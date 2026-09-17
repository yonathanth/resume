"use client";

import React from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** Shown on the confirm button (with a spinner) while the action is in flight. */
  processingLabel?: string;
  isProcessing?: boolean;
  /** Shown below the description if the confirmed action failed. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

// Shared "are you sure?" gate for destructive/copy actions (delete,
// duplicate) across the drafts list views — a single confirm click away is
// too easy to hit by accident on a resume the user worked on. Waits for the
// actual backend call to finish before closing, showing a loading state and
// surfacing an error inline if it fails instead of pretending it succeeded.
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  processingLabel = "Working...",
  isProcessing = false,
  error,
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-1 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
            danger ? "bg-rose-50 text-rose-600" : "bg-neutral-100 text-neutral-700"
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>

        <h3 className="text-sm font-bold text-neutral-950 mb-1.5">{title}</h3>
        <p className="text-xs text-neutral-500 leading-relaxed mb-2">{description}</p>
        {error && <p className="text-xs text-rose-600 font-medium leading-relaxed mb-3">{error}</p>}

        <div className="flex items-center gap-2.5 mt-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed ${
              danger ? "bg-rose-600 hover:bg-rose-700" : "bg-neutral-950 hover:bg-neutral-800"
            }`}
          >
            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isProcessing ? processingLabel : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
