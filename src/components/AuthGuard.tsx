"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, restoreSession } from "@/lib/api";
import { useMoxieWait } from "@/components/moxie/MoxieWait";
import { CenteredSpinner } from "@/components/CenteredSpinner";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { peekTryHandoff } from "@/lib/try-handoff";

// Client-side gate for signed-in-only pages. The access token lives only in
// memory, so a fresh page load restores it from the httpOnly refresh cookie
// (a 30-day session, renewed whenever it's used). Only a session the server
// refuses sends the user to /login; a network blip offers a retry instead.
// From then on apiFetch refreshes the token before it expires. Coming back
// from Google mid-/try-flow (see lib/try-handoff) the check is a plain
// spinner: Moxie's "Did you know?" would only stand between them and their CV.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "authed" | "offline">("checking");
  const [attempt, setAttempt] = useState(0);
  const hasMounted = useHasMounted();
  const quiet = hasMounted && peekTryHandoff() !== null;
  const wait = useMoxieWait(state === "checking" && !quiet, { label: "Checking you're signed in…", className: "h-screen w-full bg-[#fbfbfb] px-4" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (getAccessToken()) {
        setState("authed");
        return;
      }
      const result = await restoreSession();
      if (cancelled) return;
      if (result.status === "signed_out") {
        router.replace("/login");
        return;
      }
      setState(result.status === "ok" ? "authed" : "offline");
    })();

    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  if (state === "offline") {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-3 bg-[#fbfbfb] text-sm text-neutral-600">
        <p>Couldn&apos;t reach the server. Check your connection.</p>
        <button
          type="button"
          onClick={() => {
            setState("checking");
            setAttempt((n) => n + 1);
          }}
          className="px-3 py-2 rounded-lg border border-neutral-300 bg-white font-semibold cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }

  if (wait.active) return wait.node;
  if (state !== "authed") return quiet ? <CenteredSpinner label="Checking you're signed in…" className="h-screen w-full bg-[#fbfbfb]" /> : null;

  return <>{children}</>;
}
