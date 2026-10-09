"use client";

import React, { useEffect, useRef, useState } from "react";
import { notFound } from "next/navigation";
import { Moxie, MOXIE_ANIMATIONS, type MoxieAnimation, type MoxieHandle } from "@/components/moxie";
import { AiWaitLoader, type AiWait } from "@/components/dashboard/create-flow/FlowUI";

const WAITS: AiWait[] = ["read-file", "read-story", "read-cv", "write", "improve", "tailor"];

const MOMENTS: { name: MoxieAnimation; label: string }[] = [
  { name: "celebrate", label: "ta-da (current)" },
  { name: "tada", label: "ta-da (new: eye bonk)" },
  { name: "downloaded", label: "PDF downloaded" },
  { name: "verifying", label: "verifying payment" },
  { name: "paid", label: "payment success (Pro)" },
  { name: "onboarded", label: "onboarding finished" },
  { name: "saved", label: "saved to profile" },
];

const EMPTY_STATES: { name: MoxieAnimation; label: string }[] = [
  { name: "searching", label: "no search results" },
  { name: "emptyFolder", label: "no resumes / profiles / CVs linked" },
];

/** Dev-only playground for Moxie's animations and the AI-wait loaders. */
export default function MoxiePlayground() {
  if (process.env.NODE_ENV === "production") notFound();

  const [animation, setAnimation] = useState<MoxieAnimation>("tailor");
  const [moment, setMoment] = useState<MoxieAnimation | null>(null);
  // Preview a Pro account: she wears the crown through everything.
  const [crowned, setCrowned] = useState(false);
  const momentRef = useRef<MoxieHandle>(null);
  const [wait, setWait] = useState<AiWait>("tailor");
  // Remounting restarts the loader's timers, so its captions and impatience can be watched from the start.
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);
  // The loader covers the whole screen, so it's opened on demand; a click (anywhere but on
  // Moxie, who can be double-tapped to tickle her) or Escape closes it.
  const [showWait, setShowWait] = useState(false);
  useEffect(() => {
    if (!showWait) return;
    const close = (e?: Event) => {
      if (e?.target instanceof Element && e.target.closest("[data-moxie]")) return;
      setShowWait(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    // Armed on the next tick, so the click that opened it doesn't close it again.
    const arm = setTimeout(() => window.addEventListener("pointerdown", close), 0);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(arm);
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [showWait]);

  return (
    <main className="min-h-dvh bg-neutral-50 p-6 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-neutral-950">Moxie playground</h1>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700">
          <input type="checkbox" checked={crowned} onChange={(e) => setCrowned(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          Pro account (crown on)
        </label>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-neutral-500">Animation</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {MOXIE_ANIMATIONS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setAnimation(name)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium cursor-pointer ${
                animation === name ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-700"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="mt-6 flex items-end gap-10 rounded-2xl border border-neutral-200 bg-white p-8">
          <Moxie animation={animation} size={320} crowned={crowned} />
          <Moxie animation={animation} size={156} crowned={crowned} />
          <Moxie animation={animation} size={64} crowned={crowned} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-neutral-500">Celebrations, moments &amp; empty states (tier 2 &amp; 3 preview)</h2>
        <p className="mt-1 text-sm text-neutral-500">Each button replays it. Compare the current ta-da (celebrate) with the new one (tada).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {MOMENTS.map(({ name, label }) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setMoment(name);
                momentRef.current?.play(name);
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium cursor-pointer ${
                moment === name ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <h3 className="mt-5 text-sm font-semibold text-neutral-500">Empty states (tier 3 preview)</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {EMPTY_STATES.map(({ name, label }) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setMoment(name);
                momentRef.current?.play(name);
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium cursor-pointer ${
                moment === name ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-6 flex items-end justify-center rounded-2xl border border-neutral-200 bg-white p-10">
          <Moxie ref={momentRef} animation="idle" size={340} ticklish crowned={crowned} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-neutral-500">AI-wait loader</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {WAITS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setWait(name);
                setDone(false);
                setRun((r) => r + 1);
                setShowWait(true);
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium cursor-pointer ${
                wait === name ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-700"
              }`}
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setDone(true);
              setShowWait(true);
            }}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium cursor-pointer ${
              done ? "border-accent bg-accent text-white" : "border-neutral-200 bg-white text-neutral-700"
            }`}
          >
            show ta-da
          </button>
        </div>
        <p className="mt-3 text-sm text-neutral-500">Opens full screen, as in the app. Tickle her (wiggle over her, or double-tap her); click elsewhere or press Escape to close it.</p>
        {showWait && <AiWaitLoader key={run} wait={wait} done={done} fileName="my_cv.pdf" />}
      </section>
    </main>
  );
}
