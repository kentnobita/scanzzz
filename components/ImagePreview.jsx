'use client';

export default function ImagePreview({ imageData, isScanning, progress, showTesseractWarning, onScan }) {
  if (!imageData) return null;

  return (
    <div className="bg-white rounded-xl p-5 mb-4 shadow-sm">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3.5">
        👁️ Xem trước
      </div>

      {/* Image preview */}
      <div className="w-full border-2 border-blue-600 rounded-xl overflow-hidden mb-3.5">
        <img src={imageData.previewUrl} alt="Preview" className="w-full h-auto block" />
      </div>

      {/* Progress bar */}
      {isScanning && (
        <div className="mb-3.5">
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">{progress.text}</p>
        </div>
      )}

      {/* Tesseract warning */}
      {showTesseractWarning && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-3.5 py-3 text-xs text-amber-800 leading-relaxed mb-3.5">
          ⚠️ Đang dùng OCR offline. Kết quả có thể kém chính xác với chữ viết tay. Nhập API key Gemini để tốt hơn.
        </div>
      )}

      {/* Scan button */}
      <button
        onClick={onScan}
        disabled={isScanning}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-[0.97] ${
          isScanning
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-blue-600 text-white active:bg-blue-700'
        }`}
      >
        {isScanning ? (
          <>
            <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin-fast inline-block" />
            Đang quét...
          </>
        ) : (
          '🔍 Quét dữ liệu'
        )}
      </button>
    </div>
  );
}
