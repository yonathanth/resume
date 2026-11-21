"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getCvDocument, getSubscriptionStatus, planTier } from "@/lib/api";
import { clearPendingPurchase, readPendingPurchase, type PendingPurchase } from "@/lib/payment-session";
import { useRefreshSubscriptionStatus } from "@/hooks/use-subscription";
import { PAYMENT_CONFIRMED_REDIRECT_MS, PaymentReturnView, type PaymentReturnState } from "@/components/PaymentReturnView";

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 6; // ~9s before giving up and sending the user on anyway

// Dodo adds the payment's outcome to the return URL (?status=succeeded |
// failed | cancelled | ...). Read once on the client; null while prerendering.
const subscribeNever = () => () => {};
const readOutcome = () => new URLSearchParams(window.location.search).get("status");

// This is DODO_CHECKOUT_RETURN_URL's target — Dodo lands the browser here
// after checkout regardless of outcome. It never assumes success itself:
// the backend/webhook is the sole source of truth for subscription state, so
// this polls GET /api/v1/subscriptions/status until it reflects Pro access
// (or gives up and sends the user on anyway — the dashboard will pick up the
// real status as soon as the webhook lands).
export default function DodoReturnPage() {
  const router = useRouter();
  const refreshStatus = useRefreshSubscriptionStatus();
  const [state, setState] = useState<PaymentReturnState>("pending");
  const outcome = useSyncExternalStore(subscribeNever, readOutcome, () => null);
  const failed = outcome === "failed" || outcome === "cancelled";

  useEffect(() => {
    // No ref-based "already started" guard here — that would break React
    // Strict Mode's dev-only mount->cleanup->mount replay: the throwaway
    // first invocation would set the guard and get torn down (cancelled)
    // by the cleanup, and the real second invocation would then see the
    // guard already set and never start a loop at all, leaving the page
    // stuck on "pending" forever. Each effect invocation gets its own
    // `cancelled` closure instead, so the replay's cleanup only cancels
    // that invocation's own (throwaway) loop.
    let cancelled = false;

    // What the checkout was for (saved before leaving for Dodo).
    const pending: PendingPurchase | null = readPendingPurchase();
    // An unlocked CV goes straight back to its editor, to download it.
    const destination = pending?.kind === "unlock" ? `/dashboard/editor/${encodeURIComponent(pending.cvDocumentId)}` : "/dashboard";
    const goToDashboard = (delayMs: number) => {
      setTimeout(() => {
        if (!cancelled) {
          clearPendingPurchase();
          router.replace(destination);
        }
      }, delayMs);
    };

    // A failed or abandoned payment needs no polling: send them back to try
    // again (the editor for a CV, the upgrade page for a plan).
    if (failed) {
      setTimeout(() => {
        if (!cancelled) {
          clearPendingPurchase();
          router.replace(pending?.kind === "unlock" ? destination : "/dashboard/upgrade");
        }
      }, 3500);
      return () => {
        cancelled = true;
      };
    }

    const isDone = async (): Promise<boolean> => {
      if (pending?.kind === "unlock") return Boolean((await getCvDocument(pending.cvDocumentId)).unlockedAt);
      const status = await getSubscriptionStatus();
      if (pending?.kind === "lifetime") return Boolean(status.hasLifetime);
      const tier = planTier(status);
      if (pending?.kind === "plan" && pending.tier === "pro") return tier === "pro";
      return tier !== "free";
    };

    const poll = async () => {
      for (let attempt = 0; attempt < MAX_POLLS && !cancelled; attempt++) {
        try {
          if (await isDone()) {
            if (cancelled) return;
            setState("confirmed");
            refreshStatus();
            goToDashboard(PAYMENT_CONFIRMED_REDIRECT_MS);
            return;
          }
        } catch {
          // A transient failure here shouldn't block the user — just keep polling.
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
      if (cancelled) return;
      setState("timeout");
      refreshStatus();
      goToDashboard(1500);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [router, refreshStatus, failed]);

  return <PaymentReturnView state={failed ? "failed" : state} />;
}
