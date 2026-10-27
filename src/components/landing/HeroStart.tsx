"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, PenLine, Upload } from "lucide-react";
import { setHeroHandoff } from "@/lib/hero-handoff";
import { Moxie, MOXIE_GROUND, type MoxieHandle } from "@/components/moxie";
import { INVITE_SCRATCH_AT } from "@/components/moxie/moxie.animations";
import { WordByWord } from "@/components/moxie/WordByWord";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const ACCEPT = ".pdf,.docx,.png,.jpg,.jpeg";
const ACCEPTED = /\.(pdf|docx|png|jpe?g)$/i;
/** Moxie's size on the card, and how long her celebration plays before the flow opens. */
const MOXIE_SIZE = 104;
const CELEBRATE_MS = 900;

/** What Moxie is saying, in the bubble beside her — each line on her beat (see the "invite" animation). */
const LINES = {
  greet: "Hi, I'm Moxie! 👋",
  upload: "Got a CV? Drop it in below and I'll sharpen it up.",
  scratch: "No CV yet? No problem, we'll build one from scratch.",
  drag: "Ooh, yes! Let go and drop it right here.",
  dropped: "Got it! Let me take a look…",
  // Reduced motion: she holds still, so one line says it all.
  still: "Hi, I'm Moxie! Upload your CV below, or build one from scratch.",
} as const;
type Line = keyof typeof LINES;

/**
 * The hero's first step, done in the hero — two ways in: drop the CV you have
 * (the Improve flow opens with it already in), or build one from scratch.
 * Moxie stands on the card's top edge, glasses on and a CV tucked under her
 * arm: she says hi, then (her speech bubble keeping time) points you down at
 * the upload box, and cheers on starting from scratch if you've no CV yet.
 * She waves when a file is dragged over, and celebrates when one is dropped.
 */
export function HeroStart() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const moxieRef = useRef<MoxieHandle>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [line, setLine] = useState<Line>("greet");
  const scratchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(scratchTimer.current), []);
  const say = (next: Line) => {
    clearTimeout(scratchTimer.current);
    setLine(next);
  };

  const start = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.test(file.name)) {
      setFileError("Use a PDF, Word (.docx) or a photo of your CV.");
      return;
    }
    setFileError(null);
    setHeroHandoff({ file });
    say("dropped");
    // A quick celebration from Moxie, then on to the flow.
    if (reducedMotion) {
      router.push("/try/improve");
      return;
    }
    moxieRef.current?.play("celebrate");
    window.setTimeout(() => router.push("/try/improve"), CELEBRATE_MS);
  };

  return (
    <div className="w-full max-w-xl pt-28">
      {/* The whole card takes a dropped file */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragging) {
            moxieRef.current?.play("wave");
            say("drag");
          }
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          start(e.dataTransfer.files?.[0]);
        }}
        className="relative rounded-[26px] border border-neutral-200/80 bg-white p-2.5 text-left shadow-[0_28px_60px_-32px_rgba(226,71,11,0.35),0_10px_28px_-18px_rgba(15,17,21,0.2)]"
      >
        {/* A warm glow behind the card, so it sits a little forward of the page */}
        <div aria-hidden="true" className="pointer-events-none absolute -inset-x-6 -bottom-8 top-6 -z-10 rounded-[40px] bg-[radial-gradient(60%_70%_at_30%_60%,rgba(255,94,31,0.14),transparent_70%)] blur-2xl" />
        {/* What she's saying, beside her (the buttons below say it too, so it's hidden from screen readers) */}
        <SpeechBubble text={LINES[reducedMotion && line === "greet" ? "still" : line]} />
        {/* Moxie, standing on the card's top edge */}
        <Moxie
          ref={moxieRef}
          animation="invite"
          size={MOXIE_SIZE}
          ticklish
          shadow={false}
          title="Moxie"
          // Each round: "upload yours", then "or start from scratch", on her beat.
          onCycle={(looping) => {
            if (looping !== "invite") return;
            say("upload");
            scratchTimer.current = setTimeout(() => setLine("scratch"), INVITE_SCRATCH_AT * 1000);
          }}
          // Reactions end in idle: after a wave, straight back to inviting.
          onAnimationComplete={(done) => {
            if (done !== "wave") return;
            say("greet");
            moxieRef.current?.play("invite");
          }}
          className="!absolute right-8 top-0 z-10"
          style={{ marginTop: -MOXIE_GROUND.y * MOXIE_SIZE }}
        />
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
        {/* Two ways in, as tiles: Moxie explains them, the tiles just say what they do */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1.15fr_1fr]">
          {/* Upload, the main way in: the drop zone (dashed), warm, and lit up while a file is dragged over the card */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`group relative flex items-center gap-4 overflow-hidden rounded-[20px] border-[1.5px] border-dashed p-4 text-left transition-all duration-200 cursor-pointer sm:flex-col sm:items-start sm:gap-4 sm:p-5 ${
              dragging
                ? "border-accent bg-accent-soft"
                : "border-accent-border bg-[linear-gradient(155deg,var(--accent-soft)_0%,#f5f5f5_80%)] hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_14px_28px_-18px_rgba(226,71,11,0.55)]"
            }`}
          >
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_8px_18px_-8px_rgba(226,71,11,0.8)] ring-4 ring-accent/10">
              <Upload className={`h-5 w-5 transition-transform duration-200 ${dragging ? "-translate-y-0.5" : "group-hover:-translate-y-0.5"}`} strokeWidth={2.2} />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-semibold tracking-[-0.01em] text-neutral-950">{dragging ? "Drop it here" : "Upload your CV"}</span>
              {dragging ? (
                <span className="mt-1 block text-[13px] text-neutral-500">Let go, Moxie&apos;s ready for it</span>
              ) : (
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {["PDF", "Word", "Photo"].map((kind) => (
                    <span key={kind} className="rounded-md border border-accent-border/70 bg-white/80 px-1.5 py-0.5 text-[11px] font-semibold text-accent-strong">
                      {kind}
                    </span>
                  ))}
                  <span className="text-[12.5px] text-neutral-400">or drop it</span>
                </span>
              )}
            </span>
            <ArrowUpRight className="ml-auto h-[18px] w-[18px] shrink-0 text-accent transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:absolute sm:right-4 sm:top-4" />
          </button>

          {/* From scratch: the quieter tile beside it */}
          <Link
            href="/try/create"
            className="group relative flex items-center gap-4 rounded-[20px] border border-neutral-200/70 bg-neutral-100 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-[0_14px_28px_-18px_rgba(15,17,21,0.35)] sm:flex-col sm:items-start sm:gap-4 sm:p-5"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-neutral-900 shadow-[0_6px_14px_-8px_rgba(15,17,21,0.35)] ring-1 ring-neutral-200">
              <PenLine className="h-5 w-5 transition-transform duration-200 group-hover:-rotate-12" />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-semibold tracking-[-0.01em] text-neutral-950">Start from scratch</span>
              <span className="mt-1 block text-[13px] text-neutral-500">Answer a few questions, Moxie writes it with you</span>
            </span>
            <ArrowUpRight className="ml-auto h-[18px] w-[18px] shrink-0 text-neutral-400 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900 sm:absolute sm:right-4 sm:top-4" />
          </Link>
        </div>
      </div>

      {fileError && <p className="mt-2 text-center text-sm font-medium text-red-600">{fileError}</p>}
    </div>
  );
}

/** How far above the card's top edge her eyes are (she stands on it), so the bubble can sit level with them. */
const EYE_HEIGHT = ((393 - 168) / 320) * MOXIE_SIZE;

/** Moxie "typing" before each line arrives (moxie-typing in globals.css). */
const TYPING_MS = 700;

/**
 * Moxie's speech bubble: up beside her head, its bottom edge just below her
 * eyes and its tail curling toward them; longer lines grow it upward.
 * For each new line the old one fades, she "types" for a
 * moment (three bouncing dots), then the line arrives word by word. They all
 * share one grid cell, so the bubble only grows or shrinks to fit, never jumps.
 */
function SpeechBubble({ text }: { text: string }) {
  const [shown, setShown] = useState({ text, leaving: null as string | null, key: 0 });
  if (shown.text !== text) setShown({ text, leaving: shown.text, key: shown.key + 1 });

  return (
    <div
      aria-hidden="true"
      className="absolute z-10 w-max max-w-[12rem] rounded-[20px] bg-neutral-100 px-4 py-3 shadow-[0_10px_24px_-16px_rgba(15,17,21,0.25)] ring-1 ring-neutral-900/[0.04] sm:max-w-[15rem]"
      style={{ right: `calc(2rem + ${MOXIE_SIZE + 4}px)`, bottom: `calc(100% + ${Math.round(EYE_HEIGHT - 14)}px)` }}
    >
      {/* The tail, curling down toward her */}
      <svg viewBox="0 0 14 18" className="absolute -right-[11px] bottom-2 h-[18px] w-[14px] text-neutral-100" aria-hidden="true">
        <path d="M0 0 C1 7 5 13 14 17 C7 17.5 2.5 15 0 12 Z" fill="currentColor" />
      </svg>
      <div className="grid text-[13.5px] font-medium leading-[1.4] text-neutral-900 sm:text-[14.5px]">
        {shown.leaving && (
          <p key={`out-${shown.key}`} className="moxie-line-out [grid-area:1/1]">
            {shown.leaving}
          </p>
        )}
        <span key={`typing-${shown.key}`} className="moxie-typing flex items-center gap-1 self-start pt-1.5 [grid-area:1/1]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="moxie-typing-dot h-1.5 w-1.5 rounded-full bg-neutral-500" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </span>
        <p key={`in-${shown.key}`} className="[grid-area:1/1]">
          <WordByWord text={shown.text} delayMs={TYPING_MS} />
        </p>
      </div>
    </div>
  );
}
