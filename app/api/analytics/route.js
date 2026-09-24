import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Thư mục và file lưu trữ thống kê toàn hệ thống trên máy chủ
const dataDir = path.join(process.cwd(), '.data');
const storeFile = path.join(dataDir, 'analytics_store.json');
const MAX_LOGS = 10000;

// Hệ số dịch chuyển thời gian để mốc 05:00 AM (GMT+7) trở thành 00:00:00 UTC
// GMT+7 chênh lệch +7h so với UTC. Muốn 5h thành 0h: +7h - 5h = +2h (7200000 ms)
const RESET_OFFSET_MS = 2 * 60 * 60 * 1000;

// Bộ nhớ đệm in-memory (hữu ích trên môi trường serverless nếu file read-only)
let inMemoryLogs = null;
let mutationQueue = Promise.resolve();

// fs và bộ nhớ đệm là dùng chung trong một tiến trình Next.js. Xếp hàng các
// thao tác thay đổi để hai trang PDF hoàn tất cùng lúc không ghi đè lẫn nhau.
function enqueueMutation(operation) {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.catch(() => {});
  return result;
}

function getShiftedDate(timestamp = Date.now()) {
  return new Date(timestamp + RESET_OFFSET_MS);
}

function isSameDayCycle(timestamp, referenceTime = Date.now()) {
  const d1 = getShiftedDate(timestamp);
  const d2 = getShiftedDate(referenceTime);
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

function getShiftedWeekStartMs(shiftedDate) {
  const d = new Date(shiftedDate);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diffDays = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diffDays);
  return d.getTime();
}

function isSameWeekCycle(timestamp, referenceTime = Date.now()) {
  const d1 = getShiftedDate(timestamp);
  const d2 = getShiftedDate(referenceTime);
  return getShiftedWeekStartMs(d1) === getShiftedWeekStartMs(d2);
}

function isSameMonthCycle(timestamp, referenceTime = Date.now()) {
  const d1 = getShiftedDate(timestamp);
  const d2 = getShiftedDate(referenceTime);
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth()
  );
}

// Upstash / Vercel KV REST helpers (nếu có cấu hình)
async function getUpstashAnalytics() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/global_analytics_logs`, {
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
    console.error('Upstash GET Analytics error:', e);
  }
  return null;
}

async function setUpstashAnalytics(logs) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;

  try {
    const res = await fetch(`${url}/set/global_analytics_logs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(JSON.stringify(logs)),
      cache: 'no-store',
    });
    return res.ok;
  } catch (e) {
    console.error('Upstash SET Analytics error:', e);
    return false;
  }
}

// Đọc toàn bộ logs từ file hoặc bộ nhớ
async function readAllLogs() {
  if (inMemoryLogs !== null) {
    return inMemoryLogs;
  }

  // Thử đọc từ Upstash nếu có
  const upstashLogs = await getUpstashAnalytics();
  if (Array.isArray(upstashLogs)) {
    inMemoryLogs = upstashLogs;
    return inMemoryLogs;
  }

  try {
    if (fs.existsSync(storeFile)) {
      const raw = fs.readFileSync(storeFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryLogs = parsed;
        return inMemoryLogs;
      }
    }
  } catch (e) {
    console.error('Lỗi khi đọc file analytics_store.json:', e);
  }

  inMemoryLogs = [];
  return inMemoryLogs;
}

// Lưu toàn bộ logs vào file và bộ nhớ
async function saveAllLogs(logs) {
  inMemoryLogs = logs;

  // Lưu vào file local
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(storeFile, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error('Lỗi khi ghi file analytics_store.json:', e.message);
  }

  // Đồng bộ lên Upstash nếu có cấu hình
  await setUpstashAnalytics(logs);
}

// Tính toán tóm tắt thống kê từ danh sách logs
function computeSummary(allLogs, period = 'today', selectedModel = 'all') {
  const now = Date.now();

  const periodFilteredLogs = allLogs.filter((log) => {
    const ts = log.timestamp || 0;
    if (period === 'today') return isSameDayCycle(ts, now);
    if (period === 'week') return isSameWeekCycle(ts, now);
    if (period === 'month') return isSameMonthCycle(ts, now);
    return true; // 'all'
  });

  const modelStatsMap = {};
  periodFilteredLogs.forEach((log) => {
    const mKey = log.model || 'unknown';
    if (!modelStatsMap[mKey]) {
      modelStatsMap[mKey] = {
        modelId: mKey,
        modelName: log.modelName || mKey,
        engine: log.engine || 'kira',
        total: 0,
        success: 0,
        error: 0,
        itemCount: 0,
      };
    }
    modelStatsMap[mKey].total += 1;
    if (log.status === 'success') {
      modelStatsMap[mKey].success += 1;
      modelStatsMap[mKey].itemCount += log.itemCount || 0;
    } else {
      modelStatsMap[mKey].error += 1;
    }
  });

  const availableModels = Object.values(modelStatsMap).sort((a, b) => b.total - a.total);

  const finalLogs =
    selectedModel && selectedModel !== 'all'
      ? periodFilteredLogs.filter((log) => log.model === selectedModel)
      : periodFilteredLogs;

  const total = finalLogs.length;
  const success = finalLogs.filter((l) => l.status === 'success').length;
  const error = total - success;
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';
  const totalItems = finalLogs.reduce((acc, l) => acc + (l.itemCount || 0), 0);

  // Tính riêng số lượt hôm nay cho badge hiển thị
  const todayLogs = allLogs.filter((l) => isSameDayCycle(l.timestamp || 0, now));
  const todayTotal = todayLogs.length;

  return {
    period,
    selectedModel,
    total,
    success,
    error,
    successRate,
    totalItems,
    todayTotal,
    availableModels,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedPeriod = searchParams.get('period') || 'today';
    const period = ['today', 'week', 'month', 'all'].includes(requestedPeriod)
      ? requestedPeriod
      : 'today';
    const model = searchParams.get('model') || 'all';

    const allLogs = await readAllLogs();
    const summary = computeSummary(allLogs, period, model);

    return NextResponse.json({
      success: true,
      data: summary,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('API GET /api/analytics error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      engine = 'kira',
      model = 'default',
      modelName = '',
      status = 'success',
      itemCount = 0,
      error = null,
      timestamp = Date.now(),
    } = body;

    const entry = await enqueueMutation(async () => {
      const allLogs = await readAllLogs();
      const nextEntry = {
        id: 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        timestamp: Number(timestamp) || Date.now(),
        engine: String(engine).slice(0, 100),
        model: String(model || 'default').slice(0, 200),
        modelName: String(modelName || model || 'Không xác định').slice(0, 200),
        status: status === 'error' ? 'error' : 'success',
        itemCount: Math.max(0, Number(itemCount) || 0),
        error: error ? String(error).slice(0, 300) : null,
      };

      allLogs.unshift(nextEntry);
      if (allLogs.length > MAX_LOGS) allLogs.length = MAX_LOGS;
      await saveAllLogs(allLogs);
      return nextEntry;
    });

    return NextResponse.json({
      success: true,
      entry,
    });
  } catch (error) {
    console.error('API POST /api/analytics error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await enqueueMutation(() => saveAllLogs([]));
    return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ lịch sử thống kê' });
  } catch (error) {
    console.error('API DELETE /api/analytics error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
