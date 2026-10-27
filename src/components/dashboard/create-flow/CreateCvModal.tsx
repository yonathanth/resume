"use client";

import React, { useEffect, useState } from "react";
import {
  PenTool,
  ArrowRight,
  X,
  User,
  Lightbulb,
  Check,
  Target,
  Loader2,
} from "lucide-react";
import {
  CvData,
  TemplateId,
  DEFAULT_TEMPLATE_ID,
} from "./types";
import { AiWaitLoader, FlowStepWithLoader, JobMismatchDialog, RunOnMount, TemplateStep, gapsNotice, useAiDone, type AiWait } from "./FlowUI";
import { OptionCard, SOFT_TONES } from "./OptionCard";
import {
  useAnalyzeFreestyle,
  useAnalyzeExisting,
  useRefineCv,
  splitClarificationAnswers,
} from "@/hooks/use-cv-generation";
import { applyCvContent, createBlankCv } from "@/lib/cv-mapper";
import { ApiError, ClarificationQuestion, CVContentDTO, canUseCareerProfiles, type GenerateCvMismatch } from "@/lib/api";
import { useToast } from "@/components/Toaster";
import {
  ClarifyingQuestionsForm,
  getQuestionFormState,
  useQuestionPages,
} from "./ClarifyingQuestionsForm";
import { useDraftCvLifecycle } from "@/hooks/use-draft-cv-lifecycle";
import { useMe } from "@/hooks/use-auth";
import { useProGate } from "@/hooks/use-pro-gate";
import { useProfiles } from "@/hooks/use-profiles";
import { useAccountGate } from "@/components/account-gate/AccountGate";
import { useRestoredFlowDraft, useSaveFlowDraft } from "@/lib/flow-drafts";
import { useFlowStep, type FlowStepConfig } from "@/lib/flow-steps";
import { ProfileSyncStep } from "./ProfileSyncStep";
import { ProfilePicker, isProfileUsable } from "./ProfilePicker";
import { useSubscriptionStatus } from "@/hooks/use-subscription";
import { CareerProfilesPaywall, ProUpgradeModal } from "@/components/dashboard/ProUpgradeModal";
import { useBackgroundProfileSync } from "@/hooks/use-background-profile-sync";

interface CreateCvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (cvData: CvData) => void;
  initialTemplate?: TemplateId;
  /** Open straight on "start from this career profile". */
  initialProfileId?: string | null;
}

type Step =
  | "select-template-first"
  | "select-method"
  | "select-career-profile"
  | "profile-extras"
  | "scratch-freestyle"
  | "scratch-missing"
  | "job-ask"
  | "job-target"
  | "save-profile-prompt";



const FREESTYLE_PLACEHOLDER =
  "I'm an accountant with 3 years at Awash Bank. I handled reconciliations for 40+ branch accounts and cut month-end closing from 6 days to 4. I have a BA in Accounting from Addis Ababa University (2021), I'm good with Excel, Peachtree and IFRS, and I speak Amharic and English. I want a senior accountant role.";

const FREESTYLE_GUIDE = [
  { title: "Your role", hint: "Your current or most recent job title, and the role you want next" },
  { title: "Each job", hint: "Company, title, dates (month/year), and what you did" },
  { title: "Results with numbers", hint: "E.g. \"served 50 clients a day\", \"cut costs by 15%\", \"led a team of 6\"" },
  { title: "Education", hint: "Degree, school, and graduation year" },
  { title: "Skills", hint: "Specific tools, software, languages, and certifications" },
  { title: "Anything else relevant", hint: "Projects, volunteering, awards" },
];

type TemplateNext = { kind: "freestyle" } | { kind: "profile" };

// "Insert sample story" fills the story box: a shortcut for testing, so only in development.
const SHOW_SAMPLE_STORY = process.env.NODE_ENV === "development";
const SAMPLE_STORY =
  "Senior Cloud Architect with 7 years leading AWS & Kubernetes platforms at Stripe and Vercel. Cut cloud spend by $320K, managed 12M daily requests with Go & Terraform, UC Berkeley CS graduate.";

/**
 * What's kept across a refresh: everything typed and chosen, and the AI's
 * results so far — and how the flow was opened, so the
 * dashboard reopens it the same way (from a template, a profile, or plain).
 */
export interface CreateDraft {
  openedWith: { template?: TemplateId; profileId?: string };
  step: Step;
  templateNext: TemplateNext | null;
  templateBackStep: Step;
  selectedProfileId: string;
  fromProfile: boolean;
  selectedTemplate: TemplateId;
  freestyleText: string;
  targetRole: string;
  fullName: string;
  email: string;
  phone: string;
  optionalJd: string;
  jobBackStep: Step;
  flowExtraDetails: string;
  cvDocumentId: string | null;
  latestContent: CVContentDTO | undefined;
  analyzedSourceText: string;
  analyzedInputs: { jd: string; extra: string };
  clarifyingQuestions: ClarificationQuestion[];
  questionAnswers: Record<string, string>;
  jobGaps: string[];
}

/** The steps in the URL, and which need data to show. `first` is the story for a guest (no career profiles to offer). */
const createSteps = (first: Step): FlowStepConfig<Step, CreateDraft> => ({
  first,
  slugs: {
    "select-method": "start",
    "select-career-profile": "profiles",
    "profile-extras": "profile-details",
    "scratch-freestyle": "about-you",
    "select-template-first": "template",
    "scratch-missing": "details",
    "job-ask": "job",
    "job-target": "job-post",
    "save-profile-prompt": "finish",
  },
  available: (step, d) => {
    switch (step) {
      case "select-template-first":
        return Boolean(d?.templateNext);
      case "profile-extras":
        return Boolean(d?.selectedProfileId);
      case "job-ask":
      case "job-target":
        // Asked before a profile's CV is generated, or after the AI wrote one.
        return Boolean(d?.cvDocumentId || d?.selectedProfileId);
      case "scratch-missing":
      case "save-profile-prompt":
        return Boolean(d?.cvDocumentId);
      default:
        return true;
    }
  },
});

/** Where a restored flow reopens. */
function resumeStep(draft: CreateDraft): Step {
  if (draft.step === "select-template-first" && !draft.templateNext) return draft.templateBackStep;
  return draft.step;
}

export function CreateCvModal({
  isOpen,
  onClose,
  onComplete,
  initialTemplate,
  initialProfileId,
}: CreateCvModalProps) {
  // Progress kept across a refresh (or a trip to checkout): see useSaveFlowDraft below.
  const saved = useRestoredFlowDraft<CreateDraft>("create");
  // Signed out (the /try pages): no career profiles, so the story is the first step (and an account before the AI).
  const { isGuest, requireAccount } = useAccountGate();
  const firstStep: Step = isGuest ? "scratch-freestyle" : "select-method";
  // Opened from a career profile: straight to choosing the template for it. (Each
  // opening mounts afresh, so this is just where it starts — unless it's restoring.)
  const fromProfileStart = !saved && initialProfileId ? initialProfileId : null;
  // The step lives in the URL, so Back / Forward move between steps (see flow-steps).
  const [step, setStep, trackStepData] = useFlowStep<Step, CreateDraft>(
    createSteps(firstStep),
    saved
      ? { step: resumeStep(saved), data: saved }
      : fromProfileStart
        ? { step: "select-template-first", data: { templateNext: { kind: "profile" } } as CreateDraft }
        : null
  );
  // The template is chosen right before the first AI call — the AI only
  // writes the sections it shows, follows its notes, and asks about what it
  // needs but can't find. These remember what to run once it's picked, and
  // where the template step's Back returns to. (Skipped when the flow was
  // opened with a template already chosen.)
  const [templateNext, setTemplateNext] = useState<TemplateNext | null>(
    saved?.templateNext ?? (fromProfileStart ? { kind: "profile" } : null)
  );
  const [templateBackStep, setTemplateBackStep] = useState<Step>(
    saved?.templateBackStep ?? (fromProfileStart ? "select-career-profile" : "select-method")
  );

  // Career profiles are Pro-only: free users see the option with a Pro
  // badge, and the end-of-flow "save to a profile" step is skipped for them.
  const { data: availableProfiles = [], isSuccess: profilesLoaded } = useProfiles();
  const canUseProfiles = canUseCareerProfiles(useSubscriptionStatus().data);
  // The career-profile option on a free plan: what profiles do, and the upgrade.
  const [profilesPaywallOpen, setProfilesPaywallOpen] = useState(false);
  // Profile updates set to automatic: no last step, the profile is updated in the background.
  const backgroundSync = useBackgroundProfileSync();

  const [selectedProfileId, setSelectedProfileId] = useState<string>(saved?.selectedProfileId ?? fromProfileStart ?? "");
  // True when this CV is being generated from a profile — it's already
  // linked to that profile, so there's no "save to a profile" step after.
  const [fromProfile, setFromProfile] = useState(saved?.fromProfile ?? Boolean(fromProfileStart));



  // Selection states
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(saved?.selectedTemplate ?? initialTemplate ?? DEFAULT_TEMPLATE_ID);

  // Free style state — left blank until real data exists (typed,
  // or picked from a saved profile); never seeded with sample text.
  const [freestyleText, setFreestyleText] = useState(saved?.freestyleText ?? "");
  const [targetRole, setTargetRole] = useState(saved?.targetRole ?? "");
  const [fullName, setFullName] = useState(saved?.fullName ?? "");
  const [email, setEmail] = useState(saved?.email ?? "");
  const [phone, setPhone] = useState(saved?.phone ?? "");

  // Optional Job Description state (as requested across all flows)
  const [optionalJd, setOptionalJd] = useState(saved?.optionalJd ?? "");
  // Where Back on the "Tailor to a job?" step returns to — the questions,
  // or the career-profile step when there was nothing to ask.
  const [jobBackStep, setJobBackStep] = useState<Step>(saved?.jobBackStep ?? "scratch-missing");
  const [showWritingGuide, setShowWritingGuide] = useState(false);

  // Facts the user adds in this flow that aren't in the profile yet
  // ("Anything else / anything new?"). They go into the CV, and a profile
  // can be offered them afterwards.
  const [flowExtraDetails, setFlowExtraDetails] = useState(saved?.flowExtraDetails ?? "");

  // The CV the AI writes, from the story or a career profile.
  const [cvDocumentId, setCvDocumentId] = useState<string | null>(saved?.cvDocumentId ?? null);
  const [latestContent, setLatestContent] = useState<CVContentDTO | undefined>(saved?.latestContent ?? undefined);
  const [analyzedSourceText, setAnalyzedSourceText] = useState(saved?.analyzedSourceText ?? "");
  const [flowError, setFlowError] = useState<string | null>(null);
  // The AI won't tailor to a job in another field — the user picks what to do next.
  const [mismatch, setMismatch] = useState<GenerateCvMismatch | null>(null);
  const toast = useToast();
  // What the first AI analysis already incorporated — refine only needs a
  // new AI call when the user added something beyond this (or beyond plain
  // personal details, which are written directly).
  const [analyzedInputs, setAnalyzedInputs] = useState(saved?.analyzedInputs ?? { jd: "", extra: "" });

  // AI clarification questions surfaced by /cv/analyze (additive to the
  // fixed missing-details fields below) and any job-compatibility gaps
  // surfaced after refining — both optional, shown only when non-empty.
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarificationQuestion[]>(saved?.clarifyingQuestions ?? []);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>(saved?.questionAnswers ?? {});
  // Called before the early `if (!isOpen) return null` so hook order never changes.
  const questionPages = useQuestionPages(clarifyingQuestions, questionAnswers);
  // The account's saved details (from onboarding / Account settings) fill any
  // contact field this flow didn't collect.
  const { data: me } = useMe();
  const [jobGaps, setJobGaps] = useState<string[]>(saved?.jobGaps ?? []);

  // A CV document created mid-flow should never outlive an abandoned
  // session — only a completed flow keeps it (see markCompleted() below).
  const { markCompleted } = useDraftCvLifecycle(isOpen, cvDocumentId);

  const analyzeMutation = useAnalyzeFreestyle();
  const analyzeExistingMutation = useAnalyzeExisting();
  const refineMutation = useRefineCv();
  const proGate = useProGate();
  const { done: aiDone, celebrate } = useAiDone();

  // Generates the CV from the chosen profile's own content (see
  // useAnalyzeExisting), linked to that profile. Runs once, after every
  // question is answered, so the new details and the job description go
  // into the same call. With neither, the profile is copied in without any
  // AI call at all.
  const generateFromProfile = async (jobDescription: string) => {
    setFlowError(null);
    if (!(await requireAccount())) return;
    try {
      const { cvDocumentId: docId, sourceText, document } = await analyzeExistingMutation.mutateAsync({
        templateId: selectedTemplate,
        sourceProfileId: selectedProfileId,
        targetProfileId: selectedProfileId,
        flowType: "create",
        extraDetails: flowExtraDetails || undefined,
        jobDescription: jobDescription || undefined,
        payLater: proGate.payLater(),
      });
      if ("mismatch" in document) {
        setMismatch(document);
        return;
      }
      setCvDocumentId(docId);
      setLatestContent(document.content);
      setAnalyzedSourceText(sourceText);
      setAnalyzedInputs({ jd: jobDescription.trim(), extra: flowExtraDetails.trim() });
      setClarifyingQuestions(document.questions ?? []);
      setQuestionAnswers({});
      const personal = document.content?.personal ?? {};
      setFullName(personal.full_name || fullName);
      setEmail(personal.email || email);
      setPhone(personal.phone || phone);
      setTargetRole(personal.title || targetRole);
      const gaps = document.jobAnalysis?.gaps ?? [];
      setJobGaps(gaps);
      if (document.questions?.length) {
        setStep("scratch-missing");
      } else {
        await celebrate(jobDescription.trim() ? "tailor" : "write");
        goToProfileStep(document.content, gaps, docId);
      }
    } catch (err) {
      if (proGate.isProRequired(err, () => generateFromProfile(jobDescription))) return;
      setFlowError(err instanceof Error ? err.message : "Could not build your CV from this profile. Please try again.");
    }
  };

  const draft: CreateDraft = {
    openedWith: { template: initialTemplate, profileId: initialProfileId ?? undefined },
    step, templateNext, templateBackStep, selectedProfileId,
    fromProfile, selectedTemplate, freestyleText, targetRole, fullName, email, phone, optionalJd, jobBackStep,
    flowExtraDetails, cvDocumentId, latestContent, analyzedSourceText, analyzedInputs,
    clarifyingQuestions, questionAnswers, jobGaps,
  };
  // Back / Forward check the step they land on against this.
  useEffect(() => trackStepData(draft));
  useSaveFlowDraft<CreateDraft>("create", draft, step !== firstStep);

  if (!isOpen) return null;

  // Handle Free Style Analysis — sends the raw story to the backend AI parser
  // and seeds the "missing essentials" form with only what it actually found.
  const handleAnalyzeStory = async (templateId: TemplateId = selectedTemplate) => {
    setFlowError(null);
    const text = freestyleText.trim();
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
        flowType: "create",
        payLater: proGate.payLater(),
      });
      if ("mismatch" in document) {
        setMismatch(document);
        return;
      }
      setCvDocumentId(docId);
      setLatestContent(document.content);
      setAnalyzedSourceText(text);
      setAnalyzedInputs({ jd: "", extra: "" });
      setClarifyingQuestions(document.questions ?? []);
      setQuestionAnswers({});
      const personal = document.content?.personal ?? {};
      setFullName(personal.full_name ?? "");
      setTargetRole(personal.title ?? "");
      setPhone(personal.phone ?? "");
      // Nothing to ask: go straight on to the job question.
      if (document.questions?.length) {
        setStep("scratch-missing");
      } else {
        setJobBackStep("scratch-freestyle");
        setStep("job-ask");
      }
    } catch (err) {
      if (proGate.isProRequired(err, () => handleAnalyzeStory(templateId))) return;
      setFlowError(err instanceof ApiError ? err.message : "Could not analyze your story. Please try again.");
    }
  };

  // Handle "Choose Template & Continue" from the missing-essentials form —
  // folds the now-mandatory fields back into the source text and re-runs
  // generation so the backend document reflects them (existing non-empty
  // fields are never overwritten, only gaps are filled).
  const handleContinueFromMissing = async (jobDescription: string = optionalJd): Promise<boolean> => {
    setFlowError(null);
    if (!cvDocumentId) {
      goToProfileStep(latestContent);
      return true;
    }

    const { personal, otherLines } = splitClarificationAnswers(clarifyingQuestions, questionAnswers);
    // Keep the flow's own copies in sync — the profile name and editor
    // header are derived from these.
    if (personal.full_name) setFullName(personal.full_name);
    if (personal.email) setEmail(personal.email);
    if (personal.phone) setPhone(personal.phone);
    if (personal.title) setTargetRole(personal.title);

    const extraLines = [
      flowExtraDetails.trim() && `Additional details to incorporate: ${flowExtraDetails.trim()}`,
      ...otherLines,
      ...Object.entries(personal).map(([key, value]) => `${key}: ${value}`),
    ].filter(Boolean);
    const augmentedText = `${analyzedSourceText}\n\n${extraLines.join("\n")}`;
    const requiresRewrite = Boolean(
      otherLines.length > 0 ||
        flowExtraDetails.trim() !== analyzedInputs.extra ||
        jobDescription.trim() !== analyzedInputs.jd
    );

    try {
      const document = await refineMutation.mutateAsync({
        cvDocumentId,
        templateId: selectedTemplate,
        sourceText: augmentedText,
        jobDescription: jobDescription || undefined,
        name: personal.full_name || fullName || undefined,
        email: personal.email || email || undefined,
        personal,
        requiresRewrite,
        flowType: "create",
        payLater: proGate.payLater(),
      });
      if ("mismatch" in document) {
        setMismatch(document);
        return false;
      }
      setLatestContent(document.content);
      const gaps = document.jobAnalysis !== undefined ? document.jobAnalysis?.gaps ?? [] : jobGaps;
      if (document.jobAnalysis !== undefined) setJobGaps(gaps);
      await celebrate(jobDescription.trim() ? "tailor" : "write");
      goToProfileStep(document.content, gaps);
      return true;
    } catch (err) {
      if (!proGate.isProRequired(err, () => void handleContinueFromMissing(jobDescription))) {
        setFlowError(err instanceof ApiError ? err.message : "Could not update your CV. Please try again.");
      }
      return false;
    }
  };

  // Anything the user told us in this flow beyond the source itself.
  const hasNewDetails =
    Boolean(flowExtraDetails.trim()) || Object.values(questionAnswers).some((answer) => answer.trim());

  // The last step: offer to keep a career profile up to date (see
  // ProfileSyncStep). Skipped for free users and for a CV made from a profile
  // with nothing new to add. What the job asks for that the CV doesn't show is
  // said in a notice, not a step of its own.
  const goToProfileStep = (content: CVContentDTO | undefined, gaps: string[] = [], docId: string | null = cvDocumentId) => {
    const gapsText = gapsNotice(gaps);
    if (gapsText) toast.info("Tailored to the job", { id: "job-gaps", description: gapsText, duration: 9000 });
    const nothingNew = !canUseProfiles || !docId || (fromProfile && !hasNewDetails);
    // Automatic updates: done in the background, with a short notice, and no step for it.
    const automatic = backgroundSync.autoSync === "always";
    if (!nothingNew && automatic && docId) {
      backgroundSync.syncCv({
        cvDocumentId: docId,
        factsOnly: fromProfile || Boolean(optionalJd.trim()),
        sourceProfileId: fromProfile ? selectedProfileId : null,
        roleTitle: (targetRole || content?.personal?.title || "").trim(),
      });
    }
    const nothingToOffer = nothingNew || automatic;
    if (nothingToOffer) {
      handleFinish(content, docId);
      return;
    }
    setStep("save-profile-prompt");
  };

  // Runs the step that sends things to the AI, now that a template is chosen.
  const runAfterTemplate = (next: NonNullable<typeof templateNext>, templateId: TemplateId) => {
    if (next.kind === "freestyle") handleAnalyzeStory(templateId);
    else setStep("profile-extras");
  };

  // Shows the template step before the first AI call (or goes straight on
  // when the flow was opened with a template already chosen).
  const chooseTemplateThen = (next: NonNullable<typeof templateNext>, backStep: Step) => {
    setFlowError(null);
    if (initialTemplate) {
      runAfterTemplate(next, selectedTemplate);
      return;
    }
    setTemplateNext(next);
    setTemplateBackStep(backStep);
    setStep("select-template-first");
  };

  const openJobPrompt = () => {
    setJobBackStep(step);
    setStep("job-ask");
  };

  // A profile CV is generated at the job step (nothing exists before it).
  const awaitingProfileGeneration = fromProfile && !cvDocumentId;

  const skipJobTailoring = () => {
    setOptionalJd("");
    if (awaitingProfileGeneration) generateFromProfile("");
    else handleContinueFromMissing("");
  };

  const submitJobDescription = () => {
    if (awaitingProfileGeneration) generateFromProfile(optionalJd);
    else handleContinueFromMissing();
  };

  const isFinishing = refineMutation.isPending || analyzeExistingMutation.isPending;

  const { canSubmit: canSubmitAnswers } = getQuestionFormState(
    clarifyingQuestions,
    questionAnswers
  );

  // The missing-details form is exactly the AI's clarification questions —
  // no fixed fields. When the AI found everything, there's nothing to ask.
  const renderClarifyingQuestions = () => (
    <ClarifyingQuestionsForm
      questions={clarifyingQuestions}
      answers={questionAnswers}
      onAnswer={(id, value) => setQuestionAnswers((prev) => ({ ...prev, [id]: value }))}
      pages={questionPages}
      emptyMessage="We found everything we need from what you gave us."
    />
  );

  // Base is always a genuinely blank skeleton, never defaultSampleCv's mock
  // "Alex Rivera" content — a field is only ever filled from something real:
  // what the user actually typed in this flow, or real fetched/AI-analyzed
  // `content`. A field neither source supplies stays empty rather than
  // silently falling back to fabricated sample data.
  const buildLocalCv = (content?: CVContentDTO): CvData => {
    let generatedCv: CvData = createBlankCv({
      targetRole: targetRole || "",
      title: targetRole ? `${targetRole} - Resume` : "Untitled Resume",
      templateStyle: selectedTemplate,
      jobDescription: optionalJd || undefined,
      personalInfo: {
        ...createBlankCv().personalInfo,
        fullName: fullName || [me?.firstName, me?.lastName].filter(Boolean).join(" ") || me?.fullName || "",
        email: email || me?.email || "",
        phone: phone || me?.phone || "",
        headline: me?.occupationTitle || "",
      },
    });

    if (content) {
      generatedCv = applyCvContent(generatedCv, content);
    }

    return generatedCv;
  };

  // Opens the finished CV in the editor. (Saving it to a career profile
  // happens before this, in ProfileSyncStep.)
  const handleFinish = async (content: CVContentDTO | undefined = latestContent, docId: string | null = cvDocumentId) => {
    setFlowError(null);
    // The guided form goes straight to the editor, which needs an account too.
    if (!(await requireAccount())) return;
    if (docId) {
      markCompleted();
      onComplete({ ...buildLocalCv(content), id: docId });
      return;
    }
    onComplete(buildLocalCv(content));
  };

  const tailoring = Boolean(optionalJd.trim());
  const aiWait: AiWait | null = aiDone ?? (analyzeMutation.isPending
      ? "read-story"
      : isFinishing
        ? tailoring
          ? "tailor"
          : "write"
        : null);

  const isTemplateStep = step === "select-template-first" && !aiWait;
  // Faded until there's a profile to build from (shown as available while they load).
  const hasUsableProfile = !profilesLoaded || availableProfiles.some(isProfileUsable);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-colors ${
        aiWait ? "bg-transparent" : "bg-neutral-950/60 backdrop-blur-sm"
      }`}
    >
      {/* Card: never taller than the viewport — its body scrolls instead of being cut off.
          It is a little wider for the template step (two previews per row) and compact for the rest.
          While Moxie is up (on her own over the screen), it steps aside but stays mounted. */}
      <div
        inert={Boolean(aiWait)}
        className={`relative w-full ${aiWait ? "invisible" : ""} ${
          isTemplateStep ? "max-w-xl" : "max-w-lg"
        } max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col bg-white rounded-xl border border-neutral-200/90 shadow-2xl overflow-hidden transition-[max-width] duration-300 animate-in fade-in zoom-in-95`}
      >
        {/* Close Button (stays put while the body scrolls) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-white/80 backdrop-blur text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex-1 min-h-0 overflow-y-auto p-7 sm:p-9">
        <FlowStepWithLoader
          stepKey={step}
          loader={
            aiWait && (
              <AiWaitLoader wait={aiWait} done={aiDone !== null} />
            )
          }
        >

        {/* ================= STEP 1: SELECT METHOD ================= */}
        {step === "select-method" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
                Create New Resume
              </h2>
              <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                Choose how you would like to build your ATS-optimized CV.
              </p>
            </div>

            <div className="space-y-3 mb-4">
              <OptionCard
                icon={PenTool}
                tone="accent"
                title="Start from scratch"
                description="Tell us about yourself and we'll write your CV. You can edit everything after."
                onClick={() => {
                  setFromProfile(false);
                  setStep("scratch-freestyle");
                }}
              />
              {!isGuest && (
                <OptionCard
                  icon={User}
                  tone="violet"
                  title="Start from career profile"
                  state={!canUseProfiles ? "locked" : !hasUsableProfile ? "unavailable" : undefined}
                  description={
                    !canUseProfiles
                      ? "Build from the experience and skills saved in a role profile."
                      : !hasUsableProfile
                        ? "You don't have a career profile with experience or skills yet."
                        : "Build from the experience and skills saved in one of your role profiles."
                  }
                  onClick={() => {
                    if (!canUseProfiles) {
                      setProfilesPaywallOpen(true);
                      return;
                    }
                    setStep("select-career-profile");
                  }}
                />
              )}
            </div>


          </div>
        )}

        {/* ================= STEP: SELECT CAREER PROFILE ================= */}
        {step === "select-career-profile" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
                Choose a Career Profile
              </h2>
              <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                Your CV is written from what the profile holds.
              </p>
            </div>

            <div className="mb-6">
              <ProfilePicker
                profiles={availableProfiles}
                onManageProfiles={onClose}
                onPick={(profile) => {
                  setSelectedProfileId(profile.id);
                  setTargetRole(profile.headline || profile.title);
                  setFromProfile(true);
                  setFlowExtraDetails("");
                  chooseTemplateThen({ kind: "profile" }, "select-career-profile");
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setStep("select-method")}
              className="w-full py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Back
            </button>
            {flowError && (
              <p className="text-xs text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP: ANYTHING NEW? (optional) ================= */}
        {/* The profile already holds the user's history — this only collects
            what happened since. */}
        {step === "profile-extras" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">Anything new since you last updated it?</h2>
              <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                We&apos;ll put it in this CV, and you can save it to your profile at the end.
              </p>
            </div>

            <textarea
              rows={5}
              autoFocus
              value={flowExtraDetails}
              onChange={(e) => setFlowExtraDetails(e.target.value)}
              placeholder="A new job, project, certification or achievement"
              className="w-full p-3 mb-6 rounded-xl bg-white border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 resize-none"
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setFlowExtraDetails("");
                  setJobBackStep("profile-extras");
                  setStep("job-ask");
                }}
                className="w-1/3 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Skip
              </button>
              <button
                type="button"
                disabled={!flowExtraDetails.trim()}
                onClick={() => {
                  setJobBackStep("profile-extras");
                  setStep("job-ask");
                }}
                className="w-2/3 py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2A-1: FREE STYLE TEXT INPUT ================= */}
        {step === "scratch-freestyle" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Tell Us About Yourself
              </h2>
              <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                Type what you did, your top skills, companies, and achievements.
              </p>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={() => setShowWritingGuide(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:border-accent-border hover:text-neutral-950 transition-colors cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-sky-600" />
                    What should I include?
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={freestyleText}
                  onChange={(e) => setFreestyleText(e.target.value)}
                  placeholder={FREESTYLE_PLACEHOLDER}
                  className="w-full p-3.5 rounded-2xl bg-white border border-neutral-300 text-sm sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 resize-none"
                />
              </div>

              {SHOW_SAMPLE_STORY && (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setFreestyleText(SAMPLE_STORY)}
                    className="text-xs font-semibold text-neutral-900 hover:underline cursor-pointer"
                  >
                    Insert sample story (dev)
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step !== firstStep && (
                <button
                  type="button"
                  onClick={() => setStep("select-method")}
                  className="w-1/3 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                disabled={analyzeMutation.isPending}
                onClick={() => {
                  if (!freestyleText.trim()) {
                    setFlowError("Tell us about your experience first. A few sentences is enough.");
                    return;
                  }
                  chooseTemplateThen({ kind: "freestyle" }, "scratch-freestyle");
                }}
                className="flex-1 py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{analyzeMutation.isPending ? "Analyzing..." : "Analyze & Continue"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && (
              <p className="text-xs text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP 2A-2: FREE STYLE MISSING DETAILS PROMPT ================= */}
        {step === "scratch-missing" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Complete Missing Details
              </h2>
            </div>

            <div className="space-y-3 mb-6">
              {renderClarifyingQuestions()}
            </div>

            <div className="flex items-center gap-3">
              {!questionPages.isFirstPage && (
                <button
                  type="button"
                  onClick={questionPages.prev}
                  className="w-1/3 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                disabled={
                  refineMutation.isPending || (questionPages.isLastPage ? !canSubmitAnswers : !questionPages.pageComplete)
                }
                onClick={
                  questionPages.isLastPage
                    ? fromProfile
                      ? () => handleContinueFromMissing(optionalJd)
                      : openJobPrompt
                    : questionPages.next
                }
                className="flex-1 py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>
                  {refineMutation.isPending
                    ? "Finishing your CV..."
                    : questionPages.isLastPage
                      ? fromProfile
                        ? "Finish"
                        : "Continue"
                      : "Next"}
                </span>
                {!refineMutation.isPending && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
            {flowError && (
              <p className="text-xs text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= TEMPLATE (right before the first AI call) ================= */}
        {step === "select-template-first" && (
          <div>
            <TemplateStep
              selectedId={selectedTemplate}
              onSelect={setSelectedTemplate}
              onContinue={(id) => templateNext && runAfterTemplate(templateNext, id)}
              onBack={() => setStep(templateBackStep)}
              busy={analyzeMutation.isPending}
              error={flowError}
            />
          </div>
        )}

        {/* ================= STEP 3A: TAILOR TO A JOB? (a single question) ================= */}
        {step === "job-ask" && (
          <div className="py-4 text-center">
            <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border ${SOFT_TONES.peach}`}>
              <Target className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-xl font-bold tracking-tight text-neutral-950">Tailor this CV to a job?</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
              CVs tailored to the job description match far more of what recruiters and screening software look for.
            </p>

            <div className="mx-auto mt-8 flex max-w-xs flex-col gap-2">
              <button
                type="button"
                disabled={isFinishing}
                onClick={() => {
                  setFlowError(null);
                  setStep("job-target");
                }}
                className="w-full cursor-pointer rounded-lg bg-neutral-950 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Paste a job description
              </button>
              <button
                type="button"
                disabled={isFinishing}
                onClick={skipJobTailoring}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed"
              >
                {isFinishing && <Loader2 className="h-4 w-4 animate-spin" />}
                {isFinishing ? (awaitingProfileGeneration ? "Writing your CV..." : "Finishing your CV...") : "Skip"}
              </button>
              <button
                type="button"
                disabled={isFinishing}
                onClick={() => setStep(jobBackStep)}
                className="mt-1 cursor-pointer py-1 text-xs font-semibold text-neutral-400 transition-colors hover:text-neutral-700 disabled:cursor-not-allowed"
              >
                Back
              </button>
            </div>
            {flowError && <p className="mt-3 text-xs font-medium text-red-600">{flowError}</p>}
          </div>
        )}

        {/* ================= STEP 3B: PASTE THE JOB ================= */}
        {/* The job description is applied in the same call that folds in the
            answers, so tailoring never costs an extra generation. */}
        {step === "job-target" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">Paste the job description</h2>
            </div>

            <textarea
              rows={8}
              autoFocus
              value={optionalJd}
              onChange={(e) => setOptionalJd(e.target.value)}
              placeholder="Paste the job posting, or a job title like Senior Accountant"
              className="w-full p-3 mb-6 rounded-xl bg-white border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 resize-none"
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isFinishing}
                onClick={() => setStep("job-ask")}
                className="w-1/3 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!optionalJd.trim() || isFinishing}
                onClick={submitJobDescription}
                className="w-2/3 py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isFinishing ? "Tailoring..." : "Tailor my CV"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && <p className="text-xs text-red-600 font-medium text-center mt-3">{flowError}</p>}
          </div>
        )}

        {/* ================= STEP 4: KEEP A CAREER PROFILE UP TO DATE ================= */}
        {step === "save-profile-prompt" &&
          (canUseProfiles && cvDocumentId && backgroundSync.autoSync !== "always" ? (
            <ProfileSyncStep
              key={cvDocumentId}
              cvDocumentId={cvDocumentId}
              roleTitle={(targetRole || latestContent?.personal?.title || "").trim()}
              sourceProfile={
                fromProfile
                  ? (() => {
                      const p = availableProfiles.find((x) => x.id === selectedProfileId);
                      return p ? { id: p.id, title: p.title } : null;
                    })()
                  : null
              }
              hasNewDetails={hasNewDetails}
              tailored={Boolean(optionalJd.trim())}
              onFinish={() => handleFinish()}
              onProRequired={proGate.isProRequired}
            />
          ) : (
            // Restored at the end with no profile offer: nothing left to ask, so on to the editor.
            <RunOnMount run={() => void handleFinish()} />
          ))}

        </FlowStepWithLoader>
        </div>
      </div>

      <JobMismatchDialog
        mismatch={mismatch}
        onClose={() => setMismatch(null)}
        options={
          optionalJd.trim()
            ? [
                {
                  label: "Try a different job",
                  onClick: () => {
                    setMismatch(null);
                    setOptionalJd("");
                    setStep("job-target");
                  },
                },
                {
                  label: "Make my CV without a job",
                  onClick: () => {
                    setMismatch(null);
                    skipJobTailoring();
                  },
                },
              ]
            : []
        }
      />

      {/* ================= WHAT TO INCLUDE MODAL ================= */}
      {showWritingGuide && (
        <div
          className="fixed inset-0 z-[60] bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowWritingGuide(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="writing-guide-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md sm:max-w-xl lg:max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-[28px] border border-neutral-200/90 shadow-2xl p-6 sm:p-8 relative text-center animate-in fade-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setShowWritingGuide(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-11 h-11 mx-auto rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mb-4">
              <Lightbulb className="w-4.5 h-4.5" />
            </div>

            <h3 id="writing-guide-title" className="text-lg font-bold tracking-tight text-neutral-950">
              What should I include?
            </h3>
            <p className="text-sm text-neutral-500 mt-1 mb-6 leading-relaxed">
              The more you include, the better your CV. Try to cover:
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FREESTYLE_GUIDE.map(({ title, hint }) => (
                <li
                  key={title}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50/60 px-4 py-4"
                >
                  <span className="w-6 h-6 rounded-full bg-accent-soft border border-accent-border flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-accent-strong" strokeWidth={2.5} />
                  </span>
                  <span className="text-sm font-semibold text-neutral-900">{title}</span>
                  <span className="text-xs text-neutral-500 leading-relaxed">{hint}</span>
                </li>
              ))}
            </ul>

            <p className="text-sm text-neutral-500 mt-6 max-w-lg mx-auto leading-relaxed">
              Don&rsquo;t worry about wording or order, and you can write in Amharic, English, or both. Just get the
              facts down; we&rsquo;ll handle the rest.
            </p>

            <button
              type="button"
              onClick={() => setShowWritingGuide(false)}
              className="w-full sm:w-auto sm:min-w-48 mt-6 px-8 py-3 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <ProUpgradeModal
        isOpen={proGate.isPaywallOpen}
        onClose={proGate.closePaywall}
        paywall={proGate.paywall}
        onPayLater={proGate.canPayLater() ? proGate.continuePayLater : undefined}
      />
      <CareerProfilesPaywall isOpen={profilesPaywallOpen} onClose={() => setProfilesPaywallOpen(false)} />
    </div>
  );
}
