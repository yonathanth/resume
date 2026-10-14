import type { CvData } from "@/components/dashboard/create-flow/types";
import { createCvDocument, updateCvContent } from "./api";
import { toCVContentPatch } from "./cv-mapper";

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

export const editorHref = (id: string) => `/dashboard/editor/${id}`;
