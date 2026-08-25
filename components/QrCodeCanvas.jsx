'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export default function QrCodeCanvas({ text, size = 200, className = '' }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!text) {
      setDataUrl('');
      return;
    }

    QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a', // Slate 900 for high-contrast scanning
        light: '#ffffff',
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => {
        console.error('QR generation error:', err);
      });
  }, [text, size]);

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 rounded-xl ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="QR Code"
      className={`object-contain rounded-xl shadow-sm ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
