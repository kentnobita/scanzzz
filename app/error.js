'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Client Exception caught by Error Boundary:', error);
  }, [error]);

  const clearCacheAndReload = () => {
    try {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((r) => r.unregister());
        });
      }
      localStorage.removeItem('view_mode');
      localStorage.removeItem('scan_history');
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center text-2xl font-bold">
          ⚠
        </div>
        <h2 className="text-lg font-extrabold text-white">Đã xảy ra lỗi tải trang</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Trình duyệt đang lưu bản lưu tạm cũ hoặc gặp sự cố kết nối mạng. Bạn vui lòng bấm nút bên dưới để khôi phục và tải lại phiên bản mới nhất.
        </p>

        {error?.message && (
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] font-mono text-red-300 text-left overflow-x-auto max-h-24">
            {error.message}
          </div>
        )}

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => reset()}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg active:scale-95 transition-all"
          >
            Thử Lại Ngay
          </button>
          <button
            onClick={clearCacheAndReload}
            className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs active:scale-95 transition-all"
          >
            Xóa Cache &amp; Tải Lại Trang
          </button>
        </div>
      </div>
    </div>
  );
}
