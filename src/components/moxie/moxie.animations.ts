import { gsap } from "gsap";
import {
  armPath,
  BIG_ARM,
  bridgePath,
  CROWN,
  CROWN_BASE,
  CROWN_FLOAT,
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
  PENCIL,
  READ_HOLD,
  SHOULDER,
  SIDE_BLINK,
  SIT,
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
    p.lidL, p.lidR, p.face, p.pdfFile, p.coin, p.coinFace, p.crown, p.paperBack, p.paperSheet, p.groundPost, p.glassesL, p.glassesR,
    p.bladeA, p.bladeB, p.pencilTip, p.mouthO, p.side, p.sideTurn, p.sideBody, ...p.sideLegs, ...p.sidePupils, ...p.sideLids,
    p.sideSweat, p.crownFloat, p.hugFiles, p.hugStack, p.hugSheet, p.hugPincer,
  ];
}

/** Scene props — faded out by toNeutral so every other animation starts without them. */
function propLayers(p: MoxieParts) {
  return [
    p.pencil, p.stamp, p.scissors, p.magnifier, p.pdfFile, p.coin, p.folderBack, p.folderFront, ...p.confetti,
    p.paperBack, p.groundPost, p.glassesL, p.glassesR, p.glassesBridge, p.hugFiles,
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
  tl.set([p.pencilBody, p.pencilFront], { attr: { fill: PENCIL_COLORS[kind] } }, at);
}

// ─── Building blocks ──────────────────────────────────────────────────────────

/** Eases every layer back to the artwork's resting pose. */
export function toNeutral(p: MoxieParts, duration = 0.35, ease = "power2.inOut"): TL {
  const tl = gsap.timeline();
  tl.to(transformLayers(p), { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, duration, ease }, 0)
    .to(p.shadow, { x: 0, scaleX: 1, scaleY: 1, opacity: SHADOW_OPACITY, duration, ease }, 0)
    .to([...p.sparkles, ...p.zs, p.side, p.sideSweat, p.crownFloat, p.lashL, p.lashR, p.laughL, p.laughR, ...propLayers(p)], { opacity: 0, duration: Math.min(duration, 0.25) }, 0)
    // Back to her front view, if she was seen from the side — and her own small claw, if a copy of it was hugging folders.
    .to([p.root, p.smallClaw], { opacity: 1, duration: Math.min(duration, 0.25) }, 0)
    // A snapped pencil is whole again (hidden with it) for next time.
    .set(p.pencilTip, { opacity: 1 }, Math.min(duration, 0.25))
    .set(p.pencilSplinter, { opacity: 0 }, Math.min(duration, 0.25));
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
  const restLength = Math.hypot(from.x - SHOULDER.x, from.y - SHOULDER.y);
  const angle = Math.atan2(to.y - SHOULDER.y, to.x - SHOULDER.x);
  const reach = Math.hypot(to.x - SHOULDER.x, to.y - SHOULDER.y) - restLength;
  tl.to(
    p.bigClaw,
    {
      rotation: clawRotationTo(to, from),
      x: reach * Math.cos(angle),
      y: reach * Math.sin(angle),
      duration,
      ease,
    },
    at,
  );
}

/** The big claw's rotation (degrees) when clawTo puts `from` on `to`. */
function clawRotationTo(to: Point, from: Point = PENCIL_TIP): number {
  const rest = Math.atan2(from.y - SHOULDER.y, from.x - SHOULDER.x);
  return ((Math.atan2(to.y - SHOULDER.y, to.x - SHOULDER.x) - rest) * 180) / Math.PI;
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

/**
 * Redraws the big claw's arm to wherever its pincer is now: the wrist follows
 * the pincer, and the elbow bends further the further the pincer is set down
 * (from straight at rest to resting on the ledge when she sits).
 */
export function updateArm(p: MoxieParts) {
  const get = gsap.getProperty(p.bigPincer) as (property: string) => number;
  const dx = get("x");
  const dy = get("y");
  const bend = gsap.utils.clamp(0, 1, dy / SIT.bigPincerY);
  const elbow = {
    x: BIG_ARM.elbow.x + (SIT.bigElbow.x - BIG_ARM.elbow.x) * bend,
    y: BIG_ARM.elbow.y + (SIT.bigElbow.y - BIG_ARM.elbow.y) * bend,
  };
  const d = armPath(elbow, { x: BIG_ARM.wrist.x + dx, y: BIG_ARM.wrist.y + dy });
  if (p.bigArm[0]?.getAttribute("d") === d) return;
  p.bigArm.forEach((arm) => arm.setAttribute("d", d));
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

/**
 * The recruiter (the landing page's hero): glasses on, your CV held out and a
 * rubber stamp ready in the other claw. She reads a few lines, mouthing them;
 * lowers the sheet and looks right at you over her glasses — "hm?" — then
 * smiles and gives two approving nods; back to the sheet, and ka-CHUNK:
 * approved. A proud grin, and the next CV.
 */
const review: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = withBridge(timeline(), p);
    raiseSheet(tl, p, "cv", "stamp");
    return tl;
  },
  cycle: (p) => {
    const tl = withBridge(timeline(), p);
    let t = 0;

    // Reads a few lines, mouthing them to herself.
    mouth(tl, p, "talk", t);
    for (let i = 0; i < 3; i++) {
      look(tl, p, READ_GAZE.from.x, READ_GAZE.from.y, t, 0.12, "power3.out");
      look(tl, p, READ_GAZE.to.x, READ_GAZE.to.y, t + 0.14, 0.55, "none");
      mumble(tl, p, t + 0.12, 0.55);
      tl.to(p.root, { y: -1, duration: 0.3 }, t + 0.2).to(p.root, { y: 0, duration: 0.3 }, t + 0.5);
      t += 0.75;
    }
    mouth(tl, p, "smile", t - 0.06);

    // Lowers it and looks right at you over her glasses — "hm?"
    holdPaper(tl, p, 12, t, 0.35, "power2.out");
    tl.to(p.root, { rotation: 0, duration: 0.35 }, t).to([p.lidL, p.lidR], { y: LID.open, duration: 0.25 }, t + 0.1);
    stretchStalks(tl, p, 1.04, t, 0.35, "power2.out");
    look(tl, p, 0, -10, t + 0.15, 0.3, "power2.out");
    mouth(tl, p, "o", t + 0.2);
    blink(tl, p, t + 0.95, LID.open);
    // …a smile, and two approving nods.
    mouth(tl, p, "smile", t + 1.2);
    tl.to([p.lidL, p.lidR], { y: LID.happy, duration: 0.2 }, t + 1.25);
    for (let k = 0; k < 2; k++) {
      const nod = t + 1.35 + k * 0.34;
      tl.to(p.root, { rotation: 3, y: 2, duration: 0.14, ease: "power2.out" }, nod).to(
        p.root,
        { rotation: 0, y: 0, duration: 0.2, ease: "power2.inOut" },
        nod + 0.14,
      );
    }
    t += 2.2;

    // Back to the sheet — and stamp it: approved.
    holdPaper(tl, p, 0, t, 0.4);
    tl.to(p.root, { rotation: -2.5, duration: 0.4 }, t).to([p.lidL, p.lidR], { y: READ_LID, duration: 0.25 }, t);
    stretchStalks(tl, p, 0.95, t, 0.4, "sine.inOut");
    const spot = paperPoint(PAPER_SEAL.u, PAPER_SEAL.v);
    mouth(tl, p, "tongue", t + 0.3);
    look(tl, p, READ_GAZE.to.x - 2, READ_GAZE.to.y + 3, t + 0.3, 0.25);
    clawTo(tl, p, hoverOver(spot), t + 0.3, 0.35, "power2.inOut");
    clawTo(tl, p, hoverOver(spot, 2.2), t + 0.75, 0.3, "power2.out");
    tl.to([p.lidL, p.lidR], { y: LID.squint, duration: 0.2 }, t + 0.8);
    const hit = t + 1.25;
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
    clawTo(tl, p, hoverOver(spot, 1.5), hit + 0.45, 0.3, "power2.out");

    // Approved. A proud grin, and the next CV.
    t = admireSheet(tl, p, hit + 0.8);
    swapSheet(tl, p, t, "cv");
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
    holdPaper(tl, p, 12, 0, 0.4);
    // Looking at you over her glasses, smiling.
    look(tl, p, 0, -10, 0, 0.3);
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

// ─── Celebrations and moments (tier 2) ───────────────────────────────────────

/** A sparkle popping at a point in the drawing (sparkles are positioned from their own origin). */
function sparkleAt(tl: TL, p: MoxieParts, index: number, at: number, point: Point, size = 0.8) {
  const sparkle = p.sparkles[index];
  const spot = { x: point.x - SPARKLE_ORIGIN.x, y: point.y - SPARKLE_ORIGIN.y };
  tl.set(sparkle, { ...spot, scale: 0, rotation: 0, opacity: 1 }, at)
    .to(sparkle, { scale: size, rotation: 120, duration: 0.3, ease: "back.out(3)" }, at)
    .to(sparkle, { scale: 0, rotation: 200, opacity: 0, duration: 0.35, ease: "power1.in" }, at + 0.35);
}

/** Where the eyes meet when the stalks swing together. */
const EYES_MEET = { x: 305, y: 166 } as const;

/**
 * Ta-da, the bigger one: a crouch, a high jump with sparkles bursting out —
 * and on the way up, beaming, she swings her eyes together on purpose:
 * clink! A star where they meet, the stalks spring apart, and she floats
 * down and lands lightly, grinning. (No squash on landing.)
 */
const tada: MoxiePreset = {
  mode: "once",
  intro: (p) => {
    const tl = timeline();
    // Crouch…
    tl.to(p.root, { scaleY: 0.86, scaleX: 1.08, duration: 0.22, ease: "power2.in" }, 0)
      .to(p.shadow, { scaleX: 1.06, duration: 0.22 }, 0)
      .to(p.bigClaw, { rotation: -8, duration: 0.22 }, 0);
    stretchStalks(tl, p, 0.9, 0, 0.22, "power2.in");
    look(tl, p, 0, 1, 0.22, 0.2);

    // …and up, high: claw thrown up, legs dangling, stalks streaming, a big grin.
    const apex = 0.72;
    tl.to(p.root, { y: -72, scaleY: 1.08, scaleX: 0.94, duration: apex - 0.22, ease: "power2.out" }, 0.22)
      .to(p.root, { scaleY: 1, scaleX: 1, duration: 0.3 }, apex - 0.1)
      .to(p.shadow, { scaleX: 0.45, opacity: SHADOW_OPACITY * 0.35, duration: apex - 0.22, ease: "power2.out" }, 0.22)
      .to(p.bigClaw, { rotation: 24, duration: 0.4, ease: "back.out(2)" }, 0.22)
      .to(p.bigPincer, { rotation: -14, duration: 0.4, ease: "back.out(2)" }, 0.26)
      .to(p.smallClaw, { rotation: -35, duration: 0.4, ease: "back.out(2)" }, 0.24)
      .to(p.legList, { rotation: (i: number) => (i - 1) * 10, y: -4, duration: 0.3 }, 0.26)
      .to([p.lidL, p.lidR], { y: LID.happy, duration: 0.2 }, 0.3);
    stretchStalks(tl, p, 1.12, 0.22, 0.35, "back.out(2)");
    mouth(tl, p, "smile", 0.25);
    // (Sparkles 0 and 1 are saved for the clink.)
    p.sparkles.slice(2).forEach((sparkle, i) => {
      const b = SPARKLE_BURST[i + 2];
      const at = 0.4 + i * 0.05;
      tl.set(sparkle, { x: 0, y: 0, scale: 0, rotation: 0, opacity: 1 }, at)
        .to(sparkle, { x: b.x * 1.1, y: b.y * 1.1, scale: b.scale, rotation: 140, duration: 0.8, ease: "power3.out" }, at)
        .to(sparkle, { opacity: 0, scale: b.scale * 0.3, duration: 0.45, ease: "power1.in" }, at + 0.6);
    });

    // Near the top, on purpose: eyes swung together — clink! (Happy-squinting, not dazed.)
    const clink = apex - 0.06;
    const height = -70; // she's this high when they meet (the sparkles don't move with her)
    tl.to(p.stalkL, { rotation: 7, duration: 0.14, ease: "power2.in" }, clink - 0.14)
      .to(p.stalkR, { rotation: -7, duration: 0.14, ease: "power2.in" }, clink - 0.14)
      .to([p.eyeL, p.eyeR], { scaleX: 0.86, scaleY: 1.06, duration: 0.05, ease: "power2.out" }, clink)
      .to([p.eyeL, p.eyeR], { scaleX: 1, scaleY: 1, duration: 0.35, ease: "elastic.out(1, 0.4)" }, clink + 0.05)
      .to([p.stalkL, p.stalkR], { rotation: 0, duration: 0.7, ease: "elastic.out(1, 0.35)" }, clink + 0.06);
    sparkleAt(tl, p, 0, clink, { x: EYES_MEET.x, y: EYES_MEET.y + height }, 1.5);
    sparkleAt(tl, p, 1, clink + 0.05, { x: EYES_MEET.x + 14, y: EYES_MEET.y + height - 22 }, 0.75);
    mouth(tl, p, "o", clink, 0.05);
    mouth(tl, p, "smile", clink + 0.2);

    // Down she floats, and lands lightly — feet first, body upright, no squash.
    const land = apex + 0.42;
    tl.to(p.root, { y: 0, duration: land - apex, ease: "power2.in" }, apex)
      .to(p.shadow, { scaleX: 1, opacity: SHADOW_OPACITY, duration: land - apex, ease: "power2.in" }, apex)
      .to(p.legList, { rotation: 0, y: 0, duration: 0.15 }, land - 0.1)
      .to(p.root, { y: -5, duration: 0.12, ease: "power2.out" }, land)
      .to(p.root, { y: 0, duration: 0.25, ease: "power2.in" }, land + 0.12);
    stretchStalks(tl, p, 1, land - 0.2, 0.3, "power2.inOut");
    // A happy wiggle of the claw, then back to normal.
    tl.to(p.bigClaw, { rotation: 30, duration: 0.15, ease: "power2.out" }, land + 0.1)
      .to(p.bigClaw, { rotation: 22, duration: 0.3, ease: "back.out(2)" }, land + 0.25);
    blink(tl, p, land + 0.45, LID.happy);
    tl.add(toNeutral(p, 0.5), land + 0.9);
    return tl;
  },
  reducedPose: (p) => {
    const tl = timeline();
    tl.to(p.bigClaw, { rotation: 22, duration: 0.4 }, 0).to([p.lidL, p.lidR], { y: LID.happy, duration: 0.4 }, 0);
    return tl;
  },
};

/**
 * Downloaded: she looks up, a PDF file drops out of the sky into her
 * pincer — "oh!" — and she holds it up like a trophy, with a hop.
 */
const downloaded: MoxiePreset = {
  mode: "once",
  intro: (p) => {
    const tl = timeline();
    look(tl, p, 0, -11, 0, 0.25);
    mouth(tl, p, "o", 0.05);
    tl.to(p.bigClaw, { rotation: 6, duration: 0.3, ease: "power2.out" }, 0)
      .to(p.bigPincer, { rotation: -14, duration: 0.25, ease: "power2.out" }, 0.05) // opening to catch
      .set(p.pdfFile, { opacity: 1, y: -170 }, 0.15)
      .to(p.pdfFile, { y: 0, duration: 0.45, ease: "power2.in" }, 0.15);
    // Caught: the claw dips with it, the pincer closes on it.
    const caught = 0.6;
    tl.to(p.bigClaw, { rotation: -3, duration: 0.08, ease: "power2.out" }, caught)
      .to(p.bigClaw, { rotation: 6, duration: 0.3, ease: "back.out(2)" }, caught + 0.08)
      .to(p.bigPincer, { rotation: 4, duration: 0.08, ease: "power3.in" }, caught)
      .to(p.bigPincer, { rotation: 0, duration: 0.2 }, caught + 0.08);
    look(tl, p, -9, -3, caught, 0.15);
    // Got it! Held up high, a hop and a glint.
    const trophy = 1.0;
    mouth(tl, p, "smile", trophy);
    tl.to([p.lidL, p.lidR], { y: LID.happy, duration: 0.2 }, trophy)
      .to(p.bigClaw, { rotation: 26, duration: 0.35, ease: "back.out(2)" }, trophy)
      .to(p.root, { y: -12, scaleY: 1.03, duration: 0.18, ease: "power2.out" }, trophy + 0.1)
      .to(p.root, { y: 0, scaleY: 1, duration: 0.35, ease: "bounce.out" }, trophy + 0.28);
    look(tl, p, -9, -8, trophy, 0.2);
    sparkleAt(tl, p, 0, trophy + 0.35, { x: 249, y: 168 });
    tl.add(toNeutral(p, 0.5), trophy + 1.4);
    return tl;
  },
  reducedPose: (p) => {
    const tl = timeline();
    tl.set(p.pdfFile, { opacity: 1 }, 0).to(p.bigClaw, { rotation: 26, duration: 0.4 }, 0).to([p.lidL, p.lidR], { y: LID.happy, duration: 0.4 }, 0);
    return tl;
  },
};

/** The coin raised up close to her left eye for a good look. */
const COIN_HOLD = 14;
const COIN_AT = { x: 223, y: 178 } as const;

/**
 * Verifying a payment: glasses on, a gold coin held right up to her eye —
 * "hmm" — turned over, turned over again, then tossed and caught. Ting! A
 * satisfied nod, and she checks it again.
 */
const verifying: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = withBridge(timeline(), p);
    glassesOn(tl, p, 0);
    tl.set(p.coin, { opacity: 0, y: 0 }, 0)
      .to(p.coin, { opacity: 1, duration: 0.2 }, 0.1)
      .to(p.bigClaw, { rotation: COIN_HOLD, duration: 0.5, ease: "back.out(1.6)" }, 0.1)
      .to(p.stalkL, { rotation: -4, duration: 0.5, ease: "back.out(1.6)" }, 0.2)
      .to([p.lidL, p.lidR], { y: READ_LID, duration: 0.3 }, 0.3);
    look(tl, p, -11, 3, 0.3, 0.3);
    return tl;
  },
  cycle: (p) => {
    const tl = withBridge(timeline(), p);
    // A close look, turning it over — "hmm".
    mouth(tl, p, "flat", 0);
    tl.to([p.lidL, p.lidR], { y: LID.squint, duration: 0.2 }, 0.1);
    for (const at of [0.35, 0.95]) {
      tl.to(p.coinFace, { scaleX: 0.06, duration: 0.12, ease: "power2.in" }, at).to(
        p.coinFace,
        { scaleX: 1, duration: 0.14, ease: "power2.out" },
        at + 0.12,
      );
    }
    // Toss it — eyes up — and catch it.
    const toss = 1.5;
    tl.to([p.lidL, p.lidR], { y: LID.open, duration: 0.15 }, toss - 0.1)
      .to(p.bigClaw, { rotation: COIN_HOLD + 6, duration: 0.1, ease: "power2.out" }, toss - 0.1)
      .to(p.bigClaw, { rotation: COIN_HOLD, duration: 0.2 }, toss)
      .to(p.coin, { y: -75, duration: 0.38, ease: "power2.out" }, toss)
      .to(p.coin, { y: 0, duration: 0.36, ease: "power2.in" }, toss + 0.38);
    for (let i = 0; i < 5; i++) {
      tl.to(p.coinFace, { scaleX: i % 2 ? 1 : 0.06, duration: 0.074, ease: "none" }, toss + i * 0.074);
    }
    tl.to(p.coinFace, { scaleX: 1, duration: 0.08 }, toss + 0.37);
    look(tl, p, -6, -11, toss, 0.25);
    look(tl, p, -11, 3, toss + 0.45, 0.25);
    const caught = toss + 0.74;
    tl.to(p.bigClaw, { rotation: COIN_HOLD - 3, duration: 0.07 }, caught).to(p.bigClaw, { rotation: COIN_HOLD, duration: 0.25, ease: "back.out(2)" }, caught + 0.07);
    sparkleAt(tl, p, 0, caught + 0.05, COIN_AT, 0.55); // ting!
    // Real gold. A nod.
    mouth(tl, p, "smile", caught + 0.1);
    tl.to([p.lidL, p.lidR], { y: READ_LID, duration: 0.2 }, caught + 0.15)
      .to(p.root, { rotation: -2, duration: 0.15 }, caught + 0.3)
      .to(p.root, { rotation: 0, duration: 0.3, ease: "back.out(2)" }, caught + 0.45)
      .to({}, { duration: 0 }, caught + 1.1);
    return tl;
  },
  reducedPose: (p) => {
    const tl = withBridge(timeline(), p);
    tl.set([p.coin, p.glassesL, p.glassesR, p.glassesBridge], { opacity: 1 }, 0)
      .to(p.bigClaw, { rotation: COIN_HOLD, duration: 0.4 }, 0)
      .to([p.lidL, p.lidR], { y: READ_LID, duration: 0.4 }, 0);
    look(tl, p, -11, 3, 0, 0.4);
    return tl;
  },
};

/** The crown's jewel, where it glints (on her right eye, at rest). */
const CROWN_JEWEL = {
  x: CROWN_BASE.x + 11 * Math.sin((CROWN.tilt * Math.PI) / 180),
  y: CROWN_BASE.y - 11 * Math.cos((CROWN.tilt * Math.PI) / 180),
} as const;

/**
 * Paid — she's Pro: a crown drops out of the sky onto her shell. Her eyes
 * follow it down — "oh!" — then a jump for joy with sparkles. After that she
 * wears it proudly, the jewel glinting, glancing down at it now and then.
 */
const paid: MoxiePreset = {
  mode: "loop",
  ownsCrown: true,
  intro: (p) => {
    const tl = timeline();
    // Out of the sky, onto her shell — both eyes follow it down.
    tl.set(p.crown, { opacity: 1, y: -170, rotation: -30 }, 0).to(p.crown, { y: 0, rotation: 0, duration: 0.45, ease: "power2.in" }, 0);
    look(tl, p, 7, -10, 0.05, 0.2);
    look(tl, p, 8, 10, 0.3, 0.2);
    stretchStalks(tl, p, 1.06, 0.05, 0.3, "power2.out");
    // It lands — clunk — she bobs under it, and it wobbles into place.
    const lands = 0.45;
    tl.to(p.crown, { rotation: 12, duration: 0.08 }, lands)
      .to(p.crown, { rotation: 0, duration: 0.5, ease: "elastic.out(1, 0.35)" }, lands + 0.08)
      .to(p.root, { y: 3, duration: 0.07, ease: "power2.out" }, lands)
      .to(p.root, { y: 0, duration: 0.25, ease: "back.out(2)" }, lands + 0.07);
    mouth(tl, p, "o", lands, 0.05);
    // A jump for joy.
    const jump = 1.0;
    mouth(tl, p, "smile", jump);
    tl.to([p.lidL, p.lidR], { y: LID.happy, duration: 0.2 }, jump)
      .to(p.root, { y: -34, duration: 0.3, ease: "power2.out" }, jump + 0.05)
      .to(p.root, { y: 0, duration: 0.3, ease: "power2.in" }, jump + 0.35)
      .to(p.bigClaw, { rotation: 26, duration: 0.3, ease: "back.out(2)" }, jump + 0.05)
      .to(p.bigClaw, { rotation: 0, duration: 0.5, ease: "back.out(1.5)" }, jump + 0.7);
    stretchStalks(tl, p, 1, jump, 0.3, "power2.out");
    lookHome(tl, p, jump, 0.3);
    p.sparkles.forEach((sparkle, i) => {
      const b = SPARKLE_BURST[i];
      const at = jump + 0.1 + i * 0.04;
      tl.set(sparkle, { x: 0, y: 0, scale: 0, rotation: 0, opacity: 1 }, at)
        .to(sparkle, { x: b.x, y: b.y, scale: b.scale, rotation: 140, duration: 0.75, ease: "power3.out" }, at)
        .to(sparkle, { opacity: 0, scale: b.scale * 0.3, duration: 0.45, ease: "power1.in" }, at + 0.55);
    });
    tl.to([p.lidL, p.lidR], { y: LID.open, duration: 0.3 }, jump + 1.0);
    return tl;
  },
  cycle: (p) => {
    const tl = timeline();
    const total = 4;
    // Standing proud: a slow breath…
    tl.to(p.root, { y: -2, scaleY: 1.015, duration: total / 2 }, 0).to(p.root, { y: 0, scaleY: 1, duration: total / 2 }, total / 2);
    // …the jewel glints…
    sparkleAt(tl, p, 0, 0.6, CROWN_JEWEL, 0.5);
    // …and a proud glance down at it, with a happy squint.
    look(tl, p, 8, 10, 2.0, 0.3);
    tl.to([p.lidL, p.lidR], { y: LID.happy, duration: 0.25 }, 2.1)
      .to(p.crown, { rotation: 4, duration: 0.15 }, 2.2)
      .to(p.crown, { rotation: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" }, 2.35)
      .to([p.lidL, p.lidR], { y: LID.open, duration: 0.25 }, 3.0);
    lookHome(tl, p, 3.0, 0.35);
    return tl;
  },
  reducedPose: (p) => {
    const tl = timeline();
    tl.set(p.crown, { opacity: 1 }, 0).to([p.lidL, p.lidR], { y: LID.happy, duration: 0.4 }, 0);
    return tl;
  },
};

/**
 * Onboarded — welcome aboard: a crouch, a pop of confetti bursting out above
 * her as she hops, then a big wave hello, beaming.
 */
const onboarded: MoxiePreset = {
  mode: "once",
  intro: (p) => {
    const tl = timeline();
    tl.to(p.root, { scaleY: 0.9, scaleX: 1.05, duration: 0.18, ease: "power2.in" }, 0)
      .to(p.root, { y: -26, scaleY: 1.05, scaleX: 0.97, duration: 0.25, ease: "power2.out" }, 0.18)
      .to(p.root, { y: 0, scaleY: 1, scaleX: 1, duration: 0.35, ease: "bounce.out" }, 0.43)
      .to([p.lidL, p.lidR], { y: LID.happy, duration: 0.2 }, 0.2);
    stretchStalks(tl, p, 1.1, 0.18, 0.3, "back.out(2)");
    stretchStalks(tl, p, 1, 0.6, 0.5, "elastic.out(1, 0.4)");
    mouth(tl, p, "o", 0.2, 0.05);
    mouth(tl, p, "smile", 0.6);
    // Confetti!
    p.confetti.forEach((piece, i) => {
      const at = 0.22 + (i % 4) * 0.03;
      const out = { x: random(-160, 160), y: random(-110, -30) };
      tl.set(piece, { x: 0, y: 0, scale: random(0.9, 1.4), rotation: random(0, 180), opacity: 1 }, at)
        .to(piece, { x: out.x, y: out.y, rotation: `+=${random(90, 270)}`, duration: 0.5, ease: "power2.out" }, at)
        .to(piece, { x: out.x + random(-30, 30), y: out.y + random(170, 260), rotation: `+=${random(180, 540)}`, duration: 1.5, ease: "power1.in" }, at + 0.5)
        .to(piece, { opacity: 0, duration: 0.4 }, at + 1.6);
    });
    // A big wave hello.
    const end = waveClaw(tl, p, 0.7, 3, 22, -6);
    look(tl, p, 0, 2, 0.7, 0.3);
    tl.to([p.lidL, p.lidR], { y: LID.open, duration: 0.3 }, end - 0.3);
    tl.add(toNeutral(p, 0.5), Math.max(end, 2.4));
    return tl;
  },
  reducedPose: (p) => {
    const tl = timeline();
    tl.to(p.bigClaw, { rotation: 14, duration: 0.4 }, 0).to([p.lidL, p.lidR], { y: LID.happy, duration: 0.4 }, 0);
    return tl;
  },
};

/**
 * Saved to a career profile: she holds up the CV in a folder, tucks it in
 * — the sheet slides down behind the folder's front — gives the folder a
 * tidy little shake, and pumps her other claw: filed!
 */
const saved: MoxiePreset = {
  mode: "once",
  intro: (p) => {
    const tl = timeline();
    resetPaper(tl, p, "cv", 0);
    tl.set(p.paperBack, { rotation: -READ_HOLD, x: 0, opacity: 0 }, 0)
      .set(p.paperSheet, { y: 0, opacity: 1 }, 0)
      .to(p.paperBack, { opacity: 1, duration: 0.2 }, 0)
      .set([p.folderBack, p.folderFront], { opacity: 0 }, 0)
      .to([p.folderBack, p.folderFront], { opacity: 1, duration: 0.25 }, 0.35);
    holdPaper(tl, p, 0, 0, 0.5, "back.out(1.4)");
    look(tl, p, READ_GAZE.from.x, READ_GAZE.from.y - 3, 0.2, 0.3);
    // In it goes.
    const tuck = 0.85;
    // (It fades as it goes, so it never shows below the folder.)
    tl.to(p.paperSheet, { y: 26, duration: 0.4, ease: "power2.in" }, tuck).to(p.paperSheet, { opacity: 0, duration: 0.22 }, tuck + 0.12);
    look(tl, p, READ_GAZE.from.x, READ_GAZE.from.y + 3, tuck, 0.3);
    // A tidy shake, and a glint.
    const tidy = tuck + 0.5;
    holdPaper(tl, p, -4, tidy, 0.08, "power2.out");
    holdPaper(tl, p, 3, tidy + 0.08, 0.1);
    holdPaper(tl, p, 0, tidy + 0.18, 0.3, "back.out(2)");
    sparkleAt(tl, p, 0, tidy + 0.2, paperPoint(0.5, 0.75), 0.7);
    // Filed! A fist pump with the other claw.
    const pump = tidy + 0.55;
    mouth(tl, p, "smile", pump);
    tl.to([p.lidL, p.lidR], { y: LID.happy, duration: 0.2 }, pump)
      .to(p.bigClaw, { rotation: 30, duration: 0.18, ease: "power2.out" }, pump)
      .to(p.bigClaw, { rotation: 22, duration: 0.3, ease: "back.out(2)" }, pump + 0.18)
      .to(p.root, { y: -6, duration: 0.15, ease: "power2.out" }, pump + 0.05)
      .to(p.root, { y: 0, duration: 0.3, ease: "back.out(2.5)" }, pump + 0.2);
    lookHome(tl, p, pump, 0.3);
    tl.add(toNeutral(p, 0.5), pump + 1.2);
    return tl;
  },
  reducedPose: (p) => {
    const tl = timeline();
    tl.set([p.paperBack, p.folderBack, p.folderFront], { opacity: 1 }, 0).set(p.paperBack, { rotation: 0 }, 0);
    resetPaper(tl, p, "cv", 0);
    tl.set(p.paperSheet, { y: 20 }, 0).to(p.smallClaw, { rotation: READ_HOLD, duration: 0.4 }, 0).to([p.lidL, p.lidR], { y: LID.happy, duration: 0.4 }, 0);
    return tl;
  },
};

// ─── Empty states (tier 3) ───────────────────────────────────────────────────

/**
 * A shrug: shoulders up, the big claw out, eyes up, a flat "hmm" — held for
 * `hold` seconds, then let go. `smallClaw` joins in only when it's free (not
 * holding something). Returns when it's done.
 */
function shrug(tl: TL, p: MoxieParts, at: number, hold = 0.8, smallClaw = true): number {
  tl.to(p.root, { scaleY: 1.035, y: -2, duration: 0.18, ease: "power2.out" }, at)
    .to(p.bigClaw, { rotation: -14, y: -6, duration: 0.22, ease: "back.out(2)" }, at)
    .to(p.bigPincer, { rotation: -10, duration: 0.22, ease: "back.out(2)" }, at + 0.03)
    .to([p.lidL, p.lidR], { y: LID.flat, duration: 0.2 }, at);
  if (smallClaw) tl.to(p.smallClaw, { rotation: -24, duration: 0.22, ease: "back.out(2)" }, at);
  stretchStalks(tl, p, 1.05, at, 0.22, "back.out(2)");
  look(tl, p, 2, -6, at, 0.2);
  mouth(tl, p, "flat", at + 0.05);
  const release = at + hold;
  tl.to(p.root, { scaleY: 1, y: 0, duration: 0.3, ease: "power2.inOut" }, release)
    .to(p.bigClaw, { rotation: 0, y: 0, duration: 0.35, ease: "power2.inOut" }, release)
    .to(p.bigPincer, { rotation: 0, duration: 0.3 }, release)
    .to([p.lidL, p.lidR], { y: LID.open, duration: 0.25 }, release);
  if (smallClaw) tl.to(p.smallClaw, { rotation: 0, duration: 0.35, ease: "power2.inOut" }, release);
  stretchStalks(tl, p, 1, release, 0.35, "power2.inOut");
  return release + 0.35;
}

/** Magnifying-glass sweeps: where the claw holds it, and where her eyes look through it. */
const SEARCH_SWEEP = [
  { claw: -12, eyes: { x: -11, y: 5 } },
  { claw: 16, eyes: { x: -6, y: -9 } },
  { claw: -4, eyes: { x: -11, y: 1 } },
  { claw: 20, eyes: { x: -4, y: -10 } },
] as const;
const SEARCH_HOLD = 8;

/**
 * Nothing found (search): a magnifying glass, swept this way and that, her
 * eyes following it, stalks craning — nothing. A shrug, a look at you, and
 * she tries again.
 */
const searching: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = timeline();
    tl.set(p.magnifier, { opacity: 0 }, 0)
      .to(p.magnifier, { opacity: 1, duration: 0.2 }, 0.1)
      .to(p.bigClaw, { rotation: SEARCH_HOLD, duration: 0.45, ease: "back.out(1.6)" }, 0.1);
    look(tl, p, -11, -3, 0.2, 0.3);
    stretchStalks(tl, p, 1.08, 0.2, 0.4, "back.out(1.6)");
    return tl;
  },
  cycle: (p) => {
    const tl = timeline();
    let t = 0;
    mouth(tl, p, "flat", 0);
    // This way, that way…
    SEARCH_SWEEP.forEach(({ claw, eyes }, i) => {
      tl.to(p.bigClaw, { rotation: claw, duration: 0.55, ease: "sine.inOut" }, t)
        .to(p.stalkL, { rotation: claw > 5 ? 2 : -7, duration: 0.55, ease: "sine.inOut" }, t + 0.05)
        .to(p.stalkR, { rotation: claw > 5 ? 6 : -4, duration: 0.55, ease: "sine.inOut" }, t + 0.08)
        .to(p.root, { rotation: claw > 5 ? 1 : -1.5, duration: 0.55, ease: "sine.inOut" }, t);
      look(tl, p, eyes.x, eyes.y, t + 0.1, 0.4, "sine.inOut");
      if (i === 1) blink(tl, p, t + 0.3);
      t += 0.62;
    });
    // …nothing. Glass down, a shrug.
    tl.to(p.bigClaw, { rotation: -4, duration: 0.3 }, t)
      .to([p.stalkL, p.stalkR, p.root], { rotation: 0, duration: 0.3 }, t);
    look(tl, p, 2, 2, t, 0.25);
    t = shrug(tl, p, t + 0.3, 0.9);
    // Try again.
    tl.to(p.bigClaw, { rotation: SEARCH_HOLD, duration: 0.4, ease: "back.out(1.6)" }, t + 0.2);
    stretchStalks(tl, p, 1.08, t + 0.2, 0.4, "back.out(1.6)");
    look(tl, p, -11, -3, t + 0.25, 0.3);
    tl.to({}, { duration: 0 }, t + 0.8);
    return tl;
  },
  reducedPose: (p) => {
    const tl = timeline();
    tl.set(p.magnifier, { opacity: 1 }, 0).to(p.bigClaw, { rotation: SEARCH_HOLD, duration: 0.4 }, 0);
    look(tl, p, -11, -3, 0, 0.4);
    return tl;
  },
};

/**
 * Nothing in here yet (no resumes, no career profiles, no CVs linked): she peers into
 * an empty folder — stalks craned right over it — gives it a shake (nothing
 * falls out), then looks at you with a hopeful shrug.
 */
const emptyFolder: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = timeline();
    resetPaper(tl, p, "blank", 0);
    tl.set(p.paperBack, { rotation: -READ_HOLD, x: 0, opacity: 0 }, 0)
      .set(p.paperSheet, { opacity: 0 }, 0)
      .set([p.folderBack, p.folderFront], { opacity: 1 }, 0)
      .to(p.paperBack, { opacity: 1, duration: 0.2 }, 0);
    holdPaper(tl, p, 0, 0, 0.6, "back.out(1.4)");
    look(tl, p, 8, 6, 0.3, 0.3);
    return tl;
  },
  cycle: (p) => {
    const tl = timeline();
    // A peek inside: stalks craned right over it, eyes down into it.
    tl.to(p.stalkL, { rotation: 7, duration: 0.45, ease: "back.out(1.6)" }, 0)
      .to(p.stalkR, { rotation: 11, duration: 0.45, ease: "back.out(1.6)" }, 0.05)
      .to(p.root, { rotation: 1.5, duration: 0.45 }, 0);
    stretchStalks(tl, p, 1.12, 0, 0.45, "back.out(1.6)");
    look(tl, p, 9, 10, 0.1, 0.3);
    mouth(tl, p, "o", 0.3);
    // A shake — nothing falls out.
    const shake = 1.1;
    for (let i = 0; i < 4; i++) holdPaper(tl, p, i % 2 ? 5 : -5, shake + i * 0.09, 0.09, "sine.inOut");
    holdPaper(tl, p, 0, shake + 0.36, 0.3, "back.out(2)");
    look(tl, p, 9, 11, shake, 0.2);
    // Empty. A hopeful look at you, and a shrug.
    const back = shake + 0.75;
    tl.to([p.stalkL, p.stalkR, p.root], { rotation: 0, duration: 0.4, ease: "power2.inOut" }, back);
    stretchStalks(tl, p, 1, back, 0.4, "power2.inOut");
    look(tl, p, 1, 1, back, 0.3);
    const end = shrug(tl, p, back + 0.35, 0.9, false);
    holdPaper(tl, p, -6, back + 0.35, 0.22, "back.out(2)");
    holdPaper(tl, p, 0, back + 1.25, 0.35, "power2.inOut");
    mouth(tl, p, "smile", end);
    blink(tl, p, end + 0.4);
    tl.to({}, { duration: 0 }, end + 1.2);
    return tl;
  },
  reducedPose: (p) => {
    const tl = timeline();
    tl.set([p.paperBack, p.folderBack, p.folderFront], { opacity: 1 }, 0).set(p.paperBack, { rotation: -READ_HOLD }, 0);
    resetPaper(tl, p, "blank", 0);
    tl.set(p.paperSheet, { opacity: 0 }, 0);
    holdPaper(tl, p, 0, 0, 0.4);
    look(tl, p, 8, 6, 0, 0.4);
    return tl;
  },
};

// ─── Sitting on a ledge (the sidebar) ────────────────────────────────────────

/** The big claw resting on the ledge beside her, bent at the elbow; the small one hooked over the edge. */
function gripLedge(tl: TL, p: MoxieParts, at: number, duration: number, ease = "power2.inOut") {
  tl.to(p.bigClaw, { rotation: SIT.bigClaw, x: SIT.bigClawX, y: SIT.bigClawY, duration, ease }, at)
    .to(p.bigPincer, { rotation: SIT.bigPincer, x: SIT.bigPincerX, y: SIT.bigPincerY, duration, ease }, at)
    .to(p.smallClaw, { rotation: SIT.smallClaw, duration, ease }, at)
    .to(p.smallPincer, { rotation: SIT.smallPincer, duration, ease }, at);
}

/**
 * Settled on the ledge: her body resting on it, her big claw set down on it
 * beside her, the small one hooked over it, legs hanging too.
 */
function sitPose(tl: TL, p: MoxieParts, at: number, duration: number) {
  tl.to(p.shadow, { opacity: 0, duration: Math.min(duration, 0.2) }, at).to(
    p.legList,
    { y: SIT.legDrop, scaleY: SIT.legHang, rotation: 0, duration, ease: "power2.inOut" },
    at,
  );
  gripLedge(tl, p, at, duration);
}

/** One back-and-forth of a dangling leg, in seconds. */
const LEG_SWING = 1.7;

/**
 * A wave from where she sits: the big claw lifts off the ledge (the arm
 * straightening), a couple of waves, and sets it back down. Returns the end time.
 */
function sitWave(tl: TL, p: MoxieParts, at: number): number {
  tl.to(p.bigClaw, { rotation: 16, x: 0, y: 0, duration: 0.45, ease: "back.out(1.6)" }, at)
    .to(p.bigPincer, { rotation: -10, x: 0, y: 0, duration: 0.45, ease: "back.out(1.6)" }, at + 0.05)
    .to([p.lidL, p.lidR], { y: LID.happy, duration: 0.2 }, at + 0.1);
  look(tl, p, 1, 2, at, 0.3);
  let t = at + 0.45;
  for (let i = 0; i < 2; i++) {
    tl.to(p.bigClaw, { rotation: -2, duration: 0.26 }, t)
      .to(p.bigPincer, { rotation: 8, duration: 0.26 }, t + 0.05)
      .to(p.bigClaw, { rotation: 16, duration: 0.26 }, t + 0.26)
      .to(p.bigPincer, { rotation: -10, duration: 0.26 }, t + 0.31);
    t += 0.52;
  }
  tl.to(p.bigClaw, { rotation: SIT.bigClaw, x: SIT.bigClawX, y: SIT.bigClawY, duration: 0.55, ease: "power2.inOut" }, t)
    .to(p.bigPincer, { rotation: SIT.bigPincer, x: SIT.bigPincerX, y: SIT.bigPincerY, duration: 0.55, ease: "power2.inOut" }, t)
    .to([p.lidL, p.lidR], { y: LID.open, duration: 0.25 }, t + 0.2);
  return t + 0.55;
}

/**
 * Sitting on the edge of a ledge (the sidebar), body upright and resting on
 * it, her big claw hanging over the edge, the small one hooked on it, legs
 * hanging free and swinging gently back and forth (the hanging claw swaying
 * with them). She breathes, looks about, glances down at her feet — and now
 * and then swings her big claw up to wave. Tickled, she covers up without
 * getting off it.
 */
const sitting: MoxiePreset = {
  mode: "loop",
  coversUpWhenTickled: true,
  intro: (p) => {
    const tl = timeline();
    sitPose(tl, p, 0, 0.55);
    look(tl, p, 1, 2, 0.2, 0.3);
    return tl;
  },
  cycle: (p) => {
    const tl = timeline();
    const swings = 4;
    const total = swings * LEG_SWING;
    // Legs swinging: forward (toward us — so foreshortened, shorter) and back,
    // the outer two together, the middle one a little behind.
    p.legList.forEach((leg, i) => {
      const lag = i === 1 ? 0.3 : 0;
      const side = i === 0 ? -1 : i === 2 ? 1 : 0;
      for (let k = 0; k < swings; k++) {
        const t = k * LEG_SWING + lag;
        tl.to(leg, { scaleY: SIT.legHang * 0.66, rotation: side * 7 + 5, duration: LEG_SWING / 2, ease: "sine.inOut" }, t).to(
          leg,
          { scaleY: SIT.legHang, rotation: side * 3 - 4, duration: LEG_SWING / 2, ease: "sine.inOut" },
          t + LEG_SWING / 2,
        );
      }
    });
    // A slow breath, the body swelling a touch (she stays put on the ledge).
    tl.to([p.body, p.face], { scaleY: 1.015, scaleX: 1.006, duration: total / 4 }, 0)
      .to([p.body, p.face], { scaleY: 1, scaleX: 1, duration: total / 4 }, total / 4)
      .to([p.body, p.face], { scaleY: 1.015, scaleX: 1.006, duration: total / 4 }, total / 2)
      .to([p.body, p.face], { scaleY: 1, scaleX: 1, duration: total / 4 }, (total * 3) / 4);
    // The stalks sway with the swinging.
    const sway = random(1.5, 2.5);
    tl.to(p.stalkL, { rotation: sway, duration: total / 2 }, 0)
      .to(p.stalkL, { rotation: 0, duration: total / 2 }, total / 2)
      .to(p.stalkR, { rotation: -sway * 0.8, duration: total / 2 - 0.3 }, 0.3)
      .to(p.stalkR, { rotation: 0, duration: total / 2 }, total / 2);

    if (chance(0.45)) {
      // A wave to you.
      const at = random(1.2, 2.4);
      const end = sitWave(tl, p, at);
      lookHome(tl, p, end + 0.2, 0.4);
    } else {
      // The resting claw rocks a touch on the ledge in time with the legs.
      for (let k = 0; k < swings; k++) {
        const t = k * LEG_SWING + 0.15;
        tl.to(p.bigPincer, { rotation: SIT.bigPincer + 3, duration: LEG_SWING / 2 }, t)
          .to(p.bigPincer, { rotation: SIT.bigPincer - 2, duration: LEG_SWING / 2 }, t + LEG_SWING / 2);
      }
      tl.to(p.bigPincer, { rotation: SIT.bigPincer, duration: 0.3 }, total + 0.15);
      // A look about — sometimes down at her swinging feet.
      const at = random(0.8, 2);
      const [x, y] = chance(0.5) ? ([2, 11] as const) : pick([[-10, -3], [10, -4], [-7, 6]] as const);
      look(tl, p, x, y, at, 0.35);
      if (y > 8) tl.to([p.lidL, p.lidR], { y: LID.happy, duration: 0.3 }, at + 0.2).to([p.lidL, p.lidR], { y: LID.open, duration: 0.3 }, at + 1.5);
      lookHome(tl, p, at + random(1.4, 2), 0.45);
    }
    blink(tl, p, random(0.4, total - 1));
    // A little squeeze of the small pincer on the edge.
    if (chance(0.4)) {
      const at = random(3.5, total - 1);
      tl.to(p.smallPincer, { rotation: SIT.smallPincer + 12, duration: 0.12, ease: "power2.out" }, at)
        .to(p.smallPincer, { rotation: SIT.smallPincer, duration: 0.3, ease: "back.out(3)" }, at + 0.12);
    }
    return tl;
  },
  reducedPose: poseOnly(sitPose),
};

// ─── The 404 page, an error, the paywall (tier 4) ────────────────────────────

/** Pacing, seen from the side: how far a step takes her, how long it takes, and how far she goes each way. */
const PACE = { stride: 10.5, step: 0.34, reach: 42 } as const;
/** The near legs she steps with together, and the others (the side view's legs: far three, then near three). */
const PACE_GAIT = [[1, 3, 5], [0, 2, 4]] as const;

/**
 * Pacing, seen from the side, from `fromX` to `toX`: alternate legs swing
 * forward and push back, a bob on every step, leaning into the walk —
 * then her legs settle, unless she's walking straight on (`settle` false).
 * Returns the end time.
 */
function pace(tl: TL, p: MoxieParts, fromX: number, toX: number, at: number, settle = true): number {
  const steps = Math.max(2, Math.round(Math.abs(toX - fromX) / PACE.stride));
  const duration = steps * PACE.step;
  tl.to([p.side, p.shadow], { x: toX, duration, ease: "none" }, at).to(p.sideBody, { rotation: 3, duration: 0.2 }, at);
  for (let i = 0; i < steps; i++) {
    const t = at + i * PACE.step;
    const [lifted, planted] = i % 2 ? [PACE_GAIT[0], PACE_GAIT[1]] : [PACE_GAIT[1], PACE_GAIT[0]];
    // (Forward is a negative turn: each leg hangs from its top, and she faces +x.)
    tl.to(lifted.map((j) => p.sideLegs[j]), { rotation: -18, y: -5, duration: PACE.step / 2, ease: "power1.out" }, t)
      .to(lifted.map((j) => p.sideLegs[j]), { y: 0, duration: PACE.step / 2, ease: "power1.in" }, t + PACE.step / 2)
      .to(planted.map((j) => p.sideLegs[j]), { rotation: 14, duration: PACE.step, ease: "none" }, t)
      .to(p.sideBody, { y: -3, duration: PACE.step / 2, ease: "sine.out" }, t)
      .to(p.sideBody, { y: 0, duration: PACE.step / 2, ease: "sine.in" }, t + PACE.step / 2);
  }
  const end = at + duration;
  if (settle) tl.to(p.sideLegs, { rotation: 0, y: 0, duration: 0.2 }, end).to(p.sideBody, { rotation: 0, duration: 0.25 }, end);
  return end;
}

/**
 * Turns around on the spot to face `facing`, all in her side view: she
 * settles her weight, swings round (narrowing to edge-on and widening out
 * the other way) with a little hop, her feet shuffling round under her,
 * and the turn overshoots a touch before it settles. Returns the end time.
 */
function turnAround(tl: TL, p: MoxieParts, facing: 1 | -1, at: number): number {
  const half = 0.2;
  const mid = at + 0.12 + half;
  // Weight settles before the turn…
  tl.to(p.sideBody, { y: 3, scaleY: 0.97, duration: 0.12, ease: "power2.out" }, at)
    // …she swings round to edge-on, lifting a little…
    .to(p.sideTurn, { scaleX: -facing * 0.12, duration: half, ease: "power2.in" }, at + 0.12)
    .to(p.sideBody, { y: -4, scaleY: 1.02, duration: half, ease: "power2.out" }, at + 0.12)
    // …and on round the other way, landing.
    .set(p.sideTurn, { scaleX: facing * 0.12 }, mid)
    .to(p.sideTurn, { scaleX: facing, duration: 0.3, ease: "back.out(1.4)" }, mid)
    .to(p.sideBody, { y: 0, scaleY: 1, duration: 0.3, ease: "power2.in" }, mid);
  // Feet shuffle round under her as she turns.
  p.sideLegs.forEach((leg, i) => {
    const t = at + 0.12 + (i % 3) * 0.08 + (i < 3 ? 0.04 : 0);
    tl.to(leg, { y: -5, rotation: -10, duration: 0.1, ease: "power1.out" }, t).to(leg, { y: 0, rotation: 0, duration: 0.12, ease: "power1.in" }, t + 0.1);
  });
  return mid + 0.3;
}

/** A bead of sweat, down the side of her head. */
function sweat(tl: TL, p: MoxieParts, at: number) {
  tl.set(p.sideSweat, { opacity: 0, y: -4, scale: 0.6 }, at)
    .to(p.sideSweat, { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "back.out(2)" }, at)
    .to(p.sideSweat, { y: 24, duration: 0.7, ease: "power2.in" }, at + 0.35)
    .to(p.sideSweat, { opacity: 0, duration: 0.2 }, at + 0.85);
}

/** A blink (the lids drop shut from just above her eyes, and back up out of sight). */
function sideBlink(tl: TL, p: MoxieParts, at: number) {
  tl.to(p.sideLids, { y: SIDE_BLINK, duration: 0.08, ease: "power2.in" }, at).to(p.sideLids, { y: 0, duration: 0.15, ease: "power2.out" }, at + 0.1);
}

/**
 * Lost (the 404 page): seen from the side the whole time, claws clasped
 * behind her back, she paces — already on the move when the page opens —
 * over to one side, a worried stop and a bead of sweat, turn, all the way
 * over to the other, a sigh, turn, back through the middle — fretting.
 */
const lost: MoxiePreset = {
  mode: "loop",
  fromCurrentPose: true, // straight into the side view, walking: her front view never shows
  intro: (p) => {
    // Applied at once as well (not only on the timeline's first tick), so her front view never shows.
    const sideOn = () => {
      gsap.set(p.root, { opacity: 0 });
      gsap.set(p.side, { opacity: 1 });
      gsap.set(p.sideTurn, { scaleX: 1 });
    };
    sideOn();
    const tl = timeline();
    tl.add(toNeutral(p, 0), 0)
      .set(p.sideCrown, { opacity: gsap.getProperty(p.crown, "opacity") as number }, 0)
      .add(sideOn, 0);
    return tl;
  },
  cycle: (p) => {
    const tl = timeline();
    // Over to the right…
    let t = pace(tl, p, 0, PACE.reach, 0);
    // …a worried stop, a bead of sweat. Turn.
    sweat(tl, p, t + 0.1);
    t = turnAround(tl, p, -1, t + 0.9);
    // All the way over to the left…
    t = pace(tl, p, PACE.reach, -PACE.reach, t);
    // …a sigh, eyes down, a blink. Turn.
    tl.to(p.sideBody, { scaleY: 0.96, y: 3, duration: 0.35, ease: "power2.out" }, t + 0.1)
      .to(p.sideBody, { scaleY: 1, y: 0, duration: 0.45, ease: "power2.inOut" }, t + 0.55)
      .to(p.sidePupils, { y: 7, duration: 0.3 }, t + 0.1)
      .to(p.sidePupils, { y: 0, duration: 0.3 }, t + 0.8);
    sideBlink(tl, p, t + 0.95);
    t = turnAround(tl, p, 1, t + 1.2);
    // …and back through the middle, walking straight on into the next round.
    const back = t;
    t = pace(tl, p, -PACE.reach, 0, back, false);
    if (chance(0.5)) sideBlink(tl, p, random(back + 0.3, t - 0.3));
    return tl;
  },
  reducedPose: (p) => {
    const tl = timeline();
    tl.set(p.sideCrown, { opacity: gsap.getProperty(p.crown, "opacity") as number }, 0)
      .set(p.root, { opacity: 0 }, 0)
      .set(p.side, { opacity: 1 }, 0);
    return tl;
  },
};

/** How far from the pencil's point it breaks (the front half and the point fly off). */
const PENCIL_BREAK = PENCIL.length - (PENCIL.length - 13) / 2;
/** Where the broken-off half flies, as she sees it: up and away, then down out of sight. */
const SNAP_FLIGHT = [
  { x: 70, y: -120, rotation: 520, duration: 0.42, ease: "power2.out" },
  { x: 150, y: 230, rotation: 1100, duration: 0.85, ease: "power2.in" },
] as const;

/**
 * Something broke (an error page, an AI or PDF failure): she's writing away
 * and bears down on the next line — the pencil trembles — and it SNAPS in
 * half. The front half spins off into the air in a burst; she jumps back,
 * eyes huge, glasses knocked askew; holds up the splintered stub, trembling,
 * stares at it, wilts with a sigh — then a sheepish look at you. Glasses
 * straightened, new pencil, fresh sheet, and she starts again.
 */
const oops: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = withBridge(timeline(), p);
    raiseSheet(tl, p, "blank", "pencil");
    tl.set(p.pencilTip, { x: 0, y: 0, rotation: 0, opacity: 1 }, 0).set(p.pencilSplinter, { opacity: 0 }, 0);
    clawTo(tl, p, paperRowPoints(PAPER_ROWS[0])[0], 0.55, 0.55, "power2.inOut");
    mouth(tl, p, "tongue", 0.8);
    return tl;
  },
  cycle: (p) => {
    const tl = withBridge(timeline(), p);
    mouth(tl, p, "tongue", 0);
    // Writing away at the first line — and partway along, mid-stroke…
    const points = paperRowPoints(PAPER_ROWS[0]);
    const upTo = Math.ceil(points.length * 0.55);
    let t = 0.1;
    for (let i = 1; i <= upTo; i++) {
      const duration = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y) / WRITE_SPEED;
      clawTo(tl, p, points[i], t, duration);
      t += duration;
    }
    tl.to(p.paperInks[0], { strokeDashoffset: PAPER_INK_LENGTHS[0] - polylineLength(points.slice(0, upTo + 1)), duration: t - 0.1, ease: "none" }, 0.1);
    look(tl, p, READ_GAZE.from.x, READ_GAZE.from.y, 0.1, 0.15, "power2.out");
    look(tl, p, READ_GAZE.to.x, READ_GAZE.to.y, 0.25, t - 0.25, "none");
    // …SNAP.
    const start = points[upTo];
    const snap = t;
    const angle = ((PENCIL.angle + clawRotationTo(start)) * Math.PI) / 180;
    const breakPoint = { x: start.x - PENCIL_BREAK * Math.cos(angle), y: start.y - PENCIL_BREAK * Math.sin(angle) };
    // Off flies the front half, spinning (moved in the pencil's own turned frame, so it goes where she sees it go).
    const local = (v: { x: number; y: number }) => ({
      x: v.x * Math.cos(-angle) - v.y * Math.sin(-angle),
      y: v.x * Math.sin(-angle) + v.y * Math.cos(-angle),
    });
    let at = snap;
    for (const leg of SNAP_FLIGHT) {
      tl.to(p.pencilTip, { ...local(leg), rotation: leg.rotation, duration: leg.duration, ease: leg.ease }, at);
      at += leg.duration;
    }
    tl.to(p.pencilTip, { opacity: 0, duration: 0.2 }, at - 0.25).set(p.pencilSplinter, { opacity: 1 }, snap);
    // A burst where it broke, and the sheet jolts.
    sparkleAt(tl, p, 0, snap, breakPoint, 1.2);
    sparkleAt(tl, p, 1, snap + 0.04, { x: breakPoint.x + 18, y: breakPoint.y - 14 }, 0.7);
    sparkleAt(tl, p, 2, snap + 0.07, { x: breakPoint.x - 16, y: breakPoint.y - 10 }, 0.6);
    holdPaper(tl, p, -10, snap, 0.08, "power2.out");
    holdPaper(tl, p, 0, snap + 0.08, 0.5, "elastic.out(1, 0.4)");
    // She jumps back — eyes huge, stalks shot up, glasses knocked up and left crooked — a big "OH!"
    tl.to(p.root, { x: -12, y: -18, rotation: -6, duration: 0.14, ease: "power2.out" }, snap)
      .to(p.root, { y: 0, duration: 0.2, ease: "power2.in" }, snap + 0.14)
      .to(p.root, { x: -6, rotation: -2, duration: 0.4, ease: "back.out(2)" }, snap + 0.34)
      .to([p.lidL, p.lidR], { y: LID.open, duration: 0.08 }, snap)
      .to([p.eyeL, p.eyeR], { scale: 1.22, duration: 0.12, ease: "back.out(3)" }, snap)
      .to([p.glassesL, p.glassesR], { y: -20, rotation: -14, duration: 0.14, ease: "power2.out" }, snap)
      .to(p.glassesL, { y: 4, rotation: 9, duration: 0.3, ease: "bounce.out" }, snap + 0.14)
      .to(p.glassesR, { y: 1, rotation: -4, duration: 0.3, ease: "bounce.out" }, snap + 0.14)
      .to(p.mouthO, { scale: 1.6, duration: 0.1, ease: "back.out(3)" }, snap);
    stretchStalks(tl, p, 1.25, snap, 0.14, "power2.out");
    stretchStalks(tl, p, 1.05, snap + 0.3, 0.6, "elastic.out(1, 0.35)");
    mouth(tl, p, "o", snap, 0.03);
    // Her eyes follow it up… and down.
    look(tl, p, 10, -11, snap + 0.05, 0.2);
    look(tl, p, 10, 11, snap + 0.5, 0.55, "power2.in");
    // She holds up the stub and stares at it, trembling.
    const stare = snap + 1.25;
    tl.to(p.bigClaw, { rotation: 6, x: 10, y: 6, duration: 0.45, ease: "power2.inOut" }, stare)
      .to([p.eyeL, p.eyeR], { scale: 1.08, duration: 0.3 }, stare)
      .to(p.mouthO, { scale: 1, duration: 0.3 }, stare);
    for (let i = 0; i < 8; i++) tl.to(p.bigClaw, { rotation: i % 2 ? 4.5 : 7.5, duration: 0.05 }, stare + 0.5 + i * 0.05);
    look(tl, p, -11, -6, stare, 0.3);
    // …and wilts: stalks droop, a long sigh.
    const wilt = stare + 1.2;
    tl.to([p.eyeL, p.eyeR], { scale: 1, duration: 0.4 }, wilt)
      .to(p.stalkL, { rotation: -14, duration: 0.6, ease: "power2.inOut" }, wilt)
      .to(p.stalkR, { rotation: 12, duration: 0.6, ease: "power2.inOut" }, wilt + 0.05)
      .to([p.lidL, p.lidR], { y: LID.heavy, duration: 0.4 }, wilt)
      .to(p.root, { scaleY: 0.95, scaleX: 1.02, duration: 0.6, ease: "power2.out" }, wilt);
    stretchStalks(tl, p, 0.88, wilt, 0.6, "power2.inOut");
    mouth(tl, p, "flat", wilt + 0.1);
    look(tl, p, -4, 9, wilt, 0.5, "sine.inOut");
    // Then, stub lowered, a sheepish look at you over her crooked glasses: "heh."
    const sheepish = wilt + 1.3;
    tl.to(p.bigClaw, { rotation: -6, x: 0, y: 0, duration: 0.45, ease: "power2.inOut" }, sheepish - 0.15)
      .to([p.lidL, p.lidR], { y: LID.open, duration: 0.25 }, sheepish + 0.1)
      .to(p.root, { scaleY: 1, scaleX: 1, rotation: 2, duration: 0.4, ease: "back.out(1.6)" }, sheepish)
      .to(p.stalkL, { rotation: -5, duration: 0.4 }, sheepish)
      .to(p.stalkR, { rotation: 4, duration: 0.4 }, sheepish + 0.05);
    stretchStalks(tl, p, 1, sheepish, 0.4, "back.out(1.6)");
    look(tl, p, -1, -10, sheepish, 0.3, "power2.out");
    mouth(tl, p, "smile", sheepish + 0.15);
    // Glasses straightened, a fresh pencil and a fresh sheet; back to it.
    const again = sheepish + 1.4;
    tl.to([p.glassesL, p.glassesR], { y: 0, rotation: 0, duration: 0.3, ease: "back.out(2)" }, again)
      .to(p.pencil, { opacity: 0, duration: 0.2 }, again)
      .set(p.pencilTip, { x: 0, y: 0, rotation: 0, opacity: 1 }, again + 0.2)
      .set(p.pencilSplinter, { opacity: 0 }, again + 0.2)
      .to(p.pencil, { opacity: 1, duration: 0.25 }, again + 0.45)
      .to([p.stalkL, p.stalkR], { rotation: 0, duration: 0.4 }, again)
      .to(p.root, { x: 0, rotation: -2.5, duration: 0.4 }, again);
    stretchStalks(tl, p, 0.95, again, 0.4, "sine.inOut");
    swapSheet(tl, p, again, "blank");
    clawTo(tl, p, paperRowPoints(PAPER_ROWS[0])[0], again + 0.4, 0.45, "power2.inOut");
    mouth(tl, p, "tongue", again + 0.6);
    tl.to({}, { duration: 0 }, again + 0.9);
    return tl;
  },
  reducedPose: (p) => {
    const tl = withBridge(timeline(), p);
    tl.set([p.paperBack, p.pencil, p.glassesL, p.glassesR, p.glassesBridge, p.pencilSplinter], { opacity: 1 }, 0)
      .set(p.paperBack, { rotation: -READ_HOLD }, 0)
      .set(p.pencilTip, { opacity: 0 }, 0)
      .set(p.glassesL, { y: 4, rotation: 9 }, 0);
    resetPaper(tl, p, "blank", 0);
    holdPaper(tl, p, 0, 0, 0.4);
    clawTo(tl, p, paperRowPoints(PAPER_ROWS[0])[2], 0, 0.4, "power2.inOut");
    look(tl, p, -1, -10, 0, 0.4);
    mouth(tl, p, "o", 0);
    return tl;
  },
};

/** Between the big pincer's tips, at rest — what she reaches for the crown with. */
const PINCER_TIPS = { x: 192, y: 200 } as const;
/** Reaching up for it, standing — and the highest she gets on a jump (in her own drawing: she's lifted with it). */
const REACH = { x: 190, y: 172 } as const;
const REACH_HIGH = { x: 188, y: 166 } as const;

/**
 * The paywall: a Pro crown hangs in the air just above her big claw. She
 * looks up at it, reaches — crouches, and jumps for it, claw stretched,
 * pincer snapping shut on thin air just short of it. She lands, and wilts —
 * sad, with a sigh — then perks up to look at you with a hopeful little
 * "please?", and eyes it again. The crown never moves:
 * it's out of reach, that's all. (It's its own crown, Pro or not.)
 */
const upgrade: MoxiePreset = {
  mode: "loop",
  ownsCrown: true,
  intro: (p) => {
    const tl = timeline();
    tl.set(p.crown, { opacity: 0 }, 0)
      .set(p.crownFloat, { opacity: 0, scale: 0.6 }, 0)
      .to(p.crownFloat, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, 0.1);
    sparkleAt(tl, p, 0, 0.4, { x: CROWN_FLOAT.x + 22, y: CROWN_FLOAT.y - 30 }, 0.6);
    look(tl, p, -8, -11, 0.1, 0.35);
    stretchStalks(tl, p, 1.06, 0.1, 0.4, "back.out(1.6)");
    mouth(tl, p, "o", 0.2);
    return tl;
  },
  cycle: (p) => {
    const tl = timeline();
    // A glint; she reaches up for it, pincer open…
    sparkleAt(tl, p, 0, 0.1, { x: CROWN_FLOAT.x - 20, y: CROWN_FLOAT.y - 24 }, 0.5);
    clawTo(tl, p, REACH, 0, 0.45, "back.out(1.6)", PINCER_TIPS);
    tl.to(p.bigPincer, { rotation: -14, duration: 0.3 }, 0.1);
    look(tl, p, -9, -11, 0, 0.3);
    mouth(tl, p, "o", 0.1);
    // …not enough. A crouch…
    const crouch = 0.75;
    tl.to(p.root, { scaleY: 0.86, scaleX: 1.08, duration: 0.2, ease: "power2.in" }, crouch).to(p.shadow, { scaleX: 1.06, duration: 0.2 }, crouch);
    stretchStalks(tl, p, 0.9, crouch, 0.2, "power2.in");
    // …and a jump for it — just short.
    const jump = crouch + 0.2;
    const rise = 0.32;
    tl.to(p.root, { y: -42, scaleY: 1.07, scaleX: 0.95, duration: rise, ease: "power2.out" }, jump)
      .to(p.shadow, { scaleX: 0.6, opacity: SHADOW_OPACITY * 0.5, duration: rise, ease: "power2.out" }, jump)
      .to(p.legList, { rotation: (i: number) => (i - 1) * 10, y: -4, duration: 0.25 }, jump);
    clawTo(tl, p, REACH_HIGH, jump, rise, "power2.out", PINCER_TIPS);
    stretchStalks(tl, p, 1.14, jump, rise, "back.out(2)");
    look(tl, p, -7, -11, jump, 0.2);
    // Snap! — on thin air.
    const apex = jump + rise;
    tl.to(p.bigPincer, { rotation: 8, duration: 0.07, ease: "power3.in" }, apex).to(p.bigPincer, { rotation: -6, duration: 0.2 }, apex + 0.12);
    // Down she comes.
    const fall = apex + 0.08;
    tl.to(p.root, { y: 0, scaleY: 1.04, scaleX: 0.97, duration: 0.3, ease: "power2.in" }, fall)
      .to(p.shadow, { scaleX: 1, opacity: SHADOW_OPACITY, duration: 0.3, ease: "power2.in" }, fall)
      .to(p.legList, { rotation: 0, y: 0, duration: 0.15 }, fall + 0.15)
      .to(p.root, { scaleY: 0.9, scaleX: 1.06, duration: 0.08, ease: "power2.out" }, fall + 0.3)
      .to(p.root, { scaleY: 1, scaleX: 1, duration: 0.45, ease: "back.out(2.2)" }, fall + 0.38);
    clawTo(tl, p, REACH, fall, 0.3, "power2.in", PINCER_TIPS);
    stretchStalks(tl, p, 1.04, fall + 0.3, 0.6, "elastic.out(1, 0.4)");
    // Missed. She's sad about it: the claw drops, stalks droop a little, a
    // slumped sigh — her eyes lowered only slightly, still mostly on you.
    const sad = fall + 0.85;
    tl.to(p.bigClaw, { rotation: 0, x: 0, y: 0, duration: 0.6, ease: "power2.inOut" }, sad)
      .to(p.bigPincer, { rotation: 0, duration: 0.5 }, sad)
      .to([p.lidL, p.lidR], { y: LID.relaxed, duration: 0.4 }, sad)
      .to(p.stalkL, { rotation: -9, duration: 0.6, ease: "power2.inOut" }, sad)
      .to(p.stalkR, { rotation: 8, duration: 0.6, ease: "power2.inOut" }, sad + 0.05)
      .to(p.root, { scaleY: 0.95, scaleX: 1.02, duration: 0.6, ease: "power2.out" }, sad)
      // the sigh: a breath in, and out
      .to(p.root, { scaleY: 0.97, duration: 0.35, ease: "sine.inOut" }, sad + 0.8)
      .to(p.root, { scaleY: 0.94, duration: 0.45, ease: "sine.inOut" }, sad + 1.15);
    stretchStalks(tl, p, 0.94, sad, 0.6, "power2.inOut");
    mouth(tl, p, "flat", sad + 0.1);
    look(tl, p, -2, 4, sad, 0.5, "sine.inOut");
    // …then perks up with a hopeful look at you: "please?"
    const ask = sad + 1.75;
    tl.to(p.stalkL, { rotation: 0, duration: 0.45, ease: "back.out(1.6)" }, ask)
      .to(p.stalkR, { rotation: 0, duration: 0.45, ease: "back.out(1.6)" }, ask + 0.05)
      .to(p.root, { scaleY: 1, scaleX: 1, duration: 0.4, ease: "back.out(2)" }, ask)
      .to([p.lidL, p.lidR], { y: LID.happy, duration: 0.25 }, ask + 0.25)
      .to(p.smallClaw, { rotation: -22, duration: 0.35, ease: "back.out(2)" }, ask + 0.3)
      .to(p.smallPincer, { rotation: -14, duration: 0.15 }, ask + 0.65)
      .to(p.smallPincer, { rotation: 0, duration: 0.15 }, ask + 0.8)
      .to(p.smallPincer, { rotation: -14, duration: 0.15 }, ask + 0.95)
      .to(p.smallPincer, { rotation: 0, duration: 0.2 }, ask + 1.1)
      .to(p.smallClaw, { rotation: 0, duration: 0.4 }, ask + 1.5)
      .to([p.lidL, p.lidR], { y: LID.open, duration: 0.25 }, ask + 1.6);
    stretchStalks(tl, p, 1, ask, 0.4, "power2.inOut");
    look(tl, p, 1, 2, ask, 0.3);
    mouth(tl, p, "smile", ask + 0.2);
    // …and eyes it again.
    look(tl, p, -8, -11, ask + 1.8, 0.4, "sine.inOut");
    stretchStalks(tl, p, 1.06, ask + 1.8, 0.4, "sine.inOut");
    mouth(tl, p, "o", ask + 2.0);
    blink(tl, p, ask + 2.3);
    tl.to({}, { duration: 0 }, ask + 2.6);
    return tl;
  },
  reducedPose: (p) => {
    const tl = timeline();
    tl.set(p.crown, { opacity: 0 }, 0).set(p.crownFloat, { opacity: 1, scale: 1 }, 0);
    clawTo(tl, p, REACH, 0, 0.4, "power2.inOut", PINCER_TIPS);
    look(tl, p, -8, -11, 0, 0.4);
    return tl;
  },
};

// ─── Presenting (a loader, to compare with "loading") ────────────────────────

/** One round of presenting a fact, in seconds — the card beside her (MoxieDidYouKnow) changes on the same beat. */
export const PRESENT_SECONDS = 6;
/** The big claw resting, held out a little toward the card on her left. */
const PRESENT_REST = -8;
/** …and swept out to present it: "ta-da, look at this". */
const PRESENT_SWEEP = -22;
/** Her eyes on the card, up and to her left, through her lenses. */
const CARD_GAZE = { x: -11, y: -3 } as const;

/** A tap of the hugging pincer on the folders. */
function tapFolders(tl: TL, p: MoxieParts, at: number) {
  tl.to(p.hugPincer, { rotation: -14, duration: 0.1, ease: "power2.out" }, at).to(p.hugPincer, { rotation: 0, duration: 0.18, ease: "power2.in" }, at + 0.1);
}

/**
 * Hang on, it's coming — and meanwhile, did you know…? Glasses on, a stack of
 * folders hugged to her side, she presents a card beside her with her big
 * claw (a new fact on it each round): sweeps her claw out to it, leans in and
 * reads it eagerly through her glasses — and is amazed: eyes wide, stalks up,
 * "oh!"; then has to share it, spinning round to you grinning, jabbing at the
 * card and bouncing on her toes; then the folders slip, and she hitches them
 * back up with a little hop. The card itself is the page's, not part of her
 * (see MoxieDidYouKnow), so its words stay crisp at any size.
 */
const presenting: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = withBridge(timeline(), p);
    // The folders, tucked under her small claw: its copy (drawn just the same) takes its place at once,
    // lifts to let them in, and presses them to her side.
    tl.set(p.hugFiles, { opacity: 1 }, 0)
      .set(p.smallClaw, { opacity: 0 }, 0)
      .set(p.hugStack, { y: 34, opacity: 0 }, 0)
      .set(p.hugSheet, { opacity: 0 }, 0)
      .to(p.hugFiles, { rotation: -12, duration: 0.2, ease: "power2.out" }, 0.05)
      .to(p.hugStack, { opacity: 1, duration: 0.15 }, 0.1)
      .to(p.hugStack, { y: 0, duration: 0.45, ease: "back.out(1.6)" }, 0.1)
      .to(p.hugFiles, { rotation: 0, duration: 0.35, ease: "back.out(2)" }, 0.35)
      .to(p.root, { scaleY: 0.97, scaleX: 1.02, duration: 0.12, ease: "power2.out" }, 0.4)
      .to(p.root, { scaleY: 1, scaleX: 1, duration: 0.35, ease: "back.out(2.5)" }, 0.52)
      .to(p.bigClaw, { rotation: PRESENT_REST, duration: 0.45, ease: "power2.inOut" }, 0.3);
    tapFolders(tl, p, 0.55);
    glassesOn(tl, p, 0.25);
    return tl;
  },
  cycle: (p) => {
    const tl = withBridge(timeline(), p);
    // A new fact: she sweeps her claw out to present it, pincer open — ta-da.
    tl.to(p.bigClaw, { rotation: PRESENT_SWEEP, duration: 0.4, ease: "back.out(1.8)" }, 0)
      .to(p.bigPincer, { rotation: -12, duration: 0.3, ease: "back.out(2)" }, 0.05)
      .to(p.root, { rotation: -2, duration: 0.4 }, 0);
    look(tl, p, CARD_GAZE.x, CARD_GAZE.y, 0, 0.3);
    stretchStalks(tl, p, 1.05, 0, 0.3, "back.out(2)");
    // Reading it, eagerly: she leans in toward the card, stalks craning, eyes bright and running along
    // the lines, smiling — a little bounce on each line, a happy squeeze of the folders.
    tl.to(p.root, { rotation: -4, duration: 0.4, ease: "power2.out" }, 0.4)
      .to(p.stalkL, { rotation: -9, duration: 0.4, ease: "back.out(1.8)" }, 0.4)
      .to(p.stalkR, { rotation: -7, duration: 0.4, ease: "back.out(1.8)" }, 0.44)
      .to([p.lidL, p.lidR], { y: LID.open, duration: 0.2 }, 0.4)
      .to(p.bigClaw, { rotation: PRESENT_REST - 4, duration: 0.8, ease: "sine.inOut" }, 0.6)
      .to(p.bigPincer, { rotation: 0, duration: 0.5 }, 0.7);
    parallax(tl, p, -5, 0.4, 0.4, "power2.out");
    stretchStalks(tl, p, 1.08, 0.4, 0.4, "back.out(1.8)");
    mouth(tl, p, "smile", 0.4);
    for (const t of [0.75, 1.15]) {
      tl.to(p.root, { y: -3, scaleY: 1.02, duration: 0.1, ease: "power2.out" }, t).to(p.root, { y: 0, scaleY: 1, duration: 0.16, ease: "power2.in" }, t + 0.1);
    }
    tapFolders(tl, p, 0.95);
    look(tl, p, CARD_GAZE.x - 2, CARD_GAZE.y + 1, 0.5, 0.35, "sine.inOut");
    look(tl, p, CARD_GAZE.x + 3, CARD_GAZE.y + 2, 0.85, 0.35, "sine.inOut");
    look(tl, p, CARD_GAZE.x - 2, CARD_GAZE.y + 3, 1.2, 0.15, "power2.out");
    look(tl, p, CARD_GAZE.x + 3, CARD_GAZE.y + 4, 1.35, 0.3, "sine.inOut");

    // …wait, what? Amazed: eyes wide, stalks shot up, glasses jolted, a big "oh!" and a little hop back.
    const wow = 1.75;
    tl.to([p.eyeL, p.eyeR], { scale: 1.18, duration: 0.18, ease: "back.out(3)" }, wow)
      .to([p.glassesL, p.glassesR], { y: -7, duration: 0.12, ease: "power2.out" }, wow)
      .to([p.glassesL, p.glassesR], { y: 0, duration: 0.35, ease: "bounce.out" }, wow + 0.12)
      .to(p.root, { y: -7, rotation: -2, duration: 0.14, ease: "power2.out" }, wow)
      .to(p.root, { y: 0, duration: 0.25, ease: "back.out(2.5)" }, wow + 0.14)
      .to([p.stalkL, p.stalkR], { rotation: -3, duration: 0.16, ease: "power2.out" }, wow)
      .to(p.mouthO, { scale: 1.4, duration: 0.15, ease: "back.out(3)" }, wow);
    parallax(tl, p, 0, wow, 0.2, "power2.out");
    mouth(tl, p, "o", wow, 0.05);
    stretchStalks(tl, p, 1.18, wow, 0.16, "power2.out");
    stretchStalks(tl, p, 1.08, wow + 0.25, 0.5, "elastic.out(1, 0.4)");
    look(tl, p, CARD_GAZE.x, CARD_GAZE.y, wow, 0.12, "power3.out");
    sparkleAt(tl, p, 0, wow + 0.05, { x: 226, y: 118 }, 0.55);
    sparkleAt(tl, p, 1, wow + 0.12, { x: 386, y: 108 }, 0.5);
    tl.to([p.eyeL, p.eyeR], { scale: 1.08, duration: 0.3, ease: "power2.inOut" }, wow + 0.55).to(p.mouthO, { scale: 1, duration: 0.2 }, wow + 0.6);

    // …and she has to share it: she spins round to you grinning, jabbing her claw at the card —
    // this! look! — pincer clacking, bouncing on her toes, stalks bobbing.
    const share = 2.45;
    mouth(tl, p, "smile", share);
    tl.to([p.lidL, p.lidR], { y: LID.happy, duration: 0.15 }, share)
      .to(p.root, { rotation: 2, duration: 0.25, ease: "back.out(2)" }, share)
      .to(p.bigClaw, { rotation: PRESENT_SWEEP - 2, duration: 0.16, ease: "back.out(2.5)" }, share + 0.05)
      .to(p.bigClaw, { rotation: PRESENT_SWEEP + 8, duration: 0.16, ease: "power2.inOut" }, share + 0.25)
      .to(p.bigClaw, { rotation: PRESENT_SWEEP - 2, duration: 0.16, ease: "back.out(2.5)" }, share + 0.45)
      .to(p.bigClaw, { rotation: PRESENT_REST - 2, duration: 0.5, ease: "power2.inOut" }, share + 0.8);
    for (const [i, t] of [0.05, 0.25, 0.45].entries()) {
      tl.to(p.bigPincer, { rotation: -14, duration: 0.07, ease: "power2.out" }, share + t)
        .to(p.bigPincer, { rotation: 0, duration: 0.1, ease: "power2.in" }, share + t + 0.08);
      const hop = share + 0.08 + i * 0.24;
      tl.to(p.root, { y: -7, scaleY: 1.04, scaleX: 0.98, duration: 0.11, ease: "power2.out" }, hop)
        .to(p.root, { y: 0, scaleY: 0.97, scaleX: 1.02, duration: 0.11, ease: "power2.in" }, hop + 0.11)
        .to(p.legList, { y: -3, rotation: (j: number) => (j - 1) * 6, duration: 0.11 }, hop)
        .to(p.legList, { y: 0, rotation: 0, duration: 0.11 }, hop + 0.11)
        .to(p.stalkL, { rotation: i % 2 ? 2 : 8, duration: 0.2, ease: "sine.inOut" }, hop)
        .to(p.stalkR, { rotation: i % 2 ? 7 : 1, duration: 0.2, ease: "sine.inOut" }, hop + 0.04);
    }
    look(tl, p, 1, -3, share, 0.2);
    sparkleAt(tl, p, 2, share + 0.3, { x: 150, y: 168 }, 0.5);
    // Settling down, still beaming; a happy squeeze of the folders.
    const settle = share + 0.85;
    tl.to(p.root, { y: 0, rotation: 0, scaleY: 1, scaleX: 1, duration: 0.4, ease: "back.out(2)" }, settle)
      .to([p.stalkL, p.stalkR], { rotation: 0, duration: 0.45, ease: "back.out(1.6)" }, settle)
      .to([p.eyeL, p.eyeR], { scale: 1, duration: 0.4, ease: "power2.inOut" }, settle)
      .to([p.lidL, p.lidR], { y: LID.open, duration: 0.25 }, settle + 0.35);
    stretchStalks(tl, p, 1, settle, 0.45, "power2.inOut");
    tapFolders(tl, p, settle + 0.1);
    blink(tl, p, settle + 0.5);

    // The folders slip… she notices, and hitches them back up with a little hop.
    const slip = 3.9;
    tl.to(p.hugStack, { y: 7, rotation: 5, duration: 0.55, ease: "power1.in" }, slip);
    look(tl, p, 9, 8, slip + 0.4, 0.18);
    mouth(tl, p, "o", slip + 0.4);
    const hitch = slip + 0.6;
    tl.to(p.hugFiles, { rotation: -10, duration: 0.14, ease: "power2.out" }, hitch)
      .to(p.hugStack, { y: -3, rotation: -1.5, duration: 0.16, ease: "power2.out" }, hitch)
      .to(p.root, { y: -5, rotation: 0, scaleY: 1.03, scaleX: 0.99, duration: 0.14, ease: "power2.out" }, hitch)
      .to(p.root, { y: 0, scaleY: 1, scaleX: 1, duration: 0.32, ease: "back.out(2.5)" }, hitch + 0.14)
      .to(p.hugFiles, { rotation: 0, duration: 0.35, ease: "back.out(2)" }, hitch + 0.15)
      .to(p.hugStack, { y: 0, rotation: 0, duration: 0.35, ease: "back.out(2)" }, hitch + 0.15)
      .to(p.bigClaw, { rotation: PRESENT_REST, duration: 0.4 }, hitch + 0.2);
    mouth(tl, p, "smile", hitch + 0.3);
    lookHome(tl, p, hitch + 0.4, 0.3);
    tl.to({}, { duration: 0 }, PRESENT_SECONDS);
    return tl;
  },
  reducedPose: (p) => {
    const tl = withBridge(timeline(), p);
    tl.set([p.hugFiles, p.hugStack, p.glassesL, p.glassesR, p.glassesBridge], { opacity: 1 }, 0)
      .set(p.hugSheet, { opacity: 0 }, 0)
      .set(p.smallClaw, { opacity: 0 }, 0)
      .to(p.bigClaw, { rotation: PRESENT_SWEEP, duration: 0.4 }, 0)
      .to([p.lidL, p.lidR], { y: READ_LID, duration: 0.4 }, 0);
    look(tl, p, CARD_GAZE.x, CARD_GAZE.y, 0, 0.4);
    return tl;
  },
};

// ─── Invite (the landing page's hero) ────────────────────────────────────────

/** When, into each round of her invite, she turns from "upload yours" to "or start from scratch" — the hero's speech bubble changes on the same beat. */
export const INVITE_SCRATCH_AT = 4;
/** One round of her invite, in seconds. */
export const INVITE_SECONDS = 7.6;
/**
 * Pointing at the upload box under her: the arm held out to her right (our
 * left), only a little below level so it stays up off the floor, and the
 * pincer bent down at the wrist to aim at the box…
 */
const INVITE_POINT = { claw: -48, pincer: -40 } as const;
/** …and jabbed a little further at it: "right there". */
const INVITE_JAB = { claw: -55, pincer: -50 } as const;

/** Tucks the CV under her small claw: its copy takes over, lifts to let the sheet in, and presses it to her side. */
function tuckSheet(tl: TL, p: MoxieParts, at: number) {
  tl.set(p.hugFiles, { opacity: 1 }, at)
    .set(p.smallClaw, { opacity: 0 }, at)
    .set(p.hugStack, { opacity: 0 }, at)
    .set(p.hugSheet, { y: 34, rotation: 0, opacity: 0 }, at)
    .to(p.hugFiles, { rotation: -12, duration: 0.2, ease: "power2.out" }, at + 0.05)
    .to(p.hugSheet, { opacity: 1, duration: 0.15 }, at + 0.1)
    .to(p.hugSheet, { y: 0, duration: 0.45, ease: "back.out(1.6)" }, at + 0.1)
    .to(p.hugFiles, { rotation: 0, duration: 0.35, ease: "back.out(2)" }, at + 0.35)
    .to(p.root, { scaleY: 0.97, scaleX: 1.02, duration: 0.12, ease: "power2.out" }, at + 0.4)
    .to(p.root, { scaleY: 1, scaleX: 1, duration: 0.35, ease: "back.out(2.5)" }, at + 0.52);
  tapFolders(tl, p, at + 0.55);
}

/**
 * The hero's greeter. A CV tucked under her small claw, reading glasses on,
 * she spots you, hops, and waves hello. Then, round after round: a pat of the
 * CV under her arm and a look at you — got one? — and she points down at the
 * upload box under her, jabbing at it, nodding you on. Then a curious head
 * tilt — no CV? — that lights up into a ^‿^ squint and a happy hop, claw up
 * and clacking: we'll build one from scratch! The words are the page's (a speech bubble beside her that
 * follows her rounds — see HeroStart), so they stay crisp at any size.
 */
const invite: MoxiePreset = {
  mode: "loop",
  intro: (p) => {
    const tl = withBridge(timeline(), p);
    tuckSheet(tl, p, 0);
    glassesOn(tl, p, 0.25);
    // Spots you: a look, a little hop, stalks perking up…
    const hi = 0.9;
    look(tl, p, 0, 2, hi, 0.2);
    tl.to(p.root, { scaleY: 0.94, scaleX: 1.04, duration: 0.16, ease: "power2.in" }, hi)
      .to(p.root, { y: -14, scaleY: 1.05, scaleX: 0.97, duration: 0.24, ease: "power2.out" }, hi + 0.16)
      .to(p.root, { y: 0, scaleY: 0.95, scaleX: 1.04, duration: 0.2, ease: "power2.in" }, hi + 0.4)
      .to(p.root, { scaleY: 1, scaleX: 1, duration: 0.5, ease: "back.out(2.5)" }, hi + 0.6)
      .to(p.shadow, { scaleX: 0.86, opacity: SHADOW_OPACITY * 0.7, duration: 0.24, ease: "power2.out" }, hi + 0.16)
      .to(p.shadow, { scaleX: 1, opacity: SHADOW_OPACITY, duration: 0.2, ease: "power2.in" }, hi + 0.4)
      .to(p.stalkL, { rotation: -4, duration: 0.32, ease: "back.out(3)" }, hi + 0.14)
      .to(p.stalkR, { rotation: 4, duration: 0.32, ease: "back.out(3)" }, hi + 0.14);
    stretchStalks(tl, p, 1.1, hi + 0.14, 0.32, "back.out(3)");
    // …and waves hello: "hi!"
    mouth(tl, p, "talk", hi + 0.45);
    mumble(tl, p, hi + 0.45, 0.4);
    mouth(tl, p, "smile", hi + 0.9);
    tl.to([p.eyeL, p.eyeR], { scale: 1.06, duration: 0.25, ease: "back.out(2.5)" }, hi + 0.2);
    const end = waveClaw(tl, p, hi + 0.4, 2, 14, -8);
    tl.to([p.eyeL, p.eyeR], { scale: 1, duration: 0.4 }, end - 0.6);
    stretchStalks(tl, p, 1, end - 0.7, 0.5, "power2.inOut");
    tl.to([p.stalkL, p.stalkR], { rotation: 0, duration: 0.5 }, end - 0.7);
    blink(tl, p, end - 0.3);
    return tl;
  },
  cycle: (p) => {
    const tl = withBridge(timeline(), p);

    // Got a CV? She glances down at the one under her arm and pats it twice…
    look(tl, p, 10, 8, 0, 0.3);
    tl.to(p.stalkL, { rotation: 5, duration: 0.4 }, 0).to(p.stalkR, { rotation: 4, duration: 0.45 }, 0.05);
    tapFolders(tl, p, 0.3);
    tapFolders(tl, p, 0.62);
    tl.to(p.hugSheet, { y: -2, duration: 0.1, ease: "power2.out" }, 0.3).to(p.hugSheet, { y: 0, duration: 0.25, ease: "back.out(3)" }, 0.4);
    // …then back up at you, eyebrows raised — "one of these?"
    look(tl, p, 0, -3, 1.0, 0.25);
    tl.to([p.stalkL, p.stalkR], { rotation: 0, duration: 0.35, ease: "back.out(2)" }, 1.0);
    stretchStalks(tl, p, 1.08, 1.0, 0.3, "back.out(2)");
    mouth(tl, p, "talk", 1.05);
    mumble(tl, p, 1.05, 0.5);
    mouth(tl, p, "smile", 1.55);

    // Pop it in there: she points down at the upload box, leaning toward it, and jabs at it twice.
    const point = 1.7;
    tl.to(p.bigClaw, { rotation: INVITE_POINT.claw, duration: 0.45, ease: "back.out(1.4)" }, point)
      .to(p.bigPincer, { rotation: INVITE_POINT.pincer, duration: 0.35, ease: "back.out(1.8)" }, point + 0.12)
      .to(p.root, { rotation: -3, duration: 0.4 }, point);
    parallax(tl, p, -5, point, 0.4);
    look(tl, p, -11, 6, point + 0.05, 0.3);
    stretchStalks(tl, p, 1.02, point, 0.3, "sine.inOut");
    for (const jab of [point + 0.5, point + 0.85]) {
      tl.to(p.bigClaw, { rotation: INVITE_JAB.claw, duration: 0.12, ease: "power2.out" }, jab)
        .to(p.bigClaw, { rotation: INVITE_POINT.claw, duration: 0.2, ease: "back.out(2.5)" }, jab + 0.12)
        .to(p.bigPincer, { rotation: INVITE_JAB.pincer, duration: 0.1, ease: "power2.out" }, jab + 0.02)
        .to(p.bigPincer, { rotation: INVITE_POINT.pincer, duration: 0.18, ease: "power2.inOut" }, jab + 0.12);
    }
    // Still pointing, she looks back at you and nods you on — go on!
    const nod = point + 1.3;
    look(tl, p, 0, 1, nod, 0.25);
    for (let k = 0; k < 2; k++) {
      const at = nod + 0.15 + k * 0.32;
      tl.to(p.root, { rotation: 0, y: 2, duration: 0.13, ease: "power2.out" }, at).to(p.root, { rotation: -3, y: 0, duration: 0.19 }, at + 0.13);
    }
    // Done pointing: the pincer straightens first, then the arm swings back up to rest and settles.
    const lower = nod + 0.95;
    tl.to(p.bigPincer, { rotation: 0, duration: 0.3, ease: "power2.out" }, lower)
      .to(p.bigClaw, { rotation: 0, duration: 0.6, ease: "back.out(1.3)" }, lower + 0.08)
      .to(p.root, { rotation: 0, duration: 0.5 }, lower);
    parallax(tl, p, 0, lower, 0.5);
    stretchStalks(tl, p, 1, lower, 0.45, "sine.inOut");

    // No CV? A curious head tilt, claw open, "oh?" — no problem…
    const ask = INVITE_SCRATCH_AT;
    tl.to(p.stalkL, { rotation: 9, duration: 0.35, ease: "back.out(2)" }, ask)
      .to(p.stalkR, { rotation: 7, duration: 0.38, ease: "back.out(2)" }, ask + 0.04)
      .to(p.root, { rotation: 2.5, duration: 0.35 }, ask)
      .to(p.bigClaw, { rotation: -14, y: -4, duration: 0.3, ease: "back.out(2)" }, ask)
      .to(p.bigPincer, { rotation: -12, duration: 0.3, ease: "back.out(2)" }, ask + 0.04);
    look(tl, p, 2, -4, ask, 0.25);
    mouth(tl, p, "o", ask + 0.1);
    // …and she lights up: a happy ^‿^ squint and a big smile, a bouncy hop, claw up and clacking — we'll build one from scratch!
    const yes = ask + 0.85;
    mouth(tl, p, "smile", yes);
    tl.to([p.laughL, p.laughR], { opacity: 1, duration: 0.08, ease: "none" }, yes)
      .to([p.stalkL, p.stalkR], { rotation: 0, duration: 0.3, ease: "back.out(2)" }, yes)
      .to(p.root, { rotation: 0, scaleY: 0.95, scaleX: 1.04, duration: 0.12, ease: "power2.in" }, yes)
      .to(p.root, { y: -10, scaleY: 1.05, scaleX: 0.97, duration: 0.2, ease: "power2.out" }, yes + 0.12)
      .to(p.root, { y: 0, scaleY: 0.97, scaleX: 1.02, duration: 0.18, ease: "power2.in" }, yes + 0.32)
      .to(p.root, { scaleY: 1, scaleX: 1, duration: 0.4, ease: "back.out(2.5)" }, yes + 0.5)
      .to(p.bigClaw, { rotation: 20, y: -8, duration: 0.3, ease: "back.out(2)" }, yes + 0.1)
      .to(p.bigPincer, { rotation: 0, duration: 0.2 }, yes + 0.1);
    // A happy little wiggle of the stalks while she squints.
    for (const [i, t] of [0.35, 0.6].entries()) {
      tl.to(p.stalkL, { rotation: i ? -4 : 4, duration: 0.22 }, yes + t).to(p.stalkR, { rotation: i ? 4 : -4, duration: 0.22 }, yes + t + 0.03);
    }
    stretchStalks(tl, p, 1.1, yes + 0.1, 0.25, "back.out(2.5)");
    for (const t of [0.4, 0.6, 0.8]) {
      tl.to(p.bigPincer, { rotation: -14, duration: 0.07, ease: "power2.out" }, yes + t).to(p.bigPincer, { rotation: 0, duration: 0.1, ease: "power2.in" }, yes + t + 0.08);
    }
    sparkleAt(tl, p, 0, yes + 0.35, { x: 214, y: 132 }, 0.55);
    sparkleAt(tl, p, 1, yes + 0.6, { x: 168, y: 176 }, 0.45);
    // Eyes open again, bright, on you.
    look(tl, p, 0, 1, yes + 0.85, 0.01);
    tl.to([p.laughL, p.laughR], { opacity: 0, duration: 0.1, ease: "none" }, yes + 0.9)
      .to([p.eyeL, p.eyeR], { scale: 1.08, duration: 0.2, ease: "back.out(3)" }, yes + 0.9)
      .to([p.stalkL, p.stalkR], { rotation: 0, duration: 0.3, ease: "back.out(2)" }, yes + 0.9);
    const settle = yes + 1.15;
    tl.to(p.bigClaw, { rotation: 0, y: 0, duration: 0.5, ease: "power2.inOut" }, settle)
      .to([p.eyeL, p.eyeR], { scale: 1, duration: 0.4, ease: "power2.inOut" }, settle + 0.2);
    stretchStalks(tl, p, 1, settle, 0.5, "power2.inOut");
    blink(tl, p, settle + 0.75);
    // A breath, a re-grip of the CV, and round again.
    tl.to(p.root, { y: -2, scaleY: 1.015, duration: 0.6 }, settle + 0.5).to(p.root, { y: 0, scaleY: 1, duration: 0.6 }, settle + 1.1);
    tapFolders(tl, p, settle + 1.0);
    tl.to({}, { duration: 0 }, INVITE_SECONDS);
    return tl;
  },
  reducedPose: (p) => {
    const tl = withBridge(timeline(), p);
    tl.set([p.hugFiles, p.hugSheet, p.glassesL, p.glassesR, p.glassesBridge], { opacity: 1 }, 0)
      .set([p.smallClaw, p.hugStack], { opacity: 0 }, 0)
      .to(p.bigClaw, { rotation: 14, duration: 0.4 }, 0);
    look(tl, p, 0, 2, 0, 0.4);
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
export function tickleGiggle(p: MoxieParts, reducedMotion: boolean, coverUp = false): TL {
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
  if (coverUp) coverUpLimbs(tl, p, ahem);
  tl.to(p.jiggle, { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.2, ease: "power2.out" }, ahem)
    .to(face, { opacity: 0, duration: 0.12, ease: "none" }, ahem + 0.15)
    .to(p.jiggle, { scaleY: 1.025, scaleX: 0.99, duration: 0.14, ease: "power2.out" }, ahem + 0.3)
    .to(p.jiggle, { scaleY: 1, scaleX: 1, duration: 0.3, ease: "back.out(2)" }, ahem + 0.44);
  return tl;
}

/**
 * Covering up while she giggles (when she can't wriggle away, e.g. sitting):
 * the big claw swung down and round across her belly, the small one tucked
 * in, legs kicking — then each put back exactly where it was by `until`, so
 * whatever she was doing carries on from the same pose.
 */
function coverUpLimbs(tl: TL, p: MoxieParts, until: number) {
  const limbs = [p.bigClaw, p.bigPincer, p.smallClaw, p.smallPincer, ...p.legList];
  const was = limbs.map((el) => {
    const get = gsap.getProperty(el) as (property: string) => number;
    return { x: get("x"), y: get("y"), rotation: get("rotation"), scaleX: get("scaleX"), scaleY: get("scaleY") };
  });
  // Round the bottom (negative), not over her face.
  tl.to(p.bigClaw, { rotation: COVER.rotation, x: COVER.x, y: COVER.y, duration: 0.18, ease: "power2.out" }, 0)
    .to(p.bigPincer, { rotation: COVER.pincer, x: 0, y: 0, duration: 0.18, ease: "power2.out" }, 0.04)
    .to(p.smallClaw, { rotation: -40, x: 0, duration: 0.18, ease: "power2.out" }, 0)
    .to(p.smallPincer, { rotation: -12, duration: 0.18 }, 0.04);
  for (let i = 0; i * 0.09 < until - 0.15; i++) {
    tl.to(p.legList, { rotation: (j: number) => ((i + j) % 2 ? -10 : 10), scaleY: (j: number) => ((i + j) % 2 ? 0.95 : 1.3), duration: 0.09 }, 0.06 + i * 0.09);
  }
  limbs.forEach((el, i) => tl.to(el, { ...was[i], duration: 0.3, ease: "power2.inOut" }, until));
}

/** Where the big claw goes to cover her belly: swung round under her, pulled in close, pincer turned in. */
const COVER = { rotation: -196, x: -14, y: -16, pincer: 18 } as const;

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
  review,
  invite,
  tada,
  downloaded,
  verifying,
  paid,
  onboarded,
  saved,
  presenting,
  searching,
  emptyFolder,
  sitting,
  lost,
  oops,
  upgrade,
};
