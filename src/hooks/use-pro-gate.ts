"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { ApiError, type CvUnlockProduct, type PlanTier } from "@/lib/api";
import { consumePaidReturn } from "@/lib/payment-session";

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
//
// Buying a plan leaves the page for checkout, so `retry` (a function) is lost.
// A flow can also pass `resume`: a plain description of the refused step that
// it saves with its draft (see flow-drafts), and runs again once it's back
// with the plan paid for (useResumeAfterPayment). Steps that can't be
// described that way (a file the user picked) pass none and simply reopen.
export function useProGate<R = never>() {
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywall, setPaywall] = useState<PaywallDetails | null>(null);
  const [resume, setResume] = useState<R | null>(null);
  const payLaterRef = useRef(false);
  const retryRef = useRef<(() => void) | null>(null);

  // Returns true (and opens the paywall) if `err` is a PRO_REQUIRED
  // rejection. Callers should check this before falling back to their own
  // generic error message: `if (isProRequired(err, () => runAgain())) return;`.
  const isProRequired = useCallback((err: unknown, retry?: () => void, resumeAs?: R): boolean => {
    if (err instanceof ApiError && err.code === "PRO_REQUIRED") {
      setPaywall(detailsOf(err));
      retryRef.current = retry ?? null;
      setResume(resumeAs ?? null);
      setIsPaywallOpen(true);
      return true;
    }
    return false;
  }, []);

  return {
    isPaywallOpen,
    paywall,
    /** The refused step while the paywall is open — save it with the flow's draft. */
    resume,
    openPaywall: () => {
      setPaywall(null);
      setResume(null);
      setIsPaywallOpen(true);
    },
    closePaywall: () => {
      setIsPaywallOpen(false);
      setResume(null);
    },
    isProRequired,
    /** True once the user chose to pay for this flow's CV at download — send it as `payLater`. */
    payLater: () => payLaterRef.current,
    /** Offered only when the backend allows it and the step can be run again. */
    canPayLater: () => Boolean(paywall?.canPayLater && retryRef.current),
    /** "Continue, pay at download": closes the paywall and runs the refused step again. */
    continuePayLater: () => {
      payLaterRef.current = true;
      setIsPaywallOpen(false);
      setResume(null);
      const retry = retryRef.current;
      retryRef.current = null;
      retry?.();
    },
  };
}

/**
 * Back from buying a plan (the return page marked it paid): runs the step the
 * paywall refused — `resume`, restored from the flow's draft — once, as the
 * flow opens. Nothing happens on an ordinary refresh, or without a resume.
 */
export function useResumeAfterPayment<R>(resume: R | null | undefined, run: (resume: R) => void) {
  const onResume = useEffectEvent(run);
  useEffect(() => {
    if (resume && consumePaidReturn()) onResume(resume);
    // Once, when the flow opens (resume is what it was restored with).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
