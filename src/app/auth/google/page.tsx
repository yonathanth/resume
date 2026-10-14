"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearAccessToken, refreshAccessToken } from "@/lib/api";
import { isOwnPopup, reportToOpener } from "@/lib/google-popup";

// Where the backend's Google callback sends the browser. It has set the
// refresh cookie; trade it for an access token and continue to the dashboard —
// or, in the sign-up pop-up's Google window, report back to the page that
// opened it (which carries on from there) and close.
export default function GoogleAuthCompletePage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Drop any token left over from a previous account on this browser.
      clearAccessToken();
      const token = await refreshAccessToken();
      if (cancelled) return;
      if (isOwnPopup()) {
        reportToOpener({ ok: Boolean(token) });
        return;
      }
      router.replace(token ? "/dashboard" : "/login?error=GOOGLE_SIGN_IN_FAILED");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0a]">
      <div className="h-6 w-6 rounded-full border-2 border-neutral-700 border-t-white animate-spin" />
    </div>
  );
}
