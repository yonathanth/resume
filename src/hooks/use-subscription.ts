"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelSubscription,
  createSubscriptionCheckout,
  getAccessToken,
  getSubscriptionStatus,
  resumeSubscription,
} from "@/lib/api";
import { useHasMounted } from "./use-has-mounted";

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
    enabled: hasMounted && !!getAccessToken(),
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

// Starts the $5/month Pro checkout and redirects the browser to Polar. The
// actual subscription state only updates once Polar's webhook reaches the
// backend — this mutation only gets the user to the checkout page.
export function useStartProCheckout() {
  return useMutation({
    mutationFn: createSubscriptionCheckout,
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
