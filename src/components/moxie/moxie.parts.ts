import { gsap } from "gsap";
import { LEG_PIVOTS, PIVOTS } from "./moxie.constants";
import type { MoxieParts } from "./moxie.types";

type SinglePart = Exclude<keyof MoxieParts, "legList" | "sparkles" | "zs">;

/** Finds every animatable layer inside a rendered <MoxieArt>. */
export function queryParts(svg: SVGSVGElement): MoxieParts {
  const one = <T extends Element>(name: SinglePart): T => {
    const el = svg.querySelector<T>(`[data-part="${name}"]`);
    if (!el) throw new Error(`Moxie: missing SVG part "${name}"`);
    return el;
  };
  const all = <T extends Element>(name: string): T[] => Array.from(svg.querySelectorAll<T>(`[data-part="${name}"]`));

  return {
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
    sparkles: all<SVGGElement>("sparkle"),
    zs: all<SVGGElement>("z"),
  };
}

/** Fixes each layer's pivot once, so later tweens only touch x/y/rotation/scale. */
export function prepareParts(parts: MoxieParts): void {
  for (const [name, origin] of Object.entries(PIVOTS)) {
    gsap.set(parts[name as keyof typeof PIVOTS], { svgOrigin: origin });
  }
  parts.legList.forEach((leg, i) => gsap.set(leg, { svgOrigin: LEG_PIVOTS[i] }));
  // Particles are drawn around (0, 0) inside a positioned wrapper.
  gsap.set([...parts.sparkles, ...parts.zs], { svgOrigin: "0 0", scale: 0 });
}
