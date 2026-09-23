// lib/analytics.js
// Quản lý bộ đếm và thống kê toàn hệ thống (không chia theo phiên hay cloud sync)
// Chu kỳ làm mới tự động lúc 05:00 AM (GMT+7 - Giờ Việt Nam)

const STORAGE_KEY = 'scan_global_analytics_logs';
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
  // getUTCDay(): 0 là Chủ Nhật, 1 là Thứ Hai, ..., 6 là Thứ Bảy
  const day = d.getUTCDay();
  // Khoảng cách lùi về Thứ Hai: nếu là CN (0) thì lùi 6 ngày, còn lại lùi (day - 1) ngày
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
 * Đọc toàn bộ danh sách logs từ LocalStorage
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
 * Ghi nhận một sự kiện quét mới vào hệ thống
 * @param {Object} event
 * @param {string} event.engine - 'gemini' | 'kira'
 * @param {string} event.model - id mô hình (ví dụ: 'qwen3.8-flash', 'gemini-3.6-flash')
 * @param {string} [event.modelName] - tên hiển thị thân thiện
 * @param {'success'|'error'} event.status - trạng thái
 * @param {number} [event.itemCount] - số lượng dòng hàng quét được (nếu thành công)
 * @param {string} [event.error] - thông báo lỗi nếu thất bại
 */
export function logScanEvent({
  engine = 'kira',
  model = 'default',
  modelName = '',
  status = 'success',
  itemCount = 0,
  error = null,
}) {
  if (typeof window === 'undefined') return null;
  try {
    const logs = getAnalyticsLogs();
    const entry = {
      id: 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      engine,
      model: model || 'default',
      modelName: modelName || model || 'Không xác định',
      status: status === 'error' ? 'error' : 'success',
      itemCount: Number(itemCount) || 0,
      error: error ? String(error).slice(0, 300) : null,
    };

    logs.unshift(entry);
    if (logs.length > MAX_LOGS) {
      logs.length = MAX_LOGS;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    return entry;
  } catch (err) {
    console.error('Lỗi khi ghi scan event analytics:', err);
    return null;
  }
}

/**
 * Lấy tóm tắt thống kê theo chu kỳ và model lọc
 * @param {'today'|'week'|'month'|'all'} period
 * @param {string} selectedModel - 'all' hoặc model id cụ thể
 */
export function getAnalyticsSummary(period = 'today', selectedModel = 'all') {
  const allLogs = getAnalyticsLogs();
  const now = Date.now();

  // Lọc theo chu kỳ thời gian (mốc 5h sáng GMT+7)
  const periodFilteredLogs = allLogs.filter((log) => {
    const ts = log.timestamp || 0;
    if (period === 'today') return isSameDayCycle(ts, now);
    if (period === 'week') return isSameWeekCycle(ts, now);
    if (period === 'month') return isSameMonthCycle(ts, now);
    return true; // 'all'
  });

  // Thu thập danh sách tất cả các model xuất hiện trong chu kỳ này để làm dropdown lọc
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

  // Lọc theo model được chọn (nếu khác 'all')
  const finalLogs =
    selectedModel && selectedModel !== 'all'
      ? periodFilteredLogs.filter((log) => log.model === selectedModel)
      : periodFilteredLogs;

  const total = finalLogs.length;
  const success = finalLogs.filter((l) => l.status === 'success').length;
  const error = total - success;
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';
  const totalItems = finalLogs.reduce((acc, l) => acc + (l.itemCount || 0), 0);

  return {
    period,
    selectedModel,
    total,
    success,
    error,
    successRate,
    totalItems,
    availableModels,
    logs: finalLogs,
  };
}

/**
 * Xóa toàn bộ lịch sử thống kê
 */
export function clearAnalyticsLogs() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error(e);
  }
}
