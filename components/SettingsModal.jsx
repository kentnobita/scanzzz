'use client';

import { useState } from 'react';
import { useToast } from './Toast';

export default function SettingsModal({ isOpen, onClose }) {
  const [keyInput, setKeyInput] = useState('');
  const { showToast } = useToast();

  const handleOpen = () => {
    setKeyInput(localStorage.getItem('gemini_api_key') || '');
  };

  const save = () => {
    const key = keyInput.trim();
    if (!key) {
      showToast('Vui lòng nhập API key', 'error');
      return;
    }
    localStorage.setItem('gemini_api_key', key);
    window.dispatchEvent(new Event('apikey-changed'));
    onClose();
    showToast('✅ Đã lưu API key', 'success');
  };

  const clear = () => {
    localStorage.removeItem('gemini_api_key');
    setKeyInput('');
    window.dispatchEvent(new Event('apikey-changed'));
    onClose();
    showToast('Đã xóa API key', 'success');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onAnimationEnd={handleOpen}
    >
      <div className="bg-white w-full max-w-[480px] rounded-t-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">⚙️ Cài đặt API</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 text-xl flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-1.5">Google Gemini API Key</label>
          <input
            type="password"
            className="w-full px-3.5 py-3 border-2 border-gray-200 rounded-xl text-sm font-mono focus:border-blue-600 transition"
            placeholder="Nhập API key..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onFocus={() => { if (!keyInput) setKeyInput(localStorage.getItem('gemini_api_key') || ''); }}
          />
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
            Lấy API key miễn phí tại{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" className="text-blue-600 font-semibold">
              Google AI Studio ↗
            </a>
            <br />API key chỉ lưu trên thiết bị, không gửi đi đâu khác ngoài Google.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={save} className="py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm active:bg-blue-700 transition">
            💾 Lưu
          </button>
          <button onClick={clear} className="py-3.5 rounded-xl border-2 border-red-500 text-red-500 font-semibold text-sm active:bg-red-50 transition">
            🗑️ Xóa key
          </button>
        </div>
      </div>
    </div>
  );
}
