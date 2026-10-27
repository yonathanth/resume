import type { BillingPeriod, CvFlowType, PaidTier, PricingCatalog } from "@/lib/api";

// Plan copy shared by the pricing page, the upgrade page and the paywalls.
// Numbers come from GET /api/v1/pricing (usePricing) — FALLBACK_PRICING only
// fills the first render, and matches the backend's defaults.

export const PERIODS: BillingPeriod[] = ["weekly", "monthly", "quarterly"];

export const PERIOD_LABEL: Record<BillingPeriod, string> = { weekly: "Weekly", monthly: "Monthly", quarterly: "3 months" };
/** "/ week" style suffix for a price. */
export const PERIOD_SUFFIX: Record<BillingPeriod, string> = { weekly: "/ week", monthly: "/ month", quarterly: "/ 3 months" };
/** "a week" style phrase for limits. */
export const PERIOD_PHRASE: Record<BillingPeriod | "lifetime", string> = {
  weekly: "a week",
  monthly: "a month",
  quarterly: "every 3 months",
  lifetime: "every month",
};

export const TIER_LABEL: Record<PaidTier, string> = { plus: "Plus", pro: "Pro" };

export const FALLBACK_PRICING: PricingCatalog = {
  currency: "USD",
  free: { generations: 1, unpaidCvCap: 3 },
  plans: {
    plus: {
      weekly: { price: 3.99, available: true },
      monthly: { price: 7.99, available: true },
      quarterly: { price: 19.99, available: true },
    },
    pro: {
      weekly: { price: 6.99, available: true },
      monthly: { price: 14.99, available: true },
      quarterly: { price: 34.99, available: true },
    },
  },
  plusLimits: {
    weekly: { create: 3, tailor: 10, improve: 6 },
    monthly: { create: 8, tailor: 30, improve: 20 },
    quarterly: { create: 25, tailor: 100, improve: 65 },
  },
  lifetime: {
    price: 79,
    limits: { create: 5, tailor: 20, improve: 12 },
    offer: { available: false, display: "seats", endsAt: null, soldOut: false, ended: false },
  },
  payPerCv: { cv_new: { price: 2.99, available: true }, cv_edit: { price: 1.99, available: true } },
};

export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2).replace(/\.00$/, "")}`;
}

/** The cheapest way in to a plan — "from $3.99 / week". */
export function fromPrice(pricing: PricingCatalog, tier: PaidTier): { price: string; suffix: string } {
  return { price: formatPrice(pricing.plans[tier].weekly.price), suffix: PERIOD_SUFFIX.weekly };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "30 tailorings, 20 enhancements and 8 new CVs" */
export function describeLimits(limits: Record<CvFlowType, number>): string {
  return `${plural(limits.tailor, "tailoring", "tailorings")}, ${plural(limits.improve, "enhancement", "enhancements")} and ${plural(limits.create, "new CV", "new CVs")}`;
}

/** Feature bullets for a plan card, from the live numbers. */
export function planFeatures(pricing: PricingCatalog, tier: "free" | PaidTier, period: BillingPeriod): string[] {
  if (tier === "free") {
    return [
      `${pricing.free.generations === 1 ? "1 free AI CV" : `${pricing.free.generations} free AI CVs`}: new, tailored or improved`,
      "Every template and the full editor",
      `Then pay per CV: ${formatPrice(pricing.payPerCv.cv_new.price)} new, ${formatPrice(pricing.payPerCv.cv_edit.price)} tailored or improved`,
      "Pay only when you download",
    ];
  }
  if (tier === "plus") {
    const l = pricing.plusLimits[period];
    return [
      `${plural(l.tailor, "tailoring", "tailorings")} ${PERIOD_PHRASE[period]}`,
      `${plural(l.improve, "enhancement", "enhancements")} ${PERIOD_PHRASE[period]}`,
      `${plural(l.create, "new CV", "new CVs")} ${PERIOD_PHRASE[period]}`,
      "Career profiles",
      "Download every CV",
    ];
  }
  return [
    "Unlimited tailorings",
    "Unlimited enhancements",
    "Unlimited new CVs",
    "Career profiles",
    "AI polish to push your CV score up",
  ];
}

/** Whole days, hours, minutes and seconds left until `endsAt` (all 0 once it's passed). */
export function timeLeft(endsAt: string, now: number): { days: number; hours: number; minutes: number; seconds: number; over: boolean } {
  const ms = Math.max(0, new Date(endsAt).getTime() - now);
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    over: ms === 0,
  };
}
