import { gsap } from "gsap";
import {
  bridgePath,
  DEPTH,
  INK_STYLE,
  lensCorner,
  LID,
  PAPER_ROWS,
  PAPER_SEAL,
  paperPoint,
  paperRowPoints,
  PENCIL_TIP,
  polylineLength,
  PUPIL_REACH,
  PUPIL_REST,
  READ_HOLD,
  SHOULDER,
  SPARKLE_BURST,
  SPARKLE_ORIGIN,
  STALK_REACH,
  TAILOR_CUT_ROW,
} from "./moxie.constants";
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
    p.lidL, p.lidR, p.face, p.paperBack, p.paperSheet, p.groundPost, p.glassesL, p.glassesR,
    p.bladeA, p.bladeB,
  ];
}

/** Scene props — faded out by toNeutral so every other animation starts without them. */
function propLayers(p: MoxieParts) {
  return [
    p.pencil, p.stamp, p.scissors,
    p.paperBack, p.groundPost, p.glassesL, p.glassesR, p.glassesBridge,
  ];
}

const PAPER_INK_LENGTHS = PAPER_ROWS.map((row) => polylineLength(paperRowPoints(row)));

/** What's on the sheet she holds out: nothing yet (to write on), a CV, or the job post. */
type SheetContent = "blank" | "cv" | "job";

/**
 * Readies the sheet she holds out with that content, and no handwriting or
 * seal on it yet (any line of writing she cut out goes back in place).
 */
function resetPaper(tl: TL, p: MoxieParts, content: SheetContent, at: number) {
  tl.set(p.paperText, { opacity: content === "cv" ? 1 : 0 }, at)
    .set(p.paperJob, { opacity: content === "job" ? 1 : 0 }, at)
    .set(p.paperInks, { strokeDashoffset: (i: number) => PAPER_INK_LENGTHS[i] }, at)
    .set(p.paperInks, { x: 0, y: 0, rotation: 0, opacity: (i: number) => INK_STYLE[PAPER_ROWS[i].kind].opacity }, at)
    .set(p.paperSeal, { opacity: 0, scale: 1 }, at);
}

/** A yellow pencil for writing, a red one for editing. */
const PENCIL_COLORS = { write: "#FFC94A", edit: "#E04E24" } as const;
function pencilColor(tl: TL, p: MoxieParts, kind: keyof typeof PENCIL_COLORS, at: number) {
  tl.set(p.pencilBody, { attr: { fill: PENCIL_COLORS[kind] } }, at);
}

// ─── Building blocks ──────────────────────────────────────────────────────────

/** Eases every layer back to the artwork's resting pose. */
export function toNeutral(p: MoxieParts, duration = 0.35, ease = "power2.inOut"): TL {
  const tl = gsap.timeline();
  tl.to(transformLayers(p), { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, duration, ease }, 0)
    .to(p.shadow, { x: 0, scaleX: 1, scaleY: 1, opacity: SHADOW_OPACITY, duration, ease }, 0)
    .to([...p.sparkles, ...p.zs, p.lashL, p.lashR, ...propLayers(p)], { opacity: 0, duration: Math.min(duration, 0.25) }, 0);
  mouth(tl, p, "smile", 0, Math.min(duration, 0.15));
  return tl;
}

type Mouth = "smile" | "talk" | "flat" | "o" | "tongue";

/** Swaps her mouth to another shape (one is shown at a time; the smile is her resting mouth). */
function mouth(tl: TL, p: MoxieParts, shape: Mouth, at: number, duration = 0.08) {
  const shapes: Record<Mouth, Element> = {
    smile: p.mouthSmile,
    talk: p.mouthTalk,
    flat: p.mouthFlat,
    o: p.mouthO,
    tongue: p.mouthTongue,
  };
  const others = (Object.keys(shapes) as Mouth[]).filter((s) => s !== shape).map((s) => shapes[s]);
  tl.to(others, { opacity: 0, duration, ease: "none" }, at)
    .to(shapes[shape], { opacity: 1, duration, ease: "none" }, at)
    .to(p.mouthTalk, { scaleY: 1, scaleX: 1, duration }, at);
}

/** Mouthing words to herself: the talking mouth squashes open and shut, syllable by syllable. */
function mumble(tl: TL, p: MoxieParts, at: number, duration: number) {
  const syllable = 0.13;
  for (let t = 0; t + syllable <= duration; t += syllable) {
    const open = chance(0.75);
    tl.to(
      p.mouthTalk,
      { scaleY: open ? random(0.7, 1.05) : 0.3, scaleX: open ? random(0.85, 1.05) : 1.1, duration: syllable, ease: "sine.inOut" },
      at + t,
    );
  }
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

// ─── Scenes (Moxie doing the job, with props) ────────────────────────────────

type Point = { x: number; y: number };

/**
 * Puts a point of the claw — the pencil's point by default — on `to` (a
 * point on the page): the claw turns from the shoulder to face it and reaches
 * the rest of the way along that line.
 */
function clawTo(tl: TL, p: MoxieParts, to: Point, at: number, duration: number, ease = "none", from: Point = PENCIL_TIP) {
  const rest = Math.atan2(from.y - SHOULDER.y, from.x - SHOULDER.x);
  const restLength = Math.hypot(from.x - SHOULDER.x, from.y - SHOULDER.y);
  const angle = Math.atan2(to.y - SHOULDER.y, to.x - SHOULDER.x);
  const reach = Math.hypot(to.x - SHOULDER.x, to.y - SHOULDER.y) - restLength;
  tl.to(
    p.bigClaw,
    {
      rotation: ((angle - rest) * 180) / Math.PI,
      x: reach * Math.cos(angle),
      y: reach * Math.sin(angle),
      duration,
      ease,
    },
    at,
  );
}

/** Pencil speed while writing, in drawing units per second (a scribble goes faster). */
const WRITE_SPEED = 64;
const SCRIBBLE_SPEED = 120;

/** Writes one PAPER_ROWS row on the sheet she holds, the ink drawn right under the point. Returns the end time. */
function writeRow(tl: TL, p: MoxieParts, index: number, at: number): number {
  const row = PAPER_ROWS[index];
  const points = paperRowPoints(row);
  const scribble = row.kind === "strike";
  clawTo(tl, p, points[0], at, 0.22, "power2.inOut"); // lift over to the start
  let t = at + 0.22;
  const start = t;
  for (let i = 1; i < points.length; i++) {
    const segment = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    const duration = segment / (scribble ? SCRIBBLE_SPEED : WRITE_SPEED);
    clawTo(tl, p, points[i], t, duration);
    t += duration;
  }
  tl.to(p.paperInks[index], { strokeDashoffset: 0, duration: t - start, ease: "none" }, start);
  // Her eyes follow the point along the row, through the lenses.
  const low = row.v > 0.4 ? 2 : 0;
  look(tl, p, READ_GAZE.from.x, READ_GAZE.from.y + low, start, 0.15, "power2.out");
  look(tl, p, READ_GAZE.to.x, READ_GAZE.to.y + low, t - 0.2, 0.2, "sine.inOut");
  return t;
}

/** The scribble, and the row it crosses out (written first, then changed her mind about). */
const STRIKE_ROW = PAPER_ROWS.findIndex((row) => row.kind === "strike");
const STRUCK_ROW = PAPER_ROWS.findIndex((row) => row.kind === "line" && row.v === PAPER_ROWS[STRIKE_ROW].v);
/** Top to bottom, the scribble right after the line it crosses out. */
const PAPER_WRITING_ORDER = PAPER_ROWS.map((_, i) => i)
  .filter((i) => i !== STRIKE_ROW)
  .flatMap((i) => (i === STRUCK_ROW ? [i, STRIKE_ROW] : [i]));

/**
 * Writing a CV, the way she reads one: reading glasses on, the sheet held
 * out in her small claw and angled toward her, and the pencil in her big
 * claw reaching across to it — the CV appears on the sheet row by row,
 * right under the point. Tongue out the whole time. Midway she squints at a
 * line, scribbles it out, peers at you over her glasses with a sheepish
 * smile, finishes, admires it, and a fresh sheet takes its place.
 */
const write: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = withBridge(timeline(), p);
    raiseSheet(tl, p, "blank", "pencil");
    clawTo(tl, p, paperRowPoints(PAPER_ROWS[0])[0], 0.55, 0.55, "power2.inOut");
    mouth(tl, p, "tongue", 0.8);
    return tl;
  },
  cycle: (p) => {
    const tl = withBridge(timeline(), p);
    let t = 0;
    mouth(tl, p, "tongue", 0); // concentrating
    for (const index of PAPER_WRITING_ORDER) {
      if (index !== STRIKE_ROW) {
        t = writeRow(tl, p, index, t) + 0.1;
        continue;
      }
      // Hmm, no. A squint at that line… scratch it out.
      mouth(tl, p, "flat", t);
      tl.to([p.lidL, p.lidR], { y: LID.squint, duration: 0.2 }, t).to(p.root, { rotation: -3.5, duration: 0.25 }, t);
      t += 0.35;
      mouth(tl, p, "tongue", t);
      t = writeRow(tl, p, index, t);
      // Peers at you over her glasses with a sheepish smile — "you didn't see that" — then back to it.
      mouth(tl, p, "smile", t + 0.1);
      tl.to([p.lidL, p.lidR], { y: LID.open, duration: 0.2 }, t + 0.1).to(p.root, { rotation: -1, duration: 0.3 }, t + 0.1);
      look(tl, p, -1, -10, t + 0.15, 0.25, "power2.out");
      blink(tl, p, t + 0.55, LID.open);
      tl.to([p.lidL, p.lidR], { y: READ_LID, duration: 0.25 }, t + 0.95).to(p.root, { rotation: -2.5, duration: 0.3 }, t + 0.95);
      mouth(tl, p, "tongue", t + 0.95);
      t += 1.15;
    }

    // Done: a proud look and a grin; then a fresh sheet.
    t = admireSheet(tl, p, t);
    swapSheet(tl, p, t, "blank");
    clawTo(tl, p, paperRowPoints(PAPER_ROWS[0])[0], t + 0.3, 0.45, "power2.inOut");
    mouth(tl, p, "tongue", t + 0.5);
    tl.to({}, { duration: 0 }, t + 0.8);
    return tl;
  },
  reducedPose: (p) => {
    const tl = withBridge(timeline(), p);
    tl.set([p.paperBack, p.pencil, p.glassesL, p.glassesR, p.glassesBridge], { opacity: 1 }, 0).set(
      p.paperBack,
      { rotation: -READ_HOLD },
      0,
    );
    resetPaper(tl, p, "blank", 0);
    // A finished page, minus the scribble.
    tl.set(
      PAPER_WRITING_ORDER.filter((i) => i !== STRIKE_ROW).map((i) => p.paperInks[i]),
      { strokeDashoffset: 0 },
      0,
    );
    pencilColor(tl, p, "write", 0);
    holdPaper(tl, p, 0, 0, 0.4);
    readPose(tl, p, 0, 0.4);
    clawTo(tl, p, paperRowPoints(PAPER_ROWS[3])[0], 0, 0.4, "power2.inOut");
    mouth(tl, p, "tongue", 0);
    return tl;
  },
};

/**
 * Redraws the glasses' bridge between the two lenses wherever the eyes are
 * now — they ride on separate stalks, so no fixed shape could join them.
 */
function updateBridge(p: MoxieParts) {
  const toRoot = p.root.getCTM()?.inverse();
  const left = p.glassesL.getCTM();
  const right = p.glassesR.getCTM();
  if (!toRoot || !left || !right) return;
  const a = new DOMPoint(lensCorner("L").x, lensCorner("L").y).matrixTransform(toRoot.multiply(left));
  const b = new DOMPoint(lensCorner("R").x, lensCorner("R").y).matrixTransform(toRoot.multiply(right));
  p.glassesBridge.setAttribute("d", bridgePath(a, b));
}

/** Keeps the bridge attached for as long as this timeline plays. */
function withBridge(tl: TL, p: MoxieParts): TL {
  tl.eventCallback("onUpdate", () => updateBridge(p));
  return tl;
}

/**
 * Holds the paper `rotation` degrees off the reading position. The small claw
 * and the paper share a pivot and move as one; `out` pushes the paper further
 * away along her arm.
 */
function holdPaper(tl: TL, p: MoxieParts, rotation: number, at: number, duration: number, ease = "sine.inOut", out = 0) {
  tl.to(p.smallClaw, { rotation: READ_HOLD + rotation, x: out, duration, ease }, at).to(
    p.paperBack,
    { rotation, x: out, duration, ease },
    at,
  );
}

/** Reading lids: lowered over the top of the eye, leaving the pupils to look out through the lenses. */
const READ_LID = 28;
/** Where her pupils point to read the paper off to her right, through the bottom of the lenses. */
const READ_GAZE = { from: { x: 4, y: 7 }, to: { x: 11, y: 5 } } as const;

/**
 * The farsighted reader: leaning back from the paper she holds out to her
 * right, stalks tipped away from it, eyes looking across and down at it.
 */
function readPose(tl: TL, p: MoxieParts, at: number, duration: number) {
  tl.to(p.stalkL, { rotation: -9, duration, ease: "back.out(1.6)" }, at)
    .to(p.stalkR, { rotation: -6, duration, ease: "back.out(1.6)" }, at + 0.05)
    .to([p.lidL, p.lidR], { y: READ_LID, duration }, at + 0.1)
    .to(p.root, { rotation: -2.5, duration }, at)
    .to(p.bigClaw, { rotation: -6, duration }, at); // the free claw relaxes
  stretchStalks(tl, p, 0.95, at, duration, "sine.inOut");
  parallax(tl, p, -4, at, duration);
  look(tl, p, READ_GAZE.from.x, READ_GAZE.from.y, at + 0.1, 0.3);
}

/**
 * Reading an uploaded CV, to herself: half-moon glasses low on her eyes and
 * the paper held out at arm's length to her right (we only see its back),
 * leaning away from it like a farsighted reader, eyes sweeping each line.
 * She turns the page, sometimes pushes it even further out and squints, and
 * sometimes lowers it to peer at you over her glasses.
 */
const read: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = withBridge(timeline(), p);
    // Out goes the paper, swung up by the small claw…
    resetPaper(tl, p, "cv", 0);
    tl.set(p.paperBack, { rotation: -READ_HOLD, x: 0, opacity: 0 }, 0)
      .set(p.paperSheet, { y: 0, opacity: 1 }, 0)
      .to(p.paperBack, { opacity: 1, duration: 0.2 }, 0);
    holdPaper(tl, p, 0, 0, 0.6, "back.out(1.4)");
    // …on go the glasses, slid down onto her eyes…
    tl.set([p.glassesL, p.glassesR], { opacity: 0, y: -16 }, 0.35)
      .to([p.glassesL, p.glassesR], { opacity: 1, y: 0, duration: 0.35, ease: "back.out(2)" }, 0.35)
      .to(p.glassesBridge, { opacity: 1, duration: 0.2 }, 0.4);
    // …and she leans back to read it.
    readPose(tl, p, 0.55, 0.5);
    return tl;
  },
  cycle: (p) => {
    const tl = withBridge(timeline(), p);
    let t = 0;

    // A few lines, mouthed to herself: eyes sweep along under the lids, then
    // back for the next.
    const readLines = (count: number) => {
      mouth(tl, p, "talk", t);
      for (let i = 0; i < count; i++) {
        look(tl, p, READ_GAZE.from.x, READ_GAZE.from.y, t, 0.12, "power3.out");
        look(tl, p, READ_GAZE.to.x, READ_GAZE.to.y, t + 0.14, 0.55, "none");
        mumble(tl, p, t + 0.12, 0.55);
        tl.to(p.root, { y: -1, duration: 0.3 }, t + 0.2).to(p.root, { y: 0, duration: 0.3 }, t + 0.5);
        t += 0.75;
      }
      mouth(tl, p, "smile", t - 0.06);
    };
    readLines(2);

    if (chance(0.5)) {
      // Can't quite make it out: arm out further, lean back further, squint — "hmm".
      holdPaper(tl, p, -6, t, 0.35, "power2.out", 6);
      tl.to(p.root, { rotation: -4.5, duration: 0.35 }, t).to([p.lidL, p.lidR], { y: LID.squint, duration: 0.25 }, t + 0.1);
      stretchStalks(tl, p, 0.88, t, 0.35, "power2.out");
      look(tl, p, 11, 4, t + 0.1, 0.25);
      mouth(tl, p, "flat", t + 0.1);
      // …ah, there.
      mouth(tl, p, "smile", t + 1.0);
      holdPaper(tl, p, 0, t + 1.0, 0.4, "back.out(1.6)");
      tl.to(p.root, { rotation: -2.5, duration: 0.4 }, t + 1.0).to([p.lidL, p.lidR], { y: READ_LID, duration: 0.25 }, t + 1.0);
      stretchStalks(tl, p, 0.95, t + 1.0, 0.4, "back.out(1.6)");
      t += 1.5;
    }
    readLines(1);

    // A re-grip: the small pincer squeezes and the paper gives a little hitch up.
    tl.to(p.smallPincer, { rotation: -10, duration: 0.12, ease: "power2.out" }, t)
      .to(p.smallPincer, { rotation: 0, duration: 0.3, ease: "back.out(3)" }, t + 0.12);
    holdPaper(tl, p, -3, t, 0.15, "power2.out");
    holdPaper(tl, p, 0, t + 0.15, 0.3, "back.out(2)");
    blink(tl, p, t + 0.1, READ_LID);
    t += 0.6;
    readLines(2);

    if (chance(0.6)) {
      // Peers at you over her glasses: paper lowered, lids up, pupils above the lenses — "oh?"
      holdPaper(tl, p, 12, t, 0.35, "power2.out");
      tl.to(p.root, { rotation: 0, duration: 0.35 }, t).to([p.lidL, p.lidR], { y: LID.open, duration: 0.25 }, t + 0.1);
      stretchStalks(tl, p, 1.04, t, 0.35, "power2.out");
      look(tl, p, -1, -10, t + 0.15, 0.3, "power2.out");
      mouth(tl, p, "o", t + 0.2);
      blink(tl, p, t + 0.95, LID.open);
      // …"hm." Back to it.
      mouth(tl, p, "smile", t + 1.2);
      holdPaper(tl, p, 0, t + 1.35, 0.4);
      tl.to(p.root, { rotation: -2.5, duration: 0.4 }, t + 1.35).to([p.lidL, p.lidR], { y: READ_LID, duration: 0.3 }, t + 1.35);
      stretchStalks(tl, p, 0.95, t + 1.35, 0.4, "sine.inOut");
      look(tl, p, READ_GAZE.from.x, READ_GAZE.from.y, t + 1.35, 0.3);
      t += 1.8;
    } else {
      // A small nod at something good.
      tl.to(p.root, { rotation: -4, duration: 0.18 }, t).to(p.root, { rotation: -2.5, duration: 0.3, ease: "back.out(2)" }, t + 0.18);
      t += 0.6;
    }
    tl.to({}, { duration: 0 }, t);
    return tl;
  },
  reducedPose: (p) => {
    const tl = withBridge(timeline(), p);
    tl.set([p.paperBack, p.glassesL, p.glassesR, p.glassesBridge], { opacity: 1 }, 0).set(p.paperBack, { rotation: -READ_HOLD }, 0);
    resetPaper(tl, p, "cv", 0);
    holdPaper(tl, p, 0, 0, 0.4);
    readPose(tl, p, 0, 0.4);
    return tl;
  },
};

/** Slides the reading glasses down onto her eyes. */
function glassesOn(tl: TL, p: MoxieParts, at: number) {
  tl.set([p.glassesL, p.glassesR], { opacity: 0, y: -16 }, at)
    .to([p.glassesL, p.glassesR], { opacity: 1, y: 0, duration: 0.35, ease: "back.out(2)" }, at)
    .to(p.glassesBridge, { opacity: 1, duration: 0.2 }, at + 0.05);
}

type Tool = "pencil" | "red pencil" | "stamp";

/**
 * The opening shared by the held-sheet scenes (write, polish, stamp): a sheet
 * — printed, or blank to write on — swung up in her small claw, her reading
 * glasses on, the tool in her big claw, and the farsighted reader's pose.
 */
function raiseSheet(tl: TL, p: MoxieParts, content: SheetContent, tool: Tool) {
  resetPaper(tl, p, content, 0);
  tl.set(p.paperBack, { rotation: -READ_HOLD, x: 0, opacity: 0 }, 0)
    .set(p.paperSheet, { y: 0, opacity: 1 }, 0)
    .to(p.paperBack, { opacity: 1, duration: 0.2 }, 0);
  holdPaper(tl, p, 0, 0, 0.6, "back.out(1.4)");
  glassesOn(tl, p, 0.35);
  const held = { pencil: p.pencil, "red pencil": p.pencil, stamp: p.stamp }[tool];
  if (held === p.pencil) pencilColor(tl, p, tool === "red pencil" ? "edit" : "write", 0);
  tl.set(held, { opacity: 0 }, 0).to(held, { opacity: 1, duration: 0.25 }, 0.4);
  readPose(tl, p, 0.55, 0.5);
}

/** That sheet's done: it drops away, and a fresh one rises into her claw. */
function swapSheet(tl: TL, p: MoxieParts, at: number, content: SheetContent) {
  tl.to(p.paperSheet, { y: 26, opacity: 0, duration: 0.25, ease: "power2.in" }, at);
  resetPaper(tl, p, content, at + 0.25);
  tl.set(p.paperSheet, { y: 18 }, at + 0.25)
    .to(p.paperSheet, { y: 0, opacity: 1, duration: 0.35, ease: "back.out(2)" }, at + 0.25)
    .to([p.lidL, p.lidR], { y: READ_LID, duration: 0.25 }, at + 0.3);
  look(tl, p, READ_GAZE.from.x, READ_GAZE.from.y, at + 0.3, 0.25);
}

/** Done with it: the tool comes down, a proud look, a grin and a little bounce. Returns the end time. */
function admireSheet(tl: TL, p: MoxieParts, at: number): number {
  tl.to(p.bigClaw, { rotation: -6, x: 0, y: 0, duration: 0.4, ease: "power2.inOut" }, at);
  look(tl, p, READ_GAZE.to.x, READ_GAZE.to.y - 2, at, 0.25);
  mouth(tl, p, "smile", at + 0.25);
  tl.to([p.lidL, p.lidR], { y: LID.happy, duration: 0.2 }, at + 0.3)
    .to(p.root, { y: -5, scaleY: 1.03, scaleX: 0.99, duration: 0.16, ease: "power2.out" }, at + 0.35)
    .to(p.root, { y: 0, scaleY: 1, scaleX: 1, duration: 0.3, ease: "back.out(2.5)" }, at + 0.51);
  return at + 1.0;
}

/** Where a sparkle should appear to sit on a point of the held sheet (sparkles are positioned from their own origin). */
function onSheet(u: number, v: number) {
  const pt = paperPoint(u, v);
  return { x: pt.x - SPARKLE_ORIGIN.x, y: pt.y - SPARKLE_ORIGIN.y };
}

/** Just off the sheet, toward her — where the tool hovers before it touches down. */
function hoverOver(pt: Point, lift = 1): Point {
  return { x: pt.x - 12 * lift, y: pt.y - 6 * lift };
}

/** The spots she taps to polish it up — each one sparkles. */
const POLISH_TAPS = [
  { u: 0.42, v: 0.26 },
  { u: 0.74, v: 0.47 },
  { u: 0.5, v: 0.7 },
] as const;

/**
 * Improving a CV, the way she reads one: glasses on, the printed CV held out
 * in her small claw, a red pencil in the big one. A squint at a weak line —
 * "hmm" — a firm scribble through it, tongue out; then, whistling, she taps
 * the sheet here, here and here with the pencil, and it sparkles where she
 * taps. A satisfied grin, and a fresh one to improve.
 */
const polish: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = withBridge(timeline(), p);
    raiseSheet(tl, p, "cv", "red pencil");
    clawTo(tl, p, hoverOver(paperRowPoints(PAPER_ROWS[STRIKE_ROW])[0]), 0.55, 0.55, "power2.inOut");
    return tl;
  },
  cycle: (p) => {
    const tl = withBridge(timeline(), p);
    // That line could be better… squint… "hmm"… scratch it.
    look(tl, p, READ_GAZE.from.x, READ_GAZE.from.y + 2, 0, 0.25);
    mouth(tl, p, "flat", 0.1);
    tl.to([p.lidL, p.lidR], { y: LID.squint, duration: 0.25 }, 0.1).to(p.root, { rotation: -3.5, duration: 0.3 }, 0.1);
    mouth(tl, p, "tongue", 0.55);
    let t = writeRow(tl, p, STRIKE_ROW, 0.6);
    tl.to([p.lidL, p.lidR], { y: READ_LID, duration: 0.2 }, t).to(p.root, { rotation: -2.5, duration: 0.25 }, t);

    // Now polish it up: tap, tap, tap — whistling — and it sparkles where she taps.
    mouth(tl, p, "o", t + 0.1);
    t += 0.2;
    POLISH_TAPS.forEach((tap, i) => {
      const at = paperPoint(tap.u, tap.v);
      clawTo(tl, p, hoverOver(at), t, 0.2, "power2.inOut");
      clawTo(tl, p, at, t + 0.2, 0.08, "power3.in");
      look(tl, p, READ_GAZE.from.x + i * 3, READ_GAZE.from.y + tap.v * 3, t, 0.15);
      const sparkle = p.sparkles[i];
      const spot = onSheet(tap.u, tap.v);
      tl.set(sparkle, { ...spot, scale: 0, rotation: 0, opacity: 1 }, t + 0.28)
        .to(sparkle, { x: spot.x + 4, y: spot.y - 8, scale: random(0.55, 0.8), rotation: 120, duration: 0.35, ease: "back.out(3)" }, t + 0.28)
        .to(sparkle, { scale: 0, rotation: 200, opacity: 0, duration: 0.35, ease: "power1.in" }, t + 0.7);
      clawTo(tl, p, hoverOver(at), t + 0.28, 0.15, "power2.out");
      t += 0.5;
    });

    t = admireSheet(tl, p, t + 0.1);
    swapSheet(tl, p, t, "cv");
    clawTo(tl, p, hoverOver(paperRowPoints(PAPER_ROWS[STRIKE_ROW])[0]), t + 0.3, 0.45, "power2.inOut");
    tl.to({}, { duration: 0 }, t + 0.8);
    return tl;
  },
  reducedPose: (p) => {
    const tl = withBridge(timeline(), p);
    tl.set([p.paperBack, p.pencil, p.glassesL, p.glassesR, p.glassesBridge], { opacity: 1 }, 0).set(
      p.paperBack,
      { rotation: -READ_HOLD },
      0,
    );
    resetPaper(tl, p, "cv", 0);
    tl.set(p.paperInks[STRIKE_ROW], { strokeDashoffset: 0 }, 0);
    pencilColor(tl, p, "edit", 0);
    holdPaper(tl, p, 0, 0, 0.4);
    readPose(tl, p, 0, 0.4);
    clawTo(tl, p, hoverOver(paperPoint(POLISH_TAPS[1].u, POLISH_TAPS[1].v)), 0, 0.4, "power2.inOut");
    return tl;
  },
};

/**
 * Making the PDF: glasses on, the finished CV held out in her small claw, a
 * rubber stamp in the big one. She lines it up, tongue out, winds back —
 * and ka-CHUNK: the stamp slams onto the sheet, the paper jolts in her other
 * claw, "oh!", and the seal is on it. A proud grin, and the next one.
 */
const stamp: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = withBridge(timeline(), p);
    raiseSheet(tl, p, "cv", "stamp");
    clawTo(tl, p, hoverOver(paperPoint(PAPER_SEAL.u, PAPER_SEAL.v)), 0.55, 0.55, "power2.inOut");
    return tl;
  },
  cycle: (p) => {
    const tl = withBridge(timeline(), p);
    const spot = paperPoint(PAPER_SEAL.u, PAPER_SEAL.v);
    // Lining it up, tongue out…
    mouth(tl, p, "tongue", 0);
    look(tl, p, READ_GAZE.to.x - 2, READ_GAZE.to.y + 3, 0, 0.25);
    clawTo(tl, p, hoverOver(spot), 0, 0.35, "power2.inOut");
    // …winding back…
    clawTo(tl, p, hoverOver(spot, 2.2), 0.45, 0.3, "power2.out");
    tl.to([p.lidL, p.lidR], { y: LID.squint, duration: 0.2 }, 0.5);
    // …ka-CHUNK. "Oh!"
    const hit = 0.95;
    clawTo(tl, p, spot, hit - 0.1, 0.1, "power4.in");
    mouth(tl, p, "o", hit, 0.05);
    tl.set(p.paperSeal, { opacity: 1, scale: 1.6 }, hit)
      .to(p.paperSeal, { scale: 1, duration: 0.3, ease: "back.out(3)" }, hit)
      .to(p.root, { scaleY: 0.94, scaleX: 1.04, duration: 0.07, ease: "power2.out" }, hit)
      .to(p.root, { scaleY: 1, scaleX: 1, duration: 0.35, ease: "back.out(3)" }, hit + 0.07)
      .to([p.lidL, p.lidR], { y: LID.open, duration: 0.1 }, hit);
    holdPaper(tl, p, 5, hit, 0.06, "power2.out", 2); // the paper jolts in her other claw
    holdPaper(tl, p, 0, hit + 0.06, 0.4, "elastic.out(1, 0.4)");
    stretchStalks(tl, p, 1.06, hit, 0.08, "power2.out");
    stretchStalks(tl, p, 0.95, hit + 0.08, 0.6, "elastic.out(1, 0.4)");
    // Hold it down a beat, then lift.
    clawTo(tl, p, hoverOver(spot, 1.5), hit + 0.45, 0.3, "power2.out");
    look(tl, p, READ_GAZE.to.x - 1, READ_GAZE.to.y + 3, hit + 0.5, 0.2);

    // Sealed. A proud grin.
    let t = admireSheet(tl, p, hit + 0.8);
    swapSheet(tl, p, t, "cv");
    clawTo(tl, p, hoverOver(spot), t + 0.3, 0.45, "power2.inOut");
    t += 0.8;
    tl.to({}, { duration: 0 }, t);
    return tl;
  },
  reducedPose: (p) => {
    const tl = withBridge(timeline(), p);
    tl.set([p.paperBack, p.stamp, p.glassesL, p.glassesR, p.glassesBridge], { opacity: 1 }, 0).set(
      p.paperBack,
      { rotation: -READ_HOLD },
      0,
    );
    resetPaper(tl, p, "cv", 0);
    tl.set(p.paperSeal, { opacity: 1 }, 0);
    holdPaper(tl, p, 0, 0, 0.4);
    readPose(tl, p, 0, 0.4);
    clawTo(tl, p, hoverOver(paperPoint(PAPER_SEAL.u, PAPER_SEAL.v), 1.5), 0, 0.4, "power2.inOut");
    return tl;
  },
};

/** Blades open, then snap shut. */
function snip(tl: TL, p: MoxieParts, at: number) {
  tl.to(p.bladeA, { rotation: -18, duration: 0.12, ease: "power2.out" }, at)
    .to(p.bladeB, { rotation: 18, duration: 0.12, ease: "power2.out" }, at)
    .to([p.bladeA, p.bladeB], { rotation: 0, duration: 0.06, ease: "power3.in" }, at + 0.16)
    .to(p.root, { y: -2, duration: 0.06, ease: "power2.out" }, at + 0.22)
    .to(p.root, { y: 0, duration: 0.14, ease: "power2.in" }, at + 0.28);
}

/** The small claw reaching down toward the ground (to pick something up or put it down). */
const REACH_DOWN = 22;

/** A little crouch toward the ground, eyes down at the job post there; or back up. */
function crouch(tl: TL, p: MoxieParts, down: boolean, at: number, duration: number) {
  tl.to(p.root, { scaleY: down ? 0.94 : 1, scaleX: down ? 1.03 : 1, duration, ease: "power2.inOut" }, at);
  stretchStalks(tl, p, down ? 0.9 : 0.95, at, duration, "power2.inOut");
  if (down) look(tl, p, 3, 11, at, duration);
}

/** Picks the job post up off the ground into her small claw. Returns the end time. */
function pickUpPost(tl: TL, p: MoxieParts, at: number): number {
  crouch(tl, p, true, at, 0.3);
  // The sheet rides with the claw: in its pincer at the reaching-down angle, then up to reading position.
  tl.to(p.smallClaw, { rotation: REACH_DOWN, x: 0, duration: 0.3, ease: "power2.inOut" }, at)
    .to(p.paperBack, { rotation: REACH_DOWN - READ_HOLD, x: 0, duration: 0.3 }, at)
    .to(p.groundPost, { opacity: 0, y: -6, duration: 0.12 }, at + 0.3);
  resetPaper(tl, p, "job", at);
  tl.set(p.paperBack, { opacity: 1 }, at + 0.3)
    .set(p.paperSheet, { y: 90, scaleY: 0.2, opacity: 0 }, at + 0.3)
    .to(p.paperSheet, { y: 0, scaleY: 1, opacity: 1, duration: 0.45, ease: "back.out(1.6)" }, at + 0.3);
  holdPaper(tl, p, 0, at + 0.3, 0.45, "back.out(1.6)");
  crouch(tl, p, false, at + 0.4, 0.3);
  return at + 0.8;
}

/** Puts the job post down on the ground in front of her. Returns the end time. */
function putDownPost(tl: TL, p: MoxieParts, at: number): number {
  crouch(tl, p, true, at, 0.35);
  tl.to(p.smallClaw, { rotation: REACH_DOWN, x: 0, duration: 0.35, ease: "power2.in" }, at)
    .to(p.paperBack, { rotation: REACH_DOWN - READ_HOLD, x: 0, duration: 0.35, ease: "power2.in" }, at)
    .to(p.paperSheet, { y: 90, scaleY: 0.2, opacity: 0, duration: 0.35, ease: "power2.in" }, at)
    .set(p.groundPost, { opacity: 0, y: -10 }, at + 0.25)
    .to(p.groundPost, { opacity: 1, y: 0, duration: 0.3, ease: "bounce.out" }, at + 0.25);
  crouch(tl, p, false, at + 0.5, 0.3);
  return at + 0.8;
}

/**
 * Tailoring a CV to a job, as one loop: she picks the job post up off the
 * ground and reads it to herself through her glasses, puts it down in front
 * of her, writes the CV — glancing down at the post for reference — then
 * squints at a line that doesn't fit, swaps her pencil for scissors and cuts
 * that line out: the writing itself drops off the page and tumbles away. A
 * grin, the CV is put away, and she picks the job post up again.
 */
const tailor: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = withBridge(timeline(), p);
    // The job post flutters down onto the ground in front of her…
    tl.set(p.groundPost, { opacity: 0, y: -40 }, 0).to(p.groundPost, { opacity: 1, y: 0, duration: 0.6, ease: "bounce.out" }, 0);
    look(tl, p, 3, 10, 0.1, 0.3);
    // …and on go her reading glasses.
    tl.set(p.paperBack, { opacity: 0 }, 0);
    glassesOn(tl, p, 0.4);
    tl.to([p.lidL, p.lidR], { y: READ_LID, duration: 0.3 }, 0.6);
    return tl;
  },
  cycle: (p) => {
    const tl = withBridge(timeline(), p);

    // 1. Pick up the job post and read it to herself.
    let t = pickUpPost(tl, p, 0);
    readPose(tl, p, t - 0.3, 0.4);
    mouth(tl, p, "talk", t);
    for (let i = 0; i < 3; i++) {
      look(tl, p, READ_GAZE.from.x, READ_GAZE.from.y + i, t, 0.12, "power3.out");
      look(tl, p, READ_GAZE.to.x, READ_GAZE.to.y + i, t + 0.14, 0.55, "none");
      mumble(tl, p, t + 0.12, 0.55);
      t += 0.75;
    }
    // "Mm-hm." Got it.
    mouth(tl, p, "smile", t);
    tl.to(p.root, { rotation: -4, duration: 0.18 }, t).to(p.root, { rotation: -2.5, duration: 0.3, ease: "back.out(2)" }, t + 0.18);
    t += 0.5;

    // 2. Down it goes, in front of her.
    t = putDownPost(tl, p, t);

    // 3. A blank CV comes up into her claw, pencil out.
    resetPaper(tl, p, "blank", t);
    tl.set(p.paperBack, { rotation: 0, x: 0 }, t)
      .set(p.paperSheet, { y: 18, scaleY: 1, opacity: 0 }, t)
      .to(p.paperSheet, { y: 0, opacity: 1, duration: 0.35, ease: "back.out(2)" }, t);
    holdPaper(tl, p, 0, t, 0.35, "back.out(1.6)");
    pencilColor(tl, p, "write", t);
    tl.to(p.pencil, { opacity: 1, duration: 0.2 }, t + 0.1);
    readPose(tl, p, t, 0.35);
    clawTo(tl, p, paperRowPoints(PAPER_ROWS[0])[0], t, 0.4, "power2.inOut");
    mouth(tl, p, "tongue", t + 0.3);
    t += 0.45;

    // 4. Write it, glancing down at the job post now and then.
    const rows = PAPER_ROWS.map((_, i) => i).filter((i) => PAPER_ROWS[i].kind !== "strike");
    rows.forEach((index) => {
      t = writeRow(tl, p, index, t) + 0.08;
      if (index === 2) {
        look(tl, p, 2, 11, t, 0.2);
        stretchStalks(tl, p, 0.88, t, 0.25, "power2.out");
        stretchStalks(tl, p, 0.95, t + 0.45, 0.25, "power2.inOut");
        look(tl, p, READ_GAZE.from.x, READ_GAZE.from.y, t + 0.45, 0.2);
        t += 0.7;
      }
    });

    // 5. That line doesn't fit the job — "hmm" — scissors out…
    const cutRow = PAPER_ROWS[TAILOR_CUT_ROW];
    mouth(tl, p, "flat", t);
    tl.to([p.lidL, p.lidR], { y: LID.squint, duration: 0.2 }, t).to(p.root, { rotation: -3.5, duration: 0.25 }, t);
    look(tl, p, READ_GAZE.from.x + 2, READ_GAZE.from.y + 3, t, 0.2);
    const left = paperPoint(cutRow.u0 - 0.07, cutRow.v);
    const right = paperPoint(cutRow.u1 + 0.07, cutRow.v);
    clawTo(tl, p, hoverOver(left, 2), t, 0.3, "power2.inOut");
    tl.to(p.pencil, { opacity: 0, duration: 0.15 }, t + 0.15).to(p.scissors, { opacity: 1, duration: 0.15 }, t + 0.3);
    t += 0.5;
    // …snip at one end, snip at the other — tongue out…
    mouth(tl, p, "tongue", t);
    clawTo(tl, p, left, t, 0.2, "power2.inOut");
    snip(tl, p, t + 0.12);
    clawTo(tl, p, right, t + 0.45, 0.25, "power2.inOut");
    snip(tl, p, t + 0.6);
    t += 0.9;
    // …and the line of writing drops off the page, tumbling away. "Oh!"
    tl.to(p.paperInks[TAILOR_CUT_ROW], { y: 95, x: 10, rotation: 35, duration: 0.85, ease: "power1.in" }, t)
      .to(p.paperInks[TAILOR_CUT_ROW], { opacity: 0, duration: 0.25 }, t + 0.6)
      .to([p.lidL, p.lidR], { y: LID.open, duration: 0.15 }, t);
    mouth(tl, p, "o", t);
    look(tl, p, 6, 11, t + 0.1, 0.3); // watches it fall
    clawTo(tl, p, hoverOver(right, 2), t, 0.25, "power2.out");
    t += 0.8;

    // 6. Better. A grin, then the CV is put away — and round again to the job post.
    t = admireSheet(tl, p, t);
    tl.to(p.paperSheet, { y: 26, opacity: 0, duration: 0.25, ease: "power2.in" }, t)
      .to(p.scissors, { opacity: 0, duration: 0.15 }, t)
      .to(p.smallClaw, { rotation: 0, x: 0, duration: 0.4, ease: "power2.inOut" }, t + 0.1)
      .to(p.bigClaw, { rotation: 0, x: 0, y: 0, duration: 0.4 }, t + 0.1)
      .to(p.root, { rotation: 0, duration: 0.4 }, t + 0.1)
      .to([p.lidL, p.lidR], { y: READ_LID, duration: 0.25 }, t + 0.1);
    look(tl, p, 3, 10, t + 0.2, 0.3); // eyes back on the job post
    tl.to({}, { duration: 0 }, t + 0.6);
    return tl;
  },
  reducedPose: (p) => {
    const tl = withBridge(timeline(), p);
    tl.set([p.groundPost, p.paperBack, p.pencil, p.glassesL, p.glassesR, p.glassesBridge], { opacity: 1 }, 0).set(
      p.paperBack,
      { rotation: -READ_HOLD },
      0,
    );
    resetPaper(tl, p, "blank", 0);
    tl.set(
      PAPER_ROWS.map((_, i) => i)
        .filter((i) => PAPER_ROWS[i].kind !== "strike" && i !== TAILOR_CUT_ROW)
        .map((i) => p.paperInks[i]),
      { strokeDashoffset: 0 },
      0,
    );
    pencilColor(tl, p, "write", 0);
    holdPaper(tl, p, 0, 0, 0.4);
    readPose(tl, p, 0, 0.4);
    clawTo(tl, p, paperRowPoints(PAPER_ROWS[5])[0], 0, 0.4, "power2.inOut");
    mouth(tl, p, "tongue", 0);
    return tl;
  },
};

// ─── Tickle ───────────────────────────────────────────────────────────────────

/** How long the giggle lasts, start to "ahem". */
export const TICKLE_SECONDS = 1.75;

/**
 * The tickle giggle. Touches only its own layers — the jiggle wrapper around
 * her and the laughing face drawn over hers — never anything an animation
 * uses, so whatever she was doing can simply be paused under it and resumed
 * after, exactly as it was. Eyes squeezed shut, a big laugh, a fit of
 * wriggling giggles; then she pulls herself together — "ahem".
 */
export function tickleGiggle(p: MoxieParts, reducedMotion: boolean): TL {
  const tl = gsap.timeline();
  const face = [p.laughL, p.laughR, p.mouthLaugh];
  tl.to(face, { opacity: 1, duration: 0.06, ease: "none" }, 0);

  if (reducedMotion) {
    // Just the laughing face, held for a moment.
    tl.to(face, { opacity: 0, duration: 0.15, ease: "none" }, 1.0);
    return tl;
  }

  // A jolt at the first touch…
  tl.to(p.jiggle, { y: -6, scaleY: 1.04, scaleX: 0.97, duration: 0.08, ease: "power2.out" }, 0);
  // …then the giggles: a wriggle side to side, quick little bounces, dying down.
  const wriggles = 10;
  for (let i = 0; i < wriggles; i++) {
    const t = 0.08 + i * 0.09;
    const fade = 1 - i / wriggles;
    tl.to(p.jiggle, { rotation: (i % 2 ? -1 : 1) * 3.5 * fade, x: (i % 2 ? -1 : 1) * 2 * fade, duration: 0.09, ease: "sine.inOut" }, t)
      .to(p.jiggle, { y: i % 2 ? 0 : -3 * fade, scaleY: i % 2 ? 0.98 : 1.02, scaleX: i % 2 ? 1.015 : 0.99, duration: 0.09 }, t);
  }
  // "Ahem." The laugh fades, she straightens up with a little bob, and back to it.
  const ahem = 0.08 + wriggles * 0.09;
  tl.to(p.jiggle, { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.2, ease: "power2.out" }, ahem)
    .to(face, { opacity: 0, duration: 0.12, ease: "none" }, ahem + 0.15)
    .to(p.jiggle, { scaleY: 1.025, scaleX: 0.99, duration: 0.14, ease: "power2.out" }, ahem + 0.3)
    .to(p.jiggle, { scaleY: 1, scaleX: 1, duration: 0.3, ease: "back.out(2)" }, ahem + 0.44);
  return tl;
}

/** Puts the tickle layers back to rest at once (when something else takes over mid-giggle). */
export function endTickle(p: MoxieParts) {
  gsap.set(p.jiggle, { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });
  gsap.set([p.laughL, p.laughR, p.mouthLaugh], { opacity: 0 });
}

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
  tailor,
  write,
  read,
  polish,
  stamp,
};
