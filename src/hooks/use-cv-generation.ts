"use client";

import { useMutation } from "@tanstack/react-query";
import {
  analyzeCv,
  createCvDocument,
  deleteCvDocument,
  generateCv,
  getCvDocument,
  getProfileCvContent,
  polishSummary,
  analyzeJobRequirements,
  reviewCv,
  polishCv,
  updateCvContent,
  uploadCvImport,
  ApiCvDocument,
  ClarificationQuestion,
  CVContentDTO,
  CvFlowType,
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
  profileId: string | undefined,
  options: {
    templateId: string;
    jobDescription?: string;
    focusInstructions?: string;
    email?: string;
    flowType: CvFlowType;
    /** Past the free CV / a Plus limit: carry on, pay for this CV at download. */
    payLater?: boolean;
    /** The saved resume / profile being reworked (priced as tailored / improved). */
    sourceCvId?: string;
    sourceProfileId?: string;
  }
): Promise<{ profileId: string | null; cvDocumentId: string | null; document: ApiCvDocument | GenerateCvMismatch }> {
  // The template is chosen before analysis so the AI only writes the sections
  // it shows (plus its notes) and asks about the ones it needs but can't find.
  const analyzed = await analyzeCv({
    sourceText,
    templateId: options.templateId,
    jobDescription: options.jobDescription,
    focusInstructions: options.focusInstructions,
    email: options.email,
    flowType: options.flowType,
    payLater: options.payLater,
    sourceCvId: options.sourceCvId,
    sourceProfileId: options.sourceProfileId,
  });
  if ("mismatch" in analyzed) {
    return { profileId: profileId ?? null, cvDocumentId: null, document: analyzed };
  }

  const doc = await createCvDocument(profileId, options.templateId);
  let document: ApiCvDocument | GenerateCvMismatch;
  try {
    // The charge from the analysis goes with the save (see the backend's chargeToken).
    document = await generateCv(doc.id, {
      analyzedContent: analyzed.candidateData,
      jobDescription: options.jobDescription,
      chargeToken: analyzed.chargeToken,
    });
  } catch (err) {
    // Don't leave an empty draft behind in Past Projects.
    await deleteCvDocument(doc.id).catch(() => undefined);
    throw err;
  }
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
    mutationFn: ({
      sourceText,
      templateId,
      flowType,
      payLater,
    }: {
      sourceText: string;
      templateId: string;
      flowType: CvFlowType;
      payLater?: boolean;
    }): Promise<AnalyzeFreestyleResult> => analyzeAndPersist(sourceText, undefined, { templateId, flowType, payLater }),
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
    mutationFn: async ({
      file,
      templateId,
      flowType,
      payLater,
    }: {
      file: File;
      templateId: string;
      flowType: CvFlowType;
      payLater?: boolean;
    }): Promise<AnalyzeUploadResult> => {
      const cvImport = await uploadCvImport(file);
      if (cvImport.status === "failed" || !cvImport.rawText) {
        throw new Error(cvImport.error || "Could not read text from this file");
      }
      // The import's regex-extracted email is reliable enough to pin as the
      // authoritative identity, so the AI can't drop or garble it. (Its name
      // guess is only "first line looks like a name" — too weak to pin.)
      const { profileId, cvDocumentId, document } = await analyzeAndPersist(cvImport.rawText, undefined, {
        templateId,
        email: cvImport.extractedData?.personal?.email,
        flowType,
        payLater,
      });
      return { profileId, cvDocumentId, sourceText: cvImport.rawText, document };
    },
  });
}

export interface AnalyzeExistingInput {
  /** A specific existing CV document to pull real content from (e.g. a past project). */
  sourceCvId?: string;
  /** Or a career profile — its own content (not any one CV) is the source. */
  sourceProfileId?: string;
  /** Where the new working document should be created — omit to create a
   * standalone document not attached to any career profile. */
  targetProfileId?: string;
  /** The template chosen at the start of the flow. */
  templateId: string;
  /** New factual content the user typed in that isn't in the source yet
   * (a recent role, project, achievement...) — folded into the source text
   * so the AI can incorporate it, never fabricated on its own. */
  extraDetails?: string;
  jobDescription?: string;
  /** A short instruction for what to emphasize/rewrite toward — sent as its
   * own high-priority prompt block instead of being folded into sourceText. */
  focusInstructions?: string;
  /** Which dashboard tab this flow started from — only charged when an AI
   * call actually happens (hasNewInput below, or the later refine); a plain copy is free. */
  flowType: CvFlowType;
  /** Past the free CV / a Plus limit: carry on, pay for this CV at download. */
  payLater?: boolean;
}

export interface AnalyzeExistingResult {
  profileId: string | null;
  cvDocumentId: string | null;
  sourceText: string;
  document: ApiCvDocument | GenerateCvMismatch;
}

// "Start from career profile" / "past project" equivalent of Analyze &
// Continue: pulls REAL content (a past CV, or the profile's own content —
// never a fabricated skeleton), serializes it back to text, and runs it
// through a fresh document so the backend's fill-only-empty-fields merge
// doesn't block the rewrite.
export function useAnalyzeExisting() {
  return useMutation({
    mutationFn: async (input: AnalyzeExistingInput): Promise<AnalyzeExistingResult> => {
      let sourceDoc: { content: CVContentDTO } | undefined;
      if (input.sourceCvId) {
        sourceDoc = await getCvDocument(input.sourceCvId);
      } else if (input.sourceProfileId) {
        const { content } = await getProfileCvContent(input.sourceProfileId);
        if (!content.experience?.length && !content.skills?.length) {
          throw new Error("This profile is still empty. Add your experience and skills on the Career Profiles page first.");
        }
        sourceDoc = { content };
      }

      if (!sourceDoc) {
        throw new Error("Nothing to start from. Pick a profile or a resume.");
      }

      const baseText = serializeCvContentToText(sourceDoc.content);

      // Nothing new to fold in — the source is already structured CV content,
      // so copy it into the new working document instead of paying for an AI
      // re-parse of data we already have. Tailor/Enhance run their real AI
      // rewrite later, in useRefineCv.
      const hasNewInput = Boolean(
        input.extraDetails?.trim() || input.jobDescription?.trim() || input.focusInstructions?.trim()
      );
      if (!hasNewInput) {
        // A copy of a resume still to be paid for stays locked (sourceCvId).
        const doc = await createCvDocument(input.targetProfileId, input.templateId, input.sourceCvId);
        const document = await updateCvContent(doc.id, { content: sourceDoc.content });
        return {
          profileId: input.targetProfileId ?? null,
          cvDocumentId: doc.id,
          sourceText: baseText,
          document: { ...document, questions: [], jobAnalysis: null },
        };
      }

      const sourceText = input.extraDetails?.trim()
        ? `${baseText}\n\nAdditional details to incorporate:\n${input.extraDetails.trim()}`
        : baseText;
      const { profileId, cvDocumentId, document } = await analyzeAndPersist(sourceText, input.targetProfileId, {
        templateId: input.templateId,
        jobDescription: input.jobDescription,
        focusInstructions: input.focusInstructions,
        flowType: input.flowType,
        payLater: input.payLater,
        sourceCvId: input.sourceCvId,
        sourceProfileId: input.sourceProfileId,
      });
      return { profileId, cvDocumentId, sourceText, document };
    },
  });
}

type PersonalFields = NonNullable<CVContentDTO["personal"]>;
type PersonalKey = "full_name" | "title" | "email" | "phone" | "location";

// AI clarification question ids that map 1:1 onto a personal field. Anything
// else (e.g. "current_role_title", which is about an experience entry) needs
// the AI to place the answer correctly.
const PERSONAL_QUESTION_IDS: Record<string, PersonalKey> = {
  full_name: "full_name",
  name: "full_name",
  title: "title",
  professional_title: "title",
  email: "email",
  email_address: "email",
  phone: "phone",
  phone_number: "phone",
  location: "location",
};

/**
 * Splits clarification answers into structured personal-field values (which
 * can be written straight into the CV) and free-text lines that need an AI
 * pass to be incorporated.
 */
export function splitClarificationAnswers(
  questions: ClarificationQuestion[],
  answers: Record<string, string>
): { personal: Partial<Record<PersonalKey, string>>; otherLines: string[] } {
  const personal: Partial<Record<PersonalKey, string>> = {};
  const otherLines: string[] = [];
  for (const q of questions) {
    const answer = answers[q.id]?.trim();
    if (!answer) continue;
    const key = PERSONAL_QUESTION_IDS[q.id];
    if (key) personal[key] = answer;
    else otherLines.push(`${q.question} ${answer}`);
  }
  return { personal, otherLines };
}

export interface RefineCvInput {
  cvDocumentId: string;
  /** The template chosen at the start of the flow — steers what the AI writes and asks. */
  templateId: string;
  sourceText: string;
  jobDescription?: string;
  name?: string;
  email?: string;
  /** Personal fields the user typed/confirmed — written directly, never via AI. */
  personal?: Partial<Record<PersonalKey, string>>;
  /** False when the only new information is `personal` — then no AI call is
   * made (and no free generation spent); the fields are patched in directly. */
  requiresRewrite: boolean;
  /** 0–1, writing intensity — e.g. the Tailor alignment slider or Enhance's boost intent. */
  enhancementLevel?: number;
  /** A short instruction for what to emphasize/rewrite toward (e.g. Enhance's
   * improvement-goal field) — sent as its own high-priority prompt block
   * instead of being folded into sourceText. */
  focusInstructions?: string;
  /** The flow — charges the CV here when it's a copy not charged yet. */
  flowType?: CvFlowType;
  /** Past the free CV / a Plus limit: carry on, pay for this CV at download. */
  payLater?: boolean;
}

async function applyPersonalFields(
  cvDocumentId: string,
  fields: Partial<Record<PersonalKey, string>>
): Promise<ApiCvDocument> {
  const current = await getCvDocument(cvDocumentId);
  const personal: PersonalFields = { ...(current.content.personal ?? {}) };
  for (const [key, value] of Object.entries(fields) as [PersonalKey, string | undefined][]) {
    if (value?.trim()) personal[key] = value.trim();
  }
  return updateCvContent(cvDocumentId, { content: { personal } });
}

// Step 2: after the missing-details questions. When the user only supplied personal
// details (name, email, phone, title...), those are written straight into the
// document — no AI call, no free generation spent. Otherwise it re-analyzes
// with everything folded into the source text and REPLACES the draft's
// content with the rewrite (a fill-only merge would discard the rewrite).
// `jobAnalysis` is left undefined on the no-AI path so callers keep whatever
// gaps they already showed.
export function useRefineCv() {
  return useMutation({
    mutationFn: async (input: RefineCvInput): Promise<ApiCvDocument | GenerateCvMismatch> => {
      const personal = {
        ...input.personal,
        ...(input.name?.trim() ? { full_name: input.name } : {}),
        ...(input.email?.trim() ? { email: input.email } : {}),
      };

      if (!input.requiresRewrite) {
        const document = await applyPersonalFields(input.cvDocumentId, personal);
        return { ...document, questions: [], jobAnalysis: undefined };
      }

      const analyzed = await analyzeCv({
        sourceText: input.sourceText,
        templateId: input.templateId,
        jobDescription: input.jobDescription,
        name: input.name?.trim() || undefined,
        email: input.email?.trim() || undefined,
        enhancementLevel: input.enhancementLevel,
        focusInstructions: input.focusInstructions,
        // This document already exists: free when it's already charged, and
        // charged now when it's a copy of a saved resume / profile.
        cvDocumentId: input.cvDocumentId,
        flowType: input.flowType,
        payLater: input.payLater,
      });
      if ("mismatch" in analyzed) return analyzed;

      const document = await generateCv(input.cvDocumentId, {
        analyzedContent: analyzed.candidateData,
        jobDescription: input.jobDescription,
        name: input.name?.trim() || undefined,
        enhancementLevel: input.enhancementLevel,
        replaceContent: true,
      });
      if ("mismatch" in document) return document;

      // The AI may still have left a personal field out; the user's own
      // answers are authoritative, so make sure they land.
      const final = Object.keys(personal).length
        ? await applyPersonalFields(input.cvDocumentId, personal)
        : document;

      return { ...final, questions: analyzed.questions, jobAnalysis: analyzed.jobAnalysis };
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

// ---- CV score panel (lib/cv-score) ----

export function useAnalyzeJobRequirements() {
  return useMutation({
    mutationFn: ({ cvId, jobDescription }: { cvId: string; jobDescription?: string }) => analyzeJobRequirements(cvId, jobDescription),
  });
}

export function useReviewCv() {
  return useMutation({
    mutationFn: ({ cvId, content }: { cvId: string; content?: CVContentDTO }) => reviewCv(cvId, content),
  });
}

export function usePolishCv() {
  return useMutation({
    mutationFn: ({ cvId, ...input }: { cvId: string } & Parameters<typeof polishCv>[1]) => polishCv(cvId, input),
  });
}
