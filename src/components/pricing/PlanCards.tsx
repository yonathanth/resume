"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Check, Clock, Infinity as InfinityIcon, Loader2, X } from "lucide-react";
import {
  ApiError,
  planTier,
  type BillingPeriod,
  type PaidTier,
  type PricingCatalog,
  type SubscriptionStatusResult,
  type PlanChangePreview,
  getScheduledPlanChange,
  previewPlanChange,
} from "@/lib/api";
import {
  FALLBACK_PRICING,
  PERIODS,
  PERIOD_LABEL,
  formatPrice,
  weeklyPrice,
  planFeatures,
  timeLeft,
} from "@/lib/plans";
import { useChangePlan, usePricing, useStartProCheckout, useStartPurchase } from "@/hooks/use-subscription";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { saveQuickIntent } from "@/lib/quick-links";

// Free / Plus / Pro as three cards with a billing-period toggle, the Plus
// Lifetime deal and pay-per-CV — shared by the pricing page (dark), the home
// page and the upgrade page in the dashboard (light). Numbers come from the
// backend's price list; nothing here decides access.

export type PlanTheme = "dark" | "light";

const T = {
  dark: {
    card: "border-neutral-800 bg-[#141416]",
    cardPopular: "border-accent/50 bg-[#18181b] shadow-[0_24px_60px_-30px_rgba(255,94,31,0.45)]",
    title: "text-white",
    body: "text-neutral-400",
    muted: "text-neutral-500",
    divider: "border-neutral-800",
    feature: "text-neutral-300",
    tick: "bg-neutral-800 text-neutral-400",
    tickStrong: "bg-accent text-white",
    badge: "bg-accent/15 text-accent-light",
    primary: "bg-accent text-white hover:bg-accent-strong",
    secondary: "border border-neutral-700 bg-[#1e1e21] text-white hover:border-neutral-600 hover:bg-neutral-800",
    current: "border border-neutral-700 bg-transparent text-neutral-400",
    toggle: "border-neutral-800 bg-[#141416]",
    toggleOn: "bg-white text-neutral-950",
    toggleOff: "text-neutral-400 hover:text-white",
    deal: "border-amber-400/30 bg-[linear-gradient(120deg,#1f1a10_0%,#151517_55%,#141416_100%)]",
    dealChip: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    clock: "bg-black/30 text-white",
    error: "text-rose-400",
  },
  light: {
    card: "border-neutral-200 bg-white shadow-[0_12px_32px_-22px_rgba(15,17,21,0.25)]",
    cardPopular: "border-neutral-300 bg-white shadow-[0_18px_44px_-26px_rgba(15,17,21,0.35)] ring-1 ring-accent/30",
    title: "text-neutral-950",
    body: "text-neutral-500",
    muted: "text-neutral-400",
    divider: "border-neutral-100",
    feature: "text-neutral-700",
    tick: "bg-neutral-100 text-neutral-500",
    tickStrong: "bg-neutral-950 text-white",
    badge: "bg-accent-soft text-accent-strong",
    primary: "bg-neutral-950 text-white hover:bg-neutral-800",
    secondary: "border border-neutral-200 bg-white text-neutral-950 hover:border-neutral-300 hover:bg-neutral-50",
    current: "border border-neutral-200 bg-neutral-50 text-neutral-500",
    toggle: "border-neutral-200 bg-white",
    toggleOn: "bg-neutral-950 text-white",
    toggleOff: "text-neutral-500 hover:text-neutral-950",
    deal: "border-amber-300 bg-[linear-gradient(120deg,#fff7e6_0%,#fffdf7_55%,#ffffff_100%)]",
    dealChip: "border-amber-300 bg-amber-100 text-amber-800",
    clock: "bg-neutral-950 text-white",
    error: "text-red-600",
  },
} as const;

const BUTTON =
  "group mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold tracking-[-0.01em] transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer";

const SHORT_PERIOD: Record<BillingPeriod, string> = { weekly: "Week", monthly: "Month", quarterly: "3 mo" };

export function PeriodToggle({
  value,
  onChange,
  theme,
  compact = false,
}: {
  value: BillingPeriod;
  onChange: (p: BillingPeriod) => void;
  theme: PlanTheme;
  /** Inside a card, beside the plan name: a small pill with short labels. */
  compact?: boolean;
}) {
  const t = T[theme];
  if (compact) {
    return (
      <div role="radiogroup" aria-label="Billing period" className={`inline-flex shrink-0 rounded-full border p-0.5 ${t.toggle}`}>
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={value === p}
            aria-label={PERIOD_LABEL[p]}
            onClick={() => onChange(p)}
            className={`cursor-pointer rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${value === p ? t.toggleOn : t.toggleOff}`}
          >
            {SHORT_PERIOD[p]}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div role="radiogroup" aria-label="Billing period" className={`inline-flex rounded-full border p-1 ${t.toggle}`}>
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          className={`relative cursor-pointer rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors sm:px-5 ${value === p ? t.toggleOn : t.toggleOff}`}
        >
          {PERIOD_LABEL[p]}
          {p === "quarterly" && (
            <span className="absolute -right-1 -top-2.5 rounded-full bg-accent px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">
              Best value
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function FeatureList({ items, strong, theme }: { items: string[]; strong?: boolean; theme: PlanTheme }) {
  const t = T[theme];
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className={`flex items-start gap-3 text-[14.5px] ${t.feature}`}>
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${strong ? t.tickStrong : t.tick}`}>
            <Check className="h-3 w-3 stroke-[3]" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** "3d 04h 12m 09s" to the end of the lifetime deal, ticking every second. */
export function Countdown({ endsAt, theme, compact = false }: { endsAt: string; theme: PlanTheme; compact?: boolean }) {
  const mounted = useHasMounted();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!mounted) return null;
  const left = timeLeft(endsAt, now);
  if (left.over) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const units: [string, string][] = [
    [String(left.days), "d"],
    [pad(left.hours), "h"],
    [pad(left.minutes), "m"],
    [pad(left.seconds), "s"],
  ];
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[12px] font-semibold tabular-nums">
        <Clock className="h-3 w-3" />
        {units.map(([v, u]) => `${v}${u}`).join(" ")}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5" aria-label="Time left on this deal">
      {units.map(([v, u]) => (
        <span key={u} className={`min-w-[44px] rounded-lg px-2 py-1.5 text-center font-mono text-[15px] font-bold tabular-nums ${T[theme].clock}`}>
          {v}
          <span className="ml-0.5 text-[11px] font-semibold opacity-60">{u}</span>
        </span>
      ))}
    </div>
  );
}

/** The scarcity line for the lifetime deal: a countdown, or limited seats. */
export function LifetimeScarcity({ offer, theme, compact }: { offer: PricingCatalog["lifetime"]["offer"]; theme: PlanTheme; compact?: boolean }) {
  if (offer.display === "countdown" && offer.endsAt) return <Countdown endsAt={offer.endsAt} theme={theme} compact={compact} />;
  return <span className="text-[12.5px] font-semibold">Limited seats available</span>;
}

interface PlanCardsProps {
  theme: PlanTheme;
  /** Signed out: every button goes to sign-up. */
  signedIn: boolean;
  /** The signed-in user's plan — marks the current card and switches plans in place. */
  status?: SubscriptionStatusResult;
  /** Each paid card picks its own billing period, instead of one toggle above all of them. */
  periodOnCards?: boolean;
  /** Free goes after Plus and Pro (the in-app plans page). */
  freeLast?: boolean;
  /** Leave Free out (a signed-in user already on a paid plan: it would only say "Included"). */
  hideFree?: boolean;
}

/** Free, Plus and Pro side by side with the period toggle. */
export function PlanCards({ theme, signedIn, status, periodOnCards = false, freeLast = false, hideFree = false }: PlanCardsProps) {
  const t = T[theme];
  const { data } = usePricing();
  const pricing = data ?? FALLBACK_PRICING;
  // One period per paid plan; the shared toggle (when shown) sets both.
  const [periods, setPeriods] = useState<Record<PaidTier, BillingPeriod>>({ plus: "monthly", pro: "monthly" });
  const periodOf = (cardTier: "free" | PaidTier): BillingPeriod => (cardTier === "free" ? "monthly" : periods[cardTier]);
  const checkout = useStartProCheckout();
  const changePlan = useChangePlan();
  const [error, setError] = useState<string | null>(null);

  const tier = planTier(status);
  // An active subscription switches plan in place instead of starting a second one.
  const subscribed = status?.planSource === "subscription" && status.subscriptionProvider === "DODO";
  const currentPeriod = status?.plan && status.plan !== "lifetime" ? status.plan : null;
  const isCurrent = (cardTier: "free" | PaidTier) =>
    signedIn && cardTier === tier && (cardTier === "free" || status?.planSource !== "subscription" || currentPeriod === periodOf(cardTier));

  // A subscriber switching plan sees what it will do (and cost) before it happens.
  const [confirming, setConfirming] = useState<{ tier: PaidTier; period: BillingPeriod; name: string } | null>(null);
  const [previewing, setPreviewing] = useState<PaidTier | null>(null);
  const [preview, setPreview] = useState<PlanChangePreview | null>(null);
  const [changedNote, setChangedNote] = useState<string | null>(null);
  const { data: scheduled } = useQuery({
    queryKey: ["scheduled-plan-change"],
    queryFn: getScheduledPlanChange,
    enabled: signedIn && subscribed,
    staleTime: 60_000,
  });

  const choose = async (cardTier: PaidTier, name: string) => {
    setError(null);
    setChangedNote(null);
    const onError = (err: unknown) => setError(err instanceof ApiError ? err.message : "Could not start checkout. Please try again.");
    const period = periods[cardTier];
    if (!subscribed) {
      checkout.mutate({ tier: cardTier, period }, { onError });
      return;
    }
    setPreviewing(cardTier);
    try {
      setPreview(await previewPlanChange(cardTier, period));
      setConfirming({ tier: cardTier, period, name });
    } catch (err) {
      onError(err);
    } finally {
      setPreviewing(null);
    }
  };
  const confirmChange = () => {
    if (!confirming || !preview) return;
    const { tier: toTier, period, name } = confirming;
    changePlan.mutate(
      { tier: toTier, period },
      {
        onSuccess: () => {
          setConfirming(null);
          setChangedNote(
            preview.timing === "now"
              ? `You're on ${name} now.`
              : `You'll switch to ${name} (${PERIOD_LABEL[period]}) on ${formatDate(preview.effectiveAt)}.`
          );
        },
        onError: (err) => {
          setConfirming(null);
          setError(err instanceof ApiError ? err.message : "Could not change your plan. Please try again.");
        },
      }
    );
  };
  const pendingFor = (cardTier: PaidTier) =>
    previewing === cardTier ||
    (checkout.isPending && checkout.variables?.tier === cardTier) ||
    (changePlan.isPending && changePlan.variables?.tier === cardTier);

  const freeCard = { tier: "free" as const, name: "Free", blurb: "Try it on your next application." };
  const paidCards: { tier: PaidTier; name: string; blurb: string; popular?: boolean }[] = [
    { tier: "plus", name: "Plus", blurb: "Plenty for a focused job search." },
    { tier: "pro", name: "Pro", blurb: "No limits on any of it.", popular: true },
  ];
  const cards: { tier: "free" | PaidTier; name: string; blurb: string; popular?: boolean }[] = hideFree
    ? paidCards
    : freeLast
      ? [...paidCards, freeCard]
      : [freeCard, ...paidCards];

  return (
    <div>
      {!periodOnCards && (
        <div className="mb-10 flex justify-center">
          <PeriodToggle value={periods.pro} onChange={(p) => setPeriods({ plus: p, pro: p })} theme={theme} />
        </div>
      )}

      <div className={`mx-auto grid grid-cols-1 gap-6 ${cards.length === 2 ? "max-w-4xl md:grid-cols-2" : "max-w-6xl md:grid-cols-3"}`}>
        {cards.map((card) => {
          const period = periodOf(card.tier);
          const price = card.tier === "free" ? null : pricing.plans[card.tier][period];
          const current = isCurrent(card.tier);
          return (
            <div key={card.tier} className={`relative flex h-full flex-col rounded-3xl border p-8 ${card.popular ? t.cardPopular : t.card}`}>
              {/* The tag sits on the card's top border, leaving the header for the name and period. */}
              {card.popular && !current && (
                <span className="absolute -top-3 left-8 rounded-full bg-accent px-3 py-1 text-[11.5px] font-bold uppercase tracking-wide text-white">
                  Most popular
                </span>
              )}
              <div className="flex min-h-[30px] items-center justify-between gap-3">
                <h3 className={`text-[17px] font-semibold ${t.title}`}>{card.name}</h3>
                {periodOnCards && card.tier !== "free" && (
                  <PeriodToggle
                    compact
                    theme={theme}
                    value={periods[card.tier]}
                    onChange={(p) => setPeriods((prev) => ({ ...prev, [card.tier]: p }))}
                  />
                )}
              </div>
              <div className="mt-12 flex items-baseline gap-1.5">
                <span className={`text-5xl font-bold tracking-tight ${t.title}`}>{price ? weeklyPrice(price.price, period) : "$0"}</span>
                {price && <span className={`text-[14px] ${t.muted}`}>/ week</span>}
              </div>
              <p className={`mt-2.5 text-[14px] ${t.body}`}>{card.blurb}</p>

              {card.tier === "free" ? (
                signedIn ? (
                  <span className={`${BUTTON} cursor-default ${t.current}`}>{current ? "Your plan" : "Included"}</span>
                ) : (
                  <Link href="/signup" className={`${BUTTON} ${t.secondary}`}>
                    Start for free
                  </Link>
                )
              ) : !signedIn ? (
                <Link
                  href="/signup"
                  onClick={() => saveQuickIntent({ kind: "checkout", tier: card.tier as PaidTier, period })}
                  className={`${BUTTON} ${t.primary}`}
                >
                  Get {card.name}
                  <ArrowRight className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : current ? (
                <span className={`${BUTTON} cursor-default ${t.current}`}>Your plan</span>
              ) : (
                <button
                  type="button"
                  disabled={checkout.isPending || changePlan.isPending || previewing !== null || !price?.available}
                  onClick={() => void choose(card.tier as PaidTier, card.name)}
                  className={`${BUTTON} ${t.primary}`}
                >
                  {pendingFor(card.tier as PaidTier) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> {subscribed ? "Switching..." : "Redirecting..."}
                    </>
                  ) : !price?.available ? (
                    "Coming soon"
                  ) : (
                    <>
                      {subscribed ? `Switch to ${card.name}` : `Get ${card.name}`}
                      <ArrowRight className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              )}

              {/* Under the button; the same height on every card, so the lists line up. */}
              <p className={`mt-2.5 min-h-[18px] text-center text-[12.5px] ${t.muted}`}>{card.tier === "free" ? "" : "Cancel anytime"}</p>

              <div className={`mt-6 border-t pt-7 ${t.divider}`}>
                <FeatureList items={planFeatures(pricing, card.tier, period)} strong={card.popular} theme={theme} />
              </div>

            </div>
          );
        })}
      </div>
      {error && <p className={`mx-auto mt-6 max-w-md text-center text-sm font-medium ${t.error}`}>{error}</p>}
      {(changedNote || scheduled) && (
        <p className={`mx-auto mt-6 max-w-md text-center text-sm font-medium ${t.body}`}>
          {changedNote ??
            (scheduled &&
              `You'll switch to ${scheduled.tier === "pro" ? "Pro" : "Plus"} (${PERIOD_LABEL[scheduled.period]}) on ${formatDate(scheduled.effectiveAt)}.`)}
        </p>
      )}

      {confirming && preview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="relative w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-950 shadow-2xl">
            <button
              type="button"
              onClick={() => setConfirming(null)}
              disabled={changePlan.isPending}
              className="absolute right-4 top-4 cursor-pointer rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-1.5 text-sm font-bold">
              Switch to {confirming.name} ({PERIOD_LABEL[confirming.period]})?
            </h3>
            {preview.timing === "now" ? (
              <p className="text-xs leading-relaxed text-neutral-500">
                You&apos;ll get {confirming.name} right away. Your card on file is charged{" "}
                <strong className="text-neutral-900">{formatCents(preview.chargeNow, preview.currency)}</strong> now for the rest of this
                period, then {formatPrice(preview.renewalPrice)} each {PERIOD_UNIT[confirming.period]}.
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-neutral-500">
                You keep your current plan until <strong className="text-neutral-900">{formatDate(preview.effectiveAt)}</strong>, then switch
                to {confirming.name} at {formatPrice(preview.renewalPrice)} each {PERIOD_UNIT[confirming.period]}. Nothing is charged or
                refunded now.
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={changePlan.isPending}
                className="flex-1 cursor-pointer rounded-xl border border-neutral-200 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Keep current plan
              </button>
              <button
                type="button"
                onClick={confirmChange}
                disabled={changePlan.isPending}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-70"
              >
                {changePlan.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {preview.timing === "now" ? `Pay and switch` : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PERIOD_UNIT: Record<BillingPeriod, string> = { weekly: "week", monthly: "month", quarterly: "3 months" };

function formatDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "your next renewal";
}

function formatCents(cents: number, currency: string | null): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency ?? "USD" }).format(cents / 100);
  } catch {
    return formatPrice(cents / 100);
  }
}

/**
 * The Plus Lifetime deal as a plan card — the same shape as Free, Plus and Pro
 * in its own deal colors — centered under them, one column wide. Hidden when
 * it isn't listed.
 */
export function LifetimeDeal({ theme, signedIn, status }: { theme: PlanTheme; signedIn: boolean; status?: SubscriptionStatusResult }) {
  const t = T[theme];
  const { data } = usePricing();
  const purchase = useStartPurchase();
  const pricing = data ?? FALLBACK_PRICING;
  const { offer, limits } = pricing.lifetime;
  // Listed like Plus and Pro: shown with a "Coming soon" button until its Dodo product exists.
  if (!(offer.listed ?? offer.available)) return null;
  const onSale = offer.available;
  const owned = Boolean(status?.hasLifetime);
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const features = [
    `${count(limits.tailor, "tailoring", "tailorings")} a month`,
    `${count(limits.improve, "enhancement", "enhancements")} a month`,
    `${count(limits.create, "new CV", "new CVs")} a month`,
    "Career profiles",
    "Pay once, keep it for as long as gomoxie runs",
  ];

  return (
    <div className="mx-auto mt-6 max-w-6xl">
      {/* One column of the grid above (three columns, 1.5rem gaps). */}
      <div className={`relative mx-auto flex flex-col rounded-3xl border p-8 md:w-[calc((100%-3rem)/3)] ${t.deal}`}>
        <span className="absolute -top-3 left-8 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[11.5px] font-bold uppercase tracking-wide text-neutral-950">
          <InfinityIcon className="h-3.5 w-3.5" /> Limited offer
        </span>
        <div className="flex min-h-[30px] items-center justify-between gap-3">
          <h3 className={`text-[17px] font-semibold ${t.title}`}>Plus Lifetime</h3>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 ${t.dealChip}`}>
            <LifetimeScarcity offer={offer} theme={theme} compact />
          </span>
        </div>
        <div className="mt-12 flex items-baseline gap-1.5">
          <span className={`text-5xl font-bold tracking-tight ${t.title}`}>{formatPrice(pricing.lifetime.price)}</span>
          <span className={`text-[14px] ${t.muted}`}>once</span>
        </div>
        <p className={`mt-1.5 text-[14px] ${t.body}`}>Plus forever, pay once.</p>

        {!signedIn ? (
          <Link href="/signup" onClick={() => saveQuickIntent({ kind: "lifetime" })} className={`${BUTTON} ${t.primary}`}>
            Get Lifetime
            <ArrowRight className="h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : owned ? (
          <span className={`${BUTTON} cursor-default ${t.current}`}>You own it</span>
        ) : (
          <button
            type="button"
            disabled={purchase.isPending || !onSale}
            onClick={() => purchase.mutate({ product: "plus_lifetime" })}
            className={`${BUTTON} ${t.primary}`}
          >
            {purchase.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : onSale && <InfinityIcon className="h-4 w-4" />}
            {purchase.isPending ? "Redirecting..." : onSale ? "Get Lifetime" : "Coming soon"}
          </button>
        )}
        <p className={`mt-2.5 min-h-[18px] text-center text-[12.5px] ${purchase.isError ? t.error : t.muted}`}>
          {purchase.isError
            ? purchase.error instanceof ApiError
              ? purchase.error.message
              : "Could not start checkout."
            : "No subscription"}
        </p>

        <div className={`mt-6 border-t pt-7 ${t.divider}`}>
          <FeatureList items={features} strong theme={theme} />
        </div>
      </div>
    </div>
  );
}
