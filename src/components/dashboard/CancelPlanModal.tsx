"use client";

import { AlertTriangle, Loader2, RotateCcw, X } from "lucide-react";

interface CancelPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Whether cancellation is already scheduled — switches the modal into "undo" mode. */
  isCancelScheduled: boolean;
  /** Formatted date string for when the current billing period ends. */
  periodEndLabel: string;
  isProcessing: boolean;
  error: string | null;
  onConfirmCancel: () => void;
  onConfirmResume: () => void;
}

// Handles both directions of the same decision: scheduling a cancellation
// (destructive-ish — loses future renewal, so styled as a warning with a
// confirm step) and undoing one the user already scheduled (not
// destructive — just flips the same flag back, styled neutrally). Same
// visual language as ConfirmDialog.
export function CancelPlanModal({
  isOpen,
  onClose,
  isCancelScheduled,
  periodEndLabel,
  isProcessing,
  error,
  onConfirmCancel,
  onConfirmResume,
}: CancelPlanModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-1 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
            isCancelScheduled ? "bg-neutral-100 text-neutral-700" : "bg-rose-50 text-rose-600"
          }`}
        >
          {isCancelScheduled ? <RotateCcw className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        </div>

        {isCancelScheduled ? (
          <>
            <h3 className="text-sm font-bold text-neutral-950 mb-1.5">Undo cancellation?</h3>
            <p className="text-xs text-neutral-500 leading-relaxed mb-2">
              Your GoMoxie Pro plan is set to cancel on {periodEndLabel}. Undo this to keep it renewing
              automatically.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-sm font-bold text-neutral-950 mb-1.5">Cancel GoMoxie Pro?</h3>
            <p className="text-xs text-neutral-500 leading-relaxed mb-2">
              You&apos;ll keep Pro access until {periodEndLabel}. Nothing already paid is refunded, and it
              won&apos;t renew after that.
            </p>
          </>
        )}

        {error && <p className="text-xs text-rose-600 font-medium leading-relaxed mb-3">{error}</p>}

        <div className="flex items-center gap-2.5 mt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelScheduled ? "Keep Cancellation" : "Keep My Plan"}
          </button>
          <button
            type="button"
            onClick={isCancelScheduled ? onConfirmResume : onConfirmCancel}
            disabled={isProcessing}
            className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed ${
              isCancelScheduled ? "bg-neutral-950 hover:bg-neutral-800" : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>
              {isProcessing
                ? isCancelScheduled
                  ? "Undoing..."
                  : "Cancelling..."
                : isCancelScheduled
                  ? "Undo Cancellation"
                  : "Cancel Plan"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
