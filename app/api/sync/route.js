import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// In-memory memory map for serverless execution
const memoryStore = new Map();

// Local file store for persistent local development
const dataDir = path.join(process.cwd(), '.data');
const storeFile = path.join(dataDir, 'sync_store.json');

function getLocalStore() {
  try {
    if (fs.existsSync(storeFile)) {
      const raw = fs.readFileSync(storeFile, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading local sync store:', e);
  }
  return {};
}

function saveLocalStore(data) {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(storeFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    // In serverless read-only environment (like Vercel lambda), file write might be restricted, so we use memoryStore / Upstash
    console.error('Error saving local sync store (serverless read-only):', e.message);
  }
}

// Upstash / Vercel KV REST helper if configured
async function getUpstashValue(key) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/sync_${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.result) {
        return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      }
    }
  } catch (e) {
    console.error('Upstash GET error:', e);
  }
  return null;
}

async function setUpstashValue(key, value) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;

  try {
    const res = await fetch(`${url}/set/sync_${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(JSON.stringify(value)),
    });
    return res.ok;
  } catch (e) {
    console.error('Upstash SET error:', e);
  }
  return false;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get('code') || '').trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: 'Mã đồng bộ không hợp lệ' }, { status: 400 });
  }

  // 1. Try Upstash / Vercel KV first if configured
  const upstashData = await getUpstashValue(code);
  if (upstashData) {
    return NextResponse.json({ status: 'success', source: 'kv', data: upstashData });
  }

  // 2. Try memoryStore
  if (memoryStore.has(code)) {
    return NextResponse.json({ status: 'success', source: 'memory', data: memoryStore.get(code) });
  }

  // 3. Try local file store
  const localStore = getLocalStore();
  if (localStore[code]) {
    memoryStore.set(code, localStore[code]);
    return NextResponse.json({ status: 'success', source: 'file', data: localStore[code] });
  }

  return NextResponse.json({ error: 'Không tìm thấy dữ liệu cho mã đồng bộ này' }, { status: 404 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const code = (body.code || '').trim().toUpperCase();

    if (!code || code.length < 3) {
      return NextResponse.json({ error: 'Mã đồng bộ phải có ít nhất 3 ký tự' }, { status: 400 });
    }

    // Only synchronize API keys, quota counters, Google Sheets & columns/prompt configs
    const payload = {
      code,
      updatedAt: new Date().toISOString(),
      apiKey: body.apiKey || '',
      backupKeys: Array.isArray(body.backupKeys) ? body.backupKeys : [],
      apiUsage: body.apiUsage && typeof body.apiUsage === 'object' ? body.apiUsage : {},
      googleSheetUrl: body.googleSheetUrl || '',
      autoSyncSheet: !!body.autoSyncSheet,
      selectedColumns: body.selectedColumns || [],
      fieldPrompts: body.fieldPrompts || {},
    };

    // 1. Save to memory
    memoryStore.set(code, payload);

    // 2. Save to local file
    const localStore = getLocalStore();
    localStore[code] = payload;
    saveLocalStore(localStore);

    // 3. Save to Upstash / Vercel KV if configured
    await setUpstashValue(code, payload);

    return NextResponse.json({
      status: 'success',
      message: `Đã đồng bộ cấu hình API, Bộ đếm & Google Sheet cho mã ${code}`,
      updatedAt: payload.updatedAt,
      apiCount: (payload.apiKey ? 1 : 0) + payload.backupKeys.length,
    });
  } catch (error) {
    console.error('API Sync Error:', error);
    return NextResponse.json({ error: 'Lỗi server khi đồng bộ: ' + error.message }, { status: 500 });
  }
}
