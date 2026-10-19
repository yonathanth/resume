"use client";

import React, { useEffect, useRef, useState } from "react";
import { notFound } from "next/navigation";
import { Moxie, MOXIE_ANIMATIONS, MOXIE_SEAT, type MoxieAnimation, type MoxieHandle } from "@/components/moxie";
import { MOXIE_LOGOS } from "@/components/moxie/MoxieLogos";
import { MoxieDidYouKnow } from "@/components/moxie/MoxieDidYouKnow";
import { AiWaitLoader, type AiWait } from "@/components/dashboard/create-flow/FlowUI";
import { useHasMounted } from "@/hooks/use-has-mounted";

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

/** Tier 4, each with where it would go and the one quiet line under her there. */
const TIER_FOUR: { name: MoxieAnimation; label: string; line: string }[] = [
  { name: "lost", label: "404 page", line: "This page wandered off. Let's get you back." },
  { name: "oops", label: "error page · AI or PDF failure", line: "Oops — that didn't work. Let's try that again." },
  { name: "upgrade", label: "paywall", line: "Career profiles are part of Pro." },
];

const SIDEBAR_NAV = ["Dashboard", "Templates", "Past projects", "Career profiles"];

/** Moxie sitting on the top edge of her positioned parent (placed along it with `style`). */
function SittingMoxie({ size, crowned, style }: { size: number; crowned: boolean; style: React.CSSProperties }) {
  return (
    <Moxie
      animation="sitting"
      size={size}
      crowned={crowned}
      ticklish
      shadow={false}
      className="!absolute z-10"
      style={{ marginTop: -MOXIE_SEAT.y * size, ...style }}
    />
  );
}

/**
 * A stand-in for the dashboard sidebar, with Moxie sitting on a line in it:
 * the header's bottom edge, top left (where she is now), or the line above
 * the bottom section. Collapsed, it's the 72px-wide rail.
 */
function SidebarPreview({ crowned, spot, collapsed = false }: { crowned: boolean; spot: "top" | "bottom"; collapsed?: boolean }) {
  return (
    <aside
      className={`flex h-[560px] shrink-0 flex-col overflow-visible rounded-xl border border-neutral-200 bg-neutral-50 ${collapsed ? "w-[72px]" : "w-64"}`}
    >
      <div
        className={`relative flex h-16 shrink-0 items-center border-b border-neutral-200 text-[15px] font-bold text-neutral-950 ${
          spot === "top" ? (collapsed ? "" : "pl-[76px]") : "px-4"
        }`}
      >
        {spot === "top" && <SittingMoxie size={collapsed ? 52 : 58} crowned={crowned} style={{ top: "100%", left: collapsed ? 8 : 12 }} />}
        {!collapsed && "GoMoxie"}
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {!collapsed && <div className="px-2 pb-2 text-xs font-semibold text-neutral-400">Workspace</div>}
        {SIDEBAR_NAV.map((label, i) => (
          <div
            key={label}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${i === 0 ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500"}`}
          >
            {collapsed ? label[0] : label}
          </div>
        ))}
      </nav>
      <div className="relative shrink-0 space-y-3 border-t border-neutral-200 p-3">
        {spot === "bottom" && <SittingMoxie size={84} crowned={crowned} style={{ top: 0, right: 18 }} />}
        {!collapsed && (
          <div className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="text-sm font-semibold text-neutral-900">Upgrade to Pro</p>
            <p className="mt-0.5 text-xs text-neutral-500">Tailored CVs, career profiles and more.</p>
          </div>
        )}
        <div className="flex items-center gap-2 px-1">
          <div className="h-8 w-8 rounded-full bg-neutral-200" />
          {!collapsed && (
            <div className="text-xs">
              <p className="font-semibold text-neutral-800">Sam Rivera</p>
              <p className="text-neutral-500">Free plan</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

/** Dev-only playground for Moxie's animations and the AI-wait loaders. */
export default function MoxiePlayground() {
  if (process.env.NODE_ENV === "production") notFound();

  const [animation, setAnimation] = useState<MoxieAnimation>("tailor");
  const [moment, setMoment] = useState<MoxieAnimation | null>(null);
  // Preview a Pro account: she wears the crown through everything.
  const [crowned, setCrowned] = useState(false);
  const hasMounted = useHasMounted();
  const momentRef = useRef<MoxieHandle>(null);
  const [tierFour, setTierFour] = useState<MoxieAnimation>("lost");
  const tierFourRef = useRef<MoxieHandle>(null);
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
        <h2 className="text-sm font-semibold text-neutral-500">Logo concepts</h2>
        <p className="mt-1 text-xs text-neutral-400">Still marks drawn from Moxie, at 96 / 48 / 32 / 16px on light and dark, and next to the name.</p>
        {([3, 2, 1] as const).map((round) => (
        <div key={round} className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {round === 3 ? "Round 3 — Peepers, as a crab" : round === 2 ? "Round 2 — simple, and about the app" : "Round 1 — simplified Moxie"}
        </h3>
        <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MOXIE_LOGOS.filter((logo) => logo.round === round).map(({ name, note, Mark, mono }) => (
            <div key={name} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <div className="flex items-end gap-5 px-5 pb-5 pt-6 text-neutral-950">
                {[96, 48, 32, 16].map((size) => (
                  <Mark key={size} size={size} />
                ))}
              </div>
              <div className={`flex items-end gap-5 bg-[#0a0a0a] px-5 py-5 ${mono ? "text-white" : ""}`}>
                {[96, 48, 32, 16].map((size) => (
                  <Mark key={size} size={size} />
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-5 py-3">
                <span className="flex items-center gap-2 text-neutral-950">
                  <Mark size={32} />
                  <span className="text-[17px] font-bold tracking-tight">GoMoxie</span>
                </span>
                <span className="flex items-center gap-2 rounded-lg bg-[#0a0a0a] px-2.5 py-1.5 text-white">
                  <Mark size={26} />
                  <span className="text-[14px] font-bold tracking-tight">GoMoxie</span>
                </span>
              </div>
              <div className="border-t border-neutral-100 px-5 py-3">
                <div className="text-sm font-semibold text-neutral-900">{name}</div>
                <div className="mt-0.5 text-xs text-neutral-500">{note}</div>
              </div>
            </div>
          ))}
        </div>
        </div>
        ))}
      </section>

      <section className="mt-10">
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
        <h2 className="text-sm font-semibold text-neutral-500">Loading: current vs new</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Left, today&apos;s scuttle. Right, the new one: glasses on, folders clutched to her side, presenting a &ldquo;Did you know?&rdquo;
          card — a new fact every round. Then her moves alone, big, medium and at loader-chip size.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex items-center justify-center rounded-2xl border border-neutral-200 bg-white p-6">
            <Moxie animation="loading" size={220} ticklish crowned={crowned} />
          </div>
          <div className="flex items-center justify-center rounded-2xl border border-neutral-200 bg-white p-6">
            {/* Browser only: the facts come in a random order. */}
            {hasMounted && <MoxieDidYouKnow crowned={crowned} />}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {(["loading", "presenting"] as const).map((name) => (
            <div key={name} className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{name}</div>
              <div className="mt-4 flex items-end justify-center gap-8">
                <Moxie animation={name} size={300} ticklish crowned={crowned} />
                <Moxie animation={name} size={120} crowned={crowned} />
                <Moxie animation={name} size={56} crowned={crowned} />
              </div>
            </div>
          ))}
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
        <h2 className="text-sm font-semibold text-neutral-500">Sitting on the sidebar (preview)</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Top left on the header&apos;s bottom edge (where she is now) — expanded and collapsed — or on the line above the bottom section; and
          bigger, on a plain ledge, to check the details. Tickle her (wiggle over her, or double-tap her): she covers up without getting off.
        </p>
        <div className="mt-4 flex flex-wrap items-start gap-10">
          <SidebarPreview crowned={crowned} spot="top" />
          <SidebarPreview crowned={crowned} spot="top" collapsed />
          <SidebarPreview crowned={crowned} spot="bottom" />
          <div className="relative mt-[300px] w-[420px] rounded-t-xl border-t-2 border-neutral-300 bg-white pb-32">
            <SittingMoxie size={300} crowned={crowned} style={{ top: 0, left: 60 }} />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-neutral-500">Errors, paywall &amp; signing in (tier 4 preview)</h2>
        <p className="mt-1 text-sm text-neutral-500">Each button replays it, with the line that would sit under her there.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TIER_FOUR.map(({ name, label }) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setTierFour(name);
                tierFourRef.current?.play(name);
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium cursor-pointer ${
                tierFour === name ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-10">
          <Moxie ref={tierFourRef} animation={tierFour} size={300} ticklish crowned={crowned} />
          <p className="mt-3 text-sm text-neutral-500 sm:text-[15px]">{TIER_FOUR.find((t) => t.name === tierFour)?.line}</p>
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
