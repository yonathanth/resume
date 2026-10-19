import React from "react";
import { Loader2 } from "lucide-react";

/**
 * The plain wait for a page or a section: a small spinner in the middle of
 * its space, with an optional quiet line under it. (Moxie only takes over the
 * longer, one-off waits — see moxie/MoxieWait.)
 *
 *   if (isLoading) return <CenteredSpinner label="Loading this profile…" className="py-24" />;
 */
export function CenteredSpinner({
  label = "Loading…",
  caption,
  className = "",
}: {
  /** Announced to screen readers. */
  label?: string;
  /** Shown under the spinner. */
  caption?: string;
  className?: string;
}) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-3 text-neutral-400 ${className}`}>
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      {caption ? <p className="text-sm text-neutral-500">{caption}</p> : <span className="sr-only">{label}</span>}
    </div>
  );
}
