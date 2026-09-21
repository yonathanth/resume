"use client";

import React, { useRef, useState } from "react";
import {
  FileText,
  Upload,
  Sparkles,
  PenTool,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  FileCheck,
  Zap,
  ChevronRight,
  RotateCcw,
  LayoutTemplate,
  BookmarkPlus,
  UserCheck,
} from "lucide-react";
import {
  CvData,
  CareerProfile,
  defaultSampleCv,
  TEMPLATE_OPTIONS,
  TemplateId,
} from "./types";
import {
  useAnalyzeFreestyle,
  useAnalyzeUpload,
  useAnalyzeExisting,
  useRefineCv,
  useFinalizeCvProfile,
} from "@/hooks/use-cv-generation";
import { applyCvContent, createBlankCv } from "@/lib/cv-mapper";
import { ApiError, ClarificationQuestion, CVContentDTO, listCvDocuments } from "@/lib/api";
import { useDraftCvLifecycle } from "@/hooks/use-draft-cv-lifecycle";
import { useProGate } from "@/hooks/use-pro-gate";
import { ProUpgradeModal } from "@/components/dashboard/ProUpgradeModal";

// Quick-select starting points for "what should this CV focus on?" — a
// career profile can back many different CVs, so there's no default intent
// to assume; these just make it faster to express a common one.
const PROFILE_FOCUS_PRESETS = [
  "Tailor this CV for a specific job I'm applying to",
  "Emphasize leadership and cross-team impact",
  "Highlight my most recent and relevant experience",
  "Make it concise and modern for a fast-scanning recruiter",
  "Focus on technical depth and hands-on skills",
];

// Same idea for an uploaded CV — without direction, refining it just
// reformats the same content back with barely any real change.
const UPLOAD_FOCUS_PRESETS = [
  "Modernize the language and structure of this CV",
  "Tailor this CV for a specific job I'm applying to",
  "Quantify my achievements with real metrics wherever possible",
  "Make it more ATS-friendly and keyword-optimized",
  "Condense this down to a tighter, one-page resume",
];

interface CreateCvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (cvData: CvData) => void;
  startWithTemplate?: boolean;
  initialTemplate?: TemplateId;
  onSaveCareerProfile?: (profile: CareerProfile) => void;
  savedProfiles?: CareerProfile[];
  initialCareerProfile?: CareerProfile | null;
  initialStep?: Step;
}

type Step =
  | "select-template-first"
  | "select-method"
  | "select-career-profile"
  | "profile-instructions"
  | "scratch-choice"
  | "scratch-freestyle"
  | "scratch-missing"
  | "guided-source"
  | "upload-cv"
  | "upload-analyzing"
  | "upload-instructions"
  | "upload-missing"
  | "select-template"
  | "save-profile-prompt";

type GuidedSourceChoice = "attach" | "create" | "skip" | null;

export function CreateCvModal({
  isOpen,
  onClose,
  onComplete,
  startWithTemplate = false,
  initialTemplate,
  onSaveCareerProfile,
  savedProfiles,
  initialCareerProfile,
  initialStep,
}: CreateCvModalProps) {
  const [step, setStep] = useState<Step>(
    startWithTemplate ? "select-template-first" : "select-method"
  );

  const availableProfiles = savedProfiles ?? [];

  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    availableProfiles[0]?.id || ""
  );

  React.useEffect(() => {
    if (isOpen) {
      if (initialCareerProfile) {
        setSelectedMethod("profile");
        setSelectedProfileId(initialCareerProfile.id);
        setTargetRole(initialCareerProfile.roleTitle);
        if (initialCareerProfile.cvData?.personalInfo) {
          setFullName(initialCareerProfile.cvData.personalInfo.fullName);
          setEmail(initialCareerProfile.cvData.personalInfo.email);
          setPhone(initialCareerProfile.cvData.personalInfo.phone);
        }
        if (initialCareerProfile.highlight) {
          setMissingMetric(initialCareerProfile.highlight);
        }
        setStep("profile-instructions");
      } else if (startWithTemplate) {
        if (initialTemplate) {
          setSelectedTemplate(initialTemplate);
          setStep("select-method");
        } else {
          setStep("select-template-first");
        }
      } else {
        setStep("select-method");
      }

      if (initialTemplate) {
        setSelectedTemplate(initialTemplate);
      }
    }
  }, [
    isOpen,
    startWithTemplate,
    initialTemplate,
    initialCareerProfile,
    initialStep,
  ]);

  // Selection states
  const [selectedMethod, setSelectedMethod] = useState<
    "scratch" | "upload" | "profile"
  >("scratch");
  const [scratchType, setScratchType] = useState<"freestyle" | "guided">(
    "freestyle"
  );
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("tech");

  // Free style state — left blank until real data exists (typed, uploaded,
  // or picked from a saved profile); never seeded with sample text.
  const [freestyleText, setFreestyleText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [missingMetric, setMissingMetric] = useState("");

  // Optional Job Description state (as requested across all flows)
  const [optionalJd, setOptionalJd] = useState("");
  const [showJdInput, setShowJdInput] = useState(false);

  // "Start from career profile" — before generating, the user tells the AI
  // what this particular CV should focus on (mandatory: a profile can back
  // many different CVs, so there's no default intent to assume) and,
  // optionally, any new facts to fold in that aren't in the profile yet.
  const [flowFocusInstructions, setFlowFocusInstructions] = useState("");
  const [flowExtraDetails, setFlowExtraDetails] = useState("");

  // Upload state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real backend integration covers freestyle, upload, and "start from
  // career profile" — the "guided" (Filling Form) sub-flow has no actual
  // data-entry UI built yet, so there's nothing real to send the backend;
  // it stays local-only. Downstream logic keys off `cvDocumentId` actually
  // being set, not the method itself.
  const [cvDocumentId, setCvDocumentId] = useState<string | null>(null);
  const [latestContent, setLatestContent] = useState<CVContentDTO | undefined>(undefined);
  const [analyzedSourceText, setAnalyzedSourceText] = useState("");
  const [flowError, setFlowError] = useState<string | null>(null);

  // AI clarification questions surfaced by /cv/analyze (additive to the
  // fixed missing-details fields below) and any job-compatibility gaps
  // surfaced after refining — both optional, shown only when non-empty.
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarificationQuestion[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [jobGaps, setJobGaps] = useState<string[]>([]);
  const [showAttachProfile, setShowAttachProfile] = useState(false);

  // Naming confirmation shown right before a new career profile is created —
  // prefilled from targetRole but editable so the saved profile name doesn't
  // have to match the resume's job title field.
  const [isNameProfileModalOpen, setIsNameProfileModalOpen] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState("");

  // The guided (Filling Form) sub-flow's own source-of-truth choice, made
  // before the user ever sees the editor: attach an existing profile's
  // latest CV (real fetch, no AI), explicitly start a new profile, or skip
  // entirely. "create" and "skip" both leave the form genuinely blank —
  // they only differ in intent, not in what gets pre-filled.
  const [guidedSourceChoice, setGuidedSourceChoice] = useState<GuidedSourceChoice>(null);
  const [isFetchingGuidedSource, setIsFetchingGuidedSource] = useState(false);
  const [guidedSourceNotice, setGuidedSourceNotice] = useState<string | null>(null);
  // True only once a real fetch attempt has run for the profile currently
  // selected in this step — `selectedProfileId` alone isn't enough to gate
  // "Continue" because it defaults to the first available profile's id
  // before the user has clicked anything here.
  const [hasFetchedGuidedSource, setHasFetchedGuidedSource] = useState(false);

  // A CV document created mid-flow should never outlive an abandoned
  // session — only a completed flow keeps it (see markCompleted() below).
  const { markCompleted } = useDraftCvLifecycle(isOpen, cvDocumentId);

  const analyzeMutation = useAnalyzeFreestyle();
  const analyzeUploadMutation = useAnalyzeUpload();
  const analyzeExistingMutation = useAnalyzeExisting();
  const refineMutation = useRefineCv();
  const finalizeMutation = useFinalizeCvProfile();
  const proGate = useProGate();

  // Pulls the REAL content already saved under the chosen career profile (if
  // any) so continuing from a profile isn't just typed placeholder fields.
  // A brand-new profile with no CVs yet simply falls through to the existing
  // local-only behavior — this is a soft enhancement, not a hard requirement.
  const handlePrepareProfileSource = async (profileId: string = selectedProfileId) => {
    setFlowError(null);
    try {
      const { cvDocumentId: docId, document } = await analyzeExistingMutation.mutateAsync({
        sourceProfileId: profileId,
        targetProfileId: profileId,
        extraDetails: flowExtraDetails || undefined,
        focusInstructions: flowFocusInstructions || undefined,
        jobDescription: optionalJd || undefined,
      });
      if ("mismatch" in document) {
        setFlowError(document.reason);
        return;
      }
      setCvDocumentId(docId);
      setLatestContent(document.content);
      setClarifyingQuestions(document.questions ?? []);
      setQuestionAnswers({});
      const personal = document.content?.personal ?? {};
      setFullName(personal.full_name || fullName);
      setEmail(personal.email || email);
      setPhone(personal.phone || phone);
    } catch (err) {
      // Free generations exhausted — stop here instead of silently falling
      // through to "no existing content" (which would let the flow continue
      // as if nothing happened).
      if (proGate.isProRequired(err)) return;
      // Otherwise: no existing resume content under this profile yet —
      // proceed with whatever was typed manually; handleFinish falls back to
      // local-only.
    }
    setStep(startWithTemplate ? "save-profile-prompt" : "select-template");
  };

  // Guided flow's "Attach to Existing Profile" — a direct, non-AI fetch of
  // the profile's most recently updated CV document, dropped straight into
  // the editor as-is. Deliberately skips the AI re-analysis pipeline that
  // handlePrepareProfileSource uses (that's for the AI-driven "start from
  // career profile" method) since guided mode never calls the AI.
  const handleAttachGuidedProfile = async (profileId: string) => {
    setSelectedProfileId(profileId);
    setGuidedSourceChoice("attach");
    setGuidedSourceNotice(null);
    setHasFetchedGuidedSource(false);
    setIsFetchingGuidedSource(true);
    try {
      const docs = await listCvDocuments(profileId);
      const latest = docs[0];
      if (!latest) {
        setLatestContent(undefined);
        setGuidedSourceNotice("This profile doesn't have a saved resume yet — starting with a blank form.");
        return;
      }
      setLatestContent(latest.content);
      const personal = latest.content?.personal ?? {};
      setFullName(personal.full_name || fullName);
      setEmail(personal.email || email);
      setPhone(personal.phone || phone);
      setTargetRole(personal.title || targetRole);
    } catch (err) {
      setLatestContent(undefined);
      setGuidedSourceNotice(
        err instanceof ApiError
          ? `Couldn't load this profile's latest resume (${err.message}) — you can continue with a blank form.`
          : "Couldn't load this profile's latest resume — you can continue with a blank form."
      );
    } finally {
      setIsFetchingGuidedSource(false);
      setHasFetchedGuidedSource(true);
    }
  };

  // "Create Another Career Profile" and "Skip" both mean: don't pre-fill
  // from anything real — the editor opens on a genuinely blank form.
  const handleDeclineGuidedSource = (choice: "create" | "skip") => {
    setGuidedSourceChoice(choice);
    setGuidedSourceNotice(null);
    setLatestContent(undefined);
  };

  if (!isOpen) return null;

  // Handle Free Style Analysis — sends the raw story to the backend AI parser
  // and seeds the "missing essentials" form with only what it actually found.
  const handleAnalyzeStory = async () => {
    setFlowError(null);
    const text =
      freestyleText.trim() ||
      "I've been working as a Senior Cloud Architect for 7 years, specializing in AWS, Kubernetes, Terraform, and Go. Led distributed systems at Stripe and Vercel, managing multi-region clusters for 12M+ daily requests. Graduated from UC Berkeley in Computer Science.";
    setFreestyleText(text);

    try {
      const { cvDocumentId: docId, document } = await analyzeMutation.mutateAsync(text);
      if ("mismatch" in document) {
        setFlowError(document.reason);
        return;
      }
      setCvDocumentId(docId);
      setLatestContent(document.content);
      setAnalyzedSourceText(text);
      setClarifyingQuestions(document.questions ?? []);
      setQuestionAnswers({});
      const personal = document.content?.personal ?? {};
      setFullName(personal.full_name ?? "");
      setTargetRole(personal.title ?? "");
      setPhone(personal.phone ?? "");
      setMissingMetric("");
      setStep("scratch-missing");
    } catch (err) {
      if (proGate.isProRequired(err)) return;
      setFlowError(err instanceof ApiError ? err.message : "Could not analyze your story. Please try again.");
    }
  };

  // Upload flow equivalent: OCRs/extracts the file server-side, then runs
  // the extracted text through the same AI parse as the freestyle flow.
  const handleUploadFile = async (file: File) => {
    setFlowError(null);
    setUploadedFileName(file.name);
    setStep("upload-analyzing");
    setAnalysisProgress(15);

    const progressTimer = setInterval(() => {
      setAnalysisProgress((p) => (p < 90 ? p + 15 : p));
    }, 400);

    try {
      const { cvDocumentId: docId, sourceText, document } =
        await analyzeUploadMutation.mutateAsync(file);
      clearInterval(progressTimer);

      if ("mismatch" in document) {
        setFlowError(document.reason);
        setStep("upload-cv");
        return;
      }

      setAnalysisProgress(100);
      setCvDocumentId(docId);
      setLatestContent(document.content);
      setAnalyzedSourceText(sourceText);
      setClarifyingQuestions(document.questions ?? []);
      setQuestionAnswers({});
      const personal = document.content?.personal ?? {};
      setFullName(personal.full_name ?? "");
      setTargetRole(personal.title ?? "");
      setPhone(personal.phone ?? "");
      setMissingMetric("");
      setFlowFocusInstructions("");
      setFlowExtraDetails("");
      setStep("upload-instructions");
    } catch (err) {
      clearInterval(progressTimer);
      if (proGate.isProRequired(err)) {
        setStep("upload-cv");
        return;
      }
      setFlowError(
        err instanceof Error ? err.message : "Could not read this file. Please try a different one."
      );
      setStep("upload-cv");
    }
  };

  // Handle "Choose Template & Continue" from the missing-essentials form —
  // folds the now-mandatory fields back into the source text and re-runs
  // generation so the backend document reflects them (existing non-empty
  // fields are never overwritten, only gaps are filled).
  const handleContinueFromMissing = async () => {
    setFlowError(null);
    if (!cvDocumentId) {
      setStep(startWithTemplate ? "save-profile-prompt" : "select-template");
      return;
    }

    const extraLines = [
      `Target role: ${targetRole}`,
      phone.trim() && `Phone: ${phone}`,
      missingMetric.trim() && `Key recent achievement: ${missingMetric}`,
      flowExtraDetails.trim() && `Additional details to incorporate: ${flowExtraDetails.trim()}`,
      ...clarifyingQuestions
        .filter((q) => questionAnswers[q.id]?.trim())
        .map((q) => `${q.question} ${questionAnswers[q.id].trim()}`),
    ].filter(Boolean);
    const augmentedText = `${analyzedSourceText}\n\n${extraLines.join("\n")}`;

    try {
      const document = await refineMutation.mutateAsync({
        cvDocumentId,
        sourceText: augmentedText,
        jobDescription: optionalJd || undefined,
        name: fullName || undefined,
        focusInstructions: flowFocusInstructions || undefined,
      });
      if ("mismatch" in document) {
        setFlowError(document.reason);
        return;
      }
      setLatestContent(document.content);
      setJobGaps(document.jobAnalysis?.gaps ?? []);
      setStep(startWithTemplate ? "save-profile-prompt" : "select-template");
    } catch (err) {
      if (proGate.isProRequired(err)) return;
      setFlowError(err instanceof ApiError ? err.message : "Could not update your CV. Please try again.");
    }
  };

  // Renders any AI-surfaced clarification questions additively below the
  // fixed missing-details fields — only appears when the analyze step
  // actually flagged something it couldn't confidently infer.
  const renderClarifyingQuestions = () => {
    if (clarifyingQuestions.length === 0) return null;
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 space-y-3">
        <span className="text-[11px] font-bold text-violet-800 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          A few things the AI wants to confirm
        </span>
        {clarifyingQuestions.map((q) => (
          <div key={q.id}>
            <label className="block text-[11px] font-bold text-neutral-700 mb-1">
              {q.question}
              {!q.required && " (Optional)"}
            </label>
            {q.type === "textarea" ? (
              <textarea
                rows={2}
                value={questionAnswers[q.id] ?? ""}
                onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={q.reason}
                className="w-full p-2.5 rounded-lg border border-neutral-300 text-xs bg-white text-neutral-900"
              />
            ) : q.type === "select" && q.options?.length ? (
              <select
                value={questionAnswers[q.id] ?? ""}
                onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900"
              >
                <option value="">Select...</option>
                {q.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={q.type === "date" ? "date" : "text"}
                value={questionAnswers[q.id] ?? ""}
                onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={q.reason}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-xs text-neutral-900 focus:ring-2 focus:ring-neutral-900"
              />
            )}
          </div>
        ))}
      </div>
    );
  };

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
        fullName: fullName || "",
        email: email || "",
        phone: phone || "",
      },
    });

    if (content) {
      generatedCv = applyCvContent(generatedCv, content);
    }

    if (missingMetric && generatedCv.experiences[0]) {
      generatedCv.experiences[0].bullets.push(
        `Spearheaded cost and performance optimization: ${missingMetric}.`
      );
    }

    return generatedCv;
  };

  const saveNewProfile = (generatedCv: CvData, profileId: string, profileName?: string) => {
    if (!onSaveCareerProfile) return;
    // This only runs in the local-only fallback path (no real backend
    // document) — domain/targetCompanies are normally AI-derived from real
    // CV content (see getProfileSummary), so there's nothing real to put
    // here rather than a fabricated domain/company list.
    const newProfile: CareerProfile = {
      id: profileId,
      roleTitle: profileName || targetRole,
      domain: "",
      readinessScore: generatedCv.atsScore,
      targetCompanies: [],
      skills: generatedCv.skills.slice(0, 8),
      highlight: missingMetric || generatedCv.experiences[0]?.bullets[0] || "",
      cvData: generatedCv,
    };
    onSaveCareerProfile(newProfile);
  };

  // Handle Finish Flow and Launch Editor
  const handleFinish = async (
    action: "create" | "attach" | "none",
    existingProfileId?: string,
    profileName?: string
  ) => {
    setFlowError(null);
    const resolvedProfileName = (profileName || targetRole || defaultSampleCv.targetRole).trim();

    if (cvDocumentId) {
      try {
        const { profileId } = await finalizeMutation.mutateAsync({
          cvDocumentId,
          action,
          targetRole: resolvedProfileName,
          existingProfileId,
        });

        const generatedCv = { ...buildLocalCv(latestContent), id: cvDocumentId };
        if (action === "create" && profileId) saveNewProfile(generatedCv, profileId, resolvedProfileName);
        markCompleted();
        onComplete(generatedCv);
      } catch (err) {
        setFlowError(err instanceof ApiError ? err.message : "Something went wrong saving your CV");
      }
      return;
    }

    const generatedCv = buildLocalCv(latestContent);
    if (action === "create") saveNewProfile(generatedCv, `profile-${Date.now()}`, resolvedProfileName);
    onComplete(generatedCv);
  };

  const openNameProfileModal = () => {
    setProfileNameDraft((targetRole || defaultSampleCv.targetRole).trim());
    setIsNameProfileModalOpen(true);
  };

  const isFlowBusy = analyzeMutation.isPending || refineMutation.isPending || finalizeMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      {/* Mobbin-style Card Container */}
      <div className="w-full max-w-md bg-white rounded-[32px] border border-neutral-200/90 shadow-2xl p-7 sm:p-9 relative my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Centered Brand Icon */}
        <div className="w-11 h-11 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mx-auto mb-5 shadow-xs">
          <FileText className="w-5 h-5 stroke-[2.2]" />
        </div>

        {/* ================= STEP 1: SELECT METHOD ================= */}
        {step === "select-method" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
                Create New Resume
              </h2>
              <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                Choose how you would like to build your ATS-optimized CV.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {/* Option A: Start from Scratch */}
              <button
                type="button"
                onClick={() => setSelectedMethod("scratch")}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  selectedMethod === "scratch"
                    ? "bg-neutral-100/90 border-neutral-950 shadow-xs"
                    : "bg-neutral-50/70 border-neutral-200 hover:bg-neutral-100/60"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-950 shrink-0 mt-0.5">
                  <PenTool className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-neutral-950">
                    Start from scratch
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 leading-snug">
                    Type your career story or follow guided section prompts.
                  </div>
                </div>
              </button>

              {/* Option B: Upload Existing CV */}
              <button
                type="button"
                onClick={() => setSelectedMethod("upload")}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  selectedMethod === "upload"
                    ? "bg-neutral-100/90 border-neutral-950 shadow-xs"
                    : "bg-neutral-50/70 border-neutral-200 hover:bg-neutral-100/60"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-950 shrink-0 mt-0.5">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-neutral-950">
                    Upload old CV / resume
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 leading-snug">
                    Upload PDF/DOCX to parse, analyze, and boost your ATS score.
                  </div>
                </div>
              </button>

              {/* Option C: Start from Career Profile */}
              <button
                type="button"
                onClick={() => setSelectedMethod("profile")}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  selectedMethod === "profile"
                    ? "bg-neutral-100/90 border-neutral-950 shadow-xs"
                    : "bg-neutral-50/70 border-neutral-200 hover:bg-neutral-100/60"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-950 shrink-0 mt-0.5">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-neutral-950">
                    Start from career profile
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 leading-snug">
                    Load verified skills, metrics, and history from your master trajectory.
                  </div>
                </div>
              </button>
            </div>

            {/* Black Pill Continue Button */}
            <button
              type="button"
              onClick={() => {
                if (selectedMethod === "scratch") {
                  setStep("scratch-choice");
                } else if (selectedMethod === "upload") {
                  setStep("upload-cv");
                } else {
                  setStep("select-career-profile");
                }
              }}
              className="w-full py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md cursor-pointer"
            >
              Continue
            </button>
          </div>
        )}

        {/* ================= STEP: SELECT CAREER PROFILE ================= */}
        {step === "select-career-profile" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
                Select Career Profile
              </h2>
              <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                Choose a verified trajectory to populate your CV credentials.
              </p>
            </div>

            <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-1">
              {availableProfiles.map((p) => {
                const isSelected = selectedProfileId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProfileId(p.id);
                      setTargetRole(p.roleTitle);
                      if (p.cvData?.personalInfo) {
                        setFullName(p.cvData.personalInfo.fullName);
                        setEmail(p.cvData.personalInfo.email);
                        setPhone(p.cvData.personalInfo.phone);
                      }
                      if (p.highlight) {
                        setMissingMetric(p.highlight);
                      }
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                      isSelected
                        ? "bg-neutral-100/90 border-neutral-950 shadow-xs ring-1 ring-neutral-950"
                        : "bg-neutral-50/70 border-neutral-200 hover:bg-neutral-100/60"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-neutral-950 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-bold text-neutral-950 truncate">
                          {p.roleTitle}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          {p.readinessScore}% Match
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {p.domain}
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-1.5 line-clamp-2 italic">
                        &ldquo;{p.highlight}&rdquo;
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("select-method")}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!selectedProfileId}
                onClick={() => setStep("profile-instructions")}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && (
              <p className="text-[11px] text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP: PROFILE INSTRUCTIONS ================= */}
        {step === "profile-instructions" && (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[11px] font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Guides the AI Before Generating</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                What Should This CV Focus On?
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                This profile can back many different resumes — tell the AI what this one is for.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <span className="text-[11px] font-semibold text-neutral-500 block mb-1.5">
                  Quick starting points:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PROFILE_FOCUS_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFlowFocusInstructions(preset)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                        flowFocusInstructions === preset
                          ? "bg-neutral-950 border-neutral-950 text-white"
                          : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  What should this CV focus on? <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={flowFocusInstructions}
                  onChange={(e) => setFlowFocusInstructions(e.target.value)}
                  placeholder="e.g. Tailor this for a Staff Engineer role, leading with distributed systems experience"
                  className="w-full p-3 rounded-xl bg-neutral-100/90 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 border-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Anything new to add? (Optional)
                </label>
                <textarea
                  rows={2}
                  value={flowExtraDetails}
                  onChange={(e) => setFlowExtraDetails(e.target.value)}
                  placeholder="A recent role, project, certification, or achievement not yet in your profile..."
                  className="w-full p-3 rounded-xl bg-neutral-100/90 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 border-none resize-none"
                />
              </div>

              {/* Optional Job Description */}
              <div className="rounded-xl border border-neutral-200 p-3 bg-neutral-50/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700">
                    Target Job Description (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowJdInput(!showJdInput)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {showJdInput ? "Hide" : optionalJd ? "Edit JD" : "+ Add JD"}
                  </button>
                </div>
                {showJdInput && (
                  <textarea
                    rows={3}
                    value={optionalJd}
                    onChange={(e) => setOptionalJd(e.target.value)}
                    placeholder="Paste target job requirements if you want the CV tailored to a specific role..."
                    className="w-full mt-2 p-2.5 rounded-lg border border-neutral-300 text-xs bg-white text-neutral-900"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("select-career-profile")}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!flowFocusInstructions.trim() || analyzeExistingMutation.isPending}
                onClick={() => handlePrepareProfileSource()}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{analyzeExistingMutation.isPending ? "Generating..." : "Generate CV"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && (
              <p className="text-[11px] text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP 2A: SCRATCH CHOICE ================= */}
        {step === "scratch-choice" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
                Choose Creation Style
              </h2>
              <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                Describe your career narrative freely or use guided field prompts.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {/* Choice 1: Free Style */}
              <button
                type="button"
                onClick={() => setScratchType("freestyle")}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  scratchType === "freestyle"
                    ? "bg-neutral-100/90 border-neutral-950 shadow-xs"
                    : "bg-neutral-50/70 border-neutral-200 hover:bg-neutral-100/60"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-neutral-950">
                    Free Style
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 leading-snug">
                    Type your career journey as a description. AI drafts the CV and prompts for missing parts.
                  </div>
                </div>
              </button>

              {/* Choice 2: Guided Form */}
              <button
                type="button"
                onClick={() => setScratchType("guided")}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  scratchType === "guided"
                    ? "bg-neutral-100/90 border-neutral-950 shadow-xs"
                    : "bg-neutral-50/70 border-neutral-200 hover:bg-neutral-100/60"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-neutral-950">
                    Filling Form (Guided)
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 leading-snug">
                    Guided field-by-field form directly in the split-screen editor &amp; live preview.
                  </div>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("select-method")}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (scratchType === "freestyle") {
                    setStep("scratch-freestyle");
                  } else {
                    setStep("guided-source");
                  }
                }}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2A-G: GUIDED FORM SOURCE ================= */}
        {step === "guided-source" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
                Where Should This Start From?
              </h2>
              <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                Attach a saved career profile to pull in its latest real resume data, or start completely blank.
              </p>
            </div>

            <div className="space-y-3 mb-4">
              {availableProfiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setGuidedSourceChoice("attach")}
                  className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                    guidedSourceChoice === "attach"
                      ? "bg-neutral-100/90 border-neutral-950 shadow-xs"
                      : "bg-neutral-50/70 border-neutral-200 hover:bg-neutral-100/60"
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-neutral-950">
                      Attach to Existing Profile
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5 leading-snug">
                      Fetches the latest real resume saved under a career profile and fills the form with it.
                    </div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDeclineGuidedSource("create")}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  guidedSourceChoice === "create"
                    ? "bg-neutral-100/90 border-neutral-950 shadow-xs"
                    : "bg-neutral-50/70 border-neutral-200 hover:bg-neutral-100/60"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <PenTool className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-neutral-950">
                    Create Another Career Profile
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 leading-snug">
                    Start a brand-new trajectory. The form opens completely blank — you decide the name when saving.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDeclineGuidedSource("skip")}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  guidedSourceChoice === "skip"
                    ? "bg-neutral-100/90 border-neutral-950 shadow-xs"
                    : "bg-neutral-50/70 border-neutral-200 hover:bg-neutral-100/60"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ChevronRight className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-neutral-950">
                    Skip for Now
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 leading-snug">
                    Jump straight into a blank form — you can attach or save to a profile later.
                  </div>
                </div>
              </button>
            </div>

            {guidedSourceChoice === "attach" && (
              <div className="space-y-2 mb-4 max-h-[220px] overflow-y-auto pr-1">
                {availableProfiles.map((p) => {
                  // Gated on an actual fetch attempt (not just matching
                  // selectedProfileId's default value) so the first profile
                  // in the list doesn't render as pre-selected before the
                  // user has clicked anything here.
                  const isSelected =
                    selectedProfileId === p.id && (isFetchingGuidedSource || hasFetchedGuidedSource);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleAttachGuidedProfile(p.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-neutral-100/90 border-neutral-950 ring-1 ring-neutral-950"
                          : "bg-neutral-50/70 border-neutral-200 hover:bg-neutral-100/60"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-950 truncate">
                          {p.roleTitle}
                        </div>
                        <div className="text-[11px] text-neutral-500">{p.domain}</div>
                      </div>
                      {isSelected && isFetchingGuidedSource && (
                        <span className="text-[10px] font-semibold text-neutral-500 shrink-0">Loading...</span>
                      )}
                      {isSelected && !isFetchingGuidedSource && latestContent && (
                        <span className="text-[10px] font-bold text-emerald-700 shrink-0 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Loaded
                        </span>
                      )}
                    </div>
                  );
                })}
                {guidedSourceNotice && (
                  <p className="text-[11px] text-amber-700 font-medium mt-1">{guidedSourceNotice}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("scratch-choice")}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={
                  isFetchingGuidedSource ||
                  (guidedSourceChoice === "attach" && !hasFetchedGuidedSource)
                }
                onClick={() => setStep("select-template")}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2A-1: FREE STYLE TEXT INPUT ================= */}
        {step === "scratch-freestyle" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Describe Your Career
              </h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Type what you did, your top skills, companies, and achievements.
              </p>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <textarea
                  rows={5}
                  value={freestyleText}
                  onChange={(e) => setFreestyleText(e.target.value)}
                  placeholder="e.g. I have 6+ years as a Cloud & Distributed Systems Engineer. At Stripe, I managed Kubernetes clusters and reduced p99 latency by 44% with Go and Redis..."
                  className="w-full p-3.5 rounded-2xl bg-neutral-100/90 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 border-none resize-none"
                />
              </div>

              {/* Quick Prompt Pill */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">Need inspiration?</span>
                <button
                  type="button"
                  onClick={() =>
                    setFreestyleText(
                      "Senior Cloud Architect with 7 years leading AWS & Kubernetes platforms at Stripe and Vercel. Cut cloud spend by $320K, managed 12M daily requests with Go & Terraform, UC Berkeley CS graduate."
                    )
                  }
                  className="text-[11px] font-semibold text-neutral-900 hover:underline cursor-pointer"
                >
                  Insert Sample Story
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("scratch-choice")}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={analyzeMutation.isPending}
                onClick={handleAnalyzeStory}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{analyzeMutation.isPending ? "Analyzing..." : "Analyze & Continue"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && (
              <p className="text-[11px] text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP 2A-2: FREE STYLE MISSING DETAILS PROMPT ================= */}
        {step === "scratch-missing" && (
          <div>
            <div className="text-center mb-5">
              {(() => {
                const missingEssentialsCount = [!fullName, !targetRole, !phone].filter(Boolean).length;
                if (missingEssentialsCount === 0) {
                  return (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold mb-2">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>All Essentials Found</span>
                    </div>
                  );
                }
                return (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold mb-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>
                      {missingEssentialsCount} Missing Essential{missingEssentialsCount === 1 ? "" : "s"} Detected
                    </span>
                  </div>
                );
              })()}
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Complete Missing Details
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Our parser structured your story. Add these final details for maximum ATS scores:
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 text-xs text-neutral-900 border-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Target Job Title
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Cloud Architect"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 text-xs text-neutral-900 border-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Phone Number (For Recruiter Calls)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 text-xs text-neutral-900 border-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Key Metric for Recent Role (Google XYZ) (Optional)
                </label>
                <input
                  type="text"
                  value={missingMetric}
                  onChange={(e) => setMissingMetric(e.target.value)}
                  placeholder="e.g. Reduced p99 latency by 44% and saved $320K/yr"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 text-xs text-neutral-900 border-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              {renderClarifyingQuestions()}

              {/* Optional Job Description */}
              <div className="rounded-xl border border-neutral-200 p-3 bg-neutral-50/60 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700">
                    Target Job Description (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowJdInput(!showJdInput)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {showJdInput ? "Hide" : optionalJd ? "Edit JD" : "+ Add JD"}
                  </button>
                </div>
                {showJdInput && (
                  <textarea
                    rows={3}
                    value={optionalJd}
                    onChange={(e) => setOptionalJd(e.target.value)}
                    placeholder="Paste target job requirements if you want the CV tailored to a specific role..."
                    className="w-full mt-2 p-2.5 rounded-lg border border-neutral-300 text-xs bg-white text-neutral-900"
                  />
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={!fullName.trim() || !targetRole.trim() || !phone.trim() || refineMutation.isPending}
              onClick={handleContinueFromMissing}
              className="w-full py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {refineMutation.isPending
                  ? "Saving..."
                  : startWithTemplate
                    ? "Continue & Save"
                    : "Choose Template & Continue"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {flowError && (
              <p className="text-[11px] text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP 2B: UPLOAD CV ================= */}
        {step === "upload-cv" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
                Upload Old Resume
              </h2>
              <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                Upload your existing PDF or Word file to extract and optimize.
              </p>
            </div>

            {/* Drop Zone */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) handleUploadFile(file);
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 hover:border-neutral-950 rounded-2xl p-6 text-center transition-all cursor-pointer bg-neutral-50/50 hover:bg-neutral-100/50 mb-4"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center mx-auto mb-2.5">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-neutral-950">
                Click to browse or drop resume here
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Supports PDF, DOCX, TXT (up to 10MB)
              </p>
            </div>
            {flowError && (
              <p className="text-[11px] text-red-600 font-medium text-center mb-4">{flowError}</p>
            )}

            <button
              type="button"
              onClick={() => setStep("select-method")}
              className="w-full py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Back
            </button>
          </div>
        )}

        {/* ================= STEP 2B-1: UPLOAD ANALYZING SCANNER ================= */}
        {step === "upload-analyzing" && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-neutral-950">
              Analyzing Resume
            </h2>
            <p className="text-xs text-neutral-500 mt-1 mb-6">
              Parsing {uploadedFileName || "resume"} against ATS compliance standards...
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden mb-4">
              <div
                className="bg-neutral-950 h-full transition-all duration-300 rounded-full"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>

            <div className="space-y-2 text-left text-xs text-neutral-600 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Extracted Work Experience &amp; Roles</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Extracted Education &amp; Verified Degrees</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-neutral-950 border-t-transparent animate-spin shrink-0" />
                <span className="font-medium text-neutral-950">
                  Calculating ATS Keyword Density...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2B-1B: UPLOAD INSTRUCTIONS ================= */}
        {step === "upload-instructions" && (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[11px] font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Guides the AI Before Generating</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                What Should the AI Do With This CV?
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Without direction, we&apos;d just hand your resume back to you — tell us what to actually change.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <span className="text-[11px] font-semibold text-neutral-500 block mb-1.5">
                  Quick starting points:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {UPLOAD_FOCUS_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFlowFocusInstructions(preset)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                        flowFocusInstructions === preset
                          ? "bg-neutral-950 border-neutral-950 text-white"
                          : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  What should the AI do with this CV? <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={flowFocusInstructions}
                  onChange={(e) => setFlowFocusInstructions(e.target.value)}
                  placeholder="e.g. Rewrite this to target a Senior Product Manager role, emphasizing cross-functional leadership"
                  className="w-full p-3 rounded-xl bg-neutral-100/90 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 border-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Anything new to add? (Optional)
                </label>
                <textarea
                  rows={2}
                  value={flowExtraDetails}
                  onChange={(e) => setFlowExtraDetails(e.target.value)}
                  placeholder="A recent role, project, certification, or achievement not on this resume yet..."
                  className="w-full p-3 rounded-xl bg-neutral-100/90 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 border-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("upload-cv")}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!flowFocusInstructions.trim()}
                onClick={() => setStep("upload-missing")}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2B-2: UPLOAD MISSING DETAILS PROMPT ================= */}
        {step === "upload-missing" && (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Parsed Successfully • Baseline ATS: 78%</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Boost Score to 98%
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                We discovered a few missing details that will elevate your resume parser match:
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 text-xs text-neutral-900 border-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Target Role
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 text-xs text-neutral-900 border-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Add Missing Metric (Google XYZ) (Optional)
                </label>
                <input
                  type="text"
                  value={missingMetric}
                  onChange={(e) => setMissingMetric(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 text-xs text-neutral-900 border-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              {renderClarifyingQuestions()}

              {/* Optional Job Description */}
              <div className="rounded-xl border border-neutral-200 p-3 bg-neutral-50/60 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700">
                    Target Job Description (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowJdInput(!showJdInput)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {showJdInput ? "Hide" : optionalJd ? "Edit JD" : "+ Add JD"}
                  </button>
                </div>
                {showJdInput && (
                  <textarea
                    rows={3}
                    value={optionalJd}
                    onChange={(e) => setOptionalJd(e.target.value)}
                    placeholder="Paste target job requirements if you want the CV tailored to a specific role..."
                    className="w-full mt-2 p-2.5 rounded-lg border border-neutral-300 text-xs bg-white text-neutral-900"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("upload-instructions")}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!fullName.trim() || !targetRole.trim() || refineMutation.isPending}
                onClick={handleContinueFromMissing}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>
                  {refineMutation.isPending
                    ? "Saving..."
                    : startWithTemplate
                      ? "Continue & Save"
                      : "Choose Template & Continue"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && (
              <p className="text-[11px] text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP 0: SELECT TEMPLATE FIRST (When startWithTemplate is true) ================= */}
        {step === "select-template-first" && (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold mb-2">
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span>Start from Template</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Choose Design Archetype
              </h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Pick your preferred ATS design archetype before adding your career content.
              </p>
            </div>

            <div className="space-y-2.5 mb-6 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
              {TEMPLATE_OPTIONS.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-neutral-100 border-neutral-950 shadow-xs ring-1 ring-neutral-950"
                        : "bg-neutral-50/70 border-neutral-200 hover:bg-neutral-100/60"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-950">
                          {tmpl.name}
                        </span>
                        <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-md bg-neutral-200/80 text-neutral-700">
                          {tmpl.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                        {tmpl.fontFamily} • {tmpl.description}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {tmpl.atsScore}% ATS
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "border-neutral-950 bg-neutral-950 text-white"
                            : "border-neutral-300 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setStep("select-method")}
              className="w-full py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue with {TEMPLATE_OPTIONS.find(t => t.id === selectedTemplate)?.name || "Template"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ================= STEP 3: SELECT TEMPLATE (Shared across standard flows) ================= */}
        {step === "select-template" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Choose Resume Template
              </h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Select an ATS-engineered archetype tailored to your industry.
              </p>
            </div>

            {jobGaps.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 mb-4">
                <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Gaps vs. the job description
                </span>
                <ul className="text-[11px] text-amber-700 space-y-0.5 list-disc list-inside">
                  {jobGaps.map((gap, idx) => (
                    <li key={idx}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2.5 mb-6 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
              {TEMPLATE_OPTIONS.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-neutral-100 border-neutral-950 shadow-xs ring-1 ring-neutral-950"
                        : "bg-neutral-50/70 border-neutral-200 hover:bg-neutral-100/60"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-950">
                          {tmpl.name}
                        </span>
                        <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-md bg-neutral-200/80 text-neutral-700">
                          {tmpl.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                        {tmpl.fontFamily} • {tmpl.description}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {tmpl.atsScore}% ATS
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "border-neutral-950 bg-neutral-950 text-white"
                            : "border-neutral-300 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (selectedMethod === "profile") {
                    setStep("profile-instructions");
                  } else if (selectedMethod === "scratch") {
                    if (scratchType === "guided") {
                      setStep("guided-source");
                    } else {
                      setStep("scratch-missing");
                    }
                  } else {
                    setStep("upload-missing");
                  }
                }}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isFlowBusy}
                onClick={() => {
                  // The guided flow already answered "attach / create / skip"
                  // back in the guided-source step — don't ask again here,
                  // just carry that choice straight through to the editor.
                  if (selectedMethod === "scratch" && scratchType === "guided") {
                    if (guidedSourceChoice === "attach" && selectedProfileId) {
                      handleFinish("attach", selectedProfileId);
                    } else if (guidedSourceChoice === "create") {
                      handleFinish("create");
                    } else {
                      handleFinish("none");
                    }
                    return;
                  }
                  setStep("save-profile-prompt");
                }}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>
                  {selectedMethod === "scratch" && scratchType === "guided"
                    ? isFlowBusy
                      ? "Opening Editor..."
                      : "Open Editor"
                    : "Continue & Save"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: SAVE CAREER PROFILE PROMPT ================= */}
        {step === "save-profile-prompt" && (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2">
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save to Career Profiles</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Store as Reusable Career Profile?
              </h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Save this configuration to your career trajectories for future 1-click tailoring and job applications.
              </p>
            </div>

            {/* Profile Preview Card */}
            <div className="rounded-2xl border-2 border-dashed border-neutral-300 p-5 bg-neutral-50/70 mb-6 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Master Trajectory Preview
                  </span>
                  <h3 className="text-sm font-bold text-neutral-950 mt-0.5">
                    {targetRole || "Senior Cloud Architect"}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {fullName || "Alex Rivera"} • {selectedTemplate.toUpperCase()} Archetype
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  98% ATS
                </span>
              </div>

              <div>
                <span className="text-[10.5px] font-semibold text-neutral-500 block mb-1">
                  Core Skills:
                </span>
                <div className="flex flex-wrap gap-1">
                  {["AWS", "Kubernetes", "Go", "Terraform", "Distributed Systems"].map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-[10px] font-medium text-neutral-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {jobGaps.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 mb-4">
                <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Gaps vs. the job description
                </span>
                <ul className="text-[11px] text-amber-700 space-y-0.5 list-disc list-inside">
                  {jobGaps.map((gap, idx) => (
                    <li key={idx}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Save Error */}
            {flowError && (
              <p className="text-[11px] text-red-600 font-medium text-center mb-2">{flowError}</p>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={isFlowBusy}
                onClick={openNameProfileModal}
                className="w-full py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>
                  {finalizeMutation.isPending ? "Saving..." : "Save to Career Profiles & Open Studio"}
                </span>
              </button>

              {availableProfiles.length > 0 && !showAttachProfile && (
                <button
                  type="button"
                  disabled={isFlowBusy}
                  onClick={() => setShowAttachProfile(true)}
                  className="w-full py-2.5 rounded-2xl border border-neutral-200 text-neutral-600 font-semibold text-xs hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Attach to an Existing Profile
                </button>
              )}

              {showAttachProfile && (
                <div className="rounded-2xl border border-neutral-200 p-2.5 space-y-1.5 max-h-[160px] overflow-y-auto">
                  {availableProfiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isFlowBusy}
                      onClick={() => handleFinish("attach", p.id)}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {p.roleTitle}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={isFlowBusy}
                onClick={() => handleFinish("none")}
                className="w-full py-2.5 rounded-2xl border border-neutral-200 text-neutral-600 font-semibold text-xs hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {finalizeMutation.isPending ? "Saving..." : "Skip & Open Studio Directly"}
              </button>
            </div>
          </div>
        )}

        {/* Mobbin-style Privacy Footer */}
        <p className="text-[11px] text-neutral-400 text-center mt-5">
          We will never share your information with anyone else.
        </p>

        {/* Bottom subtle bar indicator (as seen in Mobbin reference screenshot) */}
        <div className="h-1 w-12 bg-neutral-950 rounded-full mx-auto mt-6" />
      </div>

      {/* ================= NAME CAREER PROFILE MODAL ================= */}
      {isNameProfileModalOpen && (
        <div className="fixed inset-0 z-[60] bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-[28px] border border-neutral-200/90 shadow-2xl p-7 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsNameProfileModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mb-4 shadow-xs">
              <BookmarkPlus className="w-4.5 h-4.5" />
            </div>

            <h3 className="text-lg font-bold tracking-tight text-neutral-950">
              Name This Career Profile
            </h3>
            <p className="text-xs text-neutral-500 mt-1 mb-4 leading-relaxed">
              We prefilled this from your target role — feel free to change it before saving.
            </p>

            <label className="block text-[11px] font-bold text-neutral-700 mb-1">
              Profile Name
            </label>
            <input
              type="text"
              autoFocus
              value={profileNameDraft}
              onChange={(e) => setProfileNameDraft(e.target.value)}
              placeholder="e.g. Senior Cloud Architect"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 text-xs text-neutral-900 border-none focus:ring-2 focus:ring-neutral-900"
            />

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsNameProfileModalOpen(false)}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!profileNameDraft.trim() || isFlowBusy}
                onClick={() => {
                  setIsNameProfileModalOpen(false);
                  handleFinish("create", undefined, profileNameDraft.trim());
                }}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{finalizeMutation.isPending ? "Saving..." : "Confirm & Save"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ProUpgradeModal isOpen={proGate.isPaywallOpen} onClose={proGate.closePaywall} />
    </div>
  );
}
