'use client';

import { useRef, useEffect } from 'react';
import { useToast } from './Toast';
import { processImageFile, resizeAndCompress, blobToDataUrl } from '@/lib/imageUtils';
import { renderPdfToDataUrl } from '@/lib/pdfHandler';

export default function ImageUploader({ onImageLoaded }) {
  const cameraRef = useRef(null);
  const fileRef = useRef(null);
  const { showToast } = useToast();

  // Process a selected file (image or PDF)
  async function processFile(file) {
    if (file.type === 'application/pdf') {
      try {
        showToast('📄 Đang xử lý PDF...', '');
        const { dataUrl, numPages } = await renderPdfToDataUrl(file);
        const imageData = await resizeAndCompress(dataUrl);
        onImageLoaded(imageData);
        showToast(numPages > 1 ? `📄 Đã tải trang 1/${numPages}` : '📄 Đã tải PDF', 'success');
      } catch {
        showToast('❌ Không thể đọc file PDF', 'error');
      }
    } else if (file.type.startsWith('image/')) {
      const imageData = await processImageFile(file);
      onImageLoaded(imageData);
    } else {
      showToast('Định dạng không hỗ trợ', 'error');
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  // Paste from clipboard via button
  async function pasteFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const dataUrl = await blobToDataUrl(blob);
          const imageData = await resizeAndCompress(dataUrl);
          onImageLoaded(imageData);
          showToast('📋 Đã dán ảnh từ clipboard', 'success');
          return;
        }
      }
      showToast('Clipboard không có ảnh', 'error');
    } catch {
      showToast('Không thể đọc clipboard. Thử Ctrl+V', 'error');
    }
  }

  // Listen for Ctrl+V / Cmd+V
  useEffect(() => {
    async function handlePaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          const dataUrl = await blobToDataUrl(blob);
          const imageData = await resizeAndCompress(dataUrl);
          onImageLoaded(imageData);
          showToast('📋 Đã dán ảnh từ clipboard', 'success');
          break;
        }
      }
    }
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [onImageLoaded, showToast]);

  return (
    <div className="bg-white rounded-xl p-5 mb-4 shadow-sm">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3.5">
        📸 Chọn ảnh phiếu
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => cameraRef.current?.click()}
          className="py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:bg-blue-700 active:scale-[0.97] transition"
        >
          📷 Chụp
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="py-3 rounded-xl border-2 border-blue-600 text-blue-600 text-sm font-semibold flex items-center justify-center gap-1.5 active:bg-blue-50 active:scale-[0.97] transition"
        >
          📁 File
        </button>
        <button
          onClick={pasteFromClipboard}
          className="py-3 rounded-xl border-2 border-blue-600 text-blue-600 text-sm font-semibold flex items-center justify-center gap-1.5 active:bg-blue-50 active:scale-[0.97] transition"
        >
          📋 Dán
        </button>
      </div>

      <p className="text-[11px] text-gray-400 mt-2 text-center">
        Hỗ trợ: JPG/PNG, PDF · Hoặc Ctrl+V để dán ảnh
      </p>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      <input ref={fileRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
