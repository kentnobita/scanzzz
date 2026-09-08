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

async function setUpstashValue(key, value, ttlSeconds = 86400) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;

  try {
    const sec = Math.max(60, Number(ttlSeconds) || 86400);
    // Upstash REST API supports EX parameter: POST /set/{key}/{value}?ex={seconds}
    const res = await fetch(`${url}/set/sync_${encodeURIComponent(key)}?ex=${sec}`, {
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

// Helper to check if payload has expired
function isExpired(data) {
  if (!data) return true;
  if (data.expiresAt) {
    return Date.now() > Number(data.expiresAt);
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
    if (isExpired(upstashData)) {
      return NextResponse.json({ error: 'Mã đồng bộ này đã hết hạn lưu trữ trên máy chủ' }, { status: 404 });
    }
    return NextResponse.json({ status: 'success', source: 'kv', data: upstashData });
  }

  // 2. Try memoryStore
  if (memoryStore.has(code)) {
    const memData = memoryStore.get(code);
    if (isExpired(memData)) {
      memoryStore.delete(code);
      return NextResponse.json({ error: 'Mã đồng bộ này đã hết hạn lưu trữ trên máy chủ' }, { status: 404 });
    }
    return NextResponse.json({ status: 'success', source: 'memory', data: memData });
  }

  // 3. Try local file store
  const localStore = getLocalStore();
  if (localStore[code]) {
    const fileData = localStore[code];
    if (isExpired(fileData)) {
      delete localStore[code];
      saveLocalStore(localStore);
      return NextResponse.json({ error: 'Mã đồng bộ này đã hết hạn lưu trữ trên máy chủ' }, { status: 404 });
    }
    memoryStore.set(code, fileData);
    return NextResponse.json({ status: 'success', source: 'file', data: fileData });
  }

  return NextResponse.json({ error: 'Không tìm thấy dữ liệu cho mã đồng bộ này (hoặc đã hết hạn)' }, { status: 404 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const code = (body.code || '').trim().toUpperCase();

    if (!code || code.length < 3) {
      return NextResponse.json({ error: 'Mã đồng bộ phải có ít nhất 3 ký tự' }, { status: 400 });
    }

    // Storage duration: 5 mins ~ 24h (in minutes: 5, 15, 30, 60, 180, 720, 1440). Default: 1440 (24h)
    const durationMinutes = Math.max(5, Math.min(1440, Number(body.durationMinutes) || 1440));
    const ttlSeconds = durationMinutes * 60;
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;

    // Only synchronize API keys, quota counters, Google Sheets & columns/prompt configs
    const payload = {
      code,
      updatedAt: new Date(now).toISOString(),
      expiresAt,
      durationMinutes,
      apiKey: body.apiKey || '',
      backupKeys: Array.isArray(body.backupKeys) ? body.backupKeys : [],
      apiUsage: body.apiUsage && typeof body.apiUsage === 'object' ? body.apiUsage : {},
      aiProvider: body.aiProvider || 'gemini',
      openRouterKey: body.openRouterKey || '',
      openRouterModel: body.openRouterModel || 'google/gemini-2.5-flash',
      apinexKey: body.apinexKey || '',
      apinexModel: body.apinexModel || 'free/gemini-3.8-flash',
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

    // 3. Save to Upstash / Vercel KV if configured (with TTL)
    await setUpstashValue(code, payload, ttlSeconds);

    const formattedDuration = durationMinutes >= 60 
      ? `${Math.round(durationMinutes / 60)} giờ` 
      : `${durationMinutes} phút`;

    return NextResponse.json({
      status: 'success',
      message: `Đã lưu cấu hình lên Cloud [${code}] thành công (Thời gian lưu: ${formattedDuration})`,
      updatedAt: payload.updatedAt,
      expiresAt: payload.expiresAt,
      durationMinutes,
      apiCount: (payload.apiKey ? 1 : 0) + payload.backupKeys.length,
    });
  } catch (error) {
    console.error('API Sync Error:', error);
    return NextResponse.json({ error: 'Lỗi server khi đồng bộ: ' + error.message }, { status: 500 });
  }
}
