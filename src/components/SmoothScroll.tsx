"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * The public, read-through pages, where the mouse wheel glides instead of
 * stepping. Not the dashboard or the editor (they scroll inner panels, and
 * it'd fight them — and slow down people at work), nor the short sign-in pages.
 */
const SMOOTH_PAGES = new Set(["/", "/pricing", "/templates", "/how-it-works", "/help", "/privacy", "/terms"]);

/**
 * Smooth (eased) wheel scrolling on the public pages, via Lenis. Touch keeps
 * its native scrolling (already smooth), anything that scrolls on its own
 * (the phone menu) and anything in a dialog keep theirs, in-page links glide
 * to their section, and it's off for reduced motion. Mounted once, in the
 * root layout; does nothing on any other page.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const reducedMotion = usePrefersReducedMotion();
  const enabled = SMOOTH_PAGES.has(pathname) && !reducedMotion;

  // A fresh one per page, so it starts from wherever the new page opens (the top, or its #section).
  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({
      autoRaf: true,
      // Gentle: eases to a stop rather than drifting on.
      lerp: 0.11,
      anchors: true,
      allowNestedScroll: true,
      prevent: (node) => node.closest('[role="dialog"]') !== null,
    });
    return () => lenis.destroy();
  }, [enabled, pathname]);

  return null;
}
