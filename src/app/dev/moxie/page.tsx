"use client";

import React, { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Moxie, MOXIE_ANIMATIONS, type MoxieAnimation } from "@/components/moxie";
import { AiWaitLoader, type AiWait } from "@/components/dashboard/create-flow/FlowUI";

const WAITS: AiWait[] = ["read-file", "read-story", "read-cv", "write", "improve", "tailor"];

/** Dev-only playground for Moxie's animations and the AI-wait loaders. */
export default function MoxiePlayground() {
  if (process.env.NODE_ENV === "production") notFound();

  const [animation, setAnimation] = useState<MoxieAnimation>("tailor");
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
      <h1 className="text-xl font-bold text-neutral-950">Moxie playground</h1>

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
          <Moxie animation={animation} size={320} />
          <Moxie animation={animation} size={156} />
          <Moxie animation={animation} size={64} />
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
