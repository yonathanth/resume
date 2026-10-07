"use client";

import { Loader2, Crown, X } from "lucide-react";
import { useStartProCheckout, useSubscriptionStatus } from "@/hooks/use-subscription";
import type { CheckoutProvider } from "@/lib/api";

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Why the paywall showed up — defaults to the free-limit message. */
  reason?: string;
}

// The paywall shown once a free user's 3 CV generations are spent (backend
// rejects with PRO_REQUIRED — see use-pro-gate.ts) or when they click an
// "Upgrade" entry point directly. Same visual language as ConfirmDialog.
// Offers both payment providers: Polar (real $5/month recurring
// subscription) and Chapa (local-market alternative — no auto-renewal, so
// it sells a fixed 1-month period for 80 ETB per payment instead).
export function ProUpgradeModal({ isOpen, onClose, reason }: ProUpgradeModalProps) {
  const checkout = useStartProCheckout();
  const { data: subscription } = useSubscriptionStatus();

  if (!isOpen) return null;

  const startCheckout = (provider: CheckoutProvider) => checkout.mutate(provider);

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
          <Crown className="w-5 h-5" />
        </div>

        <h3 className="text-sm font-bold text-neutral-950 mb-1.5">
          {subscription?.isExpired ? "Your FitCV Pro plan has expired" : "Upgrade to FitCV Pro"}
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed mb-3">
          {reason ??
            (subscription?.isExpired
              ? "Renew to keep unlimited AI tailoring. Your free generations are already used up."
              : "You've used all 3 free CV generations. Upgrade to FitCV Pro for unlimited AI tailoring.")}
        </p>

        {checkout.isError && (
          <p className="text-xs text-rose-600 font-medium leading-relaxed mb-2">
            Could not start the checkout. Please try again.
          </p>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => startCheckout("polar")}
            disabled={checkout.isPending}
            className="w-full py-2.5 rounded-xl bg-amber-400 text-neutral-950 text-xs font-bold hover:bg-amber-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {checkout.isPending && checkout.variables === "polar" && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            <span>
              {checkout.isPending && checkout.variables === "polar"
                ? "Redirecting..."
                : "Pay with Polar · $5/month"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => startCheckout("chapa")}
            disabled={checkout.isPending}
            className="w-full py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-800 text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {checkout.isPending && checkout.variables === "chapa" && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            <span>
              {checkout.isPending && checkout.variables === "chapa"
                ? "Redirecting..."
                : "Pay with Chapa (local) · 80 ETB / month"}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={checkout.isPending}
          className="w-full mt-3 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
