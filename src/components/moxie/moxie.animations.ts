import { gsap } from "gsap";
import { DEPTH, LID, PUPIL_REACH, PUPIL_REST, SPARKLE_BURST, STALK_REACH } from "./moxie.constants";
import type { MoxieAnimation, MoxieParts, MoxiePreset } from "./moxie.types";

// Moxie's motion library. Each preset builds plain GSAP timelines from the
// parts of the artwork; MoxieController decides when they run.
//
// Motion principles used throughout:
//  • anticipation before big moves, follow-through after (stalks lag the body)
//  • squash/stretch pivots at the ground, so she never floats off her feet
//  • parallax — near layers (big claw, eyes) travel further than far ones
//  • restrained eases (power/sine/back); elastic only on the stalks' wobble

type TL = gsap.core.Timeline;
type Side = "L" | "R";

const SHADOW_OPACITY = 0.1;
const random = (min: number, max: number) => gsap.utils.random(min, max);
const chance = (probability: number) => Math.random() < probability;
const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

function timeline(): TL {
  return gsap.timeline({ defaults: { ease: "sine.inOut", duration: 0.4 } });
}

function transformLayers(p: MoxieParts) {
  return [
    p.root, p.legs, ...p.legList, p.smallClaw, p.smallPincer, p.body, p.bellyShade, p.bigClaw, p.bigPincer,
    p.stalkL, p.stalkR, p.stalkLineL, p.stalkLineR, p.eyeL, p.eyeR, p.pupilL, p.pupilR, p.glintL, p.glintR,
    p.lidL, p.lidR, p.face,
  ];
}

// ─── Building blocks ──────────────────────────────────────────────────────────

/** Eases every layer back to the artwork's resting pose. */
export function toNeutral(p: MoxieParts, duration = 0.35, ease = "power2.inOut"): TL {
  const tl = gsap.timeline();
  tl.to(transformLayers(p), { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, duration, ease }, 0)
    .to(p.shadow, { x: 0, scaleX: 1, scaleY: 1, opacity: SHADOW_OPACITY, duration, ease }, 0)
    .to([...p.sparkles, ...p.zs, p.lashL, p.lashR], { opacity: 0, duration: Math.min(duration, 0.25) }, 0);
  return tl;
}

/** Fades the closed-eye lash lines in (lids shut) or out (lids opening). */
function lashes(tl: TL, targets: SVGPathElement[], shown: boolean, at: number) {
  tl.to(targets, { opacity: shown ? 1 : 0, duration: 0.12, ease: "none" }, at);
}

/**
 * Points both pupils (or one) at an offset from the eye's centre, clamped so
 * they never cross the outline. The glints trail slightly behind — a light
 * reflection doesn't move as much as the eyeball, which reads as depth.
 */
function look(tl: TL, p: MoxieParts, x: number, y: number, at: number, duration = 0.35, ease = "power3.out", side?: Side) {
  const length = Math.hypot(x, y);
  const k = length > PUPIL_REACH ? PUPIL_REACH / length : 1;
  const dx = x * k - PUPIL_REST.x;
  const dy = y * k - PUPIL_REST.y;
  const pupils = side === "L" ? [p.pupilL] : side === "R" ? [p.pupilR] : [p.pupilL, p.pupilR];
  const glints = side === "L" ? [p.glintL] : side === "R" ? [p.glintR] : [p.glintL, p.glintR];
  tl.to(pupils, { x: dx, y: dy, duration, ease }, at).to(glints, { x: dx * 0.85, y: dy * 0.85, duration, ease }, at);
}

const lookHome = (tl: TL, p: MoxieParts, at: number, duration = 0.4) =>
  look(tl, p, PUPIL_REST.x, PUPIL_REST.y, at, duration, "sine.inOut");

function blink(tl: TL, p: MoxieParts, at: number, restL: number = LID.open, restR: number = restL) {
  tl.to([p.lidL, p.lidR], { y: LID.closed, duration: 0.08, ease: "power2.in" }, at)
    .to(p.lidL, { y: restL, duration: 0.15, ease: "power2.out" }, at + 0.1)
    .to(p.lidR, { y: restR, duration: 0.15, ease: "power2.out" }, at + 0.1);
}

/** Lengthens (>1) or shortens (<1) one stalk; its eye slides along without distorting. */
function stretchStalk(tl: TL, p: MoxieParts, side: Side, scale: number, at: number, duration: number, ease: string) {
  const line = side === "L" ? p.stalkLineL : p.stalkLineR;
  const eye = side === "L" ? p.eyeL : p.eyeR;
  const reach = STALK_REACH[side];
  tl.to(line, { scaleY: scale, duration, ease }, at).to(
    eye,
    { x: reach.x * (scale - 1), y: reach.y * (scale - 1), duration, ease },
    at,
  );
}

function stretchStalks(tl: TL, p: MoxieParts, scale: number, at: number, duration: number, ease: string) {
  stretchStalk(tl, p, "L", scale, at, duration, ease);
  stretchStalk(tl, p, "R", scale, at, duration, ease);
}

/** Shifts layers sideways by depth — a small turn of her whole body in 2.5D. */
function parallax(tl: TL, p: MoxieParts, dx: number, at: number, duration: number, ease = "sine.inOut") {
  tl.to(p.legs, { x: dx * DEPTH.legs, duration, ease }, at)
    .to(p.smallClaw, { x: dx * DEPTH.smallClaw, duration, ease }, at)
    .to(p.body, { x: dx * DEPTH.body, duration, ease }, at)
    // The belly stroke lives inside the body, so it moves relative to it.
    .to(p.bellyShade, { x: dx * (DEPTH.bellyShade - DEPTH.body), duration, ease }, at)
    .to(p.face, { x: dx * DEPTH.face, duration, ease }, at)
    .to([p.stalkL, p.stalkR], { x: dx * DEPTH.stalks, duration, ease }, at)
    .to(p.bigClaw, { x: dx * DEPTH.bigClaw, duration, ease }, at);
}

/** The big claw waves from the shoulder; the pincer flicks a beat behind. Returns the end time. */
function waveClaw(tl: TL, p: MoxieParts, at: number, waves: number, high: number, low: number): number {
  const beat = 0.26;
  tl.to(p.bigClaw, { rotation: high, duration: 0.28, ease: "back.out(2)" }, at)
    .to(p.bigPincer, { rotation: -10, duration: 0.3, ease: "back.out(2)" }, at + 0.05);
  let t = at + 0.28;
  for (let i = 0; i < waves; i++) {
    tl.to(p.bigClaw, { rotation: low, duration: beat }, t)
      .to(p.bigPincer, { rotation: 8, duration: beat }, t + 0.05)
      .to(p.root, { rotation: 0.8, duration: beat }, t)
      .to(p.bigClaw, { rotation: high, duration: beat }, t + beat)
      .to(p.bigPincer, { rotation: -10, duration: beat }, t + beat + 0.05)
      .to(p.root, { rotation: -0.8, duration: beat }, t + beat);
    t += beat * 2;
  }
  tl.to(p.bigClaw, { rotation: 0, duration: 0.55, ease: "back.out(1.6)" }, t)
    .to(p.bigPincer, { rotation: 0, duration: 0.6, ease: "back.out(1.6)" }, t + 0.06)
    .to(p.root, { rotation: 0, duration: 0.5 }, t);
  return t + 0.6;
}

/** Sideways crab walk to `toX`: alternating legs, a bob per step, the claw swinging along. */
function scuttle(tl: TL, p: MoxieParts, toX: number, direction: 1 | -1, at: number, duration: number, steps: number) {
  tl.to([p.root, p.shadow], { x: toX, duration, ease: "sine.inOut" }, at);
  const step = duration / steps;
  for (let i = 0; i < steps; i++) {
    const t = at + i * step;
    const lifted = i % 2 === 0 ? [p.legList[0], p.legList[2]] : [p.legList[1]];
    tl.to(lifted, { y: -6, rotation: direction * 12, duration: step / 2, ease: "power1.out" }, t)
      .to(lifted, { y: 0, rotation: 0, duration: step / 2, ease: "power1.in" }, t + step / 2)
      .to(p.root, { y: -3, duration: step / 2, ease: "sine.out" }, t)
      .to(p.root, { y: 0, duration: step / 2, ease: "sine.in" }, t + step / 2)
      .to(p.bigClaw, { rotation: i % 2 ? 3 : -3, duration: step }, t);
  }
  tl.to(p.bigClaw, { rotation: 0, duration: 0.3 }, at + duration);
}

// ─── Poses (shared by animations and their reduced-motion versions) ──────────

function thinkingPose(tl: TL, p: MoxieParts, at: number, duration: number) {
  tl.to(p.bigClaw, { rotation: 24, duration, ease: "power3.inOut" }, at) // claw comes up to the chin
    .to(p.bigPincer, { rotation: 10, duration, ease: "power3.inOut" }, at + 0.08)
    .to(p.stalkL, { rotation: 7, duration, ease: "back.out(1.4)" }, at + 0.1) // stalks lean in
    .to(p.stalkR, { rotation: -7, duration, ease: "back.out(1.4)" }, at + 0.16)
    .to([p.lidL, p.lidR], { y: LID.relaxed, duration: duration * 0.6 }, at + 0.2)
    .to(p.root, { rotation: -1.2, duration }, at);
  parallax(tl, p, 3, at, duration);
  look(tl, p, 8, -8, at + 0.25, duration * 0.7, "sine.inOut");
}

function suspiciousPose(tl: TL, p: MoxieParts, at: number, duration: number) {
  tl.to(p.root, { rotation: -2.5, duration, ease: "power2.out" }, at)
    .to(p.stalkL, { rotation: -9, duration, ease: "back.out(2)" }, at + 0.05)
    .to(p.stalkR, { rotation: -3, duration, ease: "back.out(2)" }, at + 0.12)
    .to(p.lidL, { y: LID.squint, duration: duration * 0.7, ease: "power2.out" }, at + 0.2)
    .to(p.eyeR, { scale: 1.06, duration: duration * 0.7, ease: "back.out(3)" }, at + 0.2);
  parallax(tl, p, -6, at, duration, "power2.out");
  stretchStalk(tl, p, "L", 0.9, at + 0.05, duration, "back.out(2)");
  stretchStalk(tl, p, "R", 1.1, at + 0.05, duration, "back.out(2)");
  look(tl, p, 11, 1, at + 0.15, 0.3, "power3.out", "L");
  look(tl, p, 1, 2, at + 0.15, 0.3, "power3.out", "R");
}

function impatientPose(tl: TL, p: MoxieParts, at: number, duration: number) {
  // Claw lowered to tap the "desk"; stalks and eyes turned toward the work.
  tl.to(p.bigClaw, { rotation: -56, duration, ease: "power3.inOut" }, at)
    .to(p.bigPincer, { rotation: -10, duration, ease: "power3.inOut" }, at + 0.05)
    .to(p.stalkL, { rotation: 6, duration, ease: "back.out(1.5)" }, at + 0.1)
    .to(p.stalkR, { rotation: 8, duration, ease: "back.out(1.5)" }, at + 0.14)
    .to([p.lidL, p.lidR], { y: LID.flat, duration }, at)
    .to(p.root, { rotation: 1.5, duration }, at)
    // Shuffle right a touch so the lowered claw stays inside her frame.
    .to([p.root, p.shadow], { x: 12, duration }, at);
  parallax(tl, p, 4, at, duration);
  look(tl, p, 9, 6, at + 0.1, duration * 0.6);
}

/** Curled up tight: squashed to the ground, stalks retracted, eyes shut, claws and legs tucked in. */
function curlUp(tl: TL, p: MoxieParts, at: number, duration: number, ease: string) {
  tl.to(p.root, { x: 0, y: 0, rotation: 0, scaleY: 0.8, scaleX: 1.1, duration, ease }, at)
    .to([p.stalkL, p.stalkR], { x: 0, rotation: 0, duration, ease }, at)
    .to([p.lidL, p.lidR], { y: LID.closed, duration: duration * 0.6 }, at + duration * 0.2)
    .to(p.bigClaw, { rotation: 30, duration, ease }, at)
    .to(p.bigPincer, { rotation: 15, duration, ease }, at)
    .to(p.smallClaw, { rotation: -45, duration, ease }, at) // tucks behind the body
    .to(p.smallPincer, { rotation: -12, duration, ease }, at)
    .to(p.legs, { y: -16, duration, ease }, at) // pulled up behind the body
    .to(p.shadow, { x: 0, scaleX: 1.08, opacity: SHADOW_OPACITY * 1.2, duration, ease }, at);
  lashes(tl, [p.lashL, p.lashR], true, at + duration * 0.7);
  stretchStalks(tl, p, 0.3, at, duration, ease);
  lookHome(tl, p, at, duration);
}

function sleepPose(tl: TL, p: MoxieParts, at: number, duration: number) {
  tl.to(p.stalkL, { rotation: -26, duration, ease: "power2.inOut" }, at) // stalks droop outward
    .to(p.stalkR, { rotation: 24, duration, ease: "power2.inOut" }, at + 0.1)
    .to(p.bigClaw, { rotation: -20, duration }, at)
    .to(p.bigPincer, { rotation: -8, duration }, at + 0.1)
    .to(p.smallClaw, { rotation: 10, duration }, at)
    .to(p.root, { y: 2, scaleY: 0.98, scaleX: 1.01, duration }, at)
    .to([p.lidL, p.lidR], { y: LID.sleepy, duration: duration * 0.5 }, at)
    .to([p.lidL, p.lidR], { y: LID.closed, duration: duration * 0.5 }, at + duration * 0.6);
  lashes(tl, [p.lashL, p.lashR], true, at + duration);
  stretchStalks(tl, p, 0.9, at, duration, "power2.inOut");
  look(tl, p, 0, 8, at, duration, "sine.inOut");
}

function poseOnly(pose: (tl: TL, p: MoxieParts, at: number, duration: number) => void) {
  return (p: MoxieParts) => {
    const tl = timeline();
    pose(tl, p, 0, 0.4);
    return tl;
  };
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const idle: MoxiePreset = {
  mode: "loop",
  cycle: (p) => {
    const tl = timeline();
    const breath = random(2.6, 3.3);
    const half = breath / 2;
    const total = breath * 2;

    for (let i = 0; i < 2; i++) {
      const t = i * breath;
      tl.to(p.root, { y: -3, scaleY: 1.02, scaleX: 0.993, duration: half }, t)
        .to(p.root, { y: 0, scaleY: 1, scaleX: 1, duration: half }, t + half)
        .to(p.shadow, { scaleX: 0.95, opacity: SHADOW_OPACITY * 0.85, duration: half }, t)
        .to(p.shadow, { scaleX: 1, opacity: SHADOW_OPACITY, duration: half }, t + half)
        // The body swells a beat after the rest of her — overlapping action.
        .to([p.body, p.face], { scaleY: 1.012, scaleX: 1.006, duration: half }, t + 0.15)
        .to([p.body, p.face], { scaleY: 1, scaleX: 1, duration: half - 0.15 }, t + half + 0.15);
    }

    const sway = random(1.5, 2.8) * (chance(0.5) ? 1 : -1);
    tl.to(p.stalkL, { rotation: sway, duration: total / 2 }, 0)
      .to(p.stalkL, { rotation: 0, duration: total / 2 }, total / 2)
      .to(p.stalkR, { rotation: -sway * 0.8, duration: total / 2 - 0.3 }, 0.3)
      .to(p.stalkR, { rotation: 0, duration: total / 2 }, total / 2)
      .to(p.bigClaw, { rotation: -2, duration: total / 2 }, 0)
      .to(p.bigClaw, { rotation: 0, duration: total / 2 }, total / 2)
      .to(p.bigPincer, { rotation: 3, duration: total / 2 }, 0.25)
      .to(p.bigPincer, { rotation: 0, duration: total / 2 - 0.25 }, total / 2 + 0.25)
      .to(p.smallClaw, { rotation: 4, duration: breath }, half)
      .to(p.smallClaw, { rotation: 0, duration: half }, breath + half);

    if (chance(0.65)) {
      const at = random(0.6, total * 0.35);
      const [x, y] = pick([[-9, -4], [10, -3], [-6, 6], [9, 5], [0, -9]] as const);
      look(tl, p, x, y, at);
      lookHome(tl, p, at + random(1.1, 1.9), 0.45);
    }

    const blinkAt = random(0.4, total - 1.0);
    blink(tl, p, blinkAt);
    if (chance(0.25)) blink(tl, p, blinkAt + 0.32);

    if (chance(0.3)) {
      const at = random(1, total - 1);
      tl.to(p.smallPincer, { rotation: -10, duration: 0.12, ease: "power2.out" }, at)
        .to(p.smallPincer, { rotation: 0, duration: 0.3, ease: "back.out(3)" }, at + 0.12);
    }
    return tl;
  },
};

const welcome: MoxiePreset = {
  mode: "once",
  intro: (p) => {
    const tl = timeline();
    look(tl, p, 0, 2, 0, 0.2); // notices you
    // Anticipation, then a small hop.
    tl.to(p.root, { scaleY: 0.94, scaleX: 1.04, duration: 0.16, ease: "power2.in" }, 0)
      .to(p.root, { y: -16, scaleY: 1.05, scaleX: 0.97, duration: 0.24, ease: "power2.out" }, 0.16)
      .to(p.root, { y: 0, scaleY: 0.95, scaleX: 1.04, duration: 0.2, ease: "power2.in" }, 0.4)
      .to(p.root, { scaleY: 1, scaleX: 1, duration: 0.5, ease: "back.out(2.5)" }, 0.6)
      .to(p.shadow, { scaleX: 0.86, opacity: SHADOW_OPACITY * 0.7, duration: 0.24, ease: "power2.out" }, 0.16)
      .to(p.shadow, { scaleX: 1, opacity: SHADOW_OPACITY, duration: 0.2, ease: "power2.in" }, 0.4);
    // Stalks perk up and spread.
    stretchStalks(tl, p, 1.12, 0.14, 0.32, "back.out(3)");
    tl.to(p.stalkL, { rotation: -4, duration: 0.32, ease: "back.out(3)" }, 0.14)
      .to(p.stalkR, { rotation: 4, duration: 0.32, ease: "back.out(3)" }, 0.14);
    const end = waveClaw(tl, p, 0.5, 2, 14, -8);
    stretchStalks(tl, p, 1, end - 0.7, 0.5, "power2.inOut");
    tl.to([p.stalkL, p.stalkR], { rotation: 0, duration: 0.5 }, end - 0.7);
    blink(tl, p, end - 0.45);
    tl.add(toNeutral(p, 0.5), end);
    return tl;
  },
};

const wave: MoxiePreset = {
  mode: "once",
  intro: (p) => {
    const tl = timeline();
    look(tl, p, -8, -6, 0.1, 0.4); // watches her own claw
    tl.to(p.bigClaw, { rotation: -10, duration: 0.25, ease: "power2.inOut" }, 0) // anticipation dip
      .to(p.bigPincer, { rotation: 6, duration: 0.25 }, 0);
    const end = waveClaw(tl, p, 0.25, 3, 18, -6);
    // Stalks follow the claw a beat late; the body turns a touch toward it.
    tl.to(p.stalkL, { rotation: -5, duration: 0.5 }, 0.3)
      .to(p.stalkR, { rotation: -3, duration: 0.55 }, 0.36)
      .to([p.stalkL, p.stalkR], { rotation: 0, duration: 0.6, ease: "back.out(1.5)" }, end - 0.6);
    parallax(tl, p, -5, 0.3, 0.6);
    parallax(tl, p, 0, end - 0.6, 0.6);
    look(tl, p, 1, 2, end - 0.7, 0.4); // and back to you
    tl.add(toNeutral(p, 0.4), end);
    return tl;
  },
};

const thinking: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = timeline();
    thinkingPose(tl, p, 0, 0.8);
    return tl;
  },
  cycle: (p) => {
    const tl = timeline();
    const total = random(4.6, 5.6);
    tl.to(p.root, { scaleY: 1.015, scaleX: 0.995, duration: total / 2 }, 0)
      .to(p.root, { scaleY: 1, scaleX: 1, duration: total / 2 }, total / 2);

    // Glance to the other side; the stalks drift with the thought.
    const glanceAt = random(0.7, 1.2);
    look(tl, p, -8, -8, glanceAt, 0.55, "sine.inOut");
    tl.to(p.stalkL, { rotation: 3, duration: 0.8 }, glanceAt).to(p.stalkR, { rotation: -10, duration: 0.8 }, glanceAt + 0.05);
    parallax(tl, p, -3, glanceAt, 0.9);

    // Two light taps of the pincer on the chin.
    const tapAt = glanceAt + 1.2;
    for (let i = 0; i < 2; i++) {
      tl.to(p.bigPincer, { rotation: 18, duration: 0.12, ease: "power2.out" }, tapAt + i * 0.3)
        .to(p.bigPincer, { rotation: 10, duration: 0.18, ease: "power2.in" }, tapAt + i * 0.3 + 0.12);
    }

    // Back to the original angle, ready for the next cycle.
    const backAt = total - 1.2;
    look(tl, p, 8, -8, backAt, 0.6, "sine.inOut");
    tl.to(p.stalkL, { rotation: 7, duration: 0.9 }, backAt).to(p.stalkR, { rotation: -7, duration: 0.9 }, backAt + 0.05);
    parallax(tl, p, 3, backAt, 0.9);

    if (chance(0.6)) blink(tl, p, random(0.2, glanceAt - 0.3), LID.relaxed);
    return tl;
  },
  reducedPose: poseOnly(thinkingPose),
};

const suspicious: MoxiePreset = {
  mode: "once",
  intro: (p) => {
    const tl = timeline();
    suspiciousPose(tl, p, 0, 0.5);
    // The claw slowly comes round to point…
    tl.to(p.bigClaw, { rotation: 14, duration: 1.0, ease: "power2.inOut" }, 0.45)
      .to(p.bigPincer, { rotation: 24, duration: 1.0, ease: "power2.inOut" }, 0.55);
    // …the wide eye joins the side-eye…
    look(tl, p, 11, 0, 1.3, 0.18, "power3.out", "R");
    // …and she leans in for the "really?" beat.
    tl.to([p.root, p.shadow], { x: 3, duration: 0.5, ease: "power2.inOut" }, 1.5)
      .to(p.root, { rotation: -1, duration: 0.5, ease: "power2.inOut" }, 1.5)
      .to(p.lidL, { y: LID.squint + 8, duration: 0.3 }, 1.6);
    tl.add(toNeutral(p, 0.6, "power3.inOut"), 2.9);
    return tl;
  },
  reducedPose: poseOnly(suspiciousPose),
};

const impatient: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = timeline();
    impatientPose(tl, p, 0, 0.6);
    return tl;
  },
  cycle: (p) => {
    const tl = timeline();
    // Tap, tap, tap…
    for (let i = 0; i < 3; i++) {
      const t = i * 0.32;
      tl.to(p.bigClaw, { rotation: -64, duration: 0.1, ease: "power2.in" }, t)
        .to(p.bigClaw, { rotation: -56, duration: 0.18, ease: "power2.out" }, t + 0.1)
        .to(p.bigPincer, { rotation: -16, duration: 0.1, ease: "power2.in" }, t + 0.02)
        .to(p.bigPincer, { rotation: -10, duration: 0.18, ease: "power2.out" }, t + 0.12)
        .to(p.root, { y: -2.5, scaleY: 1.01, duration: 0.1, ease: "power2.out" }, t + 0.1)
        .to(p.root, { y: 0, scaleY: 1, duration: 0.16, ease: "power2.in" }, t + 0.2)
        .to(p.stalkR, { rotation: 11, duration: 0.1, ease: "power2.out" }, t + 0.1)
        .to(p.stalkR, { rotation: 8, duration: 0.2 }, t + 0.2);
    }
    // …then a pause. Sometimes a pointed glance at you, or a flat, unimpressed blink.
    const pause = random(1.1, 1.6);
    const end = 0.96 + pause;
    if (chance(0.4)) {
      look(tl, p, 2, 1, 1.2, 0.25);
      look(tl, p, 9, 6, end - 0.35, 0.25);
    } else if (chance(0.5)) {
      tl.to([p.lidL, p.lidR], { y: LID.heavy, duration: 0.25 }, 1.3).to([p.lidL, p.lidR], { y: LID.flat, duration: 0.35 }, 1.65);
    }
    tl.to({}, { duration: 0 }, end); // pad the cycle to its full length
    return tl;
  },
  reducedPose: poseOnly(impatientPose),
};

const hide: MoxiePreset = {
  mode: "hold",
  intro: (p) => {
    const tl = timeline();
    // Startle: stalks shoot up, eyes widen, pupils shrink, a tiny jolt.
    stretchStalks(tl, p, 1.14, 0, 0.14, "power2.out");
    tl.to([p.eyeL, p.eyeR], { scale: 1.08, duration: 0.14, ease: "power2.out" }, 0)
      .to([p.pupilL, p.pupilR], { scale: 0.8, duration: 0.14 }, 0)
      .to(p.root, { y: -8, scaleY: 1.04, scaleX: 0.98, duration: 0.14, ease: "power2.out" }, 0)
      .to([p.eyeL, p.eyeR, p.pupilL, p.pupilR], { scale: 1, duration: 0.3 }, 0.24);
    // Then pull everything in, fast.
    curlUp(tl, p, 0.24, 0.3, "power3.inOut");
    // A small shiver from inside…
    for (let i = 0; i < 6; i++) {
      tl.to(p.root, { x: i % 2 ? -1.2 : 1.2, duration: 0.05, ease: "none" }, 1.0 + i * 0.05);
    }
    tl.to(p.root, { x: 0, duration: 0.08 }, 1.3);
    // …and one slow breath while she waits it out.
    tl.to(p.root, { scaleY: 0.82, duration: 0.6 }, 1.5).to(p.root, { scaleY: 0.8, duration: 0.6 }, 2.1);
    return tl;
  },
  reducedPose: (p) => {
    const tl = timeline();
    curlUp(tl, p, 0, 0.4, "power2.inOut");
    return tl;
  },
};

const peek: MoxiePreset = {
  mode: "once",
  fromCurrentPose: true, // usually follows "hide" — carry on from the curled-up pose
  intro: (p) => {
    const tl = timeline();
    curlUp(tl, p, 0, 0.3, "power2.inOut"); // no-op if she's already hidden

    // The right eye creeps out first, lid lifting cautiously…
    stretchStalk(tl, p, "R", 0.85, 0.5, 0.9, "power2.out");
    tl.to(p.stalkR, { rotation: 8, duration: 0.9, ease: "power2.out" }, 0.5)
      .to(p.lidR, { y: LID.squint, duration: 0.4 }, 0.8)
      .to(p.lashR, { opacity: 0, duration: 0.1 }, 0.8)
      .to(p.lidR, { y: LID.open, duration: 0.25, ease: "power2.out" }, 1.3);
    // …and looks around.
    look(tl, p, -10, 2, 1.35, 0.25, "power3.out", "R");
    look(tl, p, 11, 0, 1.9, 0.25, "power3.out", "R");
    look(tl, p, 2, 3, 2.4, 0.25, "power3.out", "R");

    // Coast's clear: the left eye follows.
    look(tl, p, 2, 3, 2.35, 0.01, "none", "L");
    stretchStalk(tl, p, "L", 0.85, 2.35, 0.6, "power2.out");
    tl.to(p.lidL, { y: LID.open, duration: 0.3, ease: "power2.out" }, 2.6);
    lashes(tl, [p.lashL], false, 2.6);

    // A cheeky tilt, then she pops back out.
    tl.to([p.stalkL, p.stalkR], { rotation: 6, duration: 0.35, ease: "back.out(2)" }, 2.95)
      .to(p.root, { scaleY: 1, scaleX: 1, duration: 0.6, ease: "back.out(1.8)" }, 3.3)
      .to(p.legs, { y: 0, duration: 0.4, ease: "back.out(2)" }, 3.35)
      .to([p.bigClaw, p.bigPincer, p.smallClaw, p.smallPincer], { rotation: 0, duration: 0.6, ease: "back.out(1.6)" }, 3.4)
      .to(p.shadow, { scaleX: 1, opacity: SHADOW_OPACITY, duration: 0.5 }, 3.3);
    stretchStalks(tl, p, 1, 3.3, 0.6, "back.out(2)");
    blink(tl, p, 4.1);
    tl.add(toNeutral(p, 0.5), 4.4);
    return tl;
  },
};

const loading: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = timeline();
    look(tl, p, 11, 1, 0, 0.3);
    return tl;
  },
  // A sideways crab scuttle: over to the right, a look round, all the way
  // left, a look round, back to the middle. Starts and ends centred, looking right.
  cycle: (p) => {
    const tl = timeline();
    const reach = 16;
    const stalks = [p.stalkL, p.stalkR];

    tl.to(stalks, { rotation: -6, duration: 0.3, ease: "power2.out" }, 0); // stalks lag behind the move
    scuttle(tl, p, reach, 1, 0, 0.9, 4);
    tl.to(stalks, { rotation: 4, duration: 0.25, ease: "power2.out" }, 0.75) // overshoot as she stops
      .to(stalks, { rotation: 0, duration: 0.5, ease: "back.out(2)" }, 1.0);
    look(tl, p, 0, -10, 1.0, 0.25);
    look(tl, p, -11, 1, 1.35, 0.25);
    tl.to(p.smallPincer, { rotation: -14, duration: 0.1 }, 1.1).to(p.smallPincer, { rotation: 0, duration: 0.25, ease: "back.out(3)" }, 1.22);

    tl.to(stalks, { rotation: 6, duration: 0.3, ease: "power2.out" }, 1.6);
    scuttle(tl, p, -reach, -1, 1.6, 1.4, 6);
    tl.to(stalks, { rotation: -4, duration: 0.25, ease: "power2.out" }, 2.85)
      .to(stalks, { rotation: 0, duration: 0.5, ease: "back.out(2)" }, 3.1);
    look(tl, p, -6, -8, 3.05, 0.25);
    look(tl, p, 11, 1, 3.45, 0.25);
    tl.to(p.bigPincer, { rotation: 8, duration: 0.1 }, 3.2).to(p.bigPincer, { rotation: 0, duration: 0.3, ease: "back.out(3)" }, 3.3);

    tl.to(stalks, { rotation: -6, duration: 0.3, ease: "power2.out" }, 3.7);
    scuttle(tl, p, 0, 1, 3.7, 0.9, 4);
    tl.to(stalks, { rotation: 0, duration: 0.4, ease: "back.out(2)" }, 4.45);
    return tl;
  },
};

const celebrate: MoxiePreset = {
  mode: "once",
  intro: (p) => {
    const tl = timeline();
    // Crouch…
    tl.to(p.root, { scaleY: 0.86, scaleX: 1.08, duration: 0.22, ease: "power2.in" }, 0)
      .to(p.shadow, { scaleX: 1.06, duration: 0.22 }, 0)
      .to(p.bigClaw, { rotation: -8, duration: 0.22 }, 0);
    stretchStalks(tl, p, 0.9, 0, 0.22, "power2.in");
    look(tl, p, 0, 1, 0.22, 0.2);

    // …jump: stalks extend, claw up, legs dangle, happy squint.
    tl.to(p.root, { y: -42, scaleY: 1.08, scaleX: 0.94, duration: 0.36, ease: "power2.out" }, 0.22)
      .to(p.shadow, { scaleX: 0.55, opacity: SHADOW_OPACITY * 0.45, duration: 0.36, ease: "power2.out" }, 0.22)
      .to(p.bigClaw, { rotation: 22, duration: 0.4, ease: "back.out(2)" }, 0.22)
      .to(p.bigPincer, { rotation: -14, duration: 0.4, ease: "back.out(2)" }, 0.26)
      .to(p.smallClaw, { rotation: -35, duration: 0.4, ease: "back.out(2)" }, 0.24)
      .to(p.legList, { rotation: (i: number) => (i - 1) * 9, y: -3, duration: 0.3 }, 0.26)
      .to([p.lidL, p.lidR], { y: LID.happy, duration: 0.25 }, 0.3);
    stretchStalks(tl, p, 1.1, 0.22, 0.35, "back.out(2)");

    // Mid-air twist: she narrows as if turning away while near layers slide
    // past far ones (parallax), then swings back to face you. Never edge-on.
    tl.to(p.root, { scaleX: 0.62, duration: 0.18, ease: "power2.out" }, 0.5)
      .to(p.root, { scaleX: 0.94, duration: 0.3, ease: "back.out(2)" }, 0.68);
    parallax(tl, p, 14, 0.5, 0.18, "power2.out");
    parallax(tl, p, 0, 0.68, 0.3, "back.out(2)");

    // Sparkles burst out from behind her.
    p.sparkles.forEach((sparkle, i) => {
      const b = SPARKLE_BURST[i];
      const at = 0.4 + i * 0.04;
      tl.set(sparkle, { x: 0, y: 0, scale: 0, rotation: 0, opacity: 1 }, at)
        .to(sparkle, { x: b.x, y: b.y, scale: b.scale, rotation: 140, duration: 0.75, ease: "power3.out" }, at)
        .to(sparkle, { opacity: 0, scale: b.scale * 0.3, duration: 0.45, ease: "power1.in" }, at + 0.55);
    });

    // Fall, land with a squash, and let the stalks wobble after her.
    tl.to(p.root, { y: 0, scaleY: 1.05, scaleX: 0.96, duration: 0.3, ease: "power2.in" }, 0.9)
      .to(p.shadow, { scaleX: 1, opacity: SHADOW_OPACITY, duration: 0.3, ease: "power2.in" }, 0.9)
      .to(p.legList, { rotation: 0, y: 0, duration: 0.2 }, 1.0)
      .to(p.root, { scaleY: 0.87, scaleX: 1.08, duration: 0.1, ease: "power2.out" }, 1.2)
      .to(p.shadow, { scaleX: 1.08, duration: 0.1 }, 1.2)
      .to(p.root, { scaleY: 1, scaleX: 1, duration: 0.5, ease: "back.out(2.2)" }, 1.3)
      .to(p.shadow, { scaleX: 1, duration: 0.4 }, 1.3);
    stretchStalks(tl, p, 0.92, 1.2, 0.12, "power2.out");
    stretchStalks(tl, p, 1, 1.32, 0.8, "elastic.out(1, 0.45)");

    // A victory pump, then back to normal.
    tl.to(p.bigClaw, { rotation: 30, duration: 0.18, ease: "power2.out" }, 1.55)
      .to(p.bigClaw, { rotation: 22, duration: 0.3, ease: "back.out(2)" }, 1.73);
    tl.add(toNeutral(p, 0.6, "power3.inOut"), 2.3);
    return tl;
  },
  reducedPose: (p) => {
    const tl = timeline();
    tl.to(p.bigClaw, { rotation: 22, duration: 0.4 }, 0).to([p.lidL, p.lidR], { y: LID.happy, duration: 0.4 }, 0);
    return tl;
  },
};

const sleeping: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = timeline();
    sleepPose(tl, p, 0, 1.2);
    return tl;
  },
  cycle: (p) => {
    const tl = timeline();
    const breath = random(2.3, 2.7);
    // Slow, deep breathing; the drooped stalks rise and fall with it.
    tl.to(p.root, { y: 0, scaleY: 1, scaleX: 1, duration: breath }, 0)
      .to(p.root, { y: 2, scaleY: 0.98, scaleX: 1.01, duration: breath }, breath)
      .to(p.shadow, { scaleX: 0.96, duration: breath }, 0)
      .to(p.shadow, { scaleX: 1, duration: breath }, breath)
      .to(p.stalkL, { rotation: -23, duration: breath }, 0.2)
      .to(p.stalkL, { rotation: -26, duration: breath - 0.2 }, breath + 0.2)
      .to(p.stalkR, { rotation: 21, duration: breath }, 0.3)
      .to(p.stalkR, { rotation: 24, duration: breath - 0.3 }, breath + 0.3);

    // A trail of drifting z's.
    p.zs.forEach((z, i) => {
      const at = 0.3 + i * 0.85;
      tl.set(z, { x: 0, y: 0, scale: 0.5, rotation: -10, opacity: 0 }, at)
        .to(z, { x: 16 + i * 4, y: -36, scale: 1.1 - i * 0.15, rotation: 8, duration: 2.2, ease: "sine.out" }, at)
        .to(z, { opacity: 1, duration: 0.5, ease: "power1.out" }, at)
        .to(z, { opacity: 0, duration: 0.8, ease: "power1.in" }, at + 1.4);
    });

    // Now and then, a little twitch in her sleep.
    if (chance(0.4)) {
      const at = random(0.8, breath * 2 - 1);
      if (chance(0.5)) {
        tl.to(p.smallClaw, { rotation: 22, duration: 0.12, ease: "power2.out" }, at)
          .to(p.smallClaw, { rotation: 10, duration: 0.5, ease: "back.out(2)" }, at + 0.12);
      } else {
        tl.to(p.legList[2], { rotation: 10, duration: 0.1, ease: "power2.out" }, at)
          .to(p.legList[2], { rotation: 0, duration: 0.4, ease: "back.out(2)" }, at + 0.1);
      }
    }
    return tl;
  },
  reducedPose: poseOnly(sleepPose),
};

export const MOXIE_PRESETS: Record<MoxieAnimation, MoxiePreset> = {
  idle,
  welcome,
  wave,
  thinking,
  suspicious,
  impatient,
  hide,
  peek,
  loading,
  celebrate,
  sleeping,
};
