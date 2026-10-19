"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { MoxieDidYouKnow, ONE_ROUND_MS } from "./MoxieDidYouKnow";

/** Most loads finish before this: she only shows up for a real wait, so she never flashes on and off. */
const SHOW_AFTER_MS = 500;
/** She's let go just before her next fact would start arriving. */
const STAY_AT_LEAST_MS = ONE_ROUND_MS - 250;

interface MoxieWaitOptions {
  /** Announced to screen readers. */
  label?: string;
  /** A quiet line under her, saying what's loading. */
  caption?: string;
  crowned?: boolean;
  className?: string;
}

/**
 * Waiting while someone signs in (coming back from Google, and the sign-in
 * check before the dashboard), with Moxie presenting a "Did you know?" card.
 * Only there: every other page or section wait is a plain CenteredSpinner. A load that's done within half a second shows nothing.
 * Once she's up, she stays for one full round — intro and a fact — even if
 * the load finishes first, with a Continue button to skip the rest; then she
 * closes herself.
 *
 *   const wait = useMoxieWait(isLoading, { label: "Loading your profiles…" });
 *   if (wait.active) return wait.node;
 */
export function useMoxieWait(loading: boolean, options: MoxieWaitOptions = {}) {
  // When she showed up for this wait (null: not shown, or let go).
  const [shownAt, setShownAt] = useState<number | null>(null);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setShownAt(Date.now()), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  // Loaded: she finishes her round, then goes.
  useEffect(() => {
    if (loading || shownAt === null) return;
    const timer = setTimeout(() => setShownAt(null), Math.max(0, shownAt + STAY_AT_LEAST_MS - Date.now()));
    return () => clearTimeout(timer);
  }, [loading, shownAt]);

  const active = loading || shownAt !== null;
  const node = active ? <MoxieWait {...options} shown={shownAt !== null} ready={!loading} onSkip={() => setShownAt(null)} /> : null;
  return { active, node };
}

function MoxieWait({
  label = "Loading…",
  caption,
  crowned = false,
  className = "",
  shown,
  ready,
  onSkip,
}: MoxieWaitOptions & { shown: boolean; ready: boolean; onSkip: () => void }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <p role="status" className="sr-only">
        {ready ? "Ready." : label}
      </p>
      {shown && (
        <div className="moxie-overlay-in flex flex-col items-center">
          <MoxieDidYouKnow crowned={crowned} />
          {/* Loading or done, the line under her keeps its height, so the Continue button doesn't shift her. */}
          <div className="mt-6 flex min-h-9 items-center justify-center">
            {ready ? (
              <button
                type="button"
                onClick={onSkip}
                className="moxie-continue-in inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-sm font-semibold text-neutral-800 shadow-sm transition-colors hover:border-neutral-400 hover:text-neutral-950 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 focus-visible:border-accent"
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              caption && <p className="text-sm text-neutral-500">{caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
