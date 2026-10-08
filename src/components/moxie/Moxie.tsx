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
}

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

  useImperativeHandle(ref, () => ({ play: (next) => controllerRef.current?.play(next) }), []);

  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <span
      {...rest}
      className={cn("relative inline-block shrink-0 align-middle", className)}
      style={{ width: dimension, height: dimension, ...style }}
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
