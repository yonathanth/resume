"use client";

import { useEffect, useState } from "react";

// True only once the client has mounted. The server and the client's very
// first render both see `false`, so anything gated on this (e.g. whether a
// query is `enabled` based on a browser-only localStorage token) renders
// identically during hydration — it only flips to `true` in an effect,
// which runs after hydration completes, so the resulting UI change is a
// normal client-side update rather than a hydration mismatch.
export function useHasMounted(): boolean {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  return hasMounted;
}
