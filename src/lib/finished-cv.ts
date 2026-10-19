import type { CvData } from "@/components/dashboard/create-flow/types";
import { type ApiUser, completeOnboardingFromCv, createCvDocument, getMe, updateCvContent } from "./api";
import { toCVContentPatch } from "./cv-mapper";
import { firstTouch } from "./analytics";
import type { FlowKind } from "./flow-drafts";

// A finished create / tailor / improve flow opens the CV on its own editor
// page (/dashboard/editor/<id>), so a refresh keeps it open and Back works,
// like every other step. The AI flows' CVs are already saved; one started
// from the blank guided form isn't yet, so it's saved first.

const SAVED_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The CV's document id — saving it as a new document first if it only exists here so far. */
export async function ensureSavedCv(cv: CvData): Promise<string> {
  if (cv.id && SAVED_ID.test(cv.id)) return cv.id;
  const doc = await createCvDocument(undefined, cv.templateStyle);
  await updateCvContent(doc.id, {
    content: toCVContentPatch(cv),
    jobDescription: cv.jobDescription ?? null,
    title: cv.title,
    templateId: cv.templateStyle,
  });
  return doc.id;
}

/** The editor page; `fresh` marks a CV a flow has just written (it asks how the draft came out). */
export const editorHref = (id: string, fresh?: FlowKind) =>
  `/dashboard/editor/${id}${fresh ? `?fresh=${fresh}` : ""}`;

// "Fill my details from the CV I'm about to make": set when someone uploads
// their CV during onboarding instead of typing their details.
const FILL_FROM_CV_KEY = "fillDetailsFromCv";

export function markFillDetailsFromCv() {
  try {
    localStorage.setItem(FILL_FROM_CV_KEY, String(Date.now()));
  } catch {
    // Storage blocked: they can still fill their details in Account settings.
  }
}

/** Forgets the flag (another account on this browser, or the account was deleted). */
export function clearFillDetailsFromCv() {
  try {
    localStorage.removeItem(FILL_FROM_CV_KEY);
  } catch {
    // Nothing to clear.
  }
}

function takeFillDetailsFromCv(): boolean {
  try {
    const at = Number(localStorage.getItem(FILL_FROM_CV_KEY));
    localStorage.removeItem(FILL_FROM_CV_KEY);
    // A day is plenty to finish the one flow it was set for.
    return Number.isFinite(at) && at > 0 && Date.now() - at < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * After a first CV: fills the account's empty details from it, for someone
 * who hasn't been through onboarding yet (signed up on a /try page) or chose
 * to upload their CV during it. Only empty fields change (server-side). The
 * updated user, or null when there was nothing to do. Never throws.
 */
export async function fillAccountFromFinishedCv(cvDocumentId: string, flow: FlowKind): Promise<ApiUser | null> {
  try {
    const me = await getMe();
    const surface = !me.onboardingCompleted ? "try" : takeFillDetailsFromCv() ? "dashboard" : null;
    if (!surface) return null;
    return await completeOnboardingFromCv({ cvDocumentId, flow, surface, signupAttribution: firstTouch() as Record<string, string> | undefined });
  } catch {
    return null;
  }
}
