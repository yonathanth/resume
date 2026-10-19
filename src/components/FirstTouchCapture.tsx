"use client";

import { useEffect } from "react";
import { captureFirstTouch } from "@/lib/analytics";

/**
 * Remembers how this browser first arrived (utm_* params, referring site,
 * landing page) so onboarding can send it once — see lib/analytics. Mounted
 * once in the root layout; renders nothing.
 */
export function FirstTouchCapture() {
  useEffect(() => {
    captureFirstTouch();
  }, []);
  return null;
}
