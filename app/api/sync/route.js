import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// CORS Headers cho phép đồng bộ đa thiết bị (Web PC, Mobile, VPS, Localhost)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

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

// Helper lấy cấu hình Upstash Redis REST API
function getRedisConfig() {
  const url = process.env.KV_REST_API_URL || 
              process.env.UPSTASH_REDIS_REST_URL || 
              process.env.UPSTASH_REDIS_URL || 
              process.env.REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || 
                process.env.UPSTASH_REDIS_REST_TOKEN || 
                process.env.UPSTASH_REDIS_TOKEN || 
                process.env.REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

// Upstash / Vercel KV REST helper using standard /pipeline commands
async function getUpstashValue(key) {
  const config = getRedisConfig();
  if (!config) return null;

  const redisKey = `sync_${key.trim().toUpperCase()}`;
  try {
    const res = await fetch(`${config.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([['GET', redisKey]]),
      cache: 'no-store',
    });
    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results) && results[0] && results[0].result) {
        const val = results[0].result;
        return typeof val === 'string' ? JSON.parse(val) : val;
      }
    }
  } catch (e) {
    console.error('Upstash GET error:', e);
  }
  return null;
}

async function setUpstashValue(key, value, ttlSeconds = 86400) {
  const config = getRedisConfig();
  if (!config) return false;

  const redisKey = `sync_${key.trim().toUpperCase()}`;
  const sec = Math.max(300, Number(ttlSeconds) || 86400); // Tối thiểu 5 phút, mặc định 24h
  const payloadStr = JSON.stringify(value);

  try {
    const res = await fetch(`${config.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['SET', redisKey, payloadStr, 'EX', sec],
        ['ZADD', 'sync_registry_codes', Date.now(), redisKey]
      ]),
      cache: 'no-store',
    });
    if (res.ok) {
      const results = await res.json();
      return Array.isArray(results) && !results.some(r => r.error);
    }
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
    return NextResponse.json({ error: 'Mã đồng bộ không hợp lệ' }, { status: 400, headers: corsHeaders });
  }

  // 1. Try Upstash / Vercel KV first if configured
  const upstashData = await getUpstashValue(code);
  if (upstashData) {
    if (isExpired(upstashData)) {
      return NextResponse.json({ error: 'Mã đồng bộ này đã hết hạn lưu trữ trên máy chủ' }, { status: 404, headers: corsHeaders });
    }
    // Cập nhật ngược lại vào memory và local file cache
    memoryStore.set(code, upstashData);
    const localStore = getLocalStore();
    localStore[code] = upstashData;
    saveLocalStore(localStore);

    return NextResponse.json({ status: 'success', source: 'redis_upstash', data: upstashData }, { headers: corsHeaders });
  }

  // 2. Try memoryStore
  if (memoryStore.has(code)) {
    const memData = memoryStore.get(code);
    if (isExpired(memData)) {
      memoryStore.delete(code);
      return NextResponse.json({ error: 'Mã đồng bộ này đã hết hạn lưu trữ trên máy chủ' }, { status: 404, headers: corsHeaders });
    }
    return NextResponse.json({ status: 'success', source: 'memory', data: memData }, { headers: corsHeaders });
  }

  // 3. Try local file store
  const localStore = getLocalStore();
  if (localStore[code]) {
    const fileData = localStore[code];
    if (isExpired(fileData)) {
      delete localStore[code];
      saveLocalStore(localStore);
      return NextResponse.json({ error: 'Mã đồng bộ này đã hết hạn lưu trữ trên máy chủ' }, { status: 404, headers: corsHeaders });
    }
    memoryStore.set(code, fileData);
    return NextResponse.json({ status: 'success', source: 'file', data: fileData }, { headers: corsHeaders });
  }

  return NextResponse.json({ error: 'Không tìm thấy dữ liệu cho mã đồng bộ này (hoặc đã hết hạn)' }, { status: 404, headers: corsHeaders });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const code = (body.code || '').trim().toUpperCase();

    if (!code || code.length < 3) {
      return NextResponse.json({ error: 'Mã đồng bộ phải có ít nhất 3 ký tự' }, { status: 400, headers: corsHeaders });
    }

    // Storage duration: 60 mins ~ 24h (in minutes: 60, 180, 720, 1440). Default: 1440 (24h)
    const durationMinutes = Math.max(60, Math.min(1440, Number(body.durationMinutes) || 1440));
    const ttlSeconds = durationMinutes * 60;
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;

    // Chuẩn hóa và đồng bộ đầy đủ các API keys, model, Google Sheets & columns
    const apiKeyVal = String(body.apiKey || body.geminiKey || '').trim();
    const backupKeysVal = Array.isArray(body.backupKeys || body.geminiBackupKeys)
      ? (body.backupKeys || body.geminiBackupKeys).map(k => String(k).trim()).filter(Boolean)
      : [];

    const payload = {
      code,
      updatedAt: new Date(now).toISOString(),
      expiresAt,
      durationMinutes,
      // Gemini API Keys
      apiKey: apiKeyVal,
      geminiKey: apiKeyVal,
      backupKeys: backupKeysVal,
      geminiBackupKeys: backupKeysVal,
      geminiModel: String(body.geminiModel || 'gemini-3.6-flash').trim(),

      // AI Provider & các nhà cung cấp khác
      aiProvider: (body.aiProvider === 'apinex' ? 'gemini' : (body.aiProvider || 'gemini')),
      openRouterKey: String(body.openRouterKey || '').trim(),
      openRouterModel: String(body.openRouterModel || 'nex-agi/nex-n2.5-pro:free').trim(),
      kiraKey: String(body.kiraKey || '').trim(),
      kiraModel: String(body.kiraModel || 'qwen3.8-27b-free').trim(),
      baiKey: String(body.baiKey || '').trim(),
      baiModel: String(body.baiModel || 'DeepSeek-V4.1-Flash').trim(),

      // Google Sheet & Bảng biểu
      googleSheetUrl: String(body.googleSheetUrl || '').trim(),
      autoSyncSheet: body.autoSyncSheet !== undefined ? !!body.autoSyncSheet : true,
      selectedColumns: Array.isArray(body.selectedColumns) ? body.selectedColumns : [],
      fieldPrompts: body.fieldPrompts && typeof body.fieldPrompts === 'object' ? body.fieldPrompts : {},
      apiUsage: body.apiUsage && typeof body.apiUsage === 'object' ? body.apiUsage : {},
    };

    // 1. Save to memory
    memoryStore.set(code, payload);

    // 2. Save to local file
    const localStore = getLocalStore();
    localStore[code] = payload;
    saveLocalStore(localStore);

    // 3. Save to Upstash Redis REST API (with TTL)
    const redisSaved = await setUpstashValue(code, payload, ttlSeconds);

    const formattedDuration = durationMinutes >= 60 
      ? `${Math.round(durationMinutes / 60)} giờ` 
      : `${durationMinutes} phút`;

    const storageSource = redisSaved ? 'Redis Upstash + Memory' : 'Local Memory';

    return NextResponse.json({
      status: 'success',
      message: `Đã lưu cấu hình lên Cloud [${code}] thành công (${storageSource}, lưu: ${formattedDuration})`,
      updatedAt: payload.updatedAt,
      expiresAt: payload.expiresAt,
      durationMinutes,
      redisSaved,
      apiCount: (payload.apiKey ? 1 : 0) + payload.backupKeys.length,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('API Sync Error:', error);
    return NextResponse.json({ error: 'Lỗi server khi đồng bộ: ' + error.message }, { status: 500, headers: corsHeaders });
  }
}
