"use client";

import React from "react";
import Link from "next/link";
import { Crown, Gift } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/use-subscription";
import { planTier, type SubscriptionStatusResult } from "@/lib/api";
import { PERIOD_LABEL } from "@/lib/plans";
import { LifetimeDeal, PlanCards } from "@/components/pricing/PlanCards";
import { SOFT_TONES } from "./create-flow/OptionCard";

// The dashboard's plans page: the same Free / Plus / Pro cards as /pricing
// (light), with the user's plan marked and switched in place, plus the
// lifetime deal.

function formatDate(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : null;
}

/** Where a free user stands: what's left free, and what's waiting to be paid for. */
function FreePlan({ status }: { status: SubscriptionStatusResult }) {
  const left = status.free?.remaining ?? 0;
  const unpaid = status.unpaidCvs?.count ?? 0;
  const note = status.isExpired
    ? "Your plan has ended. Your CVs and profiles are still here."
    : [
        left > 0 ? `${left} free CV${left === 1 ? "" : "s"} left.` : "You've used your free CV.",
        unpaid > 0 ? `${unpaid} CV${unpaid === 1 ? " is" : "s are"} waiting to be paid for at download.` : "",
      ]
        .filter(Boolean)
        .join(" ");
  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${SOFT_TONES.peach}`}>
        <Gift className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-neutral-950">You&apos;re on Free</p>
        <p className="text-sm text-neutral-500">{note}</p>
      </div>
      <Link
        href="/dashboard/settings#plan"
        className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
      >
        Your usage
      </Link>
    </div>
  );
}

/** "Plus · Monthly — renews on May 3." */
function CurrentPlan({ status }: { status: SubscriptionStatusResult }) {
  const tier = planTier(status);
  if (tier === "free") return <FreePlan status={status} />;
  const name = tier === "pro" ? "Pro" : "Plus";
  const period = status.plan === "lifetime" ? "Lifetime" : status.plan ? PERIOD_LABEL[status.plan] : null;
  const end = formatDate(status.currentPeriodEnd);
  const resets = formatDate(status.periodEndsAt);
  const note =
    status.planSource === "subscription" && end
      ? status.cancelAtPeriodEnd
        ? `Active until ${end}.`
        : `Renews on ${end}.`
      : status.planSource === "lifetime"
        ? resets
          ? `Your monthly limits reset on ${resets}.`
          : "Yours for life."
        : status.proGrantExpiresAt
          ? `A gift from the gomoxie team, until ${formatDate(status.proGrantExpiresAt)}.`
          : "A gift from the gomoxie team.";
  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${SOFT_TONES.peach}`}>
        <Crown className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-neutral-950">
          You&apos;re on {name}
          {period && <span className="ml-1.5 text-sm font-medium text-neutral-500">· {period}</span>}
        </p>
        <p className="text-sm text-neutral-500">{note}</p>
      </div>
      <Link
        href="/dashboard/settings#plan"
        className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
      >
        Manage plan
      </Link>
    </div>
  );
}

export function UpgradeView() {
  const { data: status, isLoading } = useSubscriptionStatus();

  if (isLoading || !status) {
    return (
      <div className="mx-auto w-full max-w-6xl px-8 pt-8 sm:px-14 lg:px-20">
        <div className="h-40 animate-pulse rounded-lg bg-neutral-100" />
      </div>
    );
  }

  const tier = planTier(status);
  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-8 sm:px-10 lg:px-14">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
          {status.isExpired
            ? "Pick up where you left off"
            : tier === "pro"
              ? "Your plan"
              : tier === "plus"
                ? "Go further with Pro"
                : "Choose your plan"}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-500">
          {tier === "pro"
            ? "Everything is unlimited. You can switch billing period or plan here."
            : tier === "plus"
              ? "Pro lifts every monthly limit, so you never have to count."
              : "Plus for a focused search, Pro for no limits. Both include career profiles."}
        </p>
      </div>
      <CurrentPlan status={status} />

      <div className="mt-10">
        {/* Free only matters to someone on it; on a paid plan it would just say "Included". */}
        <PlanCards theme="light" signedIn status={status} periodOnCards freeLast hideFree={tier !== "free"} />
      </div>
      {tier === "free" && (
        <LifetimeDeal theme="light" signedIn status={status} />
      )}
    </div>
  );
}
