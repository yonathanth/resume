"use client";

import { useMutation } from "@tanstack/react-query";
import {
  getUnfiledProfile,
  createProfile,
  createCvDocument,
  generateCv,
  getCvDocument,
  listCvDocuments,
  moveCvDocumentProfile,
  uploadCvImport,
  ApiCvDocument,
  GenerateCvMismatch,
} from "@/lib/api";
import { serializeCvContentToText } from "@/lib/cv-mapper";

export interface AnalyzeFreestyleResult {
  profileId: string;
  cvDocumentId: string;
  document: ApiCvDocument | GenerateCvMismatch;
}

// Step 1: "Analyze & Continue" — creates the CV document under the account's
// hidden "Unfiled CVs" bucket (we don't know the final profile choice yet;
// a real career profile is only created if the user later chooses to save
// one) and runs the AI parse on the raw freestyle text.
export function useAnalyzeFreestyle() {
  return useMutation({
    mutationFn: async (sourceText: string): Promise<AnalyzeFreestyleResult> => {
      const bucket = await getUnfiledProfile();
      const doc = await createCvDocument(bucket.id);
      const document = await generateCv(doc.id, { sourceText });
      return { profileId: bucket.id, cvDocumentId: doc.id, document };
    },
  });
}

export interface AnalyzeUploadResult {
  profileId: string;
  cvDocumentId: string;
  sourceText: string;
  document: ApiCvDocument | GenerateCvMismatch;
}

// Upload flow equivalent of "Analyze & Continue": OCRs/extracts the file's
// text server-side (pdf-parse / mammoth / tesseract.js), then runs it
// through the same AI parse used by the freestyle flow.
export function useAnalyzeUpload() {
  return useMutation({
    mutationFn: async (file: File): Promise<AnalyzeUploadResult> => {
      const bucket = await getUnfiledProfile();
      const cvImport = await uploadCvImport(bucket.id, file);
      if (cvImport.status === "failed" || !cvImport.rawText) {
        throw new Error(cvImport.error || "Could not read text from this file");
      }
      const doc = await createCvDocument(bucket.id);
      const document = await generateCv(doc.id, { sourceText: cvImport.rawText });
      return { profileId: bucket.id, cvDocumentId: doc.id, sourceText: cvImport.rawText, document };
    },
  });
}

export interface AnalyzeExistingInput {
  /** A specific existing CV document to pull real content from (e.g. a past project). */
  sourceCvId?: string;
  /** Or resolve the most recently updated document under this career profile. */
  sourceProfileId?: string;
  /** Where the new working document should be created — defaults to the
   * hidden "Unfiled CVs" bucket, same as the freestyle/upload flows. */
  targetProfileId?: string;
}

export interface AnalyzeExistingResult {
  profileId: string;
  cvDocumentId: string;
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

      const targetProfileId = input.targetProfileId ?? (await getUnfiledProfile()).id;
      const sourceText = serializeCvContentToText(sourceDoc.content);
      const doc = await createCvDocument(targetProfileId);
      const document = await generateCv(doc.id, { sourceText });
      return { profileId: targetProfileId, cvDocumentId: doc.id, sourceText, document };
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
}

// Step 2: "Choose Template & Continue" — re-runs generation with the
// essentials the user filled in folded into the source text, plus the
// optional job description. Existing non-empty fields are never overwritten
// (see mergeEmptyFields on the backend).
export function useRefineCv() {
  return useMutation({
    mutationFn: (input: RefineCvInput) =>
      generateCv(input.cvDocumentId, {
        sourceText: input.sourceText,
        jobDescription: input.jobDescription,
        name: input.name,
        enhancementLevel: input.enhancementLevel,
      }),
  });
}

export interface FinalizeCvProfileInput {
  cvDocumentId: string;
  currentProfileId: string;
  shouldSaveProfile: boolean;
  targetRole: string;
}

// Step 3: Save/Skip decision — only now do we know whether this becomes a
// named career profile; if so, create it and move the already-generated
// document onto it.
export function useFinalizeCvProfile() {
  return useMutation({
    mutationFn: async (input: FinalizeCvProfileInput): Promise<{ profileId: string }> => {
      if (!input.shouldSaveProfile) {
        return { profileId: input.currentProfileId };
      }
      const profile = await createProfile(input.targetRole);
      await moveCvDocumentProfile(input.cvDocumentId, profile.id);
      return { profileId: profile.id };
    },
  });
}
