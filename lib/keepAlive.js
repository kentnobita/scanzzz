// lib/keepAlive.js
// Giữ kết nối ngầm, chống tắt màn hình và bảo lưu phiên làm việc khi đổi tab / chuyển ứng dụng / tắt màn hình

let wakeLockSentinel = null;
let keepAliveAudio = null;

/**
 * 1. Screen Wake Lock: Giữ màn hình luôn sáng trong suốt quá trình AI quét phiếu
 * Ngăn chặn điện thoại tự tắt màn hình sau 30s-1 phút làm ngắt kết nối socket
 */
export async function requestScreenWakeLock() {
  if (typeof window === 'undefined' || !('wakeLock' in navigator)) return false;
  try {
    if (!wakeLockSentinel) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
      return true;
    }
  } catch (err) {
    console.warn('[WakeLock] Không thể giữ sáng màn hình:', err.message);
  }
  return false;
}

export async function releaseScreenWakeLock() {
  try {
    if (wakeLockSentinel) {
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
    }
  } catch {
    // ignore
  }
}

/**
 * 2. Background Audio Keep-Alive: Chống đóng băng JavaScript trên iOS Safari & Android Chrome
 * Trình duyệt di động cấp quyền ưu tiên chạy nền (Background Media Session) cho tab có phát audio.
 * Sử dụng 1 file WAV im lặng siêu ngắn lặp vô hạn để giữ tiến trình fetch & timer không bị hệ điều hành tạm dừng.
 */
export function startBackgroundAudioKeepAlive() {
  if (typeof window === 'undefined') return;
  try {
    if (!keepAliveAudio) {
      // 1 giây âm thanh im lặng (silent WAV base64)
      const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      keepAliveAudio = new Audio(silentWav);
      keepAliveAudio.loop = true;
      keepAliveAudio.volume = 0.01; // Âm lượng tối thiểu để trình duyệt công nhận active audio stream
    }
    const playPromise = keepAliveAudio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch((err) => {
        // Trình duyệt có thể chặn autoplay nếu không có tương tác người dùng
        console.warn('[KeepAlive] Audio play failed (chờ user gesture):', err.message);
      });
    }
  } catch (e) {
    console.warn('[KeepAlive] Lỗi kích hoạt audio keep-alive:', e);
  }
}

export function stopBackgroundAudioKeepAlive() {
  try {
    if (keepAliveAudio) {
      keepAliveAudio.pause();
      keepAliveAudio.currentTime = 0;
    }
  } catch {
    // ignore
  }
}

/**
 * 3. IndexedDB Chống Mất Phiên Làm Việc (Anti-Reload / Anti-Tab Discard)
 * Khi điện thoại thiếu RAM do người dùng chuyển sang app nặng (Camera, Game, Zalo...),
 * trình duyệt có thể tắt tiến trình nền. Khi mở lại, dữ liệu này sẽ tự động khôi phục giao diện 100%.
 */
const DB_NAME = 'ScanPhieuWorkspaceDB';
const DB_VERSION = 1;
const STORE_NAME = 'active_scan_session';

// Cache kết nối IndexedDB: mở lại DB mỗi lần lưu là thao tác tốn kém (mỗi lần gọi
// saveActiveScanSession đều phải chờ onsuccess của indexedDB.open).
let dbPromise = null;

function openWorkspaceDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = (e) => {
        const db = e.target.result;
        // Nếu kết nối bị đóng (ví dụ trình duyệt thu hồi), reset cache để mở lại lần sau
        db.onclose = () => {
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

// Debounce ghi phiên làm việc: tránh ghi IndexedDB liên tục khi state đổi dồn dập
// (mỗi lần chọn trang, xoay ảnh, đổi preview...). Chỉ ghi bản mới nhất sau 400ms.
let pendingSessionData = null;
let sessionSaveTimer = null;
const SESSION_SAVE_DEBOUNCE_MS = 400;

function flushSessionSave() {
  const data = pendingSessionData;
  pendingSessionData = null;
  sessionSaveTimer = null;
  if (data) writeSessionNow(data);
}

async function writeSessionNow(sessionData) {
  try {
    const db = await openWorkspaceDB();
    const dataWithTime = { ...sessionData, savedAt: Date.now() };
    if (!db) {
      try {
        sessionStorage.setItem('active_scan_session', JSON.stringify(dataWithTime));
      } catch {
        // quota exceeded or private mode
      }
      return;
    }
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(dataWithTime, 'current_session');
  } catch (err) {
    console.warn('[SessionDB] Không thể lưu phiên làm việc:', err);
  }
}

export function saveActiveScanSession(sessionData) {
  pendingSessionData = sessionData;
  if (sessionSaveTimer) clearTimeout(sessionSaveTimer);
  sessionSaveTimer = setTimeout(flushSessionSave, SESSION_SAVE_DEBOUNCE_MS);
}

/**
 * Ghi ngay lập tức, bỏ qua debounce — dùng khi sắp rời trang (pagehide/beforeunload)
 * để không mất dữ liệu phiên đang quét.
 */
export function flushActiveScanSession() {
  if (sessionSaveTimer) {
    clearTimeout(sessionSaveTimer);
    sessionSaveTimer = null;
  }
  if (pendingSessionData) flushSessionSave();
}

export async function loadActiveScanSession() {
  try {
    const db = await openWorkspaceDB();
    if (!db) {
      try {
        const raw = sessionStorage.getItem('active_scan_session');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get('current_session');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function clearActiveScanSession() {
  try {
    // Huỷ bản ghi đang chờ debounce để không ghi đè lại dữ liệu vừa xoá
    if (sessionSaveTimer) {
      clearTimeout(sessionSaveTimer);
      sessionSaveTimer = null;
    }
    pendingSessionData = null;

    try {
      sessionStorage.removeItem('active_scan_session');
    } catch {
      // ignore
    }
    const db = await openWorkspaceDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete('current_session');
  } catch {
    // ignore
  }
}
