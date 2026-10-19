"use client";

import React, { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Compass, X } from "lucide-react";
import { useActivation, usePromptAction } from "@/hooks/use-activation";
import { track } from "@/lib/analytics";

/**
 * "Want a quick tour?", offered once someone has their first CV — when the
 * pages the tour points at have something in them. Shown until they take it
 * or say no (recorded on the server, so it doesn't come back on another
 * device). `ready` is false while anything else is over the dashboard; it
 * also waits while a flow is open on the Builder (?flow=…). Uses the URL, so
 * render it inside a Suspense boundary.
 */
export function TourOffer({ ready: readyProp, onStartTour }: { ready: boolean; onStartTour: () => void }) {
  const flowOpen = Boolean(useSearchParams().get("flow"));
  const ready = readyProp && !flowOpen;
  const { data: activation } = useActivation(ready);
  const promptAction = usePromptAction();
  const prompt = activation?.prompts.tour_offer;
  const visible = ready && Boolean(activation?.steps.firstCv) && !prompt?.dismissedAt && !prompt?.completedAt;

  const markedShown = useRef(false);
  useEffect(() => {
    if (!visible || markedShown.current || prompt?.shownAt) return;
    markedShown.current = true;
    promptAction.mutate({ key: "tour_offer", action: "shown" });
  }, [visible, prompt?.shownAt, promptAction]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="tour-offer-title"
      className="toast-enter fixed bottom-4 right-4 left-4 sm:left-auto z-40 sm:w-[340px] rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_12px_32px_-12px_rgba(15,17,21,0.35)]"
    >
      <button
        type="button"
        onClick={() => promptAction.mutate({ key: "tour_offer", action: "dismissed" })}
        title="No thanks"
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-accent-soft border border-accent-border text-accent-strong">
          <Compass className="w-[18px] h-[18px]" />
        </span>
        <div className="min-w-0">
          <p id="tour-offer-title" className="text-sm font-semibold text-neutral-950">
            Nice, your first CV is done
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-neutral-500">
            Take a 30-second tour of what else is here: profiles, past CVs and templates.
          </p>
        </div>
      </div>
      <div className="mt-3.5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => promptAction.mutate({ key: "tour_offer", action: "dismissed" })}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          No thanks
        </button>
        <button
          type="button"
          onClick={() => {
            promptAction.mutate({ key: "tour_offer", action: "completed" });
            track("tour_started", { from: "offer" });
            onStartTour();
          }}
          className="px-3.5 py-1.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          Show me around
        </button>
      </div>
    </div>
  );
}
