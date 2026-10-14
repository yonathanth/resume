"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelSubscription,
  changeSubscriptionPlan,
  createCreditCheckout,
  createSubscriptionCheckout,
  getSubscriptionStatus,
  hasSession,
  resumeSubscription,
  type CheckoutProvider,
  type CreditProduct,
  type SubscriptionPlan,
} from "@/lib/api";
import { useHasMounted } from "./use-has-mounted";
import { saveLastChapaPaymentId } from "@/lib/payment-session";

export const SUBSCRIPTION_STATUS_QUERY_KEY = ["subscription-status"] as const;

// The dashboard's single source of truth for Pro access / free-generation
// usage — always read from here, never from a locally-computed guess.
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

// Re-fetches subscription status — call this when the user returns from the
// Polar checkout redirect, since the webhook may not have synced yet and a
// stale cached "not Pro" must not be shown as final.
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

export interface StartProCheckoutInput {
  provider: CheckoutProvider;
  /** Polar only — which tier (weekly $4.99 / monthly $9.99 / quarterly $24.99). Ignored for Chapa. */
  plan?: SubscriptionPlan;
}

// Starts a checkout with the chosen provider/plan (a Polar subscription
// tier, or Chapa's 80 ETB / 1-month one-time local alternative) and
// redirects the browser there. The actual subscription state only updates
// once the payment is confirmed (Polar's webhook, or Chapa's webhook /
// the Chapa return page's re-verify call) — this mutation only gets the
// user to the checkout page.
export function useStartProCheckout() {
  return useMutation({
    mutationFn: ({ provider, plan }: StartProCheckoutInput) => createSubscriptionCheckout(provider, plan),
    onSuccess: ({ checkoutUrl, paymentId }) => {
      if (paymentId) {
        saveLastChapaPaymentId(paymentId);
      }
      window.location.href = checkoutUrl;
    },
  });
}

// Starts a one-time checkout for a pay-per-use credit (one extra Create or
// Tailor generation). Always Polar — see createCreditCheckout.
export function useStartCreditCheckout() {
  return useMutation({
    mutationFn: (product: CreditProduct) => createCreditCheckout(product),
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl;
    },
  });
}

// Schedules cancellation at the end of the current billing period — Pro
// access stays active until then and nothing already paid is refunded (see
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

// Moves the subscription to another tier in place (see changeSubscriptionPlan).
export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: SubscriptionPlan) => changeSubscriptionPlan(plan),
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
