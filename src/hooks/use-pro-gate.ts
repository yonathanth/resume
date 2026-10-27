"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, type CvUnlockProduct, type PlanTier } from "@/lib/api";

/** Why the backend refused to start a CV, from its 402 PRO_REQUIRED (see entitlement.service.ts). */
export interface PaywallDetails {
  reason: "free_used" | "plan_limit" | "unpaid_cap" | "fair_use" | "feature";
  message: string;
  /** The user may go on and pay for this CV at download. */
  canPayLater: boolean;
  product: CvUnlockProduct;
  price: number;
  tier: PlanTier;
}

function detailsOf(err: ApiError): PaywallDetails {
  const d = err.details;
  const reason = typeof d.reason === "string" ? (d.reason as PaywallDetails["reason"]) : "feature";
  return {
    reason,
    message: err.message,
    canPayLater: d.canPayLater === true,
    product: d.product === "cv_edit" ? "cv_edit" : "cv_new",
    price: typeof d.price === "number" ? d.price : 2.99,
    tier: d.tier === "plus" || d.tier === "pro" ? d.tier : "free",
  };
}

// Shared paywall trigger for every AI CV call site (Create, Tailor, Enhance)
// and paid-only features. The backend is the sole source of truth for limits
// — this hook never counts anything, it only reacts to its PRO_REQUIRED
// rejection. When the user picks "pay at download" on the paywall, the flow's
// step runs again (the `retry` passed with the error) with payLater on.
export function useProGate() {
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywall, setPaywall] = useState<PaywallDetails | null>(null);
  const payLaterRef = useRef(false);
  const retryRef = useRef<(() => void) | null>(null);

  // Returns true (and opens the paywall) if `err` is a PRO_REQUIRED
  // rejection. Callers should check this before falling back to their own
  // generic error message: `if (isProRequired(err, () => runAgain())) return;`.
  const isProRequired = useCallback((err: unknown, retry?: () => void): boolean => {
    if (err instanceof ApiError && err.code === "PRO_REQUIRED") {
      setPaywall(detailsOf(err));
      retryRef.current = retry ?? null;
      setIsPaywallOpen(true);
      return true;
    }
    return false;
  }, []);

  return {
    isPaywallOpen,
    paywall,
    openPaywall: () => {
      setPaywall(null);
      setIsPaywallOpen(true);
    },
    closePaywall: () => setIsPaywallOpen(false),
    isProRequired,
    /** True once the user chose to pay for this flow's CV at download — send it as `payLater`. */
    payLater: () => payLaterRef.current,
    /** Offered only when the backend allows it and the step can be run again. */
    canPayLater: () => Boolean(paywall?.canPayLater && retryRef.current),
    /** "Continue, pay at download": closes the paywall and runs the refused step again. */
    continuePayLater: () => {
      payLaterRef.current = true;
      setIsPaywallOpen(false);
      const retry = retryRef.current;
      retryRef.current = null;
      retry?.();
    },
  };
}
