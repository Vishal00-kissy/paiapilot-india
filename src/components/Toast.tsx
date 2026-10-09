import React, { useEffect } from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const bgStyles =
    toast.type === 'success'
      ? 'bg-emerald-900/95 text-white border-emerald-700'
      : toast.type === 'error'
      ? 'bg-rose-900/95 text-white border-rose-700'
      : 'bg-slate-900/95 text-white border-slate-700';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 md:bottom-8 md:right-8 md:left-auto md:max-w-md z-50 pointer-events-auto"
    >
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border shadow-xl backdrop-blur-md ${bgStyles}`}
      >
        <div className="flex items-center gap-3">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-sky-300 shrink-0" />}
          <p className="text-sm font-medium leading-snug">{toast.text}</p>
        </div>
        <button
          onClick={onDismiss}
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
