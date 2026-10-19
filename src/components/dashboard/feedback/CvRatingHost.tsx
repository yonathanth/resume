"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getActivation, type RatingTrigger } from "@/lib/api";
import { onCvDownloaded, peekLeftEditor, takeLeftEditor } from "@/lib/cv-rating";
import { ACTIVATION_QUERY_KEY, usePromptAction } from "@/hooks/use-activation";
import { CvRatingModal } from "./CvRatingModal";

// Asked at most once per browser tab session, whichever moment comes first:
// skipping after a download doesn't bring it straight back when they leave the editor.
let askedThisSession = false;

/** A beat after landing back on the dashboard, so the page is there behind the question. */
const AFTER_EDITOR_DELAY_MS = 400;

const PROMPT_FOR: Record<RatingTrigger, "cv_rating_exit" | "cv_rating_download"> = {
  editor_exit: "cv_rating_exit",
  download: "cv_rating_download",
};

/**
 * Asks "How did your CV turn out?" at two moments:
 *   - leaving the editor (Back or Done) once they have their first CV
 *   - right after a PDF download (from the editor or a resume card)
 * Each moment asks at most once per account, and neither asks again once
 * they've rated (all kept on the server, so it holds on every device).
 * Mounted once in the dashboard layout, on every dashboard page and the
 * editor. `onBusyChange` tells the layout to hold other prompts (the tour
 * offer) back while it's open.
 */
export function CvRatingHost({ onBusyChange }: { onBusyChange?: (busy: boolean) => void }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  // mutate is stable, so the triggers below don't re-subscribe on every render.
  const { mutate: promptMutate } = usePromptAction();
  const [open, setOpen] = useState<{ trigger: RatingTrigger; cvDocumentId: string | null } | null>(null);
  // Just back from the editor: busy from the first render, so the tour offer doesn't flash up before the question.
  // (Only rendered in the browser, under AuthGuard, so sessionStorage can be read here.)
  const [checking, setChecking] = useState(() => peekLeftEditor());
  const busyRef = useRef(false);

  useEffect(() => {
    onBusyChange?.(checking || open !== null);
  }, [checking, open, onBusyChange]);

  const consider = useCallback(
    async (trigger: RatingTrigger, cvDocumentId: string | null) => {
      if (askedThisSession || busyRef.current) return;
      busyRef.current = true;
      try {
        const activation = await queryClient.fetchQuery({ queryKey: ACTIVATION_QUERY_KEY, queryFn: getActivation, staleTime: 0 });
        const rated = Boolean(activation.prompts.cv_rating?.completedAt);
        const askedHere = Boolean(activation.prompts[PROMPT_FOR[trigger]]?.shownAt);
        if (rated || askedHere || !activation.steps.firstCv) return;
        askedThisSession = true;
        promptMutate({ key: PROMPT_FOR[trigger], action: "shown" });
        setOpen({ trigger, cvDocumentId });
      } catch {
        // Couldn't check: just don't ask this time.
      } finally {
        busyRef.current = false;
      }
    },
    [queryClient, promptMutate]
  );

  // Right after a download.
  useEffect(() => onCvDownloaded((id) => void consider("download", id)), [consider]);

  // Landed on a page after leaving the editor: asked once the page has drawn.
  useEffect(() => {
    if (pathname.startsWith("/dashboard/editor/")) return;
    const timer = setTimeout(async () => {
      const left = takeLeftEditor();
      if (left !== null) await consider("editor_exit", left || null);
      setChecking(false);
    }, AFTER_EDITOR_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pathname, consider]);

  if (!open) return null;
  return (
    <CvRatingModal
      cvDocumentId={open.cvDocumentId}
      trigger={open.trigger}
      onRated={() => promptMutate({ key: "cv_rating", action: "completed" })}
      onSkipped={() => promptMutate({ key: "cv_rating", action: "dismissed" })}
      onClose={() => setOpen(null)}
    />
  );
}
