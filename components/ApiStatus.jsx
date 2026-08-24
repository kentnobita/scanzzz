'use client';

import { useEffect, useState } from 'react';

export default function ApiStatus() {
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    setHasKey(!!localStorage.getItem('gemini_api_key'));

    const handleStorage = () => setHasKey(!!localStorage.getItem('gemini_api_key'));
    window.addEventListener('storage', handleStorage);
    window.addEventListener('apikey-changed', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('apikey-changed', handleStorage);
    };
  }, []);

  return (
    <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold mt-3 mx-4 ${
      hasKey ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
    }`}>
      <span className={`w-2 h-2 rounded-full ${hasKey ? 'bg-green-500' : 'bg-amber-500'}`} />
      {hasKey ? '✅ Gemini AI — sẵn sàng quét' : 'Chưa có API key — dùng OCR offline'}
    </div>
  );
}
