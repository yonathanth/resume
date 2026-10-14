"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, refreshAccessToken } from "@/lib/api";
import { saveQuickIntent, type QuickIntent } from "@/lib/quick-links";

/** Signed out, where a link's flow can be tried without an account (see /try). */
function tryPath(intent: QuickIntent): string | null {
  if (intent.kind === "template") return `/try/create?template=${encodeURIComponent(intent.templateId)}`;
  if (intent.kind === "pro") return null; // nothing to try: upgrading needs an account
  return `/try/${intent.kind}`;
}

/**
 * Signed in → into the dashboard, which opens the intent. Signed out → the
 * flow right away on its /try page, asking for an account only when the AI is
 * about to run; or, for Pro, sign up first and the dashboard opens it after.
 */
export function QuickLinkRedirect({ intent }: { intent: QuickIntent }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getAccessToken() ?? (await refreshAccessToken());
      if (cancelled) return;
      const tryIt = token ? null : tryPath(intent);
      if (tryIt) {
        router.replace(tryIt);
        return;
      }
      saveQuickIntent(intent);
      router.replace(token ? "/dashboard" : "/signup");
    })();
    return () => {
      cancelled = true;
    };
  }, [intent, router]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#fbfbfb]">
      <div className="h-6 w-6 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
    </div>
  );
}
