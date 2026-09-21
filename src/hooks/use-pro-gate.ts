"use client";

import { useCallback, useState } from "react";
import { ApiError } from "@/lib/api";

// Shared paywall trigger for every AI CV-generation call site (Create,
// Tailor, Enhance). The backend is the sole source of truth for the 3-free-
// generation limit — this hook never counts or decides anything itself, it
// only reacts to the PRO_REQUIRED rejection the backend throws once a free
// user's generations are spent.
export function useProGate() {
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  // Returns true (and opens the paywall) if `err` is a PRO_REQUIRED
  // rejection. Callers should check this before falling back to their own
  // generic error message: `if (isProRequired(err)) return;`.
  const isProRequired = useCallback((err: unknown): boolean => {
    if (err instanceof ApiError && err.code === "PRO_REQUIRED") {
      setIsPaywallOpen(true);
      return true;
    }
    return false;
  }, []);

  return {
    isPaywallOpen,
    openPaywall: () => setIsPaywallOpen(true),
    closePaywall: () => setIsPaywallOpen(false),
    isProRequired,
  };
}
