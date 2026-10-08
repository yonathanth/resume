"use client";

import React from "react";
import Link from "next/link";
import { Check, Crown, Loader2 } from "lucide-react";
import { useStartProCheckout, useSubscriptionStatus } from "@/hooks/use-subscription";
import type { CheckoutProvider } from "@/lib/api";
import { SOFT_TONES } from "./create-flow/OptionCard";

// Mirrors the backend: free accounts get one free use of each dashboard tab,
// one-time-only — not a shared pool (see entitlement.service.ts). Pro is
// unlimited — $5/month recurring through Polar, or a fixed 1-month period for
// 80 ETB through Chapa.
const FREE_TABS: { key: "freeCreateUsed" | "freeTailorUsed" | "freeImproveUsed"; label: string }[] = [
  { key: "freeCreateUsed", label: "Create" },
  { key: "freeTailorUsed", label: "Tailor" },
  { key: "freeImproveUsed", label: "Improve" },
];

const PRO_FEATURES = [
  "Unlimited AI resume generations",
  "Unlimited tailoring to job posts",
  "Unlimited resume improvements",
  "Every template, the editor and PDF downloads",
];

const PAYMENT_OPTIONS: { provider: CheckoutProvider; title: string; price: string; cadence: string; note: string }[] = [
  { provider: "polar", title: "Pay with card", price: "$5", cadence: "/ month", note: "Renews monthly through Polar. Cancel anytime." },
  { provider: "chapa", title: "Pay with Chapa", price: "80 ETB", cadence: "/ month", note: "For payments in Ethiopia. One month, doesn't renew." },
];

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : null;
}

export function UpgradeView() {
  const { data: subscription, isLoading } = useSubscriptionStatus();
  const checkout = useStartProCheckout();

  if (isLoading || !subscription) {
    return (
      <div className="mx-auto w-full max-w-4xl px-8 pt-8 sm:px-14 lg:px-20">
        <div className="h-40 animate-pulse rounded-lg bg-neutral-100" />
      </div>
    );
  }

  const periodEnd = formatDate(subscription.currentPeriodEnd);

  // Already Pro: show the plan instead of a pitch.
  if (subscription.isPro) {
    return (
      <div className="mx-auto w-full max-w-4xl px-8 pb-16 pt-8 sm:px-14 lg:px-20">
        <div className="rounded-lg border border-neutral-300 bg-white p-7">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${SOFT_TONES.peach}`}>
              <Crown className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-neutral-950">You&apos;re on Pro</h2>
              <p className="text-sm text-neutral-500">
                {periodEnd
                  ? subscription.cancelAtPeriodEnd || subscription.subscriptionProvider === "CHAPA"
                    ? `Pro is active until ${periodEnd}.`
                    : `Renews on ${periodEnd}.`
                  : "Unlimited AI generations are unlocked."}
              </p>
            </div>
          </div>
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-neutral-700">
                <Check className="h-4 w-4 shrink-0 text-accent" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/settings#plan"
            className="mt-7 inline-flex rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
          >
            Manage plan in Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-8 pb-16 pt-8 sm:px-14 lg:px-20">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
          {subscription.isExpired ? "Renew Resumate Pro" : "Upgrade to Resumate Pro"}
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          {subscription.isExpired
            ? "Your Pro plan has ended. Renew to keep unlimited AI generations."
            : "Unlimited AI writing, tailoring and improvements for your whole job search."}
        </p>
      </div>

      {/* Free usage */}
      {!subscription.isExpired && (
        <div className="mt-8 rounded-lg border border-neutral-300 bg-white p-5">
          <span className="text-sm font-semibold text-neutral-900">Free tab usage</span>
          <p className="mt-1 text-xs text-neutral-500">One free use each — Create, Tailor and Improve.</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {FREE_TABS.map(({ key, label }) => {
              const used = subscription[key];
              return (
                <div key={key} className="rounded-md border border-neutral-200 p-3 text-center">
                  <div className="text-xs font-semibold text-neutral-900">{label}</div>
                  <div className={`mt-1 text-[11px] ${used ? "text-neutral-400" : "text-accent-strong"}`}>
                    {used ? "Used" : "Available"}
                  </div>
                  <span className={`mt-2 block h-1.5 rounded-full ${used ? "bg-neutral-200" : "bg-accent"}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* What Pro includes */}
        <div className="rounded-lg border border-neutral-300 bg-white p-6">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${SOFT_TONES.peach}`}>
              <Crown className="h-5 w-5" />
            </span>
            <h3 className="text-base font-bold tracking-tight text-neutral-950">What you get with Pro</h3>
          </div>
          <ul className="mt-5 space-y-3">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-neutral-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Payment */}
        <div className="flex flex-col gap-3">
          {PAYMENT_OPTIONS.map((option) => {
            const pending = checkout.isPending && checkout.variables === option.provider;
            return (
              <button
                key={option.provider}
                type="button"
                onClick={() => checkout.mutate(option.provider)}
                disabled={checkout.isPending}
                className="group flex flex-1 cursor-pointer flex-col justify-between rounded-lg border border-neutral-300 bg-white p-5 text-left transition-colors hover:border-accent-border disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-950">{option.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-500">{option.note}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xl font-bold tracking-tight text-neutral-950">{option.price}</span>
                    <span className="ml-1 text-xs text-neutral-400">{option.cadence}</span>
                  </div>
                </div>
                <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-950 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-neutral-800">
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {pending ? "Redirecting…" : subscription.isExpired ? "Renew Pro" : "Get Pro"}
                </span>
              </button>
            );
          })}
          {checkout.isError && <p className="text-sm font-medium text-rose-600">Could not start the checkout. Please try again.</p>}
        </div>
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        Secure checkout with Polar or Chapa. Questions? See the{" "}
        <Link href="/dashboard/help" className="font-medium text-neutral-600 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900">
          Help center
        </Link>
        .
      </p>
    </div>
  );
}
