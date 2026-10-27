"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  FolderOpen,
  FilePlus,
  User,
  FileText,
  Upload,
  ArrowRight,
} from "lucide-react";
import {
  CvData,
  PastProjectOption,
  TemplateId,
  DEFAULT_TEMPLATE_ID,
} from "./types";
import { AiWaitLoader, FlowModal, JobGaps, JobMismatchDialog, RunOnMount, TemplateStep, useAiDone, type AiWait } from "./FlowUI";
import { OptionCard } from "./OptionCard";
import { ResumePicker } from "./ResumePicker";
import {
  useAnalyzeFreestyle,
  useAnalyzeUpload,
  useAnalyzeExisting,
  useRefineCv,
  splitClarificationAnswers,
} from "@/hooks/use-cv-generation";
import { applyCvContent, createBlankCv } from "@/lib/cv-mapper";
import {
  ClarifyingQuestionsForm,
  getQuestionFormState,
  useQuestionPages,
} from "./ClarifyingQuestionsForm";
import { ClarificationQuestion, CVContentDTO, canUseCareerProfiles, updateCvContent, type GenerateCvMismatch } from "@/lib/api";
import { useDraftCvLifecycle } from "@/hooks/use-draft-cv-lifecycle";
import { useProGate } from "@/hooks/use-pro-gate";
import { useProfiles } from "@/hooks/use-profiles";
import { useAccountGate } from "@/components/account-gate/AccountGate";
import { useRestoredFlowDraft, useSaveFlowDraft } from "@/lib/flow-drafts";
import { useFlowStep, type FlowStepConfig } from "@/lib/flow-steps";
import { useSubscriptionStatus } from "@/hooks/use-subscription";
import { CareerProfilesPaywall, ProUpgradeModal } from "@/components/dashboard/ProUpgradeModal";
import { useBackgroundProfileSync } from "@/hooks/use-background-profile-sync";
import { ProfileSyncStep } from "./ProfileSyncStep";
import { useToast } from "@/components/Toaster";
import { takeHeroHandoff } from "@/lib/hero-handoff";
import { ProfilePicker, isProfileUsable } from "./ProfilePicker";
import { ConfirmedGap, GapOutcome, GapReviewStep, gapsNotInContent, withAddedSkills } from "./GapReviewStep";

interface TailorCvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (cvData: CvData) => void;
  pastProjects?: PastProjectOption[];
  /** A saved CV to tailor (from its card): the source step is skipped and its template kept. */
  initialSourceCvId?: string | null;
  initialTemplate?: TemplateId;
}

type TailorStep =
  | "choose-template"
  | "select-source"
  | "pick-source-item"
  | "existing-cv-choice"
  | "new-cv-freestyle"
  | "new-cv-missing"
  | "new-cv-upload"
  | "new-cv-analyzing"
  | "jd-and-slider"
  | "review-gaps"
  | "select-template";

type TemplateNext = { kind: "existing"; sourceId: string } | { kind: "story" } | { kind: "upload"; file: File };

// "Insert sample story" fills the story box: a shortcut for testing, so only in development.
const SHOW_SAMPLE_STORY = process.env.NODE_ENV === "development";
const SAMPLE_STORY =
  "Senior Cloud Architect with 7 years leading AWS & Kubernetes platforms at Stripe and Vercel. Cut cloud spend by $320K, managed 12M daily requests with Go & Terraform, UC Berkeley CS graduate.";

/** What's kept across a refresh: everything typed and chosen, and the AI's results so far (not a picked file). */
interface TailorDraft {
  step: TailorStep;
  templateNext: Exclude<TemplateNext, { kind: "upload" }> | null;
  templateBackStep: TailorStep;
  sourceType: "profile" | "past-project" | "new-cv";
  selectedProjectId: string;
  newCvMethod: "scratch" | "upload";
  freestyleStory: string;
  fullName: string;
  email: string;
  phone: string;
  uploadedFileName: string | null;
  targetRole: string;
  jobDescription: string;
  selectedTemplate: TemplateId;
  cvDocumentId: string | null;
  latestContent: CVContentDTO | undefined;
  analyzedSourceText: string;
  clarifyingQuestions: ClarificationQuestion[];
  questionAnswers: Record<string, string>;
  jobGaps: string[];
  confirmedGaps: ConfirmedGap[];
  sourceProfileId: string | null;
}

/** The steps in the URL, which need data to show, and which only last while the AI works. */
const TAILOR_STEPS: FlowStepConfig<TailorStep, TailorDraft> = {
  first: "select-source",
  slugs: {
    "select-source": "start",
    "existing-cv-choice": "existing",
    "pick-source-item": "pick",
    "new-cv-freestyle": "about-you",
    "new-cv-upload": "upload",
    "new-cv-analyzing": "reading",
    "choose-template": "template",
    "new-cv-missing": "details",
    "jd-and-slider": "job",
    "review-gaps": "gaps",
    "select-template": "finish",
  },
  transient: { "new-cv-analyzing": "new-cv-upload" },
  available: (step, d) => {
    switch (step) {
      case "choose-template":
        return Boolean(d?.templateNext);
      case "pick-source-item":
        return d?.sourceType === "profile" || d?.sourceType === "past-project";
      case "new-cv-missing":
      case "jd-and-slider":
      case "select-template":
        return Boolean(d?.cvDocumentId);
      case "review-gaps":
        return Boolean(d?.cvDocumentId && d.jobGaps.length);
      default:
        return true;
    }
  },
};

/** Where a restored flow reopens: a step mid-AI-wait goes back to the one it started from (a picked file isn't kept). */
function resumeStep(draft: TailorDraft): TailorStep {
  if (draft.step === "new-cv-analyzing") return "new-cv-upload";
  if (draft.step === "choose-template" && !draft.templateNext) return draft.templateBackStep;
  return draft.step;
}

export function TailorCvModal({
  isOpen,
  onClose,
  onComplete,
  pastProjects = [],
  initialSourceCvId = null,
  initialTemplate,
}: TailorCvModalProps) {
  // Progress kept across a refresh (or a trip to checkout): see useSaveFlowDraft below.
  const saved = useRestoredFlowDraft<TailorDraft>("tailor");
  // The step lives in the URL, so Back / Forward move between steps (see flow-steps).
  const [step, setStep, trackStepData] = useFlowStep<TailorStep, TailorDraft>(
    TAILOR_STEPS,
    saved ? { step: resumeStep(saved), data: saved } : null
  );
  // The template is chosen right before the first AI call (the AI only writes
  // the sections it shows). What to run once it's picked, and where Back goes.
  const [templateNext, setTemplateNext] = useState<TemplateNext | null>(saved?.templateNext ?? null);
  const [templateBackStep, setTemplateBackStep] = useState<TailorStep>(saved?.templateBackStep ?? "select-source");

  // Source selection: 'profile' | 'past-project' | 'new-cv'
  const [sourceType, setSourceType] = useState<
    "profile" | "past-project" | "new-cv"
  >(saved?.sourceType ?? (initialSourceCvId ? "past-project" : "profile"));
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    saved?.selectedProjectId ?? initialSourceCvId ?? (pastProjects[0]?.id || "draft-1")
  );

  // New CV / Scratch sub-flow states
  const [newCvMethod, setNewCvMethod] = useState<"scratch" | "upload">(saved?.newCvMethod ?? "scratch");
  const [freestyleStory, setFreestyleStory] = useState(saved?.freestyleStory ?? "");
  const [fullName, setFullName] = useState(saved?.fullName ?? "");
  const [email, setEmail] = useState(saved?.email ?? "");
  const [phone, setPhone] = useState(saved?.phone ?? "");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(saved?.uploadedFileName ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Job Description state
  const [targetRole, setTargetRole] = useState(saved?.targetRole ?? "");
  const [jobDescription, setJobDescription] = useState(saved?.jobDescription ?? "");


  // Template selection state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(saved?.selectedTemplate ?? initialTemplate ?? DEFAULT_TEMPLATE_ID);

  // Real backend integration now covers every source — "new-cv" via
  // analyze/upload, "profile"/"past-project" via pulling their real saved
  // content (see handlePrepareExistingSource). All downstream logic keys off
  // `cvDocumentId` actually being set, not the source type itself.
  const [cvDocumentId, setCvDocumentId] = useState<string | null>(saved?.cvDocumentId ?? null);
  const [latestContent, setLatestContent] = useState<CVContentDTO | undefined>(saved?.latestContent ?? undefined);
  const [analyzedSourceText, setAnalyzedSourceText] = useState(saved?.analyzedSourceText ?? "");
  const [flowError, setFlowError] = useState<string | null>(null);
  // The AI won't tailor to a job in another field — the user picks what to do next.
  const [mismatch, setMismatch] = useState<GenerateCvMismatch | null>(null);
  // The profile / past resume currently being loaded from a click.
  const [loadingSourceId, setLoadingSourceId] = useState<string | null>(null);

  // AI clarification questions surfaced by /cv/analyze (the whole
  // missing-details form) and job-compatibility gaps surfaced after
  // tailoring — both shown only when non-empty.
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarificationQuestion[]>(saved?.clarifyingQuestions ?? []);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>(saved?.questionAnswers ?? {});
  // Called before the early `if (!isOpen) return null` so hook order never changes.
  const questionPages = useQuestionPages(clarifyingQuestions, questionAnswers);
  const [jobGaps, setJobGaps] = useState<string[]>(saved?.jobGaps ?? []);
  // Gaps the user said they do have after seeing them — kept for any later
  // re-tailor too, since they're facts about the user, not about this job.
  const [confirmedGaps, setConfirmedGaps] = useState<ConfirmedGap[]>(saved?.confirmedGaps ?? []);

  // A CV document created mid-flow should never outlive an abandoned
  // session — only a completed flow keeps it (see markCompleted() below).
  const { markCompleted } = useDraftCvLifecycle(isOpen, cvDocumentId);

  const analyzeMutation = useAnalyzeFreestyle();
  const analyzeUploadMutation = useAnalyzeUpload();
  const analyzeExistingMutation = useAnalyzeExisting();
  const refineMutation = useRefineCv();
  const proGate = useProGate();
  // Signed out (the /try pages): only what needs no account, and an account before the AI.
  const { isGuest, requireAccount } = useAccountGate();
  // Career profiles come with Plus and Pro; free users see the option with a Pro badge.
  const { data: careerProfiles = [], isSuccess: profilesLoaded } = useProfiles();
  // Faded until there's a profile to build from (shown as available while they load).
  const hasUsableProfile = !profilesLoaded || careerProfiles.some(isProfileUsable);
  // The career-profile option on a free plan: what profiles do, and the upgrade.
  const [profilesPaywallOpen, setProfilesPaywallOpen] = useState(false);
  // Profile updates set to automatic: no last step, the profile is updated in the background.
  const backgroundSync = useBackgroundProfileSync();
  // The profile this CV is being tailored from, if any — facts go back to it.
  const [sourceProfileId, setSourceProfileId] = useState<string | null>(saved?.sourceProfileId ?? null);
  const subscriptionStatus = useSubscriptionStatus().data;
  const canUseProfiles = canUseCareerProfiles(subscriptionStatus);
  // The quick save after the AI pass (adding confirmed gaps) — Moxie stays up through it.
  const [finishingUp, setFinishingUp] = useState(false);
  const { done: aiDone, celebrate } = useAiDone();

  const draft: TailorDraft = {
    step, templateNext: templateNext?.kind === "upload" ? null : templateNext, templateBackStep, sourceType, selectedProjectId,
    newCvMethod, freestyleStory, fullName, email, phone, uploadedFileName, targetRole, jobDescription,
    selectedTemplate, cvDocumentId, latestContent, analyzedSourceText, clarifyingQuestions, questionAnswers, jobGaps,
    confirmedGaps, sourceProfileId,
  };
  // Back / Forward check the step they land on against this.
  useEffect(() => trackStepData(draft));
  useSaveFlowDraft<TailorDraft>("tailor", draft, step !== "select-source");

  const toast = useToast();

  if (!isOpen) return null;

  // Pulls the REAL content behind the selected career profile or past
  // project (never the fabricated skeleton) before moving to the JD step.
  // Tailoring "from a career profile" keeps the new CV attached to that same
  // profile — it's a new document for the same trajectory, not a detached one.
  // Runs the step that sends things to the AI, now that a template is chosen.
  const runAfterTemplate = (next: NonNullable<typeof templateNext>, templateId: TemplateId) => {
    if (next.kind === "existing") handlePrepareExistingSource(next.sourceId, templateId);
    else if (next.kind === "story") handleAnalyzeStory(templateId);
    else handleUploadFile(next.file, templateId);
  };

  const chooseTemplateThen = (next: NonNullable<typeof templateNext>, backStep: TailorStep) => {
    setFlowError(null);
    setTemplateNext(next);
    setTemplateBackStep(backStep);
    setStep("choose-template");
  };

  const handlePrepareExistingSource = async (sourceId: string, templateId: TemplateId = selectedTemplate) => {
    setFlowError(null);
    if (!(await requireAccount())) return;
    setLoadingSourceId(sourceId);
    try {
      const { cvDocumentId: docId, sourceText, document } =
        await analyzeExistingMutation.mutateAsync(
          sourceType === "past-project"
            ? { sourceCvId: sourceId, templateId, flowType: "tailor", payLater: proGate.payLater() }
            : { sourceProfileId: sourceId, targetProfileId: sourceId, templateId, flowType: "tailor", payLater: proGate.payLater() }
        );
      if ("mismatch" in document) {
        setMismatch(document);
        return;
      }
      setCvDocumentId(docId);
      setLatestContent(document.content);
      setAnalyzedSourceText(sourceText);
      setClarifyingQuestions(document.questions ?? []);
      setQuestionAnswers({});
      const personal = document.content?.personal ?? {};
      setFullName(personal.full_name || fullName);
      setEmail(personal.email || email);
      setPhone(personal.phone || phone);
      setTargetRole(personal.title || targetRole);
      setStep("jd-and-slider");
    } catch (err) {
      if (proGate.isProRequired(err, () => handlePrepareExistingSource(sourceId, templateId))) return;
      setFlowError(err instanceof Error ? err.message : "Could not load that resume. Please try again.");
    } finally {
      setLoadingSourceId(null);
    }
  };

  // Handle real file upload — OCRs/extracts the file server-side, then runs
  // the extracted text through the AI parse (same as CreateCvModal's upload flow).
  const handleUploadFile = async (file: File, templateId: TemplateId = selectedTemplate) => {
    setFlowError(null);
    // Signed out (the /try pages): an account first — nothing goes to the AI before one exists.
    if (!(await requireAccount())) return;
    setUploadedFileName(file.name);
    setStep("new-cv-analyzing");

    try {
      const { cvDocumentId: docId, sourceText, document } = await analyzeUploadMutation.mutateAsync({
        file,
        templateId,
        flowType: "tailor",
        payLater: proGate.payLater(),
      });

      if ("mismatch" in document) {
        setMismatch(document);
        setStep("new-cv-upload");
        return;
      }

      setCvDocumentId(docId);
      setLatestContent(document.content);
      setAnalyzedSourceText(sourceText);
      setClarifyingQuestions(document.questions ?? []);
      setQuestionAnswers({});
      const personal = document.content?.personal ?? {};
      setFullName(personal.full_name ?? "");
      setEmail(personal.email ?? "");
      setPhone(personal.phone ?? "");
      setTargetRole(personal.title ?? "");
      // Nothing to ask: go straight on to the job description.
      setStep(document.questions?.length ? "new-cv-missing" : "jd-and-slider");
    } catch (err) {
      if (proGate.isProRequired(err, () => handleUploadFile(file, templateId))) {
        setStep("new-cv-upload");
        return;
      }
      setFlowError(
        err instanceof Error ? err.message : "Could not read this file. Please try a different one."
      );
      setStep("new-cv-upload");
    }
  };

  // Handle freestyle story analysis — sends the story to the backend AI
  // parser and seeds the baseline-details form with what it actually found.
  const handleAnalyzeStory = async (templateId: TemplateId = selectedTemplate) => {
    setFlowError(null);
    const text = freestyleStory.trim();
    if (!text) {
      // Never analyze placeholder text — it would build a CV about someone
      // else and spend one of the user's free generations doing it.
      setFlowError("Tell us about your experience first. A few sentences is enough.");
      return;
    }

    // Signed out (the /try pages): an account first — nothing goes to the AI before one exists.
    if (!(await requireAccount())) return;

    try {
      const { cvDocumentId: docId, document } = await analyzeMutation.mutateAsync({
        sourceText: text,
        templateId,
        flowType: "tailor",
        payLater: proGate.payLater(),
      });
      if ("mismatch" in document) {
        setMismatch(document);
        return;
      }
      setCvDocumentId(docId);
      setLatestContent(document.content);
      setAnalyzedSourceText(text);
      setClarifyingQuestions(document.questions ?? []);
      setQuestionAnswers({});
      const personal = document.content?.personal ?? {};
      setFullName(personal.full_name ?? "");
      setEmail(personal.email ?? "");
      setPhone(personal.phone ?? "");
      setTargetRole(personal.title ?? "");
      // Nothing to ask: go straight on to the job description.
      setStep(document.questions?.length ? "new-cv-missing" : "jd-and-slider");
    } catch (err) {
      if (proGate.isProRequired(err, () => handleAnalyzeStory(templateId))) return;
      setFlowError(err instanceof Error ? err.message : "Could not analyze your story. Please try again.");
    }
  };

  // Derive the base CV from the chosen source. Anything the source doesn't
  // supply stays blank — never the sample person's details.
  const getBaseCv = (): CvData => {
    // A profile's content arrives through latestContent (see buildTailoredCv).
    if (sourceType === "past-project") {
      const found = pastProjects.find((p) => p.id === selectedProjectId);
      return found?.cvData || createBlankCv();
    }
    const blank = createBlankCv();
    return createBlankCv({
      title: targetRole ? `${targetRole} – Tailored` : "Tailored Resume",
      targetRole,
      personalInfo: { ...blank.personalInfo, fullName, email, phone },
    });
  };

  const { canSubmit: canSubmitAnswers } = getQuestionFormState(
    clarifyingQuestions,
    questionAnswers
  );

  // Generate finalized tailored CV
  // `content` is passed in when finishing straight after the AI pass, before its state update has landed.
  const buildTailoredCv = (content: CVContentDTO | undefined = latestContent): CvData => {
    const base = getBaseCv();
    const role = targetRole || content?.personal?.title || base.targetRole;
    let tailored: CvData = {
      ...base,
      id: `tailored-${Date.now()}`,
      title: `${role || "Resume"} (Tailored)`,
      targetRole: role,
      templateStyle: selectedTemplate,
      jobDescription,
    };

    if (cvDocumentId && content) {
      tailored = applyCvContent(tailored, content);
    }

    return tailored;
  };

  const handleFinish = (content: CVContentDTO | undefined = latestContent) => {
    setFlowError(null);
    const finalCv = cvDocumentId ? { ...buildTailoredCv(content), id: cvDocumentId } : buildTailoredCv(content);
    if (cvDocumentId) markCompleted();
    onComplete(finalCv);
  };

  // Done tailoring: straight into the editor — or, on Pro, first the offer to
  // save it to a career profile (the only end step with a real choice in it).
  // With profile updates set to automatic, that happens in the background instead.
  const toTheEnd = (content?: CVContentDTO) => {
    if (canUseProfiles && cvDocumentId && backgroundSync.autoSync === "always") {
      const fromProfile = sourceType === "profile" && sourceProfileId;
      const hasNewDetails = confirmedGaps.length > 0 || Object.values(questionAnswers).some((answer) => answer.trim());
      // A CV from a profile only gives back what the user added in this flow.
      if (!fromProfile || hasNewDetails) {
        backgroundSync.syncCv({
          cvDocumentId,
          factsOnly: true,
          sourceProfileId: fromProfile ? sourceProfileId : null,
          roleTitle: (targetRole || content?.personal?.title || latestContent?.personal?.title || "").trim(),
        });
      }
      handleFinish(content);
    } else if (canUseProfiles && cvDocumentId) setStep("select-template");
    else handleFinish(content);
  };

  // Folds the job description, the answers to the AI's questions and any
  // gaps the user confirmed into the backend document via the same refine
  // endpoint CreateCvModal uses. Resolves to
  // the gaps still left and the tailored content, or null when it didn't go through.
  // `retry` re-runs the step that called this, after "pay at download" on the paywall.
  const runTailoring = async (
    gapsToAdd: ConfirmedGap[],
    retry: () => void
  ): Promise<{ remaining: string[]; content: CVContentDTO } | null> => {
    if (!cvDocumentId) return null;

    const { personal, otherLines } = splitClarificationAnswers(clarifyingQuestions, questionAnswers);
    if (personal.title) setTargetRole(personal.title);
    const extraLines = [...otherLines, ...Object.entries(personal).map(([key, value]) => `${key}: ${value}`)];
    // Read by the "DETAILS THE CANDIDATE CONFIRMED" rule in the backend's
    // tailoring.rules.ts — keep the heading in sync with it.
    const gapBlock = gapsToAdd.length
      ? `Details the candidate confirmed after reviewing the job's requirements:\n${gapsToAdd
          .map(({ gap, detail }) => `- ${gap}: ${detail || "the candidate has this (no further detail given)"}`)
          .join("\n")}`
      : "";
    const augmentedText = [analyzedSourceText, extraLines.join("\n"), gapBlock].filter(Boolean).join("\n\n");

    try {
      const document = await refineMutation.mutateAsync({
        cvDocumentId,
        templateId: selectedTemplate,
        sourceText: augmentedText,
        jobDescription: jobDescription || undefined,
        name: personal.full_name || fullName || undefined,
        email: personal.email || email || undefined,
        personal,
        // Tailoring to the job description is the AI rewrite itself.
        requiresRewrite: true,
        // Writing strength only — how far to tailor to the job is fixed in the backend's tailoring rules.
        enhancementLevel: 0.7,
        focusInstructions: gapsToAdd.length
          ? "Work every requirement listed under \"Details the candidate confirmed\" into this CV where it belongs, " +
            "using only what the candidate wrote about it."
          : undefined,
        // A copied resume / profile is charged here, on its first AI pass.
        flowType: "tailor",
        payLater: proGate.payLater(),
      });
      if ("mismatch" in document) {
        setMismatch(document);
        return null;
      }
      // Whatever the user ticked must end up in the CV: anything the AI
      // left out goes into the skills section.
      let content = document.content;
      const notInCv = gapsNotInContent(content, gapsToAdd);
      if (notInCv.length > 0) {
        setFinishingUp(true);
        content = (
          await updateCvContent(cvDocumentId, { content: withAddedSkills(content, notInCv) }).finally(() =>
            setFinishingUp(false)
          )
        ).content;
      }
      setLatestContent(content);
      if (!targetRole && content.personal?.title) setTargetRole(content.personal.title);
      // The AI shouldn't list a confirmed gap again, but never show one if it does.
      const confirmed = new Set(gapsToAdd.map(({ gap }) => gap.toLowerCase()));
      const remaining = (document.jobAnalysis?.gaps ?? []).filter((gap) => !confirmed.has(gap.toLowerCase()));
      setJobGaps(remaining);
      return { remaining, content };
    } catch (err) {
      if (proGate.isProRequired(err, retry)) return null;
      setFlowError(err instanceof Error ? err.message : "Could not tailor your CV. Please try again.");
      return null;
    }
  };

  // "Tailor My CV". When the job asks for things the CV doesn't show, the
  // user gets a chance to add the ones they simply left out before the end.
  const handleContinueToTemplate = async () => {
    setFlowError(null);
    if (!cvDocumentId) {
      handleFinish();
      return;
    }
    const result = await runTailoring(confirmedGaps, () => void handleContinueToTemplate());
    if (!result) return;
    // Gaps left to review means it isn't finished yet — save the ta-da for the end.
    if (result.remaining.length > 0) {
      setStep("review-gaps");
      return;
    }
    await celebrate("tailor");
    toTheEnd(result.content);
  };

  // "Add to my CV" on the gaps step — re-tailors with the confirmed gaps.
  const handleAddConfirmedGaps = async (added: ConfirmedGap[]) => {
    setFlowError(null);
    const all = [...confirmedGaps.filter((c) => !added.some((a) => a.gap === c.gap)), ...added];
    // What's left is what they saw and chose not to add. The re-tailoring's
    // own analysis can phrase gaps differently or raise new ones; those would
    // look like requirements they were never asked about, so they're not shown.
    const picked = new Set(added.map((a) => a.gap.toLowerCase()));
    const notPicked = jobGaps.filter((gap) => !picked.has(gap.toLowerCase()));
    const result = await runTailoring(all, () => void handleAddConfirmedGaps(added));
    if (!result) return;
    setConfirmedGaps(all);
    setJobGaps(notPicked);
    // Said here too: without Pro there's no profile step to show it, the flow goes straight to the editor.
    toast.success(`Added ${added.length === 1 ? "1 requirement" : `${added.length} requirements`} to your CV`, {
      id: "gaps-added",
      duration: 3500,
    });
    await celebrate("tailor");
    toTheEnd(result.content);
  };

  const aiWait: AiWait | null =
    aiDone ??
    (analyzeUploadMutation.isPending
      ? "read-file"
      : analyzeMutation.isPending
        ? "read-story"
        : analyzeExistingMutation.isPending
          ? "read-cv"
          : refineMutation.isPending || finishingUp
            ? "tailor"
            : null);

  return (
    <FlowModal
      stepKey={step}
      wide={step === "choose-template"}
      onClose={onClose}
      loader={aiWait && <AiWaitLoader wait={aiWait} done={aiDone !== null} fileName={uploadedFileName} />}
      outside={
        <>
          <ProUpgradeModal
            isOpen={proGate.isPaywallOpen}
            onClose={proGate.closePaywall}
            paywall={proGate.paywall}
            onPayLater={proGate.canPayLater() ? proGate.continuePayLater : undefined}
          />
          <CareerProfilesPaywall isOpen={profilesPaywallOpen} onClose={() => setProfilesPaywallOpen(false)} />
          <JobMismatchDialog
            mismatch={mismatch}
            onClose={() => setMismatch(null)}
            options={
              jobDescription.trim() && cvDocumentId
                ? [
                    {
                      label: "Try a different job",
                      onClick: () => {
                        setMismatch(null);
                        setJobDescription("");
                        setStep("jd-and-slider");
                      },
                    },
                    {
                      label: "Tailor a different CV",
                      onClick: () => {
                        setMismatch(null);
                        setStep("select-source");
                      },
                    },
                    {
                      label: "Open my CV without tailoring",
                      onClick: () => {
                        setMismatch(null);
                        handleFinish();
                      },
                    },
                  ]
                : []
            }
          />
        </>
      }
    >
        {/* ================= TEMPLATE (right before the first AI call) ================= */}
        {step === "choose-template" && (
          <div>
            <TemplateStep
              selectedId={selectedTemplate}
              onSelect={setSelectedTemplate}
              onContinue={(id) => templateNext && runAfterTemplate(templateNext, id)}
              onBack={() => setStep(templateBackStep)}
              busy={analyzeMutation.isPending || analyzeExistingMutation.isPending}
              error={flowError}
            />
          </div>
        )}

        {/* ================= STEP 1: SELECT SOURCE (3 Options) ================= */}
        {/* From the landing page's hero: the job is filled in, and a dropped CV goes on to the template step. */}
        {step === "select-source" && !initialSourceCvId && (
          <RunOnMount
            run={() => {
              const handoff = takeHeroHandoff();
              if (handoff?.jobDescription) setJobDescription(handoff.jobDescription);
              if (handoff?.file) {
                setSourceType("new-cv");
                setNewCvMethod("upload");
                chooseTemplateThen({ kind: "upload", file: handoff.file }, "new-cv-upload");
              }
            }}
          />
        )}
        {/* Opened from a CV's card: read that CV (with its own template), then straight to the job. */}
        {step === "select-source" && initialSourceCvId && !saved && !cvDocumentId && (
          <RunOnMount run={() => void handlePrepareExistingSource(initialSourceCvId, selectedTemplate)} />
        )}
        {step === "select-source" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Select Your Foundation
              </h2>
              <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                Choose the starting source you want the AI to tailor against the job description.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <OptionCard
                icon={FileText}
                tone="sky"
                title="Use an existing CV"
                description={isGuest ? "Upload a PDF, Word file or photo of your resume." : "Upload a file, or pick one of the resumes you've saved here."}
                onClick={() => {
                  // Nothing saved here yet to pick from: straight to the upload.
                  if (isGuest) {
                    setSourceType("new-cv");
                    setNewCvMethod("upload");
                    setStep("new-cv-upload");
                    return;
                  }
                  setStep("existing-cv-choice");
                }}
              />
              {!isGuest && (
                <OptionCard
                  icon={User}
                  tone="violet"
                  title="Start from a career profile"
                  state={!canUseProfiles ? "locked" : !hasUsableProfile ? "unavailable" : undefined}
                  description={
                    !canUseProfiles
                      ? "Tailor everything a role profile holds to this job."
                      : !hasUsableProfile
                        ? "You don't have a career profile with experience or skills yet."
                        : "Tailor everything a role profile holds to this job."
                  }
                  onClick={() => {
                    if (!canUseProfiles) {
                      setProfilesPaywallOpen(true);
                      return;
                    }
                    setSourceType("profile");
                    setSourceProfileId(null);
                    setStep("pick-source-item");
                  }}
                />
              )}
              <OptionCard
                icon={FilePlus}
                tone="accent"
                title="Create a new CV"
                description="Tell us about yourself and we'll write it for this job."
                onClick={() => {
                  setSourceType("new-cv");
                  setNewCvMethod("scratch");
                  setStep("new-cv-freestyle");
                }}
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2A: PICK SPECIFIC PROFILE OR PROJECT ================= */}
        {step === "pick-source-item" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                {sourceType === "profile" ? "Choose a career profile" : "Choose one of your saved resumes"}
              </h2>
            </div>

            <div className="mb-6">
              {sourceType === "profile" ? (
                <ProfilePicker
                  profiles={careerProfiles}
                  loadingId={loadingSourceId}
                  disabled={analyzeExistingMutation.isPending}
                  onManageProfiles={onClose}
                  onPick={(profile) => {
                    setSourceProfileId(profile.id);
                    chooseTemplateThen({ kind: "existing", sourceId: profile.id }, "pick-source-item");
                  }}
                />
              ) : (
                <ResumePicker
                  resumes={pastProjects}
                  loadingId={loadingSourceId}
                  disabled={analyzeExistingMutation.isPending}
                  onPick={(id) => {
                    setSelectedProjectId(id);
                    chooseTemplateThen({ kind: "existing", sourceId: id }, "pick-source-item");
                  }}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => setStep(sourceType === "past-project" ? "existing-cv-choice" : "select-source")}
              className="w-full py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
            >
              Back
            </button>
            {flowError && (
              <p className="text-xs text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP 2B-1: USE AN EXISTING CV (upload, or one made here) ================= */}
        {step === "existing-cv-choice" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">Use an Existing CV</h2>
            </div>

            <div className="space-y-3 mb-6">
              <OptionCard
                icon={Upload}
                tone="sky"
                title="Upload a CV"
                description="A PDF, Word file or photo of your resume."
                onClick={() => {
                  setSourceType("new-cv");
                  setNewCvMethod("upload");
                  setStep("new-cv-upload");
                }}
              />
              <OptionCard
                icon={FolderOpen}
                tone="emerald"
                title="Choose one of your saved resumes"
                state={pastProjects.length === 0 ? "unavailable" : undefined}
                description={
                  pastProjects.length === 0
                    ? "You haven't made any resumes here yet."
                    : `Pick a resume you've already made here (${pastProjects.length} saved).`
                }
                onClick={() => {
                  setSourceType("past-project");
                  setStep("pick-source-item");
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setStep("select-source")}
              className="w-full py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer text-center"
            >
              Back
            </button>
          </div>
        )}

        {/* ================= STEP 2B-3: FREESTYLE CAREER NARRATIVE ================= */}
        {step === "new-cv-freestyle" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Tell Us About Yourself
              </h2>
              <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                Type what you did, your top achievements, skills, and past companies.
              </p>
            </div>

            <div className="space-y-3 mb-5">
              <textarea
                rows={5}
                value={freestyleStory}
                onChange={(e) => setFreestyleStory(e.target.value)}
                placeholder="e.g. Senior Cloud Architect with 7 years leading AWS & Kubernetes platforms at Stripe and Vercel. Managed multi-region clusters for 12M+ daily requests with Go & Terraform..."
                className="w-full p-3.5 rounded-2xl bg-white border border-neutral-300 text-sm text-neutral-900 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 resize-none"
              />

              {SHOW_SAMPLE_STORY && (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setFreestyleStory(SAMPLE_STORY)}
                    className="text-xs font-semibold text-neutral-900 hover:underline cursor-pointer"
                  >
                    Insert sample story (dev)
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("select-source")}
                className="w-1/3 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={analyzeMutation.isPending}
                onClick={() => {
                  if (!freestyleStory.trim()) {
                    setFlowError("Tell us about your experience first. A few sentences is enough.");
                    return;
                  }
                  chooseTemplateThen({ kind: "story" }, "new-cv-freestyle");
                }}
                className="w-2/3 py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{analyzeMutation.isPending ? "Analyzing..." : "Analyze & Complete Details"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && (
              <p className="text-xs text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP 2B-4: UPLOAD CV ================= */}
        {step === "new-cv-upload" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Upload Old Resume
              </h2>
              <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                Upload your existing PDF or Word file to extract and tailor.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) chooseTemplateThen({ kind: "upload", file }, "new-cv-upload");
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 hover:border-neutral-950 rounded-2xl p-6 text-center transition-all cursor-pointer bg-neutral-50/50 mb-4"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center mx-auto mb-2.5">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-sm font-bold text-neutral-950">
                {uploadedFileName ? uploadedFileName : "Click or drop old resume here"}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Supports PDF, DOCX (up to 10MB)
              </p>
            </div>
            {flowError && (
              <p className="text-xs text-red-600 font-medium text-center mb-4">{flowError}</p>
            )}

            <button
              type="button"
              onClick={() => setStep("existing-cv-choice")}
              className="w-full py-2.5 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
            >
              Back
            </button>
          </div>
        )}

        {/* STEP 2B-5 ("new-cv-analyzing") has no content of its own: it only
            lasts while the upload is read, and the AI-wait loader covers that. */}

        {/* ================= STEP 2B-6: MISSING ESSENTIALS PROMPT ================= */}
        {/* Exact same missing details step as Create New CV Flow */}
        {step === "new-cv-missing" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Complete Missing Details
              </h2>
            </div>

            <div className="mb-6">
              <ClarifyingQuestionsForm
                questions={clarifyingQuestions}
                answers={questionAnswers}
                onAnswer={(id, value) => setQuestionAnswers((prev) => ({ ...prev, [id]: value }))}
                pages={questionPages}
                emptyMessage="We found everything we need from what you gave us."
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!questionPages.isFirstPage) questionPages.prev();
                  else if (newCvMethod === "scratch") setStep("new-cv-freestyle");
                  else setStep("new-cv-upload");
                }}
                className="w-1/3 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={questionPages.isLastPage ? !canSubmitAnswers : !questionPages.pageComplete}
                onClick={questionPages.isLastPage ? () => setStep("jd-and-slider") : questionPages.next}
                className="w-2/3 py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{questionPages.isLastPage ? "Add Job Description" : "Next"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: JOB DESCRIPTION & 0-10 SLIDER ================= */}
        {step === "jd-and-slider" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">Paste the job description</h2>
            </div>

            <textarea
              rows={7}
              autoFocus
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job posting, or a job title like Senior Accountant"
              className="w-full p-3 mb-5 rounded-xl bg-white border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 resize-none"
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (sourceType === "new-cv") {
                    if (clarifyingQuestions.length) setStep("new-cv-missing");
                    else if (newCvMethod === "scratch") setStep("new-cv-freestyle");
                    else setStep("new-cv-upload");
                  } else {
                    setStep("pick-source-item");
                  }
                }}
                className="w-1/3 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!jobDescription.trim() || refineMutation.isPending}
                onClick={handleContinueToTemplate}
                className="w-2/3 py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{refineMutation.isPending ? "Tailoring..." : "Tailor My CV"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && (
              <p className="text-xs text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP 4: GAPS → ADD WHAT THE USER LEFT OUT, OR CONTINUE AS IS ================= */}
        {/* Before the end: on Pro, the offer to save the CV to a profile; otherwise straight into the editor. */}
        {step === "review-gaps" && (
          <GapReviewStep
            gaps={jobGaps}
            onAdd={handleAddConfirmedGaps}
            onSkip={() => {
              setFlowError(null);
              toTheEnd();
            }}
            onBack={() => {
              setFlowError(null);
              setStep("jd-and-slider");
            }}
            busy={refineMutation.isPending}
            error={flowError}
          />
        )}

        {/* ================= STEP 5: READY → KEEP A PROFILE UP TO DATE ================= */}
        {step === "select-template" && canUseProfiles && cvDocumentId && backgroundSync.autoSync !== "always" && (
          <ProfileSyncStep
            key={cvDocumentId}
            cvDocumentId={cvDocumentId}
            roleTitle={(targetRole || latestContent?.personal?.title || "").trim()}
            sourceProfile={
              sourceType === "profile" && sourceProfileId
                ? (() => {
                    const p = careerProfiles.find((x) => x.id === sourceProfileId);
                    return p ? { id: p.id, title: p.title } : null;
                  })()
                : null
            }
            hasNewDetails={
              confirmedGaps.length > 0 || Object.values(questionAnswers).some((answer) => answer.trim())
            }
            // Tailored to a job: only facts go back, never the wording.
            tailored
            onFinish={() => handleFinish()}
            onProRequired={proGate.isProRequired}
          >
            <GapOutcome added={confirmedGaps.map((c) => c.gap)} />
            <JobGaps gaps={jobGaps} afterReview={confirmedGaps.length > 0} />
          </ProfileSyncStep>
        )}
    </FlowModal>
  );
}
