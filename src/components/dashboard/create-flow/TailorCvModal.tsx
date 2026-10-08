"use client";

import React, { useRef, useState } from "react";
import {
  FolderOpen,
  FileSearch,
  FilePlus,
  UserCheck,
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
import { FlowModal, TemplateStep, JobGaps } from "./FlowUI";
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
import { ClarificationQuestion, CVContentDTO, updateCvContent } from "@/lib/api";
import { useDraftCvLifecycle } from "@/hooks/use-draft-cv-lifecycle";
import { useProGate } from "@/hooks/use-pro-gate";
import { useProfiles } from "@/hooks/use-profiles";
import { useSubscriptionStatus } from "@/hooks/use-subscription";
import { ProUpgradeModal } from "@/components/dashboard/ProUpgradeModal";
import { ProfileSyncStep } from "./ProfileSyncStep";
import { ProfilePicker } from "./ProfilePicker";
import { ConfirmedGap, GapReviewStep, gapsNotInContent, withAddedSkills } from "./GapReviewStep";

interface TailorCvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (cvData: CvData) => void;
  pastProjects?: PastProjectOption[];
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

export function TailorCvModal({
  isOpen,
  onClose,
  onComplete,
  pastProjects = [],
}: TailorCvModalProps) {
  const [step, setStep] = useState<TailorStep>("select-source");
  // The template is chosen right before the first AI call (the AI only writes
  // the sections it shows). What to run once it's picked, and where Back goes.
  const [templateNext, setTemplateNext] = useState<
    { kind: "existing"; sourceId: string } | { kind: "story" } | { kind: "upload"; file: File } | null
  >(null);
  const [templateBackStep, setTemplateBackStep] = useState<TailorStep>("select-source");

  // Source selection: 'profile' | 'past-project' | 'new-cv'
  const [sourceType, setSourceType] = useState<
    "profile" | "past-project" | "new-cv"
  >("profile");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    pastProjects[0]?.id || "draft-1"
  );

  // New CV / Scratch sub-flow states
  const [newCvMethod, setNewCvMethod] = useState<"scratch" | "upload">("scratch");
  const [freestyleStory, setFreestyleStory] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Job Description state
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // 0 to 10 Scroll / Slider
  const [alignmentLevel, setAlignmentLevel] = useState<number>(7);


  // Template selection state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(DEFAULT_TEMPLATE_ID);

  // Real backend integration now covers every source — "new-cv" via
  // analyze/upload, "profile"/"past-project" via pulling their real saved
  // content (see handlePrepareExistingSource). All downstream logic keys off
  // `cvDocumentId` actually being set, not the source type itself.
  const [cvDocumentId, setCvDocumentId] = useState<string | null>(null);
  const [latestContent, setLatestContent] = useState<CVContentDTO | undefined>(undefined);
  const [analyzedSourceText, setAnalyzedSourceText] = useState("");
  const [flowError, setFlowError] = useState<string | null>(null);
  // The profile / past resume currently being loaded from a click.
  const [loadingSourceId, setLoadingSourceId] = useState<string | null>(null);

  // AI clarification questions surfaced by /cv/analyze (the whole
  // missing-details form) and job-compatibility gaps surfaced after
  // tailoring — both shown only when non-empty.
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarificationQuestion[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  // Called before the early `if (!isOpen) return null` so hook order never changes.
  const questionPages = useQuestionPages(clarifyingQuestions, questionAnswers);
  const [jobGaps, setJobGaps] = useState<string[]>([]);
  // Gaps the user said they do have after seeing them — kept for any later
  // re-tailor too, since they're facts about the user, not about this job.
  const [confirmedGaps, setConfirmedGaps] = useState<ConfirmedGap[]>([]);

  // A CV document created mid-flow should never outlive an abandoned
  // session — only a completed flow keeps it (see markCompleted() below).
  const { markCompleted } = useDraftCvLifecycle(isOpen, cvDocumentId);

  const analyzeMutation = useAnalyzeFreestyle();
  const analyzeUploadMutation = useAnalyzeUpload();
  const analyzeExistingMutation = useAnalyzeExisting();
  const refineMutation = useRefineCv();
  const proGate = useProGate();
  // Career profiles are Pro-only; free users see the option with a Pro badge.
  const { data: careerProfiles = [] } = useProfiles();
  // The profile this CV is being tailored from, if any — facts go back to it.
  const [sourceProfileId, setSourceProfileId] = useState<string | null>(null);
  const isPro = useSubscriptionStatus().data?.isPro ?? false;

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
    setLoadingSourceId(sourceId);
    try {
      const { cvDocumentId: docId, sourceText, document } =
        await analyzeExistingMutation.mutateAsync(
          sourceType === "past-project"
            ? { sourceCvId: sourceId, templateId, flowType: "tailor" }
            : { sourceProfileId: sourceId, targetProfileId: sourceId, templateId, flowType: "tailor" }
        );
      if ("mismatch" in document) {
        setFlowError(document.reason);
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
      if (proGate.isProRequired(err)) return;
      setFlowError(err instanceof Error ? err.message : "Could not load that resume. Please try again.");
    } finally {
      setLoadingSourceId(null);
    }
  };

  // Handle real file upload — OCRs/extracts the file server-side, then runs
  // the extracted text through the AI parse (same as CreateCvModal's upload flow).
  const handleUploadFile = async (file: File, templateId: TemplateId = selectedTemplate) => {
    setFlowError(null);
    setUploadedFileName(file.name);
    setStep("new-cv-analyzing");
    setUploadProgress(15);

    const progressTimer = setInterval(() => {
      setUploadProgress((p) => (p < 90 ? p + 15 : p));
    }, 400);

    try {
      const { cvDocumentId: docId, sourceText, document } = await analyzeUploadMutation.mutateAsync({
        file,
        templateId,
        flowType: "tailor",
      });
      clearInterval(progressTimer);

      if ("mismatch" in document) {
        setFlowError(document.reason);
        setStep("new-cv-upload");
        return;
      }

      setUploadProgress(100);
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
      setStep("new-cv-missing");
    } catch (err) {
      clearInterval(progressTimer);
      if (proGate.isProRequired(err)) {
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

    try {
      const { cvDocumentId: docId, document } = await analyzeMutation.mutateAsync({
        sourceText: text,
        templateId,
        flowType: "tailor",
      });
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
      setEmail(personal.email ?? "");
      setPhone(personal.phone ?? "");
      setTargetRole(personal.title ?? "");
      setStep("new-cv-missing");
    } catch (err) {
      if (proGate.isProRequired(err)) return;
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

  // How closely to tailor: three plain choices on the AI's 0–10 alignment scale.
  const ALIGNMENT_OPTIONS = [
    { value: 3, label: "Stay close", hint: "Keeps your own wording; only light changes toward the job." },
    { value: 7, label: "Balanced", hint: "Your real achievements, in the job's language and keywords." },
    { value: 10, label: "Match closely", hint: "Rewrites hard around what this employer is looking for." },
  ];
  const alignmentHint = ALIGNMENT_OPTIONS.find((o) => o.value === alignmentLevel)?.hint;

  // Generate finalized tailored CV
  const buildTailoredCv = (): CvData => {
    const base = getBaseCv();
    let tailored: CvData = {
      ...base,
      id: `tailored-${Date.now()}`,
      title: `${targetRole || base.targetRole || "Resume"} (Tailored)`,
      targetRole: targetRole || base.targetRole,
      templateStyle: selectedTemplate,
      jobDescription,
      tailorAlignmentScore: alignmentLevel,
    };

    if (cvDocumentId && latestContent) {
      tailored = applyCvContent(tailored, latestContent);
    }

    return tailored;
  };

  const handleFinish = () => {
    setFlowError(null);
    const finalCv = cvDocumentId ? { ...buildTailoredCv(), id: cvDocumentId } : buildTailoredCv();
    if (cvDocumentId) markCompleted();
    onComplete(finalCv);
  };

  // Folds the job description, alignment slider, the answers to the AI's
  // questions and any gaps the user confirmed into the backend document via
  // the same refine endpoint CreateCvModal uses (enhancementLevel here comes
  // from the 0–10 alignment slider instead of a fixed default). Resolves to
  // the gaps still left, or null when it didn't go through.
  const runTailoring = async (gapsToAdd: ConfirmedGap[]): Promise<string[] | null> => {
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
        enhancementLevel: alignmentLevel / 10,
        focusInstructions: gapsToAdd.length
          ? "Work every requirement listed under \"Details the candidate confirmed\" into this CV where it belongs, " +
            "using only what the candidate wrote about it."
          : undefined,
      });
      if ("mismatch" in document) {
        setFlowError(document.reason);
        return null;
      }
      // Whatever the user ticked must end up in the CV: anything the AI
      // left out goes into the skills section.
      let content = document.content;
      const notInCv = gapsNotInContent(content, gapsToAdd);
      if (notInCv.length > 0) {
        content = (await updateCvContent(cvDocumentId, { content: withAddedSkills(content, notInCv) })).content;
      }
      setLatestContent(content);
      if (!targetRole && content.personal?.title) setTargetRole(content.personal.title);
      // The AI shouldn't list a confirmed gap again, but never show one if it does.
      const confirmed = new Set(gapsToAdd.map(({ gap }) => gap.toLowerCase()));
      const remaining = (document.jobAnalysis?.gaps ?? []).filter((gap) => !confirmed.has(gap.toLowerCase()));
      setJobGaps(remaining);
      return remaining;
    } catch (err) {
      if (proGate.isProRequired(err)) return null;
      setFlowError(err instanceof Error ? err.message : "Could not tailor your CV. Please try again.");
      return null;
    }
  };

  // "Tailor My CV". When the job asks for things the CV doesn't show, the
  // user gets a chance to add the ones they simply left out before the end.
  const handleContinueToTemplate = async () => {
    setFlowError(null);
    if (!cvDocumentId) {
      setStep("select-template");
      return;
    }
    const remaining = await runTailoring(confirmedGaps);
    if (remaining) setStep(remaining.length > 0 ? "review-gaps" : "select-template");
  };

  // "Add to my CV" on the gaps step — re-tailors with the confirmed gaps.
  const handleAddConfirmedGaps = async (added: ConfirmedGap[]) => {
    setFlowError(null);
    const all = [...confirmedGaps.filter((c) => !added.some((a) => a.gap === c.gap)), ...added];
    const remaining = await runTailoring(all);
    if (!remaining) return;
    setConfirmedGaps(all);
    setStep("select-template");
  };

  return (
    <FlowModal
      stepKey={step}
      wide={step === "choose-template"}
      onClose={onClose}
      outside={
        <ProUpgradeModal
          isOpen={proGate.isPaywallOpen}
          onClose={proGate.closePaywall}
          reason="You've already used your free Tailor generation. Upgrade to FitCV Pro for unlimited AI tailoring."
        />
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
                description="Upload one, or pick a resume you've made here."
                onClick={() => setStep("existing-cv-choice")}
              />
              <OptionCard
                icon={UserCheck}
                tone="violet"
                title="Start from a career profile"
                description={
                  isPro
                    ? "Tailor everything a role profile holds to this job."
                    : "A FitCV Pro feature: build from your saved role profiles."
                }
                onClick={() => {
                  if (!isPro) {
                    proGate.openPaywall();
                    return;
                  }
                  setSourceType("profile");
                  setSourceProfileId(null);
                  setStep("pick-source-item");
                }}
              />
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
                {sourceType === "profile" ? "Choose a career profile" : "Choose a resume"}
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
                title="Choose from your resumes"
                description={`Pick one you've already made (${pastProjects.length} available).`}
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

              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Need inspiration?</span>
                <button
                  type="button"
                  onClick={() =>
                    setFreestyleStory(
                      "Senior Cloud Architect with 7 years leading AWS & Kubernetes platforms at Stripe and Vercel. Cut cloud spend by $320K, managed 12M daily requests with Go & Terraform, UC Berkeley CS graduate."
                    )
                  }
                  className="text-xs font-semibold text-neutral-900 hover:underline cursor-pointer"
                >
                  Insert Sample Story
                </button>
              </div>
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

        {/* ================= STEP 2B-5: UPLOAD SCANNING ANIMATION ================= */}
        {step === "new-cv-analyzing" && (
          <div className="py-8 text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-accent-mid to-accent border border-accent text-white flex items-center justify-center mx-auto animate-pulse">
              <FileSearch className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-950">
                Parsing Background &amp; Credentials
              </h3>
              <p className="text-sm text-neutral-500 mt-1">
                Extracting work history from {uploadedFileName || "document"}...
              </p>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden max-w-xs mx-auto">
              <div
                className="bg-accent h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

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

            {/* How closely to tailor */}
            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold text-neutral-900">How closely should we match it?</p>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1" role="radiogroup">
                {ALIGNMENT_OPTIONS.map((option) => {
                  const selected = alignmentLevel === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setAlignmentLevel(option.value)}
                      className={`cursor-pointer rounded-lg py-2 text-sm font-semibold transition-colors ${
                        selected ? "bg-white text-neutral-950 shadow-[0_1px_2px_rgba(15,17,21,0.08)] ring-1 ring-neutral-200" : "text-neutral-500 hover:text-neutral-800"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {alignmentHint && <p className="mt-2 text-xs text-neutral-500">{alignmentHint}</p>}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (sourceType === "new-cv") {
                    setStep("new-cv-missing");
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
        {/* Before the ready step: on Pro that step can save the CV to a profile straight away. */}
        {step === "review-gaps" && (
          <GapReviewStep
            gaps={jobGaps}
            onAdd={handleAddConfirmedGaps}
            onSkip={() => {
              setFlowError(null);
              setStep("select-template");
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
        {step === "select-template" && isPro && cvDocumentId && (
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
            onFinish={handleFinish}
            onProRequired={proGate.isProRequired}
          >
            <JobGaps gaps={jobGaps} />
          </ProfileSyncStep>
        )}

        {/* ================= STEP 5: READY (free plan) ================= */}
        {step === "select-template" && !(isPro && cvDocumentId) && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">Your tailored CV is ready</h2>
            </div>

            <JobGaps gaps={jobGaps} />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("jd-and-slider")}
                className="w-1/3 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="w-2/3 py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>Open in editor</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && (
              <p className="text-xs text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}
    </FlowModal>
  );
}
