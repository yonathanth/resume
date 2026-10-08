// Moxie's palette and geometry, taken unchanged from the source artwork
// (moxie_hermit_crab_shorter_stalks.svg). All coordinates are in the
// artwork's own drawing space, so pivots stay correct at any rendered size.

export const MOXIE_COLORS = {
  coral: "#FF6A3D",
  coralShade: "#E04E24",
  ink: "#14142B",
  cream: "#FFF8F0",
  blush: "#FFC94A",
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

/**
 * Rotation/scale pivots per layer. Each layer always uses the same pivot
 * (set once at mount) so GSAP never has to compensate for origin changes.
 */
export const PIVOTS = {
  root: "305 392", // ground beneath her feet
  shadow: "305 393",
  legs: "305 352",
  smallClaw: "368 328", // shoulder
  smallPincer: "404 320", // wrist
  body: "305 374", // bottom of the shell-less body
  face: "305 374", // must match body so squash keeps the face aligned
  bigClaw: "240 312", // shoulder
  bigPincer: "214 291", // wrist
  stalkL: "285 282", // where each stalk meets the body
  stalkR: "318 282",
  stalkLineL: "285 282",
  stalkLineR: "318 282",
  eyeL: `${EYE_L.cx} ${EYE_L.cy}`,
  eyeR: `${EYE_R.cx} ${EYE_R.cy}`,
  pupilL: `${EYE_L.cx + PUPIL_REST.x} ${EYE_L.cy + PUPIL_REST.y}`,
  pupilR: `${EYE_R.cx + PUPIL_REST.x} ${EYE_R.cy + PUPIL_REST.y}`,
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

/** The sleep "z"s rise from just above her right eye. */
export const ZZZ_ORIGIN = { x: 392, y: 132 } as const;
export const ZZZ_COUNT = 3;
