import type { gsap } from "gsap";

export const MOXIE_ANIMATIONS = [
  "idle",
  "welcome",
  "wave",
  "thinking",
  "suspicious",
  "impatient",
  "hide",
  "peek",
  "loading",
  "celebrate",
  "sleeping",
] as const;

export type MoxieAnimation = (typeof MOXIE_ANIMATIONS)[number];

/** Every independently animatable layer of the artwork. */
export interface MoxieParts {
  /** Whole character (not the ground shadow). Pivots at the ground under her feet. */
  root: SVGGElement;
  shadow: SVGEllipseElement;
  legs: SVGGElement;
  legList: SVGRectElement[];
  smallClaw: SVGGElement;
  smallPincer: SVGGElement;
  body: SVGGElement;
  /** Darker belly stroke drawn on the body — shifted slightly for parallax. */
  bellyShade: SVGPathElement;
  bigClaw: SVGGElement;
  bigPincer: SVGGElement;
  /** Whole stalk + eye — bends from the stalk's base. */
  stalkL: SVGGElement;
  stalkR: SVGGElement;
  /** Just the stalk line — stretched/shortened while the eye moves along it. */
  stalkLineL: SVGGElement;
  stalkLineR: SVGGElement;
  eyeL: SVGGElement;
  eyeR: SVGGElement;
  pupilL: SVGGElement;
  pupilR: SVGGElement;
  glintL: SVGGElement;
  glintR: SVGGElement;
  lidL: SVGGElement;
  lidR: SVGGElement;
  /** Closed-eye line, faded in only while a lid is fully shut. */
  lashL: SVGPathElement;
  lashR: SVGPathElement;
  /** Mouth + blush. Drawn above the big claw, so it's a separate layer that mirrors the body. */
  face: SVGGElement;
  sparkles: SVGGElement[];
  zs: SVGGElement[];
}

export type MoxieTimelineFactory = (parts: MoxieParts) => gsap.core.Timeline;

export interface MoxiePreset {
  /**
   * loop — `cycle` repeats until another animation is played.
   * once — a reaction that eases back into `idle` when finished.
   * hold — stays on its final pose (e.g. hidden) until told otherwise.
   */
  mode: "loop" | "once" | "hold";
  /** Moves into the animation (or, for once/hold, the whole animation). */
  intro?: MoxieTimelineFactory;
  /** One cycle of a loop. Rebuilt every cycle, so randomised details vary. */
  cycle?: MoxieTimelineFactory;
  /** Start from wherever she is instead of easing back to neutral first. */
  fromCurrentPose?: boolean;
  /** Static key pose used instead of motion when the user prefers reduced motion. */
  reducedPose?: MoxieTimelineFactory;
}

export interface MoxieHandle {
  /** Plays an animation now — also replays the one already showing. */
  play: (animation: MoxieAnimation) => void;
}
