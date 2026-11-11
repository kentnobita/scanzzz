// lib/analytics.js
// Quản lý bộ đếm và thống kê toàn hệ thống (đồng bộ tập trung qua Backend Server)
// Chu kỳ làm mới tự động lúc 05:00 AM (GMT+7 - Giờ Việt Nam)

const STORAGE_KEY = 'scan_global_analytics_logs';
const SUMMARY_CACHE_KEY = 'scan_global_analytics_summary_cache';
const TODAY_COUNT_KEY = 'scan_global_today_count';
const TODAY_COUNT_TIME_KEY = 'scan_global_today_count_time';
const MAX_LOGS = 10000;
const pendingAnalyticsRequests = new Map();
const recentAnalyticsResponses = new Map();
const REQUEST_DEDUP_WINDOW_MS = 2000;

// Hệ số dịch chuyển thời gian để mốc 05:00 AM (GMT+7) trở thành 00:00:00 UTC
// GMT+7 chênh lệch +7h so với UTC. Muốn 5h thành 0h: +7h - 5h = +2h (7200000 ms)
const RESET_OFFSET_MS = 2 * 60 * 60 * 1000;

/**
 * Lấy Date đã dịch chuyển theo mốc reset 5h sáng GMT+7
 */
export function getShiftedDate(timestamp = Date.now()) {
  return new Date(timestamp + RESET_OFFSET_MS);
}

/**
 * Kiểm tra xem timestamp có thuộc cùng ngày (tính từ 5h sáng) với mốc hiện tại hay không
 */
export function isSameDayCycle(timestamp, referenceTime = Date.now()) {
  const d1 = getShiftedDate(timestamp);
  const d2 = getShiftedDate(referenceTime);
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

/**
 * Lấy mốc bắt đầu tuần (Thứ Hai 05:00 AM GMT+7) trong hệ quy chiếu shifted UTC
 */
function getShiftedWeekStartMs(shiftedDate) {
  const d = new Date(shiftedDate);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diffDays = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diffDays);
  return d.getTime();
}

/**
 * Kiểm tra xem timestamp có thuộc cùng tuần (tính từ Thứ Hai 5h sáng) hay không
 */
export function isSameWeekCycle(timestamp, referenceTime = Date.now()) {
  const d1 = getShiftedDate(timestamp);
  const d2 = getShiftedDate(referenceTime);
  return getShiftedWeekStartMs(d1) === getShiftedWeekStartMs(d2);
}

/**
 * Kiểm tra xem timestamp có thuộc cùng tháng (tính từ ngày 1 lúc 5h sáng) hay không
 */
export function isSameMonthCycle(timestamp, referenceTime = Date.now()) {
  const d1 = getShiftedDate(timestamp);
  const d2 = getShiftedDate(referenceTime);
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth()
  );
}

/**
 * Đọc toàn bộ danh sách logs từ LocalStorage (Client cache)
 */
export function getAnalyticsLogs() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Lỗi khi đọc analytics logs:', err);
    return [];
  }
}

/**
 * Lấy số lượt quét hôm nay đồng bộ ngay frame đầu tiên (dùng cho React lazy initializer)
 * Luôn kiểm tra chu kỳ ngày theo mốc 05:00 AM GMT+7.
 */
export function getInitialTodayScanCount() {
  if (typeof window === 'undefined') return 0;
  try {
    const now = Date.now();
    const savedTime = Number(localStorage.getItem(TODAY_COUNT_TIME_KEY) || 0);
    if (savedTime && isSameDayCycle(savedTime, now)) {
      const count = localStorage.getItem(TODAY_COUNT_KEY);
      if (count !== null) return parseInt(count, 10) || 0;
    }

    // Fallback 1: Thử đọc từ server snapshot cache (today_all)
    const rawCache = localStorage.getItem(`${SUMMARY_CACHE_KEY}_today_all`);
    if (rawCache) {
      const cached = JSON.parse(rawCache);
      if (cached?.savedAt && isSameDayCycle(cached.savedAt, now)) {
        const val = cached?.data?.todayTotal ?? cached?.data?.total;
        if (typeof val === 'number') return val;
      }
    }

    // Fallback 2: Tính từ local logs nếu có
    const logs = getAnalyticsLogs();
    if (logs.length > 0) {
      return logs.filter((l) => isSameDayCycle(l.timestamp || 0, now)).length;
    }
  } catch {}
  return 0;
}

/**
 * Lấy tóm tắt thống kê nhanh đồng bộ (ưu tiên snapshot server cache, fallback tính local)
 * @param {'today'|'week'|'month'|'all'} period
 * @param {string} selectedModel - 'all' hoặc model id cụ thể
 */
export function getAnalyticsSummary(period = 'today', selectedModel = 'all') {
  const now = Date.now();

  // 1. Luôn ưu tiên đọc server snapshot cache hợp lệ ngay lập tức
  if (typeof window !== 'undefined') {
    try {
      const rawCache = localStorage.getItem(`${SUMMARY_CACHE_KEY}_${period}_${selectedModel}`);
      if (rawCache) {
        const cached = JSON.parse(rawCache);
        // Với period === 'today', kiểm tra snapshot có thuộc cùng chu kỳ ngày (05:00 GMT+7) hay không
        const isCycleValid = period === 'today' ? isSameDayCycle(cached?.savedAt || 0, now) : true;
        if (cached?.data && isCycleValid) {
          return cached.data;
        }
      }
    } catch {}
  }

  // 2. Fallback: Tính toán từ local logs của máy này
  const allLogs = getAnalyticsLogs();
  const periodFilteredLogs = allLogs.filter((log) => {
    const ts = log.timestamp || 0;
    if (period === 'today') return isSameDayCycle(ts, now);
    if (period === 'week') return isSameWeekCycle(ts, now);
    if (period === 'month') return isSameMonthCycle(ts, now);
    return true;
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

  const todayTotal = allLogs.filter((l) => isSameDayCycle(l.timestamp || 0, now)).length;

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

/**
 * Ghi nhận một sự kiện quét mới vào hệ thống (vừa gửi lên Server Backend vừa lưu Local Cache)
 * @param {Object} event
 * @param {string} event.engine - 'gemini' | 'kira'
 * @param {string} event.model - id mô hình (ví dụ: 'qwen3.8-flash', 'gemini-3.6-flash')
 * @param {string} [event.modelName] - tên hiển thị thân thiện
 * @param {'success'|'error'} event.status - trạng thái
 * @param {number} [event.itemCount] - số lượng dòng hàng quét được (nếu thành công)
 * @param {string} [event.error] - thông báo lỗi nếu thất bại
 */
export async function logScanEvent({
  engine = 'kira',
  model = 'default',
  modelName = '',
  status = 'success',
  itemCount = 0,
  error = null,
}) {
  const payload = {
    engine,
    model: model || 'default',
    modelName: modelName || model || 'Không xác định',
    status: status === 'error' ? 'error' : 'success',
    itemCount: Number(itemCount) || 0,
    error: error ? String(error).slice(0, 300) : null,
    timestamp: Date.now(),
  };

  // 1. Cập nhật lạc quan (Optimistic Update) vào LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const logs = getAnalyticsLogs();
      const entry = {
        id: 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        ...payload,
      };
      logs.unshift(entry);
      if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));

      // Tăng biến đếm hôm nay tức thì mà không xóa cache
      const currentToday = getInitialTodayScanCount();
      localStorage.setItem(TODAY_COUNT_KEY, String(currentToday + 1));
      localStorage.setItem(TODAY_COUNT_TIME_KEY, String(Date.now()));

      // Cập nhật lạc quan snapshot cache today_all nếu đang có
      const todayAllKey = `${SUMMARY_CACHE_KEY}_today_all`;
      const rawSnapshot = localStorage.getItem(todayAllKey);
      if (rawSnapshot) {
        const cached = JSON.parse(rawSnapshot);
        if (cached?.data) {
          cached.data.total = (cached.data.total || 0) + 1;
          cached.data.todayTotal = (cached.data.todayTotal || 0) + 1;
          if (payload.status === 'success') {
            cached.data.success = (cached.data.success || 0) + 1;
            cached.data.totalItems = (cached.data.totalItems || 0) + (payload.itemCount || 0);
          } else {
            cached.data.error = (cached.data.error || 0) + 1;
          }
          cached.savedAt = Date.now();
          localStorage.setItem(todayAllKey, JSON.stringify(cached));
        }
      }
    } catch (err) {
      console.warn('Lỗi ghi local analytics:', err);
    }
  }

  // 2. Gửi đồng bộ lên Server Backend để mọi thiết bị/trình duyệt đều có số liệu chung
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Analytics server trả về HTTP ${response.status}`);
      }
      recentAnalyticsResponses.clear();
    } catch (e) {
      // LocalStorage vẫn giữ dữ liệu dự phòng khi thiết bị đang offline.
      console.warn('Lỗi gửi analytics lên server:', e);
    }
  }

  return payload;
}

/**
 * Lấy tóm tắt thống kê từ Server Backend (cho toàn bộ hệ thống / mọi trình duyệt)
 */
export async function fetchServerAnalytics(period = 'today', selectedModel = 'all') {
  if (typeof window === 'undefined') {
    return getAnalyticsSummary(period, selectedModel);
  }

  const url = `/api/analytics?period=${encodeURIComponent(period)}&model=${encodeURIComponent(selectedModel)}`;
  const recent = recentAnalyticsResponses.get(url);
  if (recent && Date.now() - recent.receivedAt < REQUEST_DEDUP_WINDOW_MS) {
    return recent.data;
  }
  if (!pendingAnalyticsRequests.has(url)) {
    const request = fetch(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Analytics server trả về HTTP ${res.status}`);
        const json = await res.json();
        if (!json?.success || !json.data) throw new Error('Dữ liệu analytics không hợp lệ');

        try {
          localStorage.setItem(
            `${SUMMARY_CACHE_KEY}_${period}_${selectedModel}`,
            JSON.stringify({ savedAt: Date.now(), data: json.data })
          );
          if (typeof json.data.todayTotal === 'number') {
            localStorage.setItem(TODAY_COUNT_KEY, String(json.data.todayTotal));
            localStorage.setItem(TODAY_COUNT_TIME_KEY, String(Date.now()));
          }
        } catch {}

        recentAnalyticsResponses.set(url, { receivedAt: Date.now(), data: json.data });
        return json.data;
      })
      .finally(() => pendingAnalyticsRequests.delete(url));
    pendingAnalyticsRequests.set(url, request);
  }

  try {
    return await pendingAnalyticsRequests.get(url);
  } catch (err) {
    console.warn('Không thể kết nối API analytics server, dùng local fallback:', err);
  }

  // Fallback sang tính toán từ local cache
  return getAnalyticsSummary(period, selectedModel);
}

/**
 * Xóa toàn bộ lịch sử thống kê (cả Local và Server Backend)
 */
export async function clearAnalyticsLogs() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TODAY_COUNT_KEY);
      localStorage.removeItem(TODAY_COUNT_TIME_KEY);
      recentAnalyticsResponses.clear();
      // Xóa các cache summary
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(SUMMARY_CACHE_KEY)) localStorage.removeItem(key);
      });
    } catch (e) {
      console.error(e);
    }
    try {
      await fetch('/api/analytics', { method: 'DELETE' });
    } catch (e) {
      console.warn('Lỗi gọi DELETE /api/analytics:', e);
    }
  }
}
