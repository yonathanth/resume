"use client";

import { useMutation } from "@tanstack/react-query";
import {
  analyzeCv,
  createProfile,
  createCvDocument,
  generateCv,
  getCvDocument,
  listCvDocuments,
  moveCvDocumentProfile,
  polishSummary,
  uploadCvImport,
  ApiCvDocument,
  GenerateCvMismatch,
} from "@/lib/api";
import { serializeCvContentToText } from "@/lib/cv-mapper";

// Runs the combined AI analysis, then — if it wasn't a full mismatch —
// creates a standalone CV document (no profile yet; that's a later, separate
// decision) and persists the analyzed data without a second AI call (see
// generateCv's `analyzedContent` bypass). The `questions`/`jobAnalysis` the
// AI returned are folded onto the persisted document response so callers can
// keep using the same `"mismatch" in document` / `document.content` checks
// they already had, with the new fields available additively.
async function analyzeAndPersist(
  sourceText: string,
  profileId?: string,
  options?: { jobDescription?: string; focusInstructions?: string }
): Promise<{ profileId: string | null; cvDocumentId: string | null; document: ApiCvDocument | GenerateCvMismatch }> {
  const analyzed = await analyzeCv({
    sourceText,
    jobDescription: options?.jobDescription,
    focusInstructions: options?.focusInstructions,
  });
  if ("mismatch" in analyzed) {
    return { profileId: profileId ?? null, cvDocumentId: null, document: analyzed };
  }

  const doc = await createCvDocument(profileId);
  const document = await generateCv(doc.id, {
    analyzedContent: analyzed.candidateData,
    jobDescription: options?.jobDescription,
  });
  if ("mismatch" in document) {
    return { profileId: profileId ?? null, cvDocumentId: doc.id, document };
  }

  return {
    profileId: profileId ?? null,
    cvDocumentId: doc.id,
    document: { ...document, questions: analyzed.questions, jobAnalysis: analyzed.jobAnalysis },
  };
}

export interface AnalyzeFreestyleResult {
  profileId: string | null;
  cvDocumentId: string | null;
  document: ApiCvDocument | GenerateCvMismatch;
}

// Step 1: "Analyze & Continue" — creates a standalone CV document (not
// attached to any career profile; that's only decided later, if the user
// chooses to save one) and runs the AI parse on the raw freestyle text.
export function useAnalyzeFreestyle() {
  return useMutation({
    mutationFn: (sourceText: string): Promise<AnalyzeFreestyleResult> => analyzeAndPersist(sourceText),
  });
}

export interface AnalyzeUploadResult {
  profileId: string | null;
  cvDocumentId: string | null;
  sourceText: string;
  document: ApiCvDocument | GenerateCvMismatch;
}

// Upload flow equivalent of "Analyze & Continue": OCRs/extracts the file's
// text server-side (pdf-parse / mammoth / tesseract.js), then runs it
// through the same AI parse used by the freestyle flow.
export function useAnalyzeUpload() {
  return useMutation({
    mutationFn: async (file: File): Promise<AnalyzeUploadResult> => {
      const cvImport = await uploadCvImport(file);
      if (cvImport.status === "failed" || !cvImport.rawText) {
        throw new Error(cvImport.error || "Could not read text from this file");
      }
      const { profileId, cvDocumentId, document } = await analyzeAndPersist(cvImport.rawText);
      return { profileId, cvDocumentId, sourceText: cvImport.rawText, document };
    },
  });
}

export interface AnalyzeExistingInput {
  /** A specific existing CV document to pull real content from (e.g. a past project). */
  sourceCvId?: string;
  /** Or resolve the most recently updated document under this career profile. */
  sourceProfileId?: string;
  /** Where the new working document should be created — omit to create a
   * standalone document not attached to any career profile. */
  targetProfileId?: string;
  /** New factual content the user typed in that isn't in the source yet
   * (a recent role, project, achievement...) — folded into the source text
   * so the AI can incorporate it, never fabricated on its own. */
  extraDetails?: string;
  jobDescription?: string;
  /** A short instruction for what to emphasize/rewrite toward — sent as its
   * own high-priority prompt block instead of being folded into sourceText. */
  focusInstructions?: string;
}

export interface AnalyzeExistingResult {
  profileId: string | null;
  cvDocumentId: string | null;
  sourceText: string;
  document: ApiCvDocument | GenerateCvMismatch;
}

// "Start from career profile" / "past project" equivalent of Analyze &
// Continue for Tailor/Enhance: pulls the REAL content of an existing
// document (never a fabricated skeleton), serializes it back to text, and
// runs it through a fresh document so the backend's fill-only-empty-fields
// merge doesn't block the rewrite.
export function useAnalyzeExisting() {
  return useMutation({
    mutationFn: async (input: AnalyzeExistingInput): Promise<AnalyzeExistingResult> => {
      const sourceDoc = input.sourceCvId
        ? await getCvDocument(input.sourceCvId)
        : input.sourceProfileId
          ? (await listCvDocuments(input.sourceProfileId))[0]
          : undefined;

      if (!sourceDoc) {
        throw new Error("This profile doesn't have any resume content yet.");
      }

      const baseText = serializeCvContentToText(sourceDoc.content);
      const sourceText = input.extraDetails?.trim()
        ? `${baseText}\n\nAdditional details to incorporate:\n${input.extraDetails.trim()}`
        : baseText;
      const { profileId, cvDocumentId, document } = await analyzeAndPersist(sourceText, input.targetProfileId, {
        jobDescription: input.jobDescription,
        focusInstructions: input.focusInstructions,
      });
      return { profileId, cvDocumentId, sourceText, document };
    },
  });
}

export interface RefineCvInput {
  cvDocumentId: string;
  sourceText: string;
  jobDescription?: string;
  name?: string;
  /** 0–1, writing intensity — e.g. the Tailor alignment slider or Enhance's boost intent. */
  enhancementLevel?: number;
  /** A short instruction for what to emphasize/rewrite toward (e.g. Enhance's
   * improvement-goal field) — sent as its own high-priority prompt block
   * instead of being folded into sourceText. */
  focusInstructions?: string;
}

// Step 2: "Choose Template & Continue" — re-analyzes with the essentials the
// user filled in (plus any clarification answers) folded into the source
// text, then persists the result without a second AI call. Existing
// non-empty fields are never overwritten (see mergeEmptyFields on the
// backend). Any leftover questions/gaps from this round are folded onto the
// returned document, same as the initial analyze step.
export function useRefineCv() {
  return useMutation({
    mutationFn: async (input: RefineCvInput): Promise<ApiCvDocument | GenerateCvMismatch> => {
      const analyzed = await analyzeCv({
        sourceText: input.sourceText,
        jobDescription: input.jobDescription,
        name: input.name,
        enhancementLevel: input.enhancementLevel,
        focusInstructions: input.focusInstructions,
      });
      if ("mismatch" in analyzed) return analyzed;

      const document = await generateCv(input.cvDocumentId, {
        analyzedContent: analyzed.candidateData,
        jobDescription: input.jobDescription,
        name: input.name,
        enhancementLevel: input.enhancementLevel,
      });
      if ("mismatch" in document) return document;

      return { ...document, questions: analyzed.questions, jobAnalysis: analyzed.jobAnalysis };
    },
  });
}

export interface FinalizeCvProfileInput {
  cvDocumentId: string;
  /** "create" makes a new career profile and moves the document onto it;
   * "attach" moves it onto an existing chosen profile; "none" leaves it
   * standalone (no move needed). */
  action: "create" | "attach" | "none";
  targetRole?: string;
  existingProfileId?: string;
}

// Step 3: Save/Skip/Attach decision — only now do we know whether this
// becomes a named career profile, gets attached to an existing one, or stays
// standalone.
export function useFinalizeCvProfile() {
  return useMutation({
    mutationFn: async (input: FinalizeCvProfileInput): Promise<{ profileId: string | null }> => {
      if (input.action === "none") {
        return { profileId: null };
      }
      if (input.action === "attach") {
        if (!input.existingProfileId) {
          throw new Error("No career profile selected to attach to.");
        }
        await moveCvDocumentProfile(input.cvDocumentId, input.existingProfileId);
        return { profileId: input.existingProfileId };
      }
      const profile = await createProfile(input.targetRole || "New Career Profile");
      await moveCvDocumentProfile(input.cvDocumentId, profile.id);
      return { profileId: profile.id };
    },
  });
}

// Powers the CV editor's "AI Polish" action on the Summary section — a
// stateless rewrite of just the summary text, grounded by the rest of the CV.
export function usePolishSummary() {
  return useMutation({
    mutationFn: (input: {
      summary: string;
      title?: string;
      skills?: string[];
      experienceBullets?: string[];
    }) => polishSummary(input),
  });
}
