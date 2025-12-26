'use client';

import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message:  string;
  type?:  ToastType;
  duration?:  number;
  onClose:  () => void;
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }:  ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  const colors = {
    success: 'bg-green-600 border-green-500',
    error: 'bg-red-600 border-red-500',
    info: 'bg-blue-600 border-blue-500',
    warning: 'bg-yellow-600 border-yellow-500',
  };

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in">
      <div className={`${colors[type]} border-l-4 rounded-lg shadow-2xl px-6 py-4 flex items-center gap-3 min-w-[300px] max-w-md`}>
        <div className="text-3xl">{icons[type]}</div>
        <div className="flex-1">
          <p className="text-white font-semibold">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
