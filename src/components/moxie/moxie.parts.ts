import { gsap } from "gsap";
import { LEG_PIVOTS, PIVOTS, SIDE_LEGS } from "./moxie.constants";
import type { MoxieParts } from "./moxie.types";

type SinglePart = Exclude<keyof MoxieParts, "legList" | "bigArm" | "sparkles" | "zs" | "paperInks" | "confetti" | "sideLegs" | "sidePupils" | "sideLids">;

/** Finds every animatable layer inside a rendered <MoxieArt>. */
export function queryParts(svg: SVGSVGElement): MoxieParts {
  const one = <T extends Element>(name: SinglePart): T => {
    const el = svg.querySelector<T>(`[data-part="${name}"]`);
    if (!el) throw new Error(`Moxie: missing SVG part "${name}"`);
    return el;
  };
  const all = <T extends Element>(name: string): T[] => Array.from(svg.querySelectorAll<T>(`[data-part="${name}"]`));

  return {
    jiggle: one("jiggle"),
    laughL: one("laughL"),
    laughR: one("laughR"),
    mouthLaugh: one("mouthLaugh"),
    root: one("root"),
    shadow: one("shadow"),
    legs: one("legs"),
    legList: all<SVGRectElement>("leg"),
    smallClaw: one("smallClaw"),
    smallPincer: one("smallPincer"),
    body: one("body"),
    bellyShade: one("bellyShade"),
    bigClaw: one("bigClaw"),
    bigPincer: one("bigPincer"),
    bigArm: all<SVGPathElement>("bigArm"),
    stalkL: one("stalkL"),
    stalkR: one("stalkR"),
    stalkLineL: one("stalkLineL"),
    stalkLineR: one("stalkLineR"),
    eyeL: one("eyeL"),
    eyeR: one("eyeR"),
    pupilL: one("pupilL"),
    pupilR: one("pupilR"),
    glintL: one("glintL"),
    glintR: one("glintR"),
    lidL: one("lidL"),
    lidR: one("lidR"),
    lashL: one("lashL"),
    lashR: one("lashR"),
    face: one("face"),
    mouthSmile: one("mouthSmile"),
    mouthTalk: one("mouthTalk"),
    mouthFlat: one("mouthFlat"),
    mouthO: one("mouthO"),
    mouthTongue: one("mouthTongue"),
    sparkles: all<SVGGElement>("sparkle"),
    zs: all<SVGGElement>("z"),
    pencil: one("pencil"),
    pencilTip: one("pencilTip"),
    pencilFront: one("pencilFront"),
    pencilSplinter: one("pencilSplinter"),
    pencilBody: one("pencilBody"),
    paperBack: one("paperBack"),
    paperSheet: one("paperSheet"),
    paperText: one("paperText"),
    paperInks: all<SVGPathElement>("paperInk"),
    paperSeal: one("paperSeal"),
    stamp: one("stamp"),
    scissors: one("scissors"),
    bladeA: one("bladeA"),
    bladeB: one("bladeB"),
    paperJob: one("paperJob"),
    groundPost: one("groundPost"),
    magnifier: one("magnifier"),
    side: one("side"),
    sideTurn: one("sideTurn"),
    sideBody: one("sideBody"),
    sideLegs: all<SVGRectElement>("sideLeg"),
    sidePupils: all<SVGGElement>("sidePupil"),
    sideLids: all<SVGGElement>("sideLid"),
    sideSweat: one("sideSweat"),
    sideCrown: one("sideCrown"),
    crownFloat: one("crownFloat"),
    pdfFile: one("pdfFile"),
    coin: one("coin"),
    coinFace: one("coinFace"),
    crown: one("crown"),
    confetti: all<SVGGElement>("confetti"),
    folderBack: one("folderBack"),
    folderFront: one("folderFront"),
    glassesL: one("glassesL"),
    glassesR: one("glassesR"),
    glassesBridge: one("glassesBridge"),
  };
}

/** Fixes each layer's pivot once, so later tweens only touch x/y/rotation/scale. */
export function prepareParts(parts: MoxieParts): void {
  for (const [name, origin] of Object.entries(PIVOTS)) {
    gsap.set(parts[name as keyof typeof PIVOTS], { svgOrigin: origin });
  }
  parts.legList.forEach((leg, i) => gsap.set(leg, { svgOrigin: LEG_PIVOTS[i] }));
  // Particles are drawn around (0, 0) inside a positioned wrapper.
  gsap.set([...parts.sparkles, ...parts.zs, ...parts.confetti], { svgOrigin: "0 0", scale: 0 });
  gsap.set([parts.sideSweat, parts.crownFloat], { svgOrigin: "0 0" });
  // Like the coin, the snapped-off half of the pencil rides in her moving claw, so it tumbles about its own middle.
  gsap.set(parts.pencilTip, { transformOrigin: "50% 50%" });
  // The side view turns around, and bobs and leans, from the ground under her; each leg swings from its top.
  gsap.set([parts.sideTurn, parts.sideBody], { svgOrigin: "305 392" });
  parts.sideLegs.forEach((leg, i) => gsap.set(leg, { svgOrigin: `${SIDE_LEGS[i].x + 10} ${SIDE_LEGS[i].y + 4}` }));
  // The coin flips over about its own middle (it rides in her moving claw).
  gsap.set(parts.coinFace, { transformOrigin: "50% 50%" });
  // The crown rides on her right eye; it wobbles and lands about its own bottom-centre.
  gsap.set(parts.crown, { transformOrigin: "50% 100%" });
  gsap.set(parts.paperSeal, { svgOrigin: "0 0" });
  // The blades turn about the screw at their own inner end (they ride in a turned, moving claw,
  // so a fixed point in the drawing won't do — the pivot is set on their own box instead).
  gsap.set([parts.bladeA, parts.bladeB], { transformOrigin: "0% 50%" });
  // A line of handwriting cut out of the CV tumbles about its own middle as it falls.
  gsap.set(parts.paperInks, { transformOrigin: "50% 50%" });
}
