"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Moxie } from "./Moxie";
import { WordByWord } from "./WordByWord";
import type { MoxieAnimation } from "./moxie.types";

export interface MoxieMomentProps {
  /** The moment she acts out — a celebration like "onboarded" or "saved". */
  animation: MoxieAnimation;
  /** One quiet line under her ("Welcome aboard, Sam!"). */
  message: string;
  /** She wears the Pro crown (for Pro accounts). */
  crowned?: boolean;
  /** How long it stays up before going away by itself. */
  durationMs?: number;
  /** Called once it's over — by itself, or because it was clicked away. */
  onDone?: () => void;
}

/**
 * A moment worth marking — onboarding finished, a CV saved to a profile —
 * shown the way her waits are: Moxie on her own over a frosted blur of the
 * page, one quiet line under her. It goes away by itself after a moment, or
 * at a click.
 *
 *   {welcome && <MoxieMoment animation="onboarded" message="Welcome aboard!" onDone={() => setWelcome(false)} />}
 */
export function MoxieMoment({ animation, message, crowned = false, durationMs = 2600, onDone }: MoxieMomentProps) {
  const onDoneRef = useRef(onDone);
  const finished = useRef(false);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  // Over once — whether by itself or by a click, never both.
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDoneRef.current?.();
  };
  const finishRef = useRef(finish);

  useEffect(() => {
    const timer = setTimeout(() => finishRef.current(), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="moxie-overlay-in fixed inset-0 z-[70] flex items-center justify-center bg-white/55 px-6 backdrop-blur-2xl backdrop-saturate-150"
      onClick={finish}
    >
      <div className="flex flex-col items-center text-center">
        <p role="status" className="sr-only">
          {message}
        </p>
        <div className="relative">
          <div
            aria-hidden="true"
            className="moxie-glow pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent), transparent 65%)" }}
          />
          <div className="relative">
            <Moxie animation={animation} size={168} decorative crowned={crowned} />
          </div>
        </div>
        <p aria-hidden="true" className="mt-3 text-sm text-neutral-500 sm:text-[15px]">
          <WordByWord text={message} delayMs={250} />
        </p>
      </div>
    </div>,
    document.body,
  );
}
