"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { getPaymentStatus, getSubscriptionStatus } from "@/lib/api";
import { useRefreshSubscriptionStatus } from "@/hooks/use-subscription";
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
  const [state, setState] = useState<"pending" | "confirmed" | "timeout">("pending");

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
            goToDashboard(1200);
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

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#f5f5f7] px-4">
      <div className="text-center max-w-sm">
        {state === "confirmed" ? (
          <>
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-neutral-900">You&apos;re on FitCV Pro</p>
            <p className="text-xs text-neutral-500 mt-1">Redirecting to your dashboard...</p>
          </>
        ) : state === "timeout" ? (
          <>
            <Loader2 className="w-6 h-6 text-neutral-400 mx-auto mb-3 animate-spin" />
            <p className="text-sm font-semibold text-neutral-900">Still confirming your payment</p>
            <p className="text-xs text-neutral-500 mt-1">
              This can take a moment. We&apos;ll update your account as soon as it&apos;s confirmed.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="w-6 h-6 text-neutral-400 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-neutral-500">Confirming your payment...</p>
          </>
        )}
      </div>
    </div>
  );
}
