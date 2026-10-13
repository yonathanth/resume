"use client";

import { useState } from "react";
import { Loader2, Crown, X, Check } from "lucide-react";
import { useStartProCheckout, useSubscriptionStatus } from "@/hooks/use-subscription";
import type { SubscriptionPlan } from "@/lib/api";

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

const PLAN_OPTIONS: { plan: SubscriptionPlan; label: string; price: string; popular?: boolean }[] = [
  { plan: "weekly", label: "Weekly", price: "$4.99" },
  { plan: "monthly", label: "Monthly", price: "$9.99", popular: true },
  { plan: "quarterly", label: "3 Months", price: "$24.99" },
];

// The paywall shown once a free user's one free use of a dashboard tab
// (Create, Tailor or Improve) is already spent (backend rejects with
// PRO_REQUIRED — see use-pro-gate.ts) or when they click an "Upgrade" entry
// point directly. Same dialog shell as ConfirmDialog, but using the app's
// actual Pro visual identity (the peach Crown badge + accent gradient used
// in the sidebar/CareerProfilesView/UpgradeView). Offers a Polar plan picker
// (weekly/monthly/3-month — each its own Polar product) plus Chapa (local-
// market alternative — no auto-renewal, so it sells a fixed 1-month period
// for 80 ETB per payment instead).
export function ProUpgradeModal({ isOpen, onClose, reason }: ProUpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("monthly");
  const checkout = useStartProCheckout();
  const { data: subscription } = useSubscriptionStatus();

  if (!isOpen) return null;

  const isPendingFor = (provider: "polar" | "chapa", plan?: SubscriptionPlan) =>
    checkout.isPending && checkout.variables?.provider === provider && (!plan || checkout.variables.plan === plan);

  return (
    <div className="fixed inset-0 z-[80] text-center bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 shadow-[0_24px_60px_-24px_rgba(255,94,31,0.35),0_25px_50px_-12px_rgba(0,0,0,0.25)] p-6 relative animate-in zoom-in-95 duration-150 text-center">
        <button
          type="button"
          onClick={onClose}
          disabled={checkout.isPending}
          className="absolute top-4 right-4 p-1 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 mx-auto border bg-[#fdebe1] border-[#f3cfbb] text-[#9a3d12] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <Crown className="w-5 h-5" />
        </div>

        <h3 className="text-base font-bold tracking-tight text-neutral-950 mb-1.5 text-center">
          {subscription?.isExpired ? "Your FitCV Pro plan has expired" : "Upgrade to FitCV Pro"}
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed mb-4 text-center">
          {reason ??
            (subscription?.isExpired
              ? "Renew to keep unlimited AI tailoring. Your free generations are already used up."
              : "You've already used your free generation on this tab. Upgrade to FitCV Pro for unlimited AI tailoring.")}
        </p>

        <div className="space-y-2 mb-5">
          {PRO_FEATURES.map((feature) => (
            <div key={feature} className="flex items-center justify-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
              <span className="text-xs text-neutral-700">{feature}</span>
            </div>
          ))}
        </div>

        {checkout.isError && (
          <p className="text-xs text-rose-600 font-medium leading-relaxed mb-2 text-center">
            Could not start the checkout. Please try again.
          </p>
        )}

        {/* Plan picker — Polar's three billing cycles */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {PLAN_OPTIONS.map((opt) => (
            <button
              key={opt.plan}
              type="button"
              onClick={() => setSelectedPlan(opt.plan)}
              disabled={checkout.isPending}
              className={`relative rounded-xl border py-2.5 px-1.5 text-center transition-colors cursor-pointer disabled:cursor-not-allowed ${
                selectedPlan === opt.plan
                  ? "border-accent bg-accent-soft/60"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              {opt.popular && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-white">
                  Popular
                </span>
              )}
              <div className="text-[11px] font-semibold text-neutral-800">{opt.label}</div>
              <div className="text-xs font-bold text-neutral-950">{opt.price}</div>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => checkout.mutate({ provider: "polar", plan: selectedPlan })}
            disabled={checkout.isPending}
            className="w-full py-3 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent-strong transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_8px_20px_-8px_rgba(255,94,31,0.6)] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isPendingFor("polar", selectedPlan) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isPendingFor("polar", selectedPlan) ? "Redirecting..." : "Pay with Polar"}</span>
          </button>
          <button
            type="button"
            onClick={() => checkout.mutate({ provider: "chapa" })}
            disabled={checkout.isPending}
            className="w-full py-3 rounded-xl border border-neutral-200 bg-white text-neutral-800 text-sm font-bold hover:border-accent-border hover:bg-neutral-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isPendingFor("chapa") && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isPendingFor("chapa") ? "Redirecting..." : "Pay with Chapa (local) · 80 ETB / month"}</span>
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
