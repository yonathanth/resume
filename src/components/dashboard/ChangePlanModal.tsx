"use client";

import { useState } from "react";
import { Check, Loader2, Repeat, X } from "lucide-react";
import type { BillingPeriod, PaidTier } from "@/lib/api";
import { usePricing } from "@/hooks/use-subscription";
import { FALLBACK_PRICING, PERIODS, PERIOD_LABEL, PERIOD_SUFFIX, TIER_LABEL, formatPrice } from "@/lib/plans";

export interface PlanChoice {
  tier: PaidTier;
  period: BillingPeriod;
}

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The plan the user is on now (null period for a retired product). */
  current: { tier: PaidTier; period: BillingPeriod | null };
  /** A cancellation is scheduled — choosing any plan (even the current one) keeps it. */
  isCancelScheduled: boolean;
  isProcessing: boolean;
  error: string | null;
  onConfirm: (choice: PlanChoice) => void;
}

// Switching plans replaces the current one on the same subscription — the old
// plan stops, the new one starts, and unused time is credited — so the user
// never pays for two plans. Same visual language as CancelPlanModal.
export function ChangePlanModal({ isOpen, onClose, current, isCancelScheduled, isProcessing, error, onConfirm }: ChangePlanModalProps) {
  const { data } = usePricing();
  const pricing = data ?? FALLBACK_PRICING;
  const [tier, setTier] = useState<PaidTier>(current.tier);
  const [period, setPeriod] = useState<BillingPeriod>(current.period ?? "monthly");

  if (!isOpen) return null;

  const unchanged = tier === current.tier && period === current.period && !isCancelScheduled;

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

        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-neutral-100 text-neutral-700">
          <Repeat className="w-5 h-5" />
        </div>

        <h3 className="text-sm font-bold text-neutral-950 mb-1.5">Change your plan</h3>
        <p className="text-xs text-neutral-500 leading-relaxed mb-4">
          Your current plan ends and the new one takes over right away. Unused time is credited toward the new one, so
          you&apos;re never charged twice.
          {isCancelScheduled && " Choosing a plan also cancels your scheduled cancellation."}
        </p>

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Plan">
          {(["plus", "pro"] as PaidTier[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tier === t}
              onClick={() => setTier(t)}
              disabled={isProcessing}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
                tier === t ? "border-neutral-950 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <span className="block text-sm font-semibold text-neutral-950">{TIER_LABEL[t]}</span>
              <span className="block text-[11px] text-neutral-500">{t === "pro" ? "Unlimited" : "Monthly limits"}</span>
            </button>
          ))}
        </div>

        <div className="mt-2 space-y-2" role="radiogroup" aria-label="Billing period">
          {PERIODS.map((p) => {
            const selected = period === p;
            const isCurrent = tier === current.tier && p === current.period;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPeriod(p)}
                disabled={isProcessing}
                className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
                  selected ? "border-neutral-950 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold text-neutral-950">
                    {PERIOD_LABEL[p]}
                    {isCurrent && <span className="ml-2 text-[10px] font-semibold text-neutral-500">Current</span>}
                  </span>
                  <span className="block text-xs text-neutral-500">
                    {formatPrice(pricing.plans[tier][p].price)} {PERIOD_SUFFIX[p]}
                  </span>
                </span>
                {selected && <Check className="w-4 h-4 text-neutral-950 shrink-0" />}
              </button>
            );
          })}
        </div>

        {error && <p className="text-xs text-rose-600 font-medium leading-relaxed mt-3">{error}</p>}

        <div className="flex items-center gap-2.5 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Never mind
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ tier, period })}
            disabled={isProcessing || unchanged}
            className="flex-1 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isProcessing ? "Switching..." : "Switch plan"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
