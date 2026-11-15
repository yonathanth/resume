"use client";

import React, { useEffect, useState } from "react";
import { useHasMounted } from "@/hooks/use-has-mounted";

/** Long enough that the wait has started to feel like a wait — not the first thing anyone reads. */
const SHOW_AFTER_MS = 4000;

function isTouchScreen(): boolean {
  try {
    return window.matchMedia("(hover: none), (pointer: coarse)").matches;
  } catch {
    // Older browsers without matchMedia: the mouse wording still makes sense.
    return false;
  }
}

/**
 * A quiet line under a ticklish Moxie saying she can be played with: double-tap
 * on touch screens, double-click or wiggle the cursor with a mouse (see
 * Moxie's `ticklish`). Fades in after a few seconds of waiting and goes away
 * for good once she's been tickled — by then they know.
 */
export function MoxieTickleHint({ tickled, className = "" }: { tickled: boolean; className?: string }) {
  const [visible, setVisible] = useState(false);
  // Decided after mount, so the server render and the first client render agree.
  const mounted = useHasMounted();
  const touch = mounted && isTouchScreen();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  if (tickled || !mounted) return null;
  return (
    <p
      aria-hidden="true"
      className={`text-xs text-neutral-400 transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"} ${className}`}
    >
      {touch ? "Psst… Moxie is ticklish. Double-tap her!" : "Psst… Moxie is ticklish. Double-click her, or wiggle your cursor over her."}
    </p>
  );
}
