'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = '') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-sm font-medium text-white z-[1000] shadow-lg animate-toast whitespace-nowrap ${
            toast.type === 'success' ? 'bg-green-800' :
            toast.type === 'error' ? 'bg-red-800' :
            'bg-gray-800'
          }`}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
