"use client";

import { Loader2, Sparkles, X } from "lucide-react";
import { useStartProCheckout } from "@/hooks/use-subscription";

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Why the paywall showed up — defaults to the free-limit message. */
  reason?: string;
}

// The paywall shown once a free user's 3 CV generations are spent (backend
// rejects with PRO_REQUIRED — see use-pro-gate.ts) or when they click an
// "Upgrade" entry point directly. Same visual language as ConfirmDialog.
export function ProUpgradeModal({ isOpen, onClose, reason }: ProUpgradeModalProps) {
  const checkout = useStartProCheckout();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          disabled={checkout.isPending}
          className="absolute top-4 right-4 p-1 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-amber-50 text-amber-500">
          <Sparkles className="w-5 h-5" />
        </div>

        <h3 className="text-sm font-bold text-neutral-950 mb-1.5">Upgrade to FitCV Pro</h3>
        <p className="text-xs text-neutral-500 leading-relaxed mb-3">
          {reason ?? "You've used all 3 free CV generations. Upgrade to FitCV Pro for unlimited AI tailoring."}
        </p>
        <p className="text-2xl font-bold text-neutral-950 mb-1">
          $5<span className="text-sm font-medium text-neutral-400">/month</span>
        </p>

        {checkout.isError && (
          <p className="text-xs text-rose-600 font-medium leading-relaxed mt-2">
            Could not start the checkout. Please try again.
          </p>
        )}

        <div className="flex items-center gap-2.5 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={checkout.isPending}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={() => checkout.mutate()}
            disabled={checkout.isPending}
            className="flex-1 py-2.5 rounded-xl bg-amber-400 text-neutral-950 text-xs font-bold hover:bg-amber-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {checkout.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{checkout.isPending ? "Redirecting..." : "Upgrade"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
