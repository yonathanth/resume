"use client";

import { useCallback, useEffect, useState } from "react";

// A seconds countdown for buttons the backend rate-limits (e.g. resending the
// confirmation email: one per minute). `start(seconds)` begins it;
// `secondsLeft` reaches 0 when the button can be used again.
export function useCooldown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (until === 0) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  const start = useCallback((seconds: number) => {
    const t = Date.now();
    setNow(t);
    setUntil(t + seconds * 1000);
  }, []);

  return { secondsLeft: Math.max(0, Math.ceil((until - now) / 1000)), start };
}
