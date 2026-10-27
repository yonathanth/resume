"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAccessToken, refreshAccessToken } from "@/lib/api";
import { isOwnPopup, reportToOpener } from "@/lib/google-popup";
import { peekTryHandoff } from "@/lib/try-handoff";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { useMoxieWait } from "@/components/moxie/MoxieWait";
import { CenteredSpinner } from "@/components/CenteredSpinner";

// Where the backend's Google callback sends the browser. It has set the
// refresh cookie; trade it for an access token and continue to the dashboard —
// or, in the sign-up pop-up's Google window, report back to the page that
// opened it (which carries on from there) and close. If Moxie showed up for
// the wait, the dashboard waits for her to finish her round (or Continue).
// Signing in from the middle of a /try flow (the pop-up, or this whole tab
// when the pop-up was blocked) is a quiet spinner instead: they're mid-task,
// and her "Did you know?" would only hold them up.
export default function GoogleAuthCompletePage() {
  const router = useRouter();
  // Where to go once signed in; loading until it's known.
  const [next, setNext] = useState<string | null>(null);
  // Read once mounted (window / sessionStorage), so the server render matches the first client one.
  const hasMounted = useHasMounted();
  const quiet = hasMounted && (isOwnPopup() || peekTryHandoff() !== null);
  const wait = useMoxieWait(next === null && hasMounted && !quiet, {
    label: "Signing you in with Google…",
    className: "h-screen w-full bg-[#fbfbfb] px-4",
  });

  useEffect(() => {
    if (next && !wait.active) router.replace(next);
  }, [next, wait.active, router]);

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
      // A failure goes straight to the error; success waits for Moxie's round, if she's up.
      if (token) setNext("/dashboard");
      else router.replace("/login?error=GOOGLE_SIGN_IN_FAILED");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (wait.node) return wait.node;
  return quiet ? (
    <CenteredSpinner label="Signing you in with Google…" className="h-screen w-full bg-[#fbfbfb]" />
  ) : (
    <div className="h-screen w-full bg-[#fbfbfb]" />
  );
}
