/**
 * What a visitor gave the landing page's hero — a CV file and/or a job
 * description — handed to the /try flow it opens, so they don't give it
 * twice. Kept in memory only (a File can't go in a URL or storage): it
 * survives the in-app navigation to /try, and a full reload simply starts the
 * flow from its first step. Taken once.
 */

export interface HeroHandoff {
  file?: File;
  jobDescription?: string;
}

let pending: HeroHandoff | null = null;

export function setHeroHandoff(handoff: HeroHandoff) {
  pending = handoff;
}

/** The hero's file / job description, once — later calls get null. */
export function takeHeroHandoff(): HeroHandoff | null {
  const handoff = pending;
  pending = null;
  return handoff;
}
