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

const LEGACY_REDIS_KEY = 'global_analytics_logs';
const REDIS_LOG_LIST_KEY = 'global_analytics_logs:v2';

// Chỉ dùng làm phương án dự phòng khi Redis chưa cấu hình hoặc đang lỗi.
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

function getRedisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function runRedisPipeline(commands) {
  const config = getRedisConfig();
  if (!config) return null;
  try {
    const res = await fetch(`${config.url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
    const results = await res.json();
    if (!Array.isArray(results) || results.some((result) => result.error)) {
      throw new Error(results?.find((result) => result.error)?.error || 'Redis pipeline thất bại');
    }
    return results.map((result) => result.result);
  } catch (e) {
    console.error('Redis Analytics error:', e);
    return null;
  }
}

function parseLogEntries(values) {
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }).filter((entry) => entry && typeof entry === 'object');
}

function mergeLogs(...groups) {
  const unique = new Map();
  groups.flat().forEach((log) => {
    const key = log.id || `${log.timestamp}_${log.model}_${log.status}`;
    if (!unique.has(key)) unique.set(key, log);
  });
  return [...unique.values()]
    .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0))
    .slice(0, MAX_LOGS);
}

async function getRedisLogs() {
  const results = await runRedisPipeline([
    ['LRANGE', REDIS_LOG_LIST_KEY, 0, MAX_LOGS - 1],
    // Tương thích với dữ liệu mảng JSON của phiên bản trước.
    ['GET', LEGACY_REDIS_KEY],
  ]);
  if (!results) return null;
  return mergeLogs(parseLogEntries(results[0]), parseLogEntries([results[1]]));
}

async function appendRedisLog(entry) {
  const results = await runRedisPipeline([
    ['LPUSH', REDIS_LOG_LIST_KEY, JSON.stringify(entry)],
    ['LTRIM', REDIS_LOG_LIST_KEY, 0, MAX_LOGS - 1],
  ]);
  return Boolean(results);
}

async function clearRedisLogs() {
  const results = await runRedisPipeline([
    ['DEL', REDIS_LOG_LIST_KEY],
    ['DEL', LEGACY_REDIS_KEY],
  ]);
  return Boolean(results);
}

async function readAllLogs() {
  if (getRedisConfig()) {
    const redisLogs = await getRedisLogs();
    if (redisLogs !== null) return redisLogs;
  }
  if (inMemoryLogs !== null) return inMemoryLogs;
  try {
    if (fs.existsSync(storeFile)) {
      const parsed = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
      if (Array.isArray(parsed)) return (inMemoryLogs = parsed);
    }
  } catch (e) {
    console.error('Lỗi khi đọc file analytics_store.json:', e);
  }
  return (inMemoryLogs = []);
}

async function saveFallbackLogs(logs) {
  inMemoryLogs = logs;
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(storeFile, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error('Lỗi khi ghi file analytics_store.json:', e.message);
  }
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

      // LPUSH là lệnh nguyên tử: nhiều PC/Android quét đồng thời sẽ không ghi
      // đè lượt của nhau như cách GET/SET cả mảng trước đây.
      if (getRedisConfig() && await appendRedisLog(nextEntry)) {
        return nextEntry;
      }

      const allLogs = await readAllLogs();
      allLogs.unshift(nextEntry);
      if (allLogs.length > MAX_LOGS) allLogs.length = MAX_LOGS;
      await saveFallbackLogs(allLogs);
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
    await enqueueMutation(async () => {
      if (getRedisConfig() && await clearRedisLogs()) {
        inMemoryLogs = [];
        return;
      }
      await saveFallbackLogs([]);
    });
    return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ lịch sử thống kê' });
  } catch (error) {
    console.error('API DELETE /api/analytics error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
