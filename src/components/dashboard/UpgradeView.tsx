"use client";

import React from "react";
import Link from "next/link";
import { Check, Crown, Loader2 } from "lucide-react";
import { useStartCreditCheckout, useStartProCheckout, useSubscriptionStatus } from "@/hooks/use-subscription";
import type { CreditProduct, SubscriptionPlan } from "@/lib/api";
import { Moxie } from "@/components/moxie";
import { SOFT_TONES } from "./create-flow/OptionCard";

// Mirrors the backend: free accounts get one free use of each dashboard tab,
// one-time-only — not a shared pool (see entitlement.service.ts). Pro is
// unlimited — a Polar subscription tier (weekly $4.99 / monthly $9.99 /
// 3-month $24.99, see services/polar/plans.ts), or a fixed 1-month period for
// 80 ETB through Chapa (no auto-renewal). Pay-per-use credits (below) are a
// separate, cheaper one-off that never grants Pro.
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

const SUBSCRIPTION_PLAN_OPTIONS: { plan: SubscriptionPlan; title: string; price: string; cadence: string; note: string; popular?: boolean }[] = [
  { plan: "weekly", title: "Weekly", price: "$4.99", cadence: "/ week", note: "A short burst of applications." },
  { plan: "monthly", title: "Monthly", price: "$9.99", cadence: "/ month", note: "An active job search.", popular: true },
  { plan: "quarterly", title: "3 Months", price: "$24.99", cadence: "/ 3 months", note: "A longer search — best value." },
];

const PLAN_LABEL: Record<SubscriptionPlan, string> = { weekly: "Weekly", monthly: "Monthly", quarterly: "3 Months" };

const CREDIT_OPTIONS: { product: CreditProduct; title: string; price: string; note: string }[] = [
  { product: "new_cv", title: "New CV", price: "$3.99", note: "One extra Create generation." },
  { product: "tailoring", title: "Tailoring", price: "$1.99", note: "One extra Tailor generation." },
];

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : null;
}

export function UpgradeView() {
  const { data: subscription, isLoading } = useSubscriptionStatus();
  const checkout = useStartProCheckout();
  const creditCheckout = useStartCreditCheckout();

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
              <h2 className="text-lg font-bold tracking-tight text-neutral-950">
                You&apos;re on Pro
                {subscription.plan && (
                  <span className="ml-2 align-middle text-xs font-semibold text-accent-strong">
                    ({PLAN_LABEL[subscription.plan]})
                  </span>
                )}
              </h2>
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
      {/* Header — Moxie beside it, jumping for the Pro crown just out of reach. */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
            {subscription.isExpired ? "Renew GoMoxie Pro" : "Upgrade to GoMoxie Pro"}
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            {subscription.isExpired
              ? "Your Pro plan has ended. Renew to keep unlimited AI generations."
              : "Unlimited AI writing, tailoring and improvements for your whole job search."}
          </p>
        </div>
        <Moxie animation="upgrade" size={96} decorative ticklish shadow={false} className="-mb-3 -mt-4 hidden shrink-0 sm:block" />
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
          {SUBSCRIPTION_PLAN_OPTIONS.map((option) => {
            const pending = checkout.isPending && checkout.variables?.provider === "polar" && checkout.variables.plan === option.plan;
            return (
              <button
                key={option.plan}
                type="button"
                onClick={() => checkout.mutate({ provider: "polar", plan: option.plan })}
                disabled={checkout.isPending}
                className={`group relative flex flex-1 cursor-pointer flex-col justify-between rounded-lg border bg-white p-5 text-left transition-colors hover:border-accent-border disabled:cursor-not-allowed disabled:opacity-70 ${
                  option.popular ? "border-accent/50" : "border-neutral-300"
                }`}
              >
                {option.popular && (
                  <span className="absolute -top-2.5 right-5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                    Most popular
                  </span>
                )}
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

          {/* Chapa — local-market alternative, single fixed-period product (no cycle choice) */}
          {(() => {
            const pending = checkout.isPending && checkout.variables?.provider === "chapa";
            return (
              <button
                type="button"
                onClick={() => checkout.mutate({ provider: "chapa" })}
                disabled={checkout.isPending}
                className="group flex flex-1 cursor-pointer flex-col justify-between rounded-lg border border-neutral-300 bg-white p-5 text-left transition-colors hover:border-accent-border disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-neutral-950">Pay with Chapa</div>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-500">For payments in Ethiopia. One month, doesn&apos;t renew.</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xl font-bold tracking-tight text-neutral-950">80 ETB</span>
                    <span className="ml-1 text-xs text-neutral-400">/ month</span>
                  </div>
                </div>
                <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-950 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-neutral-800">
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {pending ? "Redirecting…" : subscription.isExpired ? "Renew Pro" : "Get Pro"}
                </span>
              </button>
            );
          })()}
          {checkout.isError && <p className="text-sm font-medium text-rose-600">Could not start the checkout. Please try again.</p>}
        </div>
      </div>

      {/* Pay-per-use — a cheaper one-off for someone who only needs a single
          extra generation, not an ongoing subscription. Never touches Pro
          status or the free per-tab counter. */}
      <div className="mt-6 rounded-lg border border-neutral-300 bg-white p-6">
        <h3 className="text-base font-bold tracking-tight text-neutral-950">Just need one more?</h3>
        <p className="mt-1 text-sm text-neutral-500">Buy a single extra generation instead of a full subscription.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CREDIT_OPTIONS.map((option) => {
            const pending = creditCheckout.isPending && creditCheckout.variables === option.product;
            return (
              <button
                key={option.product}
                type="button"
                onClick={() => creditCheckout.mutate(option.product)}
                disabled={creditCheckout.isPending}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-neutral-200 p-4 text-left transition-colors hover:border-accent-border disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div>
                  <div className="text-sm font-semibold text-neutral-950">{option.title}</div>
                  <p className="mt-0.5 text-xs text-neutral-500">{option.note}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-semibold text-neutral-900">
                  {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {pending ? "..." : option.price}
                </span>
              </button>
            );
          })}
        </div>
        {creditCheckout.isError && (
          <p className="mt-3 text-sm font-medium text-rose-600">Could not start the checkout. Please try again.</p>
        )}
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        Secure checkout with Polar or Chapa. Questions? See the{" "}
        <Link
          href="/dashboard/help"
          className="font-medium text-neutral-600 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900"
        >
          Help center
        </Link>
        .
      </p>
    </div>
  );
}
