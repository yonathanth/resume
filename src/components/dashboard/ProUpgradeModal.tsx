"use client";

import React, { useState } from "react";
import { ArrowRight, Check, Infinity as InfinityIcon, Loader2, X } from "lucide-react";
import { Moxie } from "@/components/moxie";
import {
  ApiError,
  planTier,
  type BillingPeriod,
  type CvUnlockProduct,
  type PaidTier,
} from "@/lib/api";
import { FALLBACK_PRICING, PERIODS, PERIOD_LABEL, PERIOD_SUFFIX, describeLimits, formatPrice, planFeatures } from "@/lib/plans";
import { useChangePlan, usePricing, useStartProCheckout, useStartPurchase, useSubscriptionStatus } from "@/hooks/use-subscription";
import { LifetimeScarcity } from "@/components/pricing/PlanCards";
import type { PaywallDetails } from "@/hooks/use-pro-gate";

// The paywall: Moxie jumping for the crown, then the options as rows — Plus,
// Pro (most popular), the Plus Lifetime deal in its own ticket, and, when the
// backend allows it, carrying on for free and paying for this CV at download.
// One Continue button acts on the selected row. Used by the CV flows (402
// PRO_REQUIRED), paid-only features (career profiles, AI polish) and locked
// downloads (UnlockCvModal).

type Choice = { kind: "plan"; tier: PaidTier } | { kind: "unlock" } | null;

interface PlanPaywallProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Why it showed up, when the backend didn't say. */
  reason?: string;
  /** From the backend's 402 (see useProGate). */
  paywall?: PaywallDetails | null;
  /** Shown as the "skip" option: carry on, pay for this CV at download. */
  onPayLater?: () => void;
  /** A locked CV: "just this CV" is the first option. */
  unlock?: { cvDocumentId: string; product: CvUnlockProduct; price: number } | null;
  /** The dismiss button — "Back" when it returns to a flow step. */
  dismissLabel?: string;
  /** Accepted for older callers. */
  features?: string[];
}

const REASON_COPY: Record<PaywallDetails["reason"], { title: string; body: string }> = {
  free_used: {
    title: "You've used your free CV.",
    body: "",
  },
  plan_limit: {
    title: "You've reached this period's limit.",
    body: "",
  },
  unpaid_cap: {
    title: "You have CVs waiting to be paid for",
    body: "Download or delete one of them before making another, or get a plan and download them all.",
  },
  fair_use: { title: "You've reached the fair-use limit", body: "It resets with your next billing period." },
  feature: { title: "This comes with Plus and Pro", body: "Upgrade to use it." },
};

export function ProUpgradeModal({
  isOpen,
  onClose,
  title,
  reason,
  paywall,
  onPayLater,
  unlock,
  dismissLabel,
}: PlanPaywallProps) {
  const { data } = usePricing();
  const pricing = data ?? FALLBACK_PRICING;
  const { data: status } = useSubscriptionStatus();
  const tier = planTier(status);
  const checkout = useStartProCheckout();
  const changePlan = useChangePlan();
  const purchase = useStartPurchase();
  // Nothing is picked up front; a plan row opens its billing periods once clicked.
  const [choice, setChoice] = useState<Choice>(unlock ? { kind: "unlock" } : null);
  // Opening a plan starts on its cheapest period.
  const [period, setPeriod] = useState<BillingPeriod>("weekly");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const copy = paywall ? REASON_COPY[paywall.reason] : null;
  const heading = title ?? (unlock ? "Download this CV" : copy?.title ?? (status?.isExpired ? "Your plan has ended" : "Upgrade your plan"));
  const body = unlock
    ? "Unlock just this one, or get a plan and download every CV."
    : paywall && paywall.reason !== "feature"
      ? copy?.body
      : reason ?? "Get more AI CVs and career profiles.";
  const fairUse = paywall?.reason === "fair_use";
  const subscribed = status?.planSource === "subscription" && status.subscriptionProvider === "POLAR";
  // Plans worth offering: never the one they're on (or a lower one).
  // Only what can be bought right now: a plan or period whose Polar product
  // isn't set up yet (see the backend's price list) isn't offered at all.
  const periodsFor = (t: PaidTier) => PERIODS.filter((p) => pricing.plans[t][p].available);
  const tiers: PaidTier[] = (["plus", "pro"] as PaidTier[])
    .filter((t) => (tier === "plus" ? t === "pro" : tier !== "pro"))
    .filter((t) => periodsFor(t).length > 0);
  const canUnlock = Boolean(unlock && pricing.payPerCv[unlock.product].available);
  const nothingToBuy = tiers.length === 0 && !canUnlock;
  // "Just this CV" starts picked in the download dialog, but only while it's on sale.
  const picked: Choice = choice?.kind === "unlock" && !canUnlock ? null : choice;
  const busy = checkout.isPending || changePlan.isPending || purchase.isPending;
  const lifetime = pricing.lifetime;
  // Shown to Free users in every paywall (the download dialog too) while the
  // deal is listed; it can only be bought once its Polar product is set up.
  const showLifetime = (lifetime.offer.listed ?? lifetime.offer.available) && tier === "free" && !status?.hasLifetime;
  const lifetimeOnSale = lifetime.offer.available;
  const payLaterPrice = paywall?.price ?? pricing.payPerCv.cv_new.price;

  const onError = (err: unknown) => setError(err instanceof ApiError ? err.message : "Could not start the checkout. Please try again.");
  const go = () => {
    setError(null);
    if (picked?.kind === "unlock" && unlock) {
      purchase.mutate({ product: "cv_unlock", cvDocumentId: unlock.cvDocumentId }, { onError });
    } else if (picked?.kind === "plan") {
      if (subscribed) changePlan.mutate({ tier: picked.tier, period }, { onError, onSuccess: onClose });
      else checkout.mutate({ tier: picked.tier, period }, { onError });
    }
  };

  // Each option has its own soft colour; the picked one gets a dark outline.
  const ROW_TONE = {
    unlock: "bg-[linear-gradient(135deg,#e8f2e3_0%,#f6faf3_60%,#ffffff_100%)] border-[#cbe0c2]",
    plus: "bg-[linear-gradient(135deg,#e2f1f6_0%,#f2f9fb_60%,#ffffff_100%)] border-[#c2dfe9]",
    pro: "bg-[linear-gradient(135deg,#fdebe1_0%,#fff6f0_60%,#ffffff_100%)] border-[#f3cfbb]",
  } as const;
  const row = (selected: boolean, tone: keyof typeof ROW_TONE) =>
    `relative w-full rounded-2xl border p-4 text-left transition-all cursor-pointer disabled:cursor-not-allowed ${ROW_TONE[tone]} ${
      selected ? "border-neutral-950 ring-1 ring-neutral-950" : "hover:brightness-[0.98]"
    }`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-paywall-title"
        className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-neutral-200/90 bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 sm:p-8"
        // A click on empty space (not an option or a button) clears the picked plan.
        onClick={(e) => {
          if (!busy && !(e.target as HTMLElement).closest("button, [data-option]")) setChoice(null);
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          title="Close"
          aria-label="Close"
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Moxie beside the message, as if she's saying it; the plans start right under. */}
        <div className="flex items-center gap-3 pr-8 text-left">
          <Moxie animation="upgrade" size={52} decorative ticklish shadow={false} className="-my-1 shrink-0" />
          <div className="min-w-0 pt-3">
            <h2
              id="plan-paywall-title"
              className={`tracking-tight text-neutral-950 ${body ? "text-lg font-bold leading-snug" : "text-[16px] font-semibold leading-snug"}`}
            >
              {heading}
            </h2>
            {body && <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{body}</p>}
          </div>
        </div>

        {!fairUse && (
          <>
            <div className="mt-4 space-y-2.5 text-left">
              {canUnlock && unlock && (
                <button type="button" disabled={busy} onClick={() => setChoice({ kind: "unlock" })} className={row(choice?.kind === "unlock", "unlock")}>
                  <span className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-[15px] font-semibold text-neutral-950">Just this CV</span>
                      <span className="block text-[12.5px] text-neutral-500">One-time, download it as often as you like</span>
                    </span>
                    <span className="text-[15px] font-bold text-neutral-950">{formatPrice(unlock.price)}</span>
                  </span>
                </button>
              )}

              {tiers.map((t) => {
                const selected = choice?.kind === "plan" && choice.tier === t;
                const plan = pricing.plans[t];
                const periods = periodsFor(t);
                return (
                  <div
                    key={t}
                    data-option
                    className={row(selected, t)}
                    onClick={() => {
                      if (busy) return;
                      if (!selected) setPeriod(periods[0]);
                      setChoice({ kind: "plan", tier: t });
                    }}
                  >
                    {t === "pro" && (
                      <span className="absolute -top-2.5 right-4 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Most popular
                      </span>
                    )}
                    <span className="flex items-center justify-between gap-3">
                      <span>
                        <span className="block text-[15px] font-semibold text-neutral-950">{t === "pro" ? "Pro" : "Plus"}</span>
                        <span className="block text-[12.5px] font-medium text-neutral-900">
                          {t === "pro" ? "Unlimited CVs + career profiles" : "Higher limits + career profiles"}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[11px] text-neutral-400">from</span>
                        <span className="text-[15px] font-bold text-neutral-950">{formatPrice(plan[periods[0]].price)}</span>
                      </span>
                    </span>
                    {selected && (
                      <span
                        className={`mt-3 grid gap-1.5 ${periods.length === 3 ? "grid-cols-3" : periods.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}
                        role="radiogroup"
                        aria-label="Billing period"
                      >
                        {periods.map((p) => (
                          <button
                            key={p}
                            type="button"
                            role="radio"
                            aria-checked={period === p}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPeriod(p);
                            }}
                            className={`rounded-lg border px-1.5 py-2 text-center transition-colors cursor-pointer ${
                              period === p ? "border-neutral-950 bg-white" : "border-neutral-200 bg-white/60 hover:border-neutral-300"
                            }`}
                          >
                            <span className="block text-[11px] font-semibold text-neutral-600">{PERIOD_LABEL[p]}</span>
                            <span className="block text-[13px] font-bold text-neutral-950">{formatPrice(plan[p].price)}</span>
                          </button>
                        ))}
                      </span>
                    )}
                    {/* What the picked period gets you. */}
                    {selected && (
                      <ul className="mt-3 space-y-1.5 border-t border-neutral-950/10 pt-3">
                        {planFeatures(pricing, t, period).map((feature) => (
                          <li key={feature} className="flex items-start gap-1.5 text-[12.5px] font-medium text-neutral-800">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-950" strokeWidth={3} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}

              {/* Plus Lifetime — its own ticket, outside the radio rows */}
              {showLifetime && (
                <button
                  type="button"
                  disabled={busy || !lifetimeOnSale}
                  onClick={() => purchase.mutate({ product: "plus_lifetime" }, { onError })}
                  className={`group flex w-full items-center gap-3 rounded-2xl border border-dashed border-amber-300 bg-[linear-gradient(120deg,#fff7e6_0%,#ffffff_100%)] px-4 py-3 text-left transition-colors ${
                    lifetimeOnSale ? "hover:border-amber-400 cursor-pointer" : "cursor-default"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <InfinityIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-neutral-950">
                      Plus Lifetime · {formatPrice(lifetime.price)} once
                    </span>
                    <span className="block truncate text-[12px] text-amber-800">
                      <LifetimeScarcity offer={lifetime.offer} theme="light" compact />
                      <span className="text-neutral-500"> · {describeLimits(lifetime.limits)} a month</span>
                    </span>
                  </span>
                  {!lifetimeOnSale ? (
                    <span className="shrink-0 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Coming soon
                    </span>
                  ) : purchase.isPending && purchase.variables?.product === "plus_lifetime" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-amber-600 transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>
              )}
            </div>

            {error && <p className="mt-3 text-xs font-medium text-red-600 text-center">{error}</p>}

            {nothingToBuy && (
              <p className="mt-2 text-center text-[13px] text-neutral-500">Plans aren&apos;t on sale just yet. Check back soon.</p>
            )}
            {!nothingToBuy && (
            <button
              type="button"
              disabled={busy || !picked}
              onClick={go}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-neutral-950 py-3.5 text-sm font-bold text-white transition-colors hover:bg-neutral-800 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {(checkout.isPending || changePlan.isPending || (purchase.isPending && purchase.variables?.product === "cv_unlock")) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {!picked
                ? "Choose a plan"
                : picked.kind === "unlock"
                ? `Unlock for ${formatPrice(unlock?.price ?? 0)}`
                : subscribed
                  ? `Switch to ${picked.tier === "pro" ? "Pro" : "Plus"} · ${formatPrice(pricing.plans[picked.tier][period].price)} ${PERIOD_SUFFIX[period]}`
                  : `Continue · ${formatPrice(pricing.plans[picked.tier][period].price)} ${PERIOD_SUFFIX[period]}`}
            </button>
            )}
          </>
        )}

        {/* The "skip": carry on for free, pay for this CV only if it's downloaded */}
        {onPayLater && !unlock ? (
          <button
            type="button"
            disabled={busy}
            onClick={onPayLater}
            className="mt-3 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-3 text-center transition-colors hover:border-neutral-400 hover:bg-neutral-50 cursor-pointer disabled:opacity-60"
          >
            <span className="block text-[13.5px] font-semibold text-neutral-800">
              Continue and pay {formatPrice(payLaterPrice)} to download
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="mt-3 w-full py-2 text-xs font-semibold text-neutral-500 transition-colors hover:text-neutral-800 cursor-pointer disabled:opacity-50"
          >
            {dismissLabel ?? (fairUse ? "Close" : "Maybe later")}
          </button>
        )}
      </div>
    </div>
  );
}

/** Career profiles on a free plan: what they do, and the upgrade. "Back" returns to the step. */
export function CareerProfilesPaywall({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <ProUpgradeModal
      isOpen={isOpen}
      onClose={onClose}
      title="Career profiles come with Plus and Pro"
      reason="Save your experience once per role and start every new CV from it. New CVs keep it up to date."
      dismissLabel="Back"
    />
  );
}

/** A locked CV's download: unlock just this one, or a plan that unlocks them all. */
export function UnlockCvModal({
  unlock,
  onClose,
}: {
  unlock: { cvDocumentId: string; product: CvUnlockProduct; price: number } | null;
  onClose: () => void;
}) {
  return <ProUpgradeModal key={unlock?.cvDocumentId} isOpen={Boolean(unlock)} onClose={onClose} unlock={unlock} />;
}
