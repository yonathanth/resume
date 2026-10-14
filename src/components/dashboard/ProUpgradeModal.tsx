"use client";

import { Loader2, X, Check } from "lucide-react";
import { Moxie } from "@/components/moxie";
import { useStartProCheckout, useSubscriptionStatus } from "@/hooks/use-subscription";
import type { CheckoutProvider } from "@/lib/api";

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Why the paywall showed up — defaults to the free-limit message. */
  reason?: string;
}

// The two things Pro actually unlocks today (see the reason strings passed
// in from CareerProfilesView/ProfileEditorView/the create-flow modals) —
// kept to real gated features, nothing invented.
const PRO_FEATURES = ["Unlimited AI-tailored CV generations", "Reusable, editable career profiles"];

// The flow modals' button styles (see AccountGate, ProfileSyncStep).
const BUTTON_PRIMARY =
  "w-full py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed";
const BUTTON_SECONDARY =
  "w-full py-3 rounded-xl border border-neutral-200 bg-white text-sm font-bold text-neutral-800 hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

// The paywall shown once a free user's one free use of a dashboard tab
// (Create, Tailor or Improve) is already spent (backend rejects with
// PRO_REQUIRED — see use-pro-gate.ts) or when they click an "Upgrade" entry
// point directly. Same shell, fields and buttons as the flow modals and the
// sign-up pop-up (AccountGate), with Moxie jumping for the Pro crown just out
// of reach — the upgrade page's scene. Offers both payment providers:
// Polar (real $5/month recurring subscription) and Chapa (local-market
// alternative — no auto-renewal, so it sells a fixed 1-month period for 80
// ETB per payment instead).
export function ProUpgradeModal({ isOpen, onClose, reason }: ProUpgradeModalProps) {
  const checkout = useStartProCheckout();
  const { data: subscription } = useSubscriptionStatus();

  if (!isOpen) return null;

  const startCheckout = (provider: CheckoutProvider) => checkout.mutate(provider);

  const pendingOn = (provider: CheckoutProvider) => checkout.isPending && checkout.variables === provider;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-upgrade-title"
        className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-neutral-200/90 bg-white p-7 text-center shadow-2xl animate-in zoom-in-95 sm:p-9"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={checkout.isPending}
          title="Close"
          aria-label="Close"
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-white/80 backdrop-blur text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <X className="w-4 h-4" />
        </button>

        <Moxie animation="upgrade" size={112} decorative ticklish shadow={false} className="mx-auto -mt-3 mb-1" />

        <h2 id="pro-upgrade-title" className="text-xl font-bold tracking-tight text-neutral-950">
          {subscription?.isExpired ? "Your FitCV Pro plan has expired" : "Upgrade to FitCV Pro"}
        </h2>
        <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
          {reason ??
            (subscription?.isExpired
              ? "Renew to keep unlimited AI tailoring. Your free generations are already used up."
              : "You've already used your free generation on this tab. Upgrade to FitCV Pro for unlimited AI tailoring.")}
        </p>

        <ul className="my-6 space-y-2.5 text-left">
          {PRO_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 text-sm text-neutral-700">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        {checkout.isError && (
          <p className="text-xs text-red-600 font-medium text-center mb-3">Could not start the checkout. Please try again.</p>
        )}

        <div className="space-y-2.5">
          <button type="button" onClick={() => startCheckout("polar")} disabled={checkout.isPending} className={BUTTON_PRIMARY}>
            {pendingOn("polar") && <Loader2 className="w-4 h-4 animate-spin" />}
            {pendingOn("polar") ? "Redirecting..." : "Pay with card · $5/month"}
          </button>
          <button type="button" onClick={() => startCheckout("chapa")} disabled={checkout.isPending} className={BUTTON_SECONDARY}>
            {pendingOn("chapa") && <Loader2 className="w-4 h-4 animate-spin" />}
            {pendingOn("chapa") ? "Redirecting..." : "Pay with Chapa · 80 ETB/month"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={checkout.isPending}
            className="w-full py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
