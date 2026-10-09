import { gsap } from "gsap";
import { endTickle, MOXIE_PRESETS, tickleGiggle, toNeutral } from "./moxie.animations";
import type { MoxieAnimation, MoxieParts, MoxieTimelineFactory } from "./moxie.types";

/** Time to ease back to neutral before starting a new animation. */
const SETTLE = 0.35;
/** How long a reduced-motion reaction holds its pose before relaxing. */
const REDUCED_HOLD = 1.4;

interface ControllerOptions {
  reducedMotion: boolean;
  onComplete?: (animation: MoxieAnimation) => void;
}

/**
 * Runs Moxie's animations on one set of parts. Only one timeline is live at
 * a time; starting a new animation kills the old one and eases out of
 * whatever pose it left behind, so any animation can interrupt any other.
 * Works entirely outside React — nothing here triggers a re-render.
 */
export class MoxieController {
  private timeline: gsap.core.Timeline | null = null;
  /** The tickle giggle, while it plays (the animation underneath is paused). */
  private giggle: gsap.core.Timeline | null = null;
  private paused = false;
  /** The animation currently showing ("idle" again once a reaction has finished). */
  current: MoxieAnimation | null = null;

  constructor(
    private readonly parts: MoxieParts,
    private readonly options: ControllerOptions,
  ) {}

  play(animation: MoxieAnimation): void {
    this.stopGiggle(); // anything new takes over from a giggle at once
    const preset = MOXIE_PRESETS[animation];
    const { parts } = this;
    const tl = gsap.timeline();
    this.current = animation;

    if (this.options.reducedMotion) {
      // Static key poses only: no loops, no bouncing.
      tl.add(toNeutral(parts, SETTLE));
      if (preset.reducedPose) {
        tl.add(preset.reducedPose(parts));
        if (preset.mode === "once") tl.add(toNeutral(parts, SETTLE * 1.5), `+=${REDUCED_HOLD}`);
      }
      tl.eventCallback("onComplete", () => {
        if (preset.mode === "once") this.finishReaction(animation, false);
      });
    } else {
      if (!preset.fromCurrentPose) tl.add(toNeutral(parts, SETTLE));
      if (preset.intro) tl.add(preset.intro(parts));
      tl.eventCallback("onComplete", () => {
        if (preset.mode === "loop" && preset.cycle) this.runCycle(preset.cycle);
        else if (preset.mode === "once") this.finishReaction(animation, true);
        else this.options.onComplete?.(animation);
      });
    }
    this.start(tl);
  }

  /**
   * Tickled: whatever's playing pauses where it is, she giggles (on layers
   * no animation uses), then it picks up exactly where it stopped. Ignored
   * while she's already giggling or paused. Returns whether she reacted.
   */
  tickle(): boolean {
    if (this.giggle || this.paused) return false;
    this.timeline?.pause();
    const giggle = tickleGiggle(this.parts, this.options.reducedMotion);
    giggle.eventCallback("onComplete", () => {
      this.giggle = null;
      if (!this.paused) this.timeline?.resume();
    });
    this.giggle = giggle;
    return true;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.timeline?.pause();
      this.giggle?.pause();
    } else if (this.giggle) {
      this.giggle.resume(); // the animation underneath resumes when the giggle ends
    } else {
      this.timeline?.resume();
    }
  }

  destroy(): void {
    this.stopGiggle();
    this.timeline?.kill();
    this.timeline = null;
  }

  private stopGiggle() {
    if (!this.giggle) return;
    this.giggle.kill();
    this.giggle = null;
    endTickle(this.parts);
  }

  /** Back to idle first, then notify — so a callback that plays something new wins. */
  private finishReaction(animation: MoxieAnimation, resumeIdle: boolean) {
    if (resumeIdle) this.play("idle");
    else this.current = "idle";
    this.options.onComplete?.(animation);
  }

  /** Loops are rebuilt every cycle so their randomised details never repeat exactly. */
  private runCycle(cycle: MoxieTimelineFactory) {
    const tl = cycle(this.parts);
    tl.eventCallback("onComplete", () => this.runCycle(cycle));
    this.start(tl);
  }

  private start(tl: gsap.core.Timeline) {
    this.timeline?.kill();
    this.timeline = tl;
    if (this.paused || this.giggle) tl.pause();
  }
}
