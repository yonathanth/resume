"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PenLine, Upload, X } from "lucide-react";
import { setHeroHandoff } from "@/lib/hero-handoff";
import { Moxie, MOXIE_GROUND, type MoxieHandle } from "@/components/moxie";
import { EDGE_X, PEEK_BUBBLE_AT, PEEK_OUT_AT } from "@/components/moxie/moxie.animations";
import { WordByWord } from "@/components/moxie/WordByWord";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const ACCEPT = ".pdf,.docx,.png,.jpg,.jpeg";
const ACCEPTED = /\.(pdf|docx|png|jpe?g)$/i;
/** She peeks in this long after the page loads… */
const FIRST_PEEK_MS = 1500;
/** Sent away, she still peeks round the edge now and then: hidden this long (alternating, so it's not a metronome)… */
const PEEK_EVERY_MS = [3000, 4000] as const;
/** …then peeking for this long. A tap on her while she peeks brings the quick start back. */
const PEEK_FOR_MS = 2800;
/** The controller eases her to neutral before an animation starts; her beats are counted from after it. */
const SETTLE_MS = 350;
/** Her celebration when a CV is picked, before the flow opens. */
const CELEBRATE_MS = 900;
/** Past this much of the first screen, she shrinks back to a peek (a tap brings the quick start back). */
const MINI_AFTER = 0.6;
/** Moxie "typing" before her line arrives (moxie-typing in globals.css). */
const TYPING_MS = 700;

/** How much of her shows: none, a peek round the edge (an eye and her claw), or all of her. */
type Reveal = "hidden" | "peek" | "out";
/**
 * How much of her box shows past the screen's right edge, for each (in units of her size).
 * Peeking, the edge runs where her animations expect it (EDGE_X): her eyes crane round
 * it, and her legs stay out of sight behind it.
 */
const SHOWN: Record<Reveal, number> = { hidden: 0, peek: (EDGE_X - 131) / 320, out: 1 };
/** Sliding in or out (ducking away waits a moment, so she straightens up first). */
const SLIDE = {
  in: "transform 750ms cubic-bezier(0.22, 1, 0.36, 1)",
  away: "transform 900ms cubic-bezier(0.65, 0, 0.35, 1) 220ms",
};
/** Fully out, she stands this far in from the edge. */
const EDGE_GAP = "0.75rem";

/**
 * Moxie at the landing page's bottom-right corner: a moment after the page
 * loads she peeks round the screen's edge, comes all the way out and waves,
 * and offers a quick start in her bubble — upload a CV, or start from scratch
 * (free; sign-in comes later, before the AI runs). Sent away (✕), she ducks out but keeps peeking back
 * round the edge every few seconds; tap her and the quick start opens again. Once you scroll past the first screen she shrinks back to a peek;
 * tap her and the quick start opens again.
 */
export function MoxiePeek() {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  const moxieRef = useRef<MoxieHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** Where her entrance is: not yet, peeking, out (waving), or done (bubble open). */
  const [stage, setStage] = useState<"waiting" | "peeking" | "out" | "ready">("waiting");
  const [dismissed, setDismissed] = useState(false);
  /** Sent away, but peeking round the edge for a moment. */
  const [peekingBack, setPeekingBack] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [opened, setOpened] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const later = (ms: number, run: () => void) => timers.current.push(setTimeout(run, ms));

  /** Her entrance, `delay` ms from now (from "waiting"). */
  const enter = useCallback(
    (delay: number) => {
      clearTimers();
      if (reducedMotion) {
        later(delay, () => setStage("ready"));
        return;
      }
      later(delay, () => {
        setStage("peeking");
        moxieRef.current?.play("peekSide");
      });
      later(delay + SETTLE_MS + PEEK_OUT_AT * 1000, () => setStage("out"));
      later(delay + SETTLE_MS + PEEK_BUBBLE_AT * 1000, () => setStage("ready"));
    },
    [reducedMotion],
  );

  useEffect(() => {
    enter(FIRST_PEEK_MS);
    return clearTimers;
  }, [enter]);

  // Past the first screen she shrinks to a peek; scrolling on a little after a tap closes her bubble again.
  const openedAt = useRef<number | null>(null);
  const open = () => {
    openedAt.current = window.scrollY;
    setOpened(true);
  };
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * MINI_AFTER);
      if (openedAt.current !== null && Math.abs(window.scrollY - openedAt.current) > 160) {
        openedAt.current = null;
        setOpened(false);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** Sent away: she ducks out, then keeps peeking back round the edge every few seconds. */
  const peekNowAndThen = (round = 0) => {
    later(PEEK_EVERY_MS[round % PEEK_EVERY_MS.length], () => {
      setPeekingBack(true);
      later(PEEK_FOR_MS, () => {
        setPeekingBack(false);
        peekNowAndThen(round + 1);
      });
    });
  };
  const dismiss = () => {
    clearTimers();
    setDismissed(true);
    setPeekingBack(false);
    setStage("ready");
    openedAt.current = null;
    setOpened(false);
    peekNowAndThen();
  };
  /** Tapped while peeking: out she comes, with the quick start. */
  const bringBack = () => {
    clearTimers();
    setDismissed(false);
    setPeekingBack(false);
    setStage("ready");
    open();
  };

  const start = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.test(file.name)) {
      setFileError("Use a PDF, Word (.docx) or a photo of your CV.");
      return;
    }
    setFileError(null);
    setHeroHandoff({ file });
    if (reducedMotion) {
      router.push("/try/improve");
      return;
    }
    moxieRef.current?.play("celebrate");
    window.setTimeout(() => router.push("/try/improve"), CELEBRATE_MS);
  };

  const mini = scrolled && !opened;
  const reveal: Reveal = dismissed
    ? peekingBack
      ? "peek"
      : "hidden"
    : stage === "waiting"
      ? "hidden"
      : stage === "peeking" || mini
        ? "peek"
        : "out";
  /** Peeking (sent away, or scrolled past the first screen), a tap on her opens the quick start. */
  const tappable = reveal === "peek" && stage === "ready";
  const bubbleOpen = !dismissed && stage === "ready" && !mini;

  // After her entrance, what she does follows where she is: peeking round the edge, straightening up to duck away or come out.
  const shown = useRef<{ reveal: Reveal; ready: boolean }>({ reveal, ready: false });
  useEffect(() => {
    const ready = stage === "ready";
    const was = shown.current;
    shown.current = { reveal, ready };
    if (!ready || (was.ready && was.reveal === reveal)) return;
    if (reveal === "peek") moxieRef.current?.play("peekEdge");
    else if (was.reveal === "peek") moxieRef.current?.play(reveal === "out" ? "peekEdgeOut" : "peekEdgeAway");
  }, [reveal, stage]);

  return (
    <div className="[--peek-size:84px] sm:[--peek-size:96px] lg:[--peek-size:112px]">
      {/* Her bubble: above her, up from the corner, with the quick start in it */}
      {bubbleOpen && (
        <div
          role="dialog"
          aria-label="Quick start with Moxie"
          className="moxie-bubble-in fixed right-3 z-40 w-[15.5rem] max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(15,17,21,0.06),0_16px_36px_-14px_rgba(15,17,21,0.28)] ring-1 ring-neutral-900/[0.06] sm:right-5 sm:w-[17rem] sm:rounded-[20px] sm:p-3.5"
          style={{ bottom: "calc(var(--peek-size) * 0.9 + 0.5rem)" }}
        >
          {/* The tail, curling down to her */}
          <svg viewBox="0 0 18 14" className="absolute -bottom-[11px] right-[calc(var(--peek-size)*0.4)] h-[14px] w-[18px] text-white" aria-hidden="true">
            <path d="M0 0 C7 1 13 5 17 14 C17.5 7 15 2.5 12 0 Z" fill="currentColor" />
          </svg>

          <div className="flex items-start gap-2">
            <div className="grid min-w-0 flex-1 pl-0.5">
              <span className="moxie-typing flex h-[22px] items-center gap-1 [grid-area:1/1]" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="moxie-typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </span>
              <p className="text-[14.5px] font-semibold leading-[22px] tracking-[-0.01em] text-neutral-950 [grid-area:1/1] sm:text-[15.5px]">
                <WordByWord text="Hi, I'm Moxie! 👋" delayMs={TYPING_MS} />
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Not now"
              className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="moxie-continue-in mt-0.5 pl-0.5 text-[12.5px] leading-snug text-neutral-500 [animation-delay:1s] sm:text-[13px]">
            Want a quick start? It's free.
          </p>

          {/* The quick start: no account needed until the AI runs (see /try) */}
          <div className="moxie-continue-in mt-3 grid gap-1.5 [animation-delay:1.3s]">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-neutral-800 sm:h-10 sm:text-[13.5px]"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload my CV
            </button>
            <Link
              href="/try/create"
              className="flex h-9 items-center justify-center gap-2 rounded-xl bg-neutral-100 px-4 text-[13px] font-semibold text-neutral-900 transition-colors hover:bg-neutral-200/80 sm:h-10 sm:text-[13.5px]"
            >
              <PenLine className="h-4 w-4" aria-hidden="true" />
              Start from scratch
            </Link>
          </div>
          {fileError && <p className="mt-1.5 text-center text-[11.5px] font-medium text-red-600 sm:text-[12px]">{fileError}</p>}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              start(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {/* Moxie herself, slid in from the right edge: while she peeks the edge cuts her off; fully out, she stands just in from it */}
      {/* (Wider than her, on the left, so a waving or pointing claw isn't cut off — and see-through to clicks there.) */}
      <div
        className="pointer-events-none fixed right-0 z-40 overflow-hidden"
        style={{
          width: `calc(var(--peek-size) * 1.5 + ${EDGE_GAP})`,
          height: "calc(var(--peek-size) * 1.4)",
          bottom: `calc(0.5rem - var(--peek-size) * ${(1 - MOXIE_GROUND.y).toFixed(3)})`,
        }}
      >
        <button
          type="button"
          aria-label={tappable ? "Quick start with Moxie" : "Moxie"}
          tabIndex={tappable ? 0 : -1}
          onClick={() => tappable && bringBack()}
          className={`pointer-events-auto absolute bottom-0 block ${tappable ? "cursor-pointer" : "cursor-default"}`}
          style={{
            right: EDGE_GAP,
            transition: reducedMotion ? "none" : reveal === "hidden" ? SLIDE.away : SLIDE.in,
            transform: reveal === "out" ? "none" : `translateX(calc(var(--peek-size) * ${(1 - SHOWN[reveal]).toFixed(3)} + ${EDGE_GAP}))`,
          }}
        >
          <Moxie ref={moxieRef} animation="idle" size="var(--peek-size)" ticklish={!mini} decorative />
        </button>
      </div>
    </div>
  );
}
