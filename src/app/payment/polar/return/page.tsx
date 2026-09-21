"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { getSubscriptionStatus } from "@/lib/api";
import { useRefreshSubscriptionStatus } from "@/hooks/use-subscription";

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 6; // ~9s before giving up and sending the user on anyway

// This is POLAR_CHECKOUT_RETURN_URL's target — Polar lands the browser here
// after checkout regardless of outcome. It never assumes success itself:
// the backend/webhook is the sole source of truth for subscription state, so
// this polls GET /api/v1/subscriptions/status until it reflects Pro access
// (or gives up and sends the user on anyway — the dashboard will pick up the
// real status as soon as the webhook lands).
export default function PolarReturnPage() {
  const router = useRouter();
  const refreshStatus = useRefreshSubscriptionStatus();
  const [state, setState] = useState<"pending" | "confirmed" | "timeout">("pending");

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

    const goToDashboard = (delayMs: number) => {
      setTimeout(() => {
        if (!cancelled) router.replace("/dashboard");
      }, delayMs);
    };

    const poll = async () => {
      for (let attempt = 0; attempt < MAX_POLLS && !cancelled; attempt++) {
        try {
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
              This can take a moment — we&apos;ll update your account as soon as it&apos;s confirmed.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="w-6 h-6 text-neutral-400 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-neutral-500">Confirming your subscription...</p>
          </>
        )}
      </div>
    </div>
  );
}
