'use client';

export default function Header({ onOpenSettings }) {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-50 shadow-lg">
      <h1 className="text-lg font-bold flex items-center gap-2">
        📋 Scan Phiếu
      </h1>
      <button
        onClick={onOpenSettings}
        className="w-10 h-10 rounded-full bg-white/20 text-xl flex items-center justify-center hover:bg-white/30 active:bg-white/40 transition"
        title="Cài đặt"
      >
        ⚙️
      </button>
    </div>
  );
}
