import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export const Toast = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isCritical = toast.type === 'critical' || toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-lg border shadow-lg flex items-start gap-3 transition-all ${
              isCritical
                ? 'bg-rose-900/95 border-rose-700 text-rose-100'
                : isSuccess
                ? 'bg-slate-900/95 border-emerald-600 text-slate-100'
                : 'bg-slate-900/95 border-slate-700 text-slate-100'
            }`}
          >
            {isCritical ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            )}
            
            <div className="flex-1 text-xs">
              {toast.title && <div className="font-semibold text-sm mb-0.5">{toast.title}</div>}
              <div className="opacity-90 leading-relaxed">{toast.message}</div>
              <div className="text-[10px] opacity-60 mt-1 font-mono">{toast.time}</div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="opacity-70 hover:opacity-100 transition-opacity p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Toast;
