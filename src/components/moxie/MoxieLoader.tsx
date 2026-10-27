"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Moxie } from "./Moxie";
import { WordByWord } from "./WordByWord";
import { TICKLE_SECONDS } from "./moxie.animations";
import type { MoxieAnimation } from "./moxie.types";

/** After this long she starts tapping her foot (outside a scene), and the lines own up to the wait. */
const IMPATIENT_AFTER_S = 15;
/** Then: a few seconds of impatience out of every this-many, back to work in between. */
const IMPATIENT_EVERY_S = 20;
const IMPATIENT_FOR_S = 4;
/** Long enough to read a line and watch her for a moment before the next one. */
const LINE_EVERY_MS = 3800;
/** A new line waits this long for the old one to fade (moxie-line-out in globals.css) so they never overlap. */
const LINE_HANDOVER_MS = 380;

const SLOW_MESSAGES = ["Almost there…", "Still on it, good things take a moment…", "Just tidying up the last bits…"];

/** What she says when she's tickled mid-work — a different one each time. */
const TICKLE_MESSAGES = ["Hehe, that tickles!", "Hey! I'm working here!", "Eek, stop it, hehe!"];

/** Scenes tell their own story, so the generic foot-tapping would only interrupt it. */
const SCENES: ReadonlySet<MoxieAnimation> = new Set(["tailor", "write", "read", "polish", "stamp"]);

export interface MoxieLoaderProps {
  /**
   * What she's doing, one line at a time, changing every few seconds. The
   * first is what's announced to screen readers ("Writing your CV…").
   */
  messages: string[];
  /** What she does while working — a generic pose, or a scene with props (e.g. tailor). */
  animation?: Extract<MoxieAnimation, "thinking" | "loading" | "tailor" | "write" | "read" | "polish" | "stamp">;
  /** A reaction played once before she settles into `animation`. */
  intro?: Extract<MoxieAnimation, "suspicious" | "peek" | "wave">;
  size?: number;
  /** The work finished: she celebrates, and the line says so (shown briefly before moving on). */
  done?: boolean;
  /** The line once it's done. */
  doneMessage?: string;
  /** She wears the Pro crown (for Pro accounts). */
  crowned?: boolean;
}

/**
 * Moxie working on something that takes a while — the AI writing a CV, a file
 * being read, a PDF being built — on her own over the whole screen, on a
 * frosted blur of the page. One quiet line of text under her says what she's
 * doing; it changes every few seconds, each new line arriving word by word
 * as the last one drifts away. Past ~15s the lines own up to the wait.
 *
 *   <MoxieLoader animation="write" messages={["Writing your CV…", "Choosing strong action verbs…"]} />
 */
export function MoxieLoader({
  messages,
  animation = "thinking",
  intro,
  size = 168,
  done = false,
  doneMessage = "Done!",
  crowned = false,
}: MoxieLoaderProps) {
  const [introDone, setIntroDone] = useState(!intro);
  const [elapsed, setElapsed] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  // Tickles so far, and the one she's giggling at now (0 when she isn't).
  const [tickles, setTickles] = useState(0);
  const [giggling, setGiggling] = useState(0);
  const onTickle = () => {
    const count = tickles + 1;
    setTickles(count);
    setGiggling(count);
    setTimeout(() => setGiggling((now) => (now === count ? 0 : now)), TICKLE_SECONDS * 1000);
  };

  useEffect(() => {
    const started = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    const rotate = setInterval(() => setLineIndex((i) => i + 1), LINE_EVERY_MS);
    return () => {
      clearInterval(tick);
      clearInterval(rotate);
    };
  }, []);

  const slow = elapsed >= IMPATIENT_AFTER_S;
  const impatient =
    slow && !SCENES.has(animation) && (elapsed - IMPATIENT_AFTER_S) % IMPATIENT_EVERY_S < IMPATIENT_FOR_S;
  const current: MoxieAnimation = done
    ? "tada"
    : !introDone && intro
      ? intro
      : impatient
        ? "impatient"
        : animation;

  // Her lines first; once it's slow, the slow ones take over.
  const lines = slow ? SLOW_MESSAGES : messages;
  const lineAt = (i: number) => lines[((i % lines.length) + lines.length) % lines.length];
  const tickled = giggling > 0 && !done;
  const line = done ? doneMessage : tickled ? TICKLE_MESSAGES[(giggling - 1) % TICKLE_MESSAGES.length] : lineAt(lineIndex);
  // The line on its way out is simply the one before (none on the first, while she giggles, or once she's done).
  const leaving = !done && !tickled && lineIndex > 0 ? lineAt(lineIndex - 1) : null;

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="moxie-overlay-in fixed inset-0 z-[70] flex items-center justify-center bg-white/55 px-6 backdrop-blur-2xl backdrop-saturate-150">
      <div className="flex flex-col items-center text-center">
        {/* Announced once — the changing line below is decorative. */}
        <p role="status" className="sr-only">
          {done ? doneMessage : messages[0]}
        </p>

        <div className="relative">
          {/* A soft warm glow behind her. */}
          <div
            aria-hidden="true"
            className="moxie-glow pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent), transparent 65%)" }}
          />
          <div className="relative">
            <Moxie
              animation={current}
              size={size}
              decorative
              ticklish={!done}
              crowned={crowned}
              onTickle={onTickle}
              onAnimationComplete={(finished) => {
                if (finished === intro) setIntroDone(true);
              }}
            />
          </div>
        </div>

        {/* Under her, quiet: she's the show; the line just says what she's up to. */}
        <div aria-hidden="true" className="relative mt-3 flex min-h-6 w-[min(90vw,26rem)] items-start justify-center">
          {leaving && (
            <p key={`out-${lineIndex}`} className="moxie-line-out absolute inset-x-0 top-0 text-sm text-neutral-500 sm:text-[15px]">
              {leaving}
            </p>
          )}
          <p
            key={done ? "done" : tickled ? `tickle-${giggling}` : `in-${lineIndex}`}
            className="text-sm text-neutral-500 sm:text-[15px]"
          >
            <WordByWord text={line} delayMs={leaving ? LINE_HANDOVER_MS : 0} />
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
