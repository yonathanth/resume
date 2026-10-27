"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelSubscription,
  changeSubscriptionPlan,
  createPurchaseCheckout,
  createSubscriptionCheckout,
  getPricing,
  getSubscriptionStatus,
  hasSession,
  resumeSubscription,
  type BillingPeriod,
  type OneTimePurchase,
  type PaidTier,
} from "@/lib/api";
import { useHasMounted } from "./use-has-mounted";
import { savePendingPurchase } from "@/lib/payment-session";

export const SUBSCRIPTION_STATUS_QUERY_KEY = ["subscription-status"] as const;
export const PRICING_QUERY_KEY = ["pricing"] as const;

// The dashboard's single source of truth for the plan and its usage —
// always read from here, never from a locally-computed guess.
// Gated on useHasMounted (not `typeof window !== "undefined"` directly) so
// the query's enabled/loading state is identical between the server render
// and the client's first hydration pass — it only flips on in an effect
// after hydration, avoiding a text mismatch in whatever renders based on
// `isLoading`/`data`.
export function useSubscriptionStatus() {
  const hasMounted = useHasMounted();
  return useQuery({
    queryKey: SUBSCRIPTION_STATUS_QUERY_KEY,
    queryFn: getSubscriptionStatus,
    enabled: hasMounted && hasSession(),
  });
}

// The public price list (prices, Plus limits, the lifetime deal, pay per CV).
// Signed out too — the pricing page shows it to everyone.
export function usePricing() {
  return useQuery({ queryKey: PRICING_QUERY_KEY, queryFn: getPricing, staleTime: 5 * 60 * 1000 });
}

// Re-fetches subscription status — call this when the user returns from the
// Polar checkout redirect, since the webhook may not have synced yet and a
// stale cached "Free" must not be shown as final.
export function useRefreshSubscriptionStatus() {
  const queryClient = useQueryClient();
  // Stable identity — callers (e.g. the Polar return page) put this in a
  // useEffect dependency array, and a new function on every render would
  // otherwise re-trigger that effect needlessly.
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_STATUS_QUERY_KEY }),
    [queryClient]
  );
}

export interface StartCheckoutInput {
  tier: PaidTier;
  period: BillingPeriod;
}

// Starts a Plus / Pro subscription checkout and sends the browser there. The
// plan only changes once Polar's webhook confirms the payment — this only
// gets the user to the checkout page.
export function useStartProCheckout() {
  return useMutation({
    mutationFn: ({ tier, period }: StartCheckoutInput) => createSubscriptionCheckout(tier, period),
    onSuccess: ({ checkoutUrl }, { tier }) => {
      savePendingPurchase({ kind: "plan", tier });
      window.location.href = checkoutUrl;
    },
  });
}

// Starts a one-time checkout: Plus Lifetime, or unlocking one CV's download.
export function useStartPurchase() {
  return useMutation({
    mutationFn: (purchase: OneTimePurchase) => createPurchaseCheckout(purchase),
    onSuccess: ({ checkoutUrl }, purchase) => {
      savePendingPurchase(
        purchase.product === "cv_unlock" ? { kind: "unlock", cvDocumentId: purchase.cvDocumentId } : { kind: "lifetime" }
      );
      window.location.href = checkoutUrl;
    },
  });
}

// Schedules cancellation at the end of the current billing period — the plan
// stays active until then and nothing already paid is refunded (see
// cancelSubscription's doc comment). Updates the cached status immediately
// with the backend's response rather than waiting on a refetch.
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: (status) => {
      queryClient.setQueryData(SUBSCRIPTION_STATUS_QUERY_KEY, status);
    },
  });
}

// Moves the subscription to another plan or period in place (see changeSubscriptionPlan).
export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tier, period }: StartCheckoutInput) => changeSubscriptionPlan(tier, period),
    onSuccess: (status) => {
      queryClient.setQueryData(SUBSCRIPTION_STATUS_QUERY_KEY, status);
    },
  });
}

// Reverses a pending cancel-at-period-end — the subscription goes back to
// renewing normally.
export function useResumeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resumeSubscription,
    onSuccess: (status) => {
      queryClient.setQueryData(SUBSCRIPTION_STATUS_QUERY_KEY, status);
    },
  });
}
