// lib/analytics.js
// Quản lý bộ đếm và thống kê toàn hệ thống (đồng bộ tập trung qua Backend Server)
// Chu kỳ làm mới tự động lúc 05:00 AM (GMT+7 - Giờ Việt Nam)

const STORAGE_KEY = 'scan_global_analytics_logs';
const SUMMARY_CACHE_KEY = 'scan_global_analytics_summary_cache';
const MAX_LOGS = 10000;

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

  // 1. Lưu dự phòng vào LocalStorage của client
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
    } catch (err) {
      console.warn('Lỗi ghi local analytics:', err);
    }
  }

  // 2. Gửi đồng bộ lên Server Backend để mọi thiết bị/trình duyệt đều có số liệu chung
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((e) => console.warn('Lỗi gửi analytics lên server:', e));
    } catch (e) {
      // Bỏ qua nếu offline
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

  try {
    const url = `/api/analytics?period=${encodeURIComponent(period)}&model=${encodeURIComponent(selectedModel)}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data) {
        // Lưu cache lại để lần sau mở app render tức thì
        try {
          localStorage.setItem(
            `${SUMMARY_CACHE_KEY}_${period}_${selectedModel}`,
            JSON.stringify(json.data)
          );
        } catch {}
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Không thể kết nối API analytics server, dùng local fallback:', err);
  }

  // Fallback sang tính toán từ local cache
  return getAnalyticsSummary(period, selectedModel);
}

/**
 * Lấy tóm tắt thống kê nhanh đồng bộ (đọc từ cache local)
 * @param {'today'|'week'|'month'|'all'} period
 * @param {string} selectedModel - 'all' hoặc model id cụ thể
 */
export function getAnalyticsSummary(period = 'today', selectedModel = 'all') {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`${SUMMARY_CACHE_KEY}_${period}_${selectedModel}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.total === 'number') {
          return parsed;
        }
      }
    } catch {}
  }

  const allLogs = getAnalyticsLogs();
  const now = Date.now();

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
 * Xóa toàn bộ lịch sử thống kê (cả Local và Server Backend)
 */
export async function clearAnalyticsLogs() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
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
