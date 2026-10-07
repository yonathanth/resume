"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, refreshAccessToken } from "@/lib/api";

// Client-side gate for signed-in-only pages. The access token lives in
// localStorage, so this can only run after mount. With no stored token it
// tries the httpOnly refresh cookie once before sending the user to /login.
// An expired stored token is handled by apiFetch's own 401 → refresh →
// redirect flow on the first real request.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = getAccessToken() ?? (await refreshAccessToken());
      if (cancelled) return;
      if (!token) {
        router.replace("/login");
        return;
      }
      setIsAuthed(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!isAuthed) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#fbfbfb]">
        <div className="h-6 w-6 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
