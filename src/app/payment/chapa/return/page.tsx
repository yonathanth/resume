"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPaymentStatus, getSubscriptionStatus } from "@/lib/api";
import { useRefreshSubscriptionStatus } from "@/hooks/use-subscription";
import { PAYMENT_CONFIRMED_REDIRECT_MS, PaymentReturnView, type PaymentReturnState } from "@/components/PaymentReturnView";
import { readAndClearLastChapaPaymentId } from "@/lib/payment-session";

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 6; // ~9s before giving up and sending the user on anyway

// This is CHAPA_RETURN_URL's target — Chapa lands the browser here after a
// FitCV Pro checkout, regardless of outcome. It never assumes success
// itself: unlike Polar, Chapa's payment confirmation is only finalized by
// GET /api/v1/payments/:id/status actually re-verifying against Chapa (the
// same call that grants the 1-month Pro period on success — see the
// backend's verifyAndSyncPayment/grantChapaProPeriod), so this explicitly
// re-verifies the payment recorded before redirecting (via sessionStorage,
// since CHAPA_RETURN_URL has no template placeholder for the payment id),
// then polls subscription status until it reflects Pro access.
export default function ChapaReturnPage() {
  const router = useRouter();
  const refreshStatus = useRefreshSubscriptionStatus();
  const [state, setState] = useState<PaymentReturnState>("pending");

  useEffect(() => {
    // No ref-based "already started" guard — see polar/return/page.tsx's
    // identical comment for why that breaks React Strict Mode's dev replay.
    let cancelled = false;

    const goToDashboard = (delayMs: number) => {
      setTimeout(() => {
        if (!cancelled) router.replace("/dashboard");
      }, delayMs);
    };

    const poll = async () => {
      const paymentId = readAndClearLastChapaPaymentId();

      for (let attempt = 0; attempt < MAX_POLLS && !cancelled; attempt++) {
        try {
          if (paymentId) {
            // Forces the actual Chapa re-verify + fulfillment — don't just
            // passively wait on the webhook.
            await getPaymentStatus(paymentId);
          }
          const status = await getSubscriptionStatus();
          if (status.isPro) {
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
  }, [router, refreshStatus]);

  return <PaymentReturnView state={state} />;
}
