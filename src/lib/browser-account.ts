// What this browser keeps between visits — unfinished flows (with the CV the
// AI already wrote), the "fill my details from my CV" flag, a pending upload,
// a /try handoff — belongs to one account. Without an owner check it would
// outlive that account: after a deletion (or someone else signing in on the
// same browser) the next account would be shown the previous one's
// unfinished CV. So the browser remembers whose it is, and clears it when
// that changes.
//
// Not cleared: things that aren't anyone's data — the anonymous analytics id,
// first-touch attribution, "seen the editor tour", and a /go link someone
// opened before signing up (that's the new person's own intent).

import { clearAllFlowDrafts } from "./flow-drafts";
import { clearFillDetailsFromCv } from "./finished-cv";
import { clearTryHandoff } from "./try-handoff";
import { setPendingUpload } from "./pending-upload";
import { readAndClearLastChapaPaymentId } from "./payment-session";

const OWNER_KEY = "resumate_account_owner";

/** Forgets every account-owned thing this browser keeps. */
export function clearAccountBrowserData() {
  clearAllFlowDrafts();
  clearFillDetailsFromCv();
  clearTryHandoff();
  setPendingUpload(null);
  readAndClearLastChapaPaymentId();
  try {
    sessionStorage.removeItem("rateAfterEditor");
  } catch {
    // Nothing to clear.
  }
}

/**
 * The signed-in account, once it's known (every /me load). A different
 * account than the one this browser's saved state came from clears that state
 * first. State saved while signed out (a /try flow before signing up) has no
 * owner yet and carries over to whoever signs up.
 */
export function claimBrowserFor(userId: string) {
  try {
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner && owner !== userId) clearAccountBrowserData();
    if (owner !== userId) localStorage.setItem(OWNER_KEY, userId);
  } catch {
    // Storage blocked: there's nothing saved to carry over either.
  }
}

/** The account was deleted, or signed out: nothing here is anyone's any more. */
export function releaseBrowser() {
  clearAccountBrowserData();
  try {
    localStorage.removeItem(OWNER_KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * Signed out (the public /try pages): if what's saved here came from an
 * account, it isn't this visitor's — drop it. A guest's own unfinished flow
 * has no owner and stays (a refresh mid-flow keeps working).
 */
export function forgetPreviousAccount() {
  try {
    if (localStorage.getItem(OWNER_KEY) !== null) releaseBrowser();
  } catch {
    // Storage blocked: nothing saved.
  }
}
