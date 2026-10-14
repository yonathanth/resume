"use client";

import { useState } from "react";
import { Check, Loader2, Repeat, X } from "lucide-react";
import type { SubscriptionPlan } from "@/lib/api";

const PLANS: { plan: SubscriptionPlan; label: string; price: string }[] = [
  { plan: "weekly", label: "Weekly", price: "$4.99 / week" },
  { plan: "monthly", label: "Monthly", price: "$9.99 / month" },
  { plan: "quarterly", label: "3 Months", price: "$24.99 / 3 months" },
];

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The plan the user is on now (null for a pre-tier subscriber). */
  currentPlan: SubscriptionPlan | null;
  /** A cancellation is scheduled — choosing any plan (even the current one) keeps Pro. */
  isCancelScheduled: boolean;
  isProcessing: boolean;
  error: string | null;
  onConfirm: (plan: SubscriptionPlan) => void;
}

// Switching tiers replaces the current plan on the same subscription — the
// old plan stops, the new one starts, and unused time is credited — so the
// user never pays for two plans. Same visual language as CancelPlanModal.
export function ChangePlanModal({
  isOpen,
  onClose,
  currentPlan,
  isCancelScheduled,
  isProcessing,
  error,
  onConfirm,
}: ChangePlanModalProps) {
  const [picked, setPicked] = useState<SubscriptionPlan | null>(null);

  if (!isOpen) return null;

  const choice = picked ?? (isCancelScheduled ? currentPlan : null);
  const unchanged = choice === currentPlan && !isCancelScheduled;

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
          Your current plan ends and the new one takes over right away. Unused time on your current plan is credited
          toward the new one, so you&apos;re never charged twice.
          {isCancelScheduled && " Choosing a plan also cancels your scheduled cancellation."}
        </p>

        <div className="space-y-2" role="radiogroup" aria-label="Plans">
          {PLANS.map(({ plan, label, price }) => {
            const selected = choice === plan;
            const isCurrent = plan === currentPlan;
            return (
              <button
                key={plan}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPicked(plan)}
                disabled={isProcessing}
                className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
                  selected ? "border-neutral-950 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold text-neutral-950">
                    {label}
                    {isCurrent && <span className="ml-2 text-[10px] font-semibold text-neutral-500">Current</span>}
                  </span>
                  <span className="block text-xs text-neutral-500">{price}</span>
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
            onClick={() => choice && onConfirm(choice)}
            disabled={isProcessing || !choice || unchanged}
            className="flex-1 py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isProcessing ? "Switching..." : "Switch Plan"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
