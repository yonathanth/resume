"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, restoreSession } from "@/lib/api";

// Client-side gate for signed-in-only pages. The access token lives only in
// memory, so a fresh page load restores it from the httpOnly refresh cookie
// (a 30-day session, renewed whenever it's used). Only a session the server
// refuses sends the user to /login; a network blip offers a retry instead.
// From then on apiFetch refreshes the token before it expires.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "authed" | "offline">("checking");
  const [attempt, setAttempt] = useState(0);

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

  if (state !== "authed") {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#fbfbfb]">
        <div className="h-6 w-6 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
