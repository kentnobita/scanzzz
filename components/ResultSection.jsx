'use client';

import { useState, useEffect } from 'react';
import { useToast } from './Toast';

export default function ResultSection({ data, engineUsed, onReset }) {
  const { showToast } = useToast();
  const [soPhieu, setSoPhieu] = useState('');
  const [items, setItems] = useState([]);

  // Sync from extracted data
  useEffect(() => {
    if (data) {
      setSoPhieu(data.soPhieu || '');
      setItems(data.items?.map(item => ({ ten: item.ten || '', soLuong: item.soLuong || '' })) || []);
    }
  }, [data]);

  if (!data) return null;

  // Update item field
  function updateItem(index, field, value) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  // Copy helpers
  async function copyText(text, label) {
    if (!text) {
      showToast(`Chưa có ${label}`, 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 Đã copy!', 'success');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('📋 Đã copy!', 'success');
    }
  }

  function copySoPhieu() {
    copyText(soPhieu, 'số phiếu');
  }

  function copyMaHang() {
    const lines = items.map(i => i.ten.trim()).filter(Boolean);
    copyText(lines.join('\n'), 'mã hàng');
  }

  function copySoLuong() {
    const lines = items.map(i => i.soLuong.trim()).filter(Boolean);
    copyText(lines.join('\n'), 'số lượng');
  }

  function copyItemRow(index) {
    const item = items[index];
    copyText(`${item.ten} | ${item.soLuong}`, 'dòng');
  }

  return (
    <div className="bg-white rounded-xl p-5 mb-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          📝 Kết quả trích xuất
        </span>
        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide ${
          engineUsed === 'gemini' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {engineUsed === 'gemini' ? '✨ Gemini AI' : '📝 OCR Offline'}
        </span>
      </div>

      {/* Số phiếu */}
      <div className="bg-blue-50 rounded-xl p-3.5 mb-4">
        <div className="text-xs font-semibold text-blue-800 mb-1.5">Số phiếu</div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={soPhieu}
            onChange={(e) => setSoPhieu(e.target.value)}
            className="flex-1 px-3 py-2.5 border-2 border-blue-200 rounded-lg bg-white font-mono text-lg font-bold text-blue-800 focus:border-blue-600 transition"
            placeholder="Số phiếu..."
          />
          <CopyBtn onClick={copySoPhieu} />
        </div>
      </div>

      {/* Items table */}
      <div className="text-xs font-semibold text-gray-500 mb-1.5">Danh sách hàng hóa</div>

      {/* Table header */}
      <div className="grid grid-cols-[30px_1fr_70px_36px] gap-2 pb-2 border-b-2 border-gray-200 mb-2.5">
        <span className="text-[11px] font-bold text-gray-400 uppercase">#</span>
        <span className="text-[11px] font-bold text-gray-400 uppercase">Tên / Mã hàng</span>
        <span className="text-[11px] font-bold text-gray-400 uppercase text-center">SL</span>
        <span />
      </div>

      {/* Item rows */}
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-[30px_1fr_70px_36px] gap-2 items-center mb-2">
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
            {index + 1}
          </div>
          <input
            type="text"
            value={item.ten}
            onChange={(e) => updateItem(index, 'ten', e.target.value)}
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg font-mono text-sm bg-gray-50 focus:border-blue-600 focus:bg-white transition"
            placeholder="Mã hàng..."
          />
          <input
            type="text"
            value={item.soLuong}
            onChange={(e) => updateItem(index, 'soLuong', e.target.value)}
            className="w-full px-1.5 py-2.5 border-2 border-gray-200 rounded-lg font-mono text-sm font-bold text-center bg-gray-50 focus:border-blue-600 focus:bg-white transition"
            placeholder="SL"
          />
          <CopyBtn onClick={() => copyItemRow(index)} />
        </div>
      ))}

      {/* Divider */}
      <div className="h-px bg-gray-200 my-4" />

      {/* 3 copy buttons */}
      <div className="grid grid-cols-3 gap-2.5 mb-3">
        <button onClick={copySoPhieu} className="py-2.5 rounded-xl bg-green-600 text-white text-xs font-semibold active:bg-green-700 active:scale-[0.97] transition">
          📋 Số phiếu
        </button>
        <button onClick={copyMaHang} className="py-2.5 rounded-xl bg-green-600 text-white text-xs font-semibold active:bg-green-700 active:scale-[0.97] transition">
          📋 Mã hàng
        </button>
        <button onClick={copySoLuong} className="py-2.5 rounded-xl bg-green-600 text-white text-xs font-semibold active:bg-green-700 active:scale-[0.97] transition">
          📋 Số lượng
        </button>
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="w-full py-3.5 rounded-xl border-2 border-red-500 text-red-500 font-semibold text-sm active:bg-red-50 active:scale-[0.97] transition"
      >
        🔄 Quét lại
      </button>
    </div>
  );
}

function CopyBtn({ onClick }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    onClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-9 h-9 rounded-lg text-base flex items-center justify-center flex-shrink-0 transition active:scale-90 ${
        copied ? 'bg-green-600 text-white' : 'bg-blue-50 text-blue-600'
      }`}
      title="Copy"
    >
      {copied ? '✅' : '📋'}
    </button>
  );
}
