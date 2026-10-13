// Moxie's palette and geometry, taken unchanged from the source artwork
// (moxie_hermit_crab_shorter_stalks.svg). All coordinates are in the
// artwork's own drawing space, so pivots stay correct at any rendered size.

export const MOXIE_COLORS = {
  coral: "#FF6A3D",
  coralShade: "#E04E24",
  ink: "#14142B",
  cream: "#FFF8F0",
  blush: "#FFC94A",
  /** Lighter than her shell, so the tip of her tongue shows against it. */
  tongue: "#FF9E80",
} as const;

/**
 * Cropped tightly around the character (the source used a 680×400 canvas
 * with a translate), with a little headroom for jumps and droops so she
 * fills icon-sized boxes. Effects may still spill outside — the SVG uses
 * `overflow: visible`.
 */
export const MOXIE_VIEWBOX = "131 96 320 320";

/** Eye geometry (circle centres; radius 37 in the source). */
export const EYE_L = { cx: 264, cy: 172 } as const;
export const EYE_R = { cx: 346, cy: 164 } as const;
export const EYE_RADIUS = 37;
/** In the source art the pupils sit this far from each eye's centre. */
export const PUPIL_REST = { x: 6, y: 4 } as const;
/** How far a pupil can travel from the eye's centre before touching the outline. */
export const PUPIL_REACH = 11;

/**
 * Lid travel, in drawing units downward from fully open. Open lids are
 * parked far enough above the eye that not even their curved edge's
 * antialiasing touches it — the resting render matches the source exactly.
 */
export const LID_PARK_GAP = 14;
export const LID = {
  open: 0,
  flat: 18, // unimpressed
  relaxed: 20, // musing
  happy: 32, // smiling squint
  heavy: 42, // slow, deliberate blink
  squint: 46, // the suspicious eye
  sleepy: 68,
  closed: 90,
} as const;

// ─── Props (hidden at rest; shown by the scenes that use them) ───────────────

/** The big claw's shoulder — everything it holds swings around this point. */
export const SHOULDER = { x: 240, y: 312 } as const;

/**
 * Where the pencil's point sits when the claw is at rest: the middle of the
 * writing area, as seen from the shoulder (angle and distance). The writer
 * scene turns the claw toward each point and reaches the remaining distance,
 * so the point lands exactly on the ink — about ±8° and ±24 units at most.
 */
export const PENCIL_TIP = { x: 165, y: 154 } as const;
/** From the pincer's grip up to the point. */
export const PENCIL = { length: 62, angle: -110 } as const;

/** The PDF file that drops into her big pincer: its bottom edge sits in the pincer's tips. */
export const PDF_FILE = { x: 176, y: 158, width: 30, height: 42 } as const;

/** The coin she holds up in her big pincer, gripped between its tips. */
export const COIN = { x: 191, y: 186, radius: 12 } as const;

/**
 * The Pro crown, worn on her body: perched on the top-right of her shell,
 * tilted with its curve — clear of the stalk beside it, so it's always in view.
 * `angle` is where on the shell (degrees from her right, upward negative);
 * `sink` sets it slightly into the outline so it sits rather than floats.
 */
export const CROWN = { angle: -58, sink: 3, tilt: 26, width: 44, height: 26 } as const;

/** Where the crown's bottom-centre sits on her shell, in the drawing. */
export const CROWN_BASE = {
  x: 305 + (88 - CROWN.sink) * Math.cos((CROWN.angle * Math.PI) / 180),
  y: 320 + (54 - CROWN.sink) * Math.sin((CROWN.angle * Math.PI) / 180),
} as const;

/** Where the confetti bursts from — above her head — and how many pieces. */
export const CONFETTI_ORIGIN = { x: 305, y: 150 } as const;
export const CONFETTI_COLORS = ["#FF6A3D", "#FFC94A", "#7FC8A9", "#8FB8F0", "#E04E24", "#FFF8F0"] as const;
export const CONFETTI_COUNT = 14;

/** Centre of her mouth, where the other mouth shapes sit. */
export const MOUTH = { x: 301, y: 324 } as const;

/**
 * The read scene's paper, turned to face her — we see its blank back,
 * foreshortened (narrow, its far edge shorter) — held out at arm's length to
 * her right in the small claw: the farsighted reader. Drawn where it sits
 * when the small claw is raised by READ_HOLD degrees; it pivots on that
 * claw's shoulder too, so it moves exactly as if held.
 */
export const READ_PAPER = { x: 390, y: 214, width: 36, height: 74, skew: 7 } as const;

/**
 * A point on that sheet, from its own across (u) and down (v), both 0–1:
 * the sheet is angled, its far (left) edge shorter, so lines of text on it
 * slope and squeeze toward that edge.
 */
export function paperPoint(u: number, v: number): { x: number; y: number } {
  const { x, y, width, height, skew } = READ_PAPER;
  const top = y + skew * (1 - u);
  return { x: x + u * width, y: top + v * (height - 2 * skew * (1 - u)) };
}

/** Where the stamp scene's seal lands on that sheet (across, down). */
export const PAPER_SEAL = { u: 0.6, v: 0.8 } as const;

export interface PaperRow {
  kind: "name" | "title" | "heading" | "line" | "strike";
  /** How far down the sheet (0–1), and where the line starts and ends across it (0–1). */
  v: number;
  u0: number;
  u1: number;
}

/**
 * The CV on the sheet she holds out: a name, a job title, a heading, then
 * lines. Printed when she's reading it; handwritten, row by row, when she's
 * writing it — including a scribble through one line she changes her mind about.
 */
export const PAPER_ROWS: readonly PaperRow[] = [
  { kind: "name", v: 0.13, u0: 0.16, u1: 0.66 },
  { kind: "title", v: 0.23, u0: 0.16, u1: 0.52 },
  { kind: "heading", v: 0.37, u0: 0.16, u1: 0.42 },
  { kind: "line", v: 0.46, u0: 0.16, u1: 0.8 },
  { kind: "line", v: 0.55, u0: 0.16, u1: 0.72 },
  { kind: "line", v: 0.64, u0: 0.16, u1: 0.82 },
  { kind: "line", v: 0.73, u0: 0.16, u1: 0.6 },
  { kind: "strike", v: 0.55, u0: 0.12, u1: 0.76 },
];

/** Points along a row on the sheet: a slight handwriting wobble, or a zig-zag for a scribble. */
export function paperRowPoints(row: PaperRow): { x: number; y: number }[] {
  const across = (row.u1 - row.u0) * READ_PAPER.width;
  const count = Math.max(3, Math.round(across / 3.5) + 1);
  return Array.from({ length: count }, (_, i) => {
    const pt = paperPoint(row.u0 + ((row.u1 - row.u0) * i) / (count - 1), row.v);
    const wobble = row.kind === "strike" ? (i % 2 ? 2.6 : -2.6) : 0.8 * Math.sin(i * 1.4);
    return { x: pt.x, y: pt.y + wobble };
  });
}
/** Small-claw angle while reading: raised, its pincer gripping the paper's bottom-left corner from behind. */
export const READ_HOLD = -25;

/**
 * The job post the tailor scene reads, then puts down in front of her: lying
 * flat on the ground just right of her feet (seen from the front, so it's a
 * squashed quad — far edge narrower and higher, near edge lower and wider).
 */
export const GROUND_POST = {
  farLeft: { x: 336, y: 391 },
  farRight: { x: 398, y: 388 },
  nearRight: { x: 414, y: 404 },
  nearLeft: { x: 334, y: 409 },
} as const;

/** A point on the job post lying on the ground, from its own across (u) and down (v), both 0–1. */
export function groundPoint(u: number, v: number): { x: number; y: number } {
  const { farLeft: fl, farRight: fr, nearRight: nr, nearLeft: nl } = GROUND_POST;
  const top = { x: fl.x + (fr.x - fl.x) * u, y: fl.y + (fr.y - fl.y) * u };
  const bottom = { x: nl.x + (nr.x - nl.x) * u, y: nl.y + (nr.y - nl.y) * u };
  return { x: top.x + (bottom.x - top.x) * v, y: top.y + (bottom.y - top.y) * v };
}

/** The line she writes on the CV and then cuts out, because it doesn't fit the job (an index into PAPER_ROWS). */
export const TAILOR_CUT_ROW = 4;
/** The small claw's shoulder. */
export const SMALL_SHOULDER = { x: 368, y: 328 } as const;

/** Half-moon reading glasses, worn low: lens corners relative to each eye's centre. */
export const GLASSES = { halfWidth: 27, top: 12, bottom: 35, bridgeLift: 6 } as const;

/** Where the bridge meets each lens (its inner top corner), in that eye's own drawing space. */
export function lensCorner(side: "L" | "R") {
  const eye = side === "L" ? EYE_L : EYE_R;
  return { x: eye.cx + (side === "L" ? GLASSES.halfWidth : -GLASSES.halfWidth), y: eye.cy + GLASSES.top };
}

/** The bridge: a gentle arch from one lens corner to the other. */
export function bridgePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const midX = (a.x + b.x) / 2;
  const midY = Math.min(a.y, b.y) - GLASSES.bridgeLift;
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${midX.toFixed(1)} ${midY.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

/** Handwriting styles on the held sheet. `opacity` is what a stroke shows once drawn. */
export const INK_STYLE: Record<PaperRow["kind"], { color: string; width: number; opacity: number }> = {
  name: { color: MOXIE_COLORS.coral, width: 5, opacity: 1 },
  title: { color: MOXIE_COLORS.ink, width: 3, opacity: 0.75 },
  heading: { color: MOXIE_COLORS.coral, width: 3, opacity: 0.9 },
  line: { color: MOXIE_COLORS.ink, width: 2.6, opacity: 0.6 },
  strike: { color: MOXIE_COLORS.coralShade, width: 2.5, opacity: 1 },
};

/** Length of a polyline — used as the stroke's dash length so it can be "drawn". */
export function polylineLength(points: { x: number; y: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return Math.ceil(total);
}

/**
 * Rotation/scale pivots per layer. Each layer always uses the same pivot
 * (set once at mount) so GSAP never has to compensate for origin changes.
 */
export const PIVOTS = {
  root: "305 392", // ground beneath her feet
  jiggle: "305 392", // the giggle shakes her from the ground up too
  shadow: "305 393",
  legs: "305 352",
  smallClaw: `${SMALL_SHOULDER.x} ${SMALL_SHOULDER.y}`, // shoulder
  smallPincer: "404 320", // wrist
  body: "305 374", // bottom of the shell-less body
  face: "305 374", // must match body so squash keeps the face aligned
  bigClaw: `${SHOULDER.x} ${SHOULDER.y}`, // shoulder
  bigPincer: "214 291", // wrist
  stalkL: "285 282", // where each stalk meets the body
  stalkR: "318 282",
  stalkLineL: "285 282",
  stalkLineR: "318 282",
  eyeL: `${EYE_L.cx} ${EYE_L.cy}`,
  eyeR: `${EYE_R.cx} ${EYE_R.cy}`,
  pupilL: `${EYE_L.cx + PUPIL_REST.x} ${EYE_L.cy + PUPIL_REST.y}`,
  pupilR: `${EYE_R.cx + PUPIL_REST.x} ${EYE_R.cy + PUPIL_REST.y}`,
  mouthTalk: `${MOUTH.x} ${MOUTH.y}`, // mouthing words squashes it open and shut about its centre
  mouthO: `${MOUTH.x} ${MOUTH.y}`,
  paperBack: `${SMALL_SHOULDER.x} ${SMALL_SHOULDER.y}`, // held in the small claw, so it shares that claw's pivot
  paperSheet: `${READ_PAPER.x + READ_PAPER.width / 2} ${READ_PAPER.y + READ_PAPER.height / 2}`, // turns over around its middle
} as const;

/**
 * Eye centre minus stalk base. Stretching a stalk line by `s` moves its tip
 * by `(s - 1) × this`, so the eye is moved by the same amount to stay on it.
 */
export const STALK_REACH = {
  L: { x: EYE_L.cx - 285, y: EYE_L.cy - 282 },
  R: { x: EYE_R.cx - 318, y: EYE_R.cy - 282 },
} as const;

/** Top-centre of each leg, for stepping. */
export const LEG_PIVOTS = ["259 349", "303 354", "349 352"] as const;

/**
 * Depth per layer for 2.5D parallax: a sideways shift of `dx` moves each
 * layer by `dx * depth`, so near layers travel further than far ones.
 */
export const DEPTH = {
  legs: 0.35,
  smallClaw: 0.55,
  body: 0.75,
  bellyShade: 0.55,
  face: 0.95,
  stalks: 1,
  bigClaw: 1.2,
} as const;

/** Where the celebration sparkles burst from, and where they land. */
export const SPARKLE_ORIGIN = { x: 300, y: 250 } as const;
export const SPARKLE_BURST = [
  { x: -128, y: -88, color: MOXIE_COLORS.blush, scale: 1.6 },
  { x: 128, y: -100, color: MOXIE_COLORS.coral, scale: 1.4 },
  { x: -118, y: 18, color: MOXIE_COLORS.coral, scale: 1.1 },
  { x: 122, y: 6, color: MOXIE_COLORS.blush, scale: 1.2 },
  { x: -46, y: -140, color: MOXIE_COLORS.cream, scale: 1 },
  { x: 62, y: -142, color: MOXIE_COLORS.blush, scale: 0.95 },
] as const;

/**
 * The big claw's arm: shoulder → elbow → wrist (where the pincer attaches).
 * The elbow only shows once the pincer moves away from the shoulder.
 */
export const BIG_ARM = {
  shoulder: SHOULDER,
  elbow: { x: 224, y: 300 },
  wrist: { x: 212, y: 288 },
} as const;

/** The big claw's arm, from the shoulder through `elbow` to `wrist`. */
export function armPath(elbow: { x: number; y: number }, wrist: { x: number; y: number }) {
  const { shoulder } = BIG_ARM;
  return `M${shoulder.x} ${shoulder.y} L${elbow.x.toFixed(1)} ${elbow.y.toFixed(1)} L${wrist.x.toFixed(1)} ${wrist.y.toFixed(1)}`;
}

/**
 * Sitting on a ledge (the sidebar): the ledge's top edge, in the drawing —
 * just under her body, which rests on it — and her pose there: the big claw
 * resting on the ledge beside her, pincer upright and the arm bent at the
 * elbow; the small one hooked over it, legs lowered and lengthened to hang
 * over it.
 */
export const SIT = {
  ledgeY: 372,
  bigClaw: 0,
  bigClawX: 0,
  bigClawY: 0,
  bigPincer: -20,
  /** The pincer set down on the ledge (moved from the wrist)… */
  bigPincerX: -32,
  bigPincerY: 66,
  /** …and where the elbow bends to reach it, resting on the ledge too. */
  bigElbow: { x: 226, y: 364 },
  smallClaw: 46,
  smallPincer: 170,
  legDrop: 10,
  legHang: 1.25,
} as const;

/**
 * Where the ledge meets her, as a fraction of her box from its top-left
 * (from MOXIE_VIEWBOX): put that point on a line to sit her on it.
 */
export const MOXIE_SEAT = { x: (305 - 131) / 320, y: (SIT.ledgeY - 96) / 320 } as const;

/** Where the paywall's crown hangs (its bottom-centre): just above her big claw, out of its reach — and how much bigger than the one she wears. */
export const CROWN_FLOAT = { x: 192, y: 112, scale: 1.35 } as const;

/** How far the side view's lids drop to close (from resting just above the eye): enough for the bigger eye. */
export const SIDE_BLINK = 90;

/** Her legs seen from the side: the far three (set back, in shadow), then the near three. */
export const SIDE_LEGS = [
  { x: 280, y: 344, height: 40, far: true },
  { x: 312, y: 344, height: 40, far: true },
  { x: 344, y: 344, height: 40, far: true },
  { x: 262, y: 350, height: 42, far: false },
  { x: 296, y: 352, height: 40, far: false },
  { x: 330, y: 350, height: 42, far: false },
] as const;

/** The sleep "z"s rise from just above her right eye. */
export const ZZZ_ORIGIN = { x: 392, y: 132 } as const;
export const ZZZ_COUNT = 3;
