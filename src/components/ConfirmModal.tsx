import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isLoading = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[99] flex items-center justify-center p-4 animate-fade-in select-none">
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with warning styling */}
        <div className="bg-rose-50 border-b border-rose-100 px-5 py-4 flex items-center gap-3">
          <div className="p-2 bg-rose-100 rounded-lg text-rose-600 shrink-0">
            <AlertTriangle className="h-5 w-5 animate-bounce" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold font-display text-sm text-slate-900 truncate">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="ml-auto text-slate-400 hover:text-slate-600 rounded-md p-1 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5">
          <p className="text-xs text-slate-605 leading-relaxed font-semibold">
            {message}
          </p>
        </div>

        {/* Footer controls */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-bold transition cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
