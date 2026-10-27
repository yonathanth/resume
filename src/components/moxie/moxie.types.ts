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
  // Scenes — Moxie doing the job, with props.
  "tailor",
  "write",
  "read",
  "polish",
  "stamp",
  // The recruiter (the landing page's hero): reads your CV, looks at you over her glasses, nods, stamps it.
  "review",
  // The hero's greeter: a CV tucked under her arm, glasses on, she says hi, then points you to uploading yours — or starting from scratch.
  "invite",
  // Peeking in from the screen's edge, then waving: the landing page's quick start (MoxiePeek).
  "peekSide",
  // Peeking back round that edge afterwards, ducking away, and coming back out.
  "peekEdge",
  "peekEdgeAway",
  "peekEdgeOut",
  // Celebrations and moments (tier 2) — previewed on /dev/moxie.
  "tada",
  "downloaded",
  "verifying",
  "paid",
  "onboarded",
  "saved",
  // A new loader to compare with "loading": presenting a "Did you know?" card — previewed on /dev/moxie.
  "presenting",
  // Empty states (tier 3) — previewed on /dev/moxie.
  "searching",
  "emptyFolder",
  // Sitting on a ledge — the sidebar (previewed on /dev/moxie).
  "sitting",
  // The 404 page, errors and the paywall (tier 4) — previewed on /dev/moxie.
  "lost",
  "oops",
  "upgrade",
] as const;

export type MoxieAnimation = (typeof MOXIE_ANIMATIONS)[number];

/** Every independently animatable layer of the artwork. */
export interface MoxieParts {
  /**
   * Wraps the whole character, and only the tickle giggle moves it — so it
   * can shake her while whatever she was doing stays exactly as it was.
   */
  jiggle: SVGGElement;
  /** Squeezed-shut, laughing eyes drawn over each eye — shown only while she giggles. */
  laughL: SVGGElement;
  laughR: SVGGElement;
  /** A big laughing mouth drawn over her mouth — shown only while she giggles. */
  mouthLaugh: SVGGElement;
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
  /** The big claw's arm (outline and fill), redrawn to keep it joined to the pincer. */
  bigArm: SVGPathElement[];
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
  /** Mouth shapes inside the face — one shown at a time (the smile at rest). */
  mouthSmile: SVGGElement;
  /** Mouthing words while she reads to herself (squashed open and shut). */
  mouthTalk: SVGEllipseElement;
  /** A wavy, unconvinced "hmm". */
  mouthFlat: SVGPathElement;
  /** A small round "oh?". */
  mouthO: SVGEllipseElement;
  /** Concentrating: lips pressed, tongue tip poking out. */
  mouthTongue: SVGGElement;
  sparkles: SVGGElement[];
  zs: SVGGElement[];
  /** Held in the big pincer, so it moves with the claw. */
  pencil: SVGGElement;
  /** The pencil's front half and point, which can snap off… */
  pencilTip: SVGGElement;
  /** …the barrel's front half, recoloured with the rest of it… */
  pencilFront: SVGRectElement;
  /** …and the splintered end left on the stub. */
  pencilSplinter: SVGPathElement;
  /** The pencil's barrel — recoloured for a red editing pencil. */
  pencilBody: SVGRectElement;
  /** The read scene's paper, back toward us — pivots with the big claw that holds it. */
  paperBack: SVGGElement;
  /** The sheet inside it (swapped for a fresh one when she's done with it). */
  paperSheet: SVGGElement;
  /** Its printed CV — shown when she reads it, hidden for a blank sheet. */
  paperText: SVGGElement;
  /** Handwritten rows (PAPER_ROWS order), drawn on by animating their dash offset. */
  paperInks: SVGPathElement[];
  /** The seal the stamp scene presses onto that sheet. */
  paperSeal: SVGGElement;
  /** A rubber stamp, held in the big pincer like the pencil (its face where the pencil's point is). */
  stamp: SVGGElement;
  /** Scissors, held the same way, the blades' tips where the pencil's point is. */
  scissors: SVGGElement;
  /** The two blades, which open and close about the screw. */
  bladeA: SVGGElement;
  bladeB: SVGGElement;
  /** The held sheet's job-post face — shown while she reads the job post (instead of a CV). */
  paperJob: SVGGElement;
  /** The job post lying on the ground in front of her (tailor scene), between readings. */
  groundPost: SVGGElement;
  /** A magnifying glass, held in the big pincer like the pencil (the lens where the point would be). */
  magnifier: SVGGElement;
  /** Moxie seen from the side (pacing, on the 404 page) — hidden until shown in place of her front view. */
  side: SVGGElement;
  /** Flipped (scaleX -1) to face the other way. */
  sideTurn: SVGGElement;
  /** Everything above the legs: bobs as she walks. */
  sideBody: SVGGElement;
  /** Far three legs, then near three. */
  sideLegs: SVGRectElement[];
  sidePupils: SVGGElement[];
  /** Worried, slanted lids — lowered to blink. */
  sideLids: SVGGElement[];
  /** A bead of sweat. */
  sideSweat: SVGGElement;
  /** The Pro crown, worn in the side view too. */
  sideCrown: SVGGElement;
  /** A crown hanging in the air above her big claw (the paywall) — not part of her, so it stays put. */
  crownFloat: SVGGElement;
  /** A PDF file that drops into her big pincer (the "downloaded" moment). */
  pdfFile: SVGGElement;
  /** A gold coin held in the big pincer (verifying a payment); the face flips over, the whole coin is tossed. */
  coin: SVGGElement;
  coinFace: SVGGElement;
  /** The Pro crown that lands on her head (payment success). */
  crown: SVGGElement;
  /** Confetti pieces, burst out above her (onboarding finished). */
  confetti: SVGGElement[];
  /** A folder around the held sheet (saved to a profile): its back behind the sheet, its front over it. */
  folderBack: SVGGElement;
  folderFront: SVGGElement;
  /** Folders clutched to her side, with its own copy of the small claw holding them (presenting loader). */
  hugFiles: SVGGElement;
  /** Just the folders — they slip, and get hitched back up. */
  hugStack: SVGGElement;
  /** A single CV tucked under that same arm instead of the folders (the hero's invite). */
  hugSheet: SVGGElement;
  /** That copy's pincer — taps the folders while she waits. */
  hugPincer: SVGGElement;
  /** Half-moon reading glasses, one lens inside each eye so they follow the eyes. */
  glassesL: SVGGElement;
  glassesR: SVGGElement;
  /** Joins the lenses; redrawn every frame since the eyes move independently. */
  glassesBridge: SVGPathElement;
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
  /** Shows or hides the Pro crown itself — the `crowned` setting doesn't apply while it plays. */
  ownsCrown?: boolean;
  /**
   * Tickled, she covers up — claws pulled in over her body, legs kicking —
   * instead of only wriggling: for poses she can't move out of, like sitting.
   */
  coversUpWhenTickled?: boolean;
}

export interface MoxieHandle {
  /** Plays an animation now — also replays the one already showing. */
  play: (animation: MoxieAnimation) => void;
  /**
   * Tickles her: whatever she's doing pauses, she giggles and wiggles, then
   * picks up exactly where she left off. Ignored while she's already giggling.
   * Returns whether she reacted.
   */
  tickle: () => boolean;
}
