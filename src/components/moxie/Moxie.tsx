"use client";

import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { MoxieArt } from "./MoxieArt";
import { MoxieController } from "./moxie.controller";
import { prepareParts, queryParts } from "./moxie.parts";
import type { MoxieAnimation, MoxieHandle } from "./moxie.types";

export interface MoxieProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /**
   * What Moxie is doing. Loops (idle, thinking, impatient, loading, sleeping)
   * run until this changes; reactions (welcome, wave, suspicious, peek,
   * celebrate) play once and then settle into idle; hide holds until changed.
   */
  animation?: MoxieAnimation;
  /** Rendered width and height — a number of px or any CSS length. */
  size?: number | string;
  /** Stops all motion (she stays in her current pose). Off-screen pausing is automatic. */
  paused?: boolean;
  /** Hide from assistive tech when she sits next to text that already says what's going on. */
  decorative?: boolean;
  /** Accessible name when not decorative. */
  title?: string;
  /** Soft ground shadow. Worth turning off at icon sizes. */
  shadow?: boolean;
  /** Called when a reaction finishes or a hold (hide) reaches its pose. */
  onAnimationComplete?: (animation: MoxieAnimation) => void;
  /**
   * She can be tickled: wiggle the pointer back and forth over her, or
   * double-tap her (finger or mouse), and she giggles, then carries on. A
   * feather cursor hints at it while hovering.
   */
  ticklish?: boolean;
  /** Called each time she's tickled (and reacts). */
  onTickle?: () => void;
}

/** A tickle: this many back-and-forths of the pointer over her… */
const TICKLE_WIGGLES = 4;
/** …within this long. */
const TICKLE_WINDOW_MS = 700;
/** Or a double tap — finger or mouse — within this long. */
const TICKLE_TAPS = 2;
const TICKLE_TAP_WINDOW_MS = 1000;
/** A moment's rest between tickles, so she doesn't turn into a giggle machine. */
const TICKLE_COOLDOWN_MS = 2000;
/** Ignore jitter: a change of direction only counts after this much movement (px). */
const WIGGLE_MIN_PX = 3;

/** A little coral feather, as the cursor over a ticklish Moxie (hotspot at the quill's tip). */
const FEATHER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
    '<path d="M27 3C17 5 9 12 7 23l-1 3c4-3 9-5 13-9 5-5 8-10 8-14z" fill="#FF6A3D" stroke="#14142B" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M24 7C18 12 12 18 6 27" fill="none" stroke="#14142B" stroke-width="1.4" stroke-linecap="round"/>' +
    '<path d="M6 27l-2 3" stroke="#14142B" stroke-width="1.6" stroke-linecap="round"/>' +
    "</svg>",
)}") 4 30, pointer`;

/**
 * Moxie, the brand mascot — layered vector art animated with GSAP.
 *
 * Renders as static SVG on the server; animation starts after mount, runs
 * outside React (no re-renders while she moves), pauses while off-screen,
 * and drops to still poses when the user prefers reduced motion.
 *
 *   <Moxie animation="thinking" size={96} />
 *   moxieRef.current?.play("celebrate")
 */
export const Moxie = forwardRef<MoxieHandle, MoxieProps>(function Moxie(
  {
    animation = "idle",
    size = 120,
    paused = false,
    decorative = false,
    title,
    shadow = true,
    onAnimationComplete,
    ticklish = false,
    onTickle,
    className,
    style,
    ...rest
  },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const controllerRef = useRef<MoxieController | null>(null);
  const animationRef = useRef(animation);
  const onCompleteRef = useRef(onAnimationComplete);
  const pausedRef = useRef(paused);
  const visibleRef = useRef(true);
  const reducedMotion = usePrefersReducedMotion();
  // Clip-path ids must be unique per instance and safe inside url(#…).
  const idPrefix = `moxie-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    animationRef.current = animation;
    onCompleteRef.current = onAnimationComplete;
    pausedRef.current = paused;
  });

  // Build the controller once the SVG exists (and again if the motion preference changes).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const parts = queryParts(svg);
    prepareParts(parts);
    const controller = new MoxieController(parts, {
      reducedMotion,
      onComplete: (finished) => onCompleteRef.current?.(finished),
    });
    controllerRef.current = controller;
    controller.setPaused(pausedRef.current || !visibleRef.current);
    controller.play(animationRef.current);
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [reducedMotion]);

  // Follow the `animation` prop. Skipped when it's already showing, so the
  // initial mount and a reaction settling back to idle don't restart anything.
  useEffect(() => {
    const controller = controllerRef.current;
    if (controller && controller.current !== animation) controller.play(animation);
  }, [animation]);

  // Pause when the `paused` prop says so, or while she's scrolled out of view.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const sync = () => controllerRef.current?.setPaused(paused || !visibleRef.current);
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
      sync();
    });
    observer.observe(svg);
    sync();
    return () => observer.disconnect();
  }, [paused, reducedMotion]);

  useImperativeHandle(
    ref,
    () => ({
      play: (next) => controllerRef.current?.play(next),
      tickle: () => controllerRef.current?.tickle() ?? false,
    }),
    [],
  );

  // Tickle detection: recent direction changes of the pointer over her, recent taps, and the cooldown.
  const tickleRef = useRef({ lastX: null as number | null, dir: 0, travelled: 0, turns: [] as number[], taps: [] as number[], restUntil: 0 });
  const tryTickle = () => {
    const state = tickleRef.current;
    const now = performance.now();
    if (now < state.restUntil || !controllerRef.current?.tickle()) return;
    state.restUntil = now + TICKLE_COOLDOWN_MS;
    state.turns = [];
    state.taps = [];
    onTickle?.();
  };
  const tickleHandlers: React.HTMLAttributes<HTMLSpanElement> = ticklish
    ? {
        onPointerMove: (e) => {
          if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
          const state = tickleRef.current;
          if (state.lastX === null) {
            state.lastX = e.clientX;
            return;
          }
          const dx = e.clientX - state.lastX;
          state.lastX = e.clientX;
          if (dx === 0) return;
          const dir = Math.sign(dx);
          if (dir === state.dir) {
            state.travelled += Math.abs(dx);
            return;
          }
          // A change of direction — counted once the previous stroke was more than jitter.
          if (state.dir !== 0 && state.travelled >= WIGGLE_MIN_PX) {
            const now = performance.now();
            state.turns = [...state.turns.filter((t) => now - t < TICKLE_WINDOW_MS), now];
            if (state.turns.length >= TICKLE_WIGGLES) tryTickle();
          }
          state.dir = dir;
          state.travelled = Math.abs(dx);
        },
        onPointerLeave: () => {
          tickleRef.current.lastX = null;
          tickleRef.current.dir = 0;
        },
        onPointerDown: () => {
          const state = tickleRef.current;
          const now = performance.now();
          state.taps = [...state.taps.filter((t) => now - t < TICKLE_TAP_WINDOW_MS), now];
          if (state.taps.length >= TICKLE_TAPS) tryTickle();
        },
      }
    : {};

  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <span
      {...rest}
      {...tickleHandlers}
      data-moxie=""
      className={cn("relative inline-block shrink-0 align-middle", className)}
      style={{ width: dimension, height: dimension, ...(ticklish ? { cursor: FEATHER_CURSOR, touchAction: "manipulation", userSelect: "none" } : null), ...style }}
    >
      <MoxieArt
        ref={svgRef}
        idPrefix={idPrefix}
        title={title}
        decorative={decorative}
        showShadow={shadow}
        className="pointer-events-none block h-full w-full"
      />
    </span>
  );
});
