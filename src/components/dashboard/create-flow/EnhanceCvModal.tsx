"use client";

import React, { useRef, useState } from "react";
import {
  Upload,
  FileText,
  ArrowRight,
  Target,
  Loader2,
} from "lucide-react";
import {
  CvData,
  PastProjectOption,
  TemplateId,
  DEFAULT_TEMPLATE_ID,
} from "./types";
import { FlowModal, TemplateStep, JobGaps } from "./FlowUI";
import { OptionCard, SOFT_TONES } from "./OptionCard";
import { ResumePicker } from "./ResumePicker";
import {
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
import { ClarificationQuestion, CVContentDTO, WordingPreview, previewCvWording } from "@/lib/api";
import { useDraftCvLifecycle } from "@/hooks/use-draft-cv-lifecycle";
import { useProGate } from "@/hooks/use-pro-gate";
import { ProUpgradeModal } from "@/components/dashboard/ProUpgradeModal";
import { useSubscriptionStatus } from "@/hooks/use-subscription";
import { WordingReviewStep } from "./WordingReviewStep";

interface EnhanceCvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (cvData: CvData) => void;
  pastProjects?: PastProjectOption[];
}

type EnhanceStep =
  | "choose-template"
  | "select-source"
  | "pick-source-item"
  | "upload-file"
  | "enhance-questions"
  | "improvement-goals"
  | "job-ask"
  | "job-target"
  | "select-template";

export function EnhanceCvModal({
  isOpen,
  onClose,
  onComplete,
  pastProjects = [],
}: EnhanceCvModalProps) {
  const [step, setStep] = useState<EnhanceStep>("select-source");
  // The template is chosen right before the first AI call (the AI only writes
  // the sections it shows). What to run once it's picked, and where Back goes.
  const [templateNext, setTemplateNext] = useState<
    { kind: "existing"; sourceId: string } | { kind: "upload"; file: File } | null
  >(null);
  const [templateBackStep, setTemplateBackStep] = useState<EnhanceStep>("select-source");

  // Source state: 'upload' | 'profile' | 'past-project'
  const [sourceType, setSourceType] = useState<"upload" | "past-project">("upload");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    pastProjects[0]?.id || "draft-1"
  );

  // Improvement goals state
  const [improvementGoal, setImprovementGoal] = useState<string>("");

  // Optional Job Description (as requested across flows)
  const [optionalJd, setOptionalJd] = useState<string>("");

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(DEFAULT_TEMPLATE_ID);

  // Real backend integration now covers every source — "upload" via OCR,
  // "profile"/"past-project" via pulling their real saved content (see
  // handlePrepareExistingSource). Downstream logic keys off `cvDocumentId`
  // actually being set, not the source type itself.
  const [cvDocumentId, setCvDocumentId] = useState<string | null>(null);
  const [latestContent, setLatestContent] = useState<CVContentDTO | undefined>(undefined);
  const [analyzedSourceText, setAnalyzedSourceText] = useState("");
  const [flowError, setFlowError] = useState<string | null>(null);
  // The profile / past resume currently being loaded from a click.
  const [loadingSourceId, setLoadingSourceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI clarification questions surfaced by /cv/analyze (additive to the
  // improvement-goals step) and job-compatibility gaps surfaced after
  // enhancing — both optional, shown only when non-empty.
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarificationQuestion[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  // Called before the early `if (!isOpen) return null` so hook order never changes.
  const questionPages = useQuestionPages(clarifyingQuestions, questionAnswers);
  const [jobGaps, setJobGaps] = useState<string[]>([]);

  // A CV document created mid-flow should never outlive an abandoned
  // session — only a completed flow keeps it (see markCompleted() below).
  const { markCompleted } = useDraftCvLifecycle(isOpen, cvDocumentId);

  const analyzeUploadMutation = useAnalyzeUpload();
  const analyzeExistingMutation = useAnalyzeExisting();
  const refineMutation = useRefineCv();
  const proGate = useProGate();
  const isPro = useSubscriptionStatus().data?.isPro ?? false;
  // Improved wording that differs from the matching career profile — offered
  // on the last step when there is any (Pro only).
  const [wordingPreview, setWordingPreview] = useState<
    (WordingPreview & { profile: NonNullable<WordingPreview["profile"]> }) | null
  >(null);

  if (!isOpen) return null;

  // Real file upload — OCRs/extracts the file server-side, then runs the
  // extracted text through the AI parse (same as CreateCvModal's upload flow).
  // Runs the step that sends things to the AI, now that a template is chosen.
  const runAfterTemplate = (next: NonNullable<typeof templateNext>, templateId: TemplateId) => {
    if (next.kind === "existing") handlePrepareExistingSource(next.sourceId, templateId);
    else handleUploadFile(next.file, templateId);
  };

  const chooseTemplateThen = (next: NonNullable<typeof templateNext>, backStep: EnhanceStep) => {
    setFlowError(null);
    setTemplateNext(next);
    setTemplateBackStep(backStep);
    setStep("choose-template");
  };

  const handleUploadFile = async (file: File, templateId: TemplateId = selectedTemplate) => {
    setFlowError(null);
    setUploadedFileName(file.name);
    try {
      const { cvDocumentId: docId, sourceText, document } =
        await analyzeUploadMutation.mutateAsync({ file, templateId });
      if ("mismatch" in document) {
        setFlowError(document.reason);
        return;
      }
      setCvDocumentId(docId);
      setLatestContent(document.content);
      setAnalyzedSourceText(sourceText);
      setClarifyingQuestions(document.questions ?? []);
      setQuestionAnswers({});
      setStep(document.questions?.length ? "enhance-questions" : "improvement-goals");
    } catch (err) {
      if (proGate.isProRequired(err)) return;
      setFlowError(
        err instanceof Error ? err.message : "Could not read this file. Please try a different one."
      );
    }
  };

  // Pulls the REAL content behind the selected career profile or past
  // project (never the fabricated skeleton) before moving to the goals step.
  // Enhancing "from a career profile" keeps the new CV attached to that same
  // profile — it's a new document for the same trajectory, not a detached one.
  const handlePrepareExistingSource = async (sourceId: string, templateId: TemplateId = selectedTemplate) => {
    setFlowError(null);
    setLoadingSourceId(sourceId);
    try {
      const { cvDocumentId: docId, sourceText, document } =
        await analyzeExistingMutation.mutateAsync(
          sourceType === "past-project"
            ? { sourceCvId: sourceId, templateId }
            : { sourceProfileId: sourceId, targetProfileId: sourceId, templateId }
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
      setStep(document.questions?.length ? "enhance-questions" : "improvement-goals");
    } catch (err) {
      if (proGate.isProRequired(err)) return;
      setFlowError(err instanceof Error ? err.message : "Could not load that resume. Please try again.");
    } finally {
      setLoadingSourceId(null);
    }
  };

  // The final AI pass, then the quick save that opens the editor.
  const isImproving = refineMutation.isPending;

  const { canSubmit: canSubmitAnswers } = getQuestionFormState(
    clarifyingQuestions,
    questionAnswers
  );

  const getBaseCv = (): CvData => {
    if (sourceType === "past-project") {
      const proj = pastProjects.find((item) => item.id === selectedProjectId);
      return proj?.cvData || createBlankCv();
    }
    return createBlankCv({
      title: uploadedFileName ? `Enhanced – ${uploadedFileName.replace(/\.[^/.]+$/, "")}` : "Enhanced Resume",
    });
  };

  // `content` defaults to the latest saved content; pass it explicitly when it
  // was only just returned (state set in the same tick isn't readable yet).
  const buildEnhancedCv = (content: CVContentDTO | undefined = latestContent): CvData => {
    const base = getBaseCv();
    let enhanced: CvData = {
      ...base,
      id: `enhanced-${Date.now()}`,
      title: `${base.targetRole || "Resume"} (Enhanced)`,
      templateStyle: selectedTemplate,
      enhancementFocus: improvementGoal,
      jobDescription: optionalJd || undefined,
    };

    if (cvDocumentId && content) {
      enhanced = applyCvContent(enhanced, content);
    }

    return enhanced;
  };

  // "Apply & Select Template" / "Skip instructions" — re-runs generation
  // with the improvement goal sent as its own high-priority instruction (not
  // folded into sourceText, so the AI treats it as a directive rather than
  // more candidate narrative to extract facts from) and a high
  // enhancementLevel, since "Enhance" implies an aggressive rewrite rather
  // than the neutral default.
  const handleContinueToTemplate = async (jobDescription: string = optionalJd) => {
    setFlowError(null);
    const goal = improvementGoal;

    if (!cvDocumentId) {
      setStep("select-template");
      return;
    }

    const { personal, otherLines } = splitClarificationAnswers(clarifyingQuestions, questionAnswers);
    const answerLines = [...otherLines, ...Object.entries(personal).map(([key, value]) => `${key}: ${value}`)];
    const augmentedText = [analyzedSourceText, ...answerLines].filter(Boolean).join("\n\n");

    try {
      const document = await refineMutation.mutateAsync({
        cvDocumentId,
        templateId: selectedTemplate,
        sourceText: augmentedText,
        focusInstructions: goal.trim() || undefined,
        jobDescription: jobDescription || undefined,
        personal,
        // Improving always rewrites: with the user's goal and job when given,
        // and on our own guidelines alone when they skipped both.
        requiresRewrite: true,
        enhancementLevel: 0.8,
      });
      if ("mismatch" in document) {
        setFlowError(document.reason);
        return;
      }
      setLatestContent(document.content);
      const gaps = document.jobAnalysis?.gaps ?? [];
      setJobGaps(gaps);
      const wording = await loadWordingPreview(cvDocumentId);
      setWordingPreview(wording);
      // Straight into the editor — unless there's improved wording to offer
      // back to a profile, or the job description showed gaps.
      if (wording || gaps.length > 0) setStep("select-template");
      else handleFinish(document.content);
    } catch (err) {
      if (proGate.isProRequired(err)) return;
      setFlowError(err instanceof Error ? err.message : "Could not enhance your CV. Please try again.");
    }
  };

  // Only offered when it's worth a step: Pro, and at least one entry the
  // profile has was reworded. Any failure just skips the offer.
  const loadWordingPreview = async (docId: string) => {
    if (!isPro) return null;
    try {
      const preview = await previewCvWording({
        cvDocumentId: docId,
        sourceCvId: sourceType === "past-project" ? selectedProjectId : undefined,
      });
      return preview.profile && preview.proposals.length > 0 ? { ...preview, profile: preview.profile } : null;
    } catch {
      return null;
    }
  };

  // Opens the finished CV in the editor.
  const handleFinish = (content: CVContentDTO | undefined = latestContent) => {
    setFlowError(null);
    const finalCv = cvDocumentId ? { ...buildEnhancedCv(content), id: cvDocumentId } : buildEnhancedCv();
    if (cvDocumentId) markCompleted();
    onComplete(finalCv);
  };

  return (
    <FlowModal
      stepKey={step}
      wide={step === "choose-template"}
      onClose={onClose}
      outside={<ProUpgradeModal isOpen={proGate.isPaywallOpen} onClose={proGate.closePaywall} />}
    >
        {/* ================= TEMPLATE (right before the first AI call) ================= */}
        {step === "choose-template" && (
          <div>
            <TemplateStep
              selectedId={selectedTemplate}
              onSelect={setSelectedTemplate}
              onContinue={(id) => templateNext && runAfterTemplate(templateNext, id)}
              onBack={() => setStep(templateBackStep)}
              busy={analyzeUploadMutation.isPending || analyzeExistingMutation.isPending}
              error={flowError}
            />
          </div>
        )}

        {/* ================= STEP 1: SELECT SOURCE (3 Options) ================= */}
        {/* Explicitly requested: "first three options upload existing cv, start from career profile or past project" */}
        {step === "select-source" && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Choose CV to Enhance
              </h2>
              <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                Select where your baseline resume content is located.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <OptionCard
                icon={Upload}
                tone="sky"
                title="Upload an existing CV"
                description="Upload a PDF or Word resume to improve."
                onClick={() => {
                  setSourceType("upload");
                  setStep("upload-file");
                }}
              />
              <OptionCard
                icon={FileText}
                tone="accent"
                title="Pick an existing resume"
                description={`Choose one you've already made (${pastProjects.length} available).`}
                onClick={() => {
                  setSourceType("past-project");
                  setStep("pick-source-item");
                }}
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2A: UPLOAD FILE DROPZONE ================= */}
        {step === "upload-file" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold text-neutral-950">
                Upload Resume Document
              </h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                Drop your current resume to let AI extract and quantify achievements.
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
                if (file) chooseTemplateThen({ kind: "upload", file }, "upload-file");
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-200 rounded-2xl p-6 text-center hover:border-neutral-900 transition-colors bg-neutral-50/50 mb-4 cursor-pointer"
            >
              <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-neutral-800">
                {analyzeUploadMutation.isPending
                  ? "Analyzing..."
                  : uploadedFileName
                    ? uploadedFileName
                    : "Click or drag PDF / DOCX resume"}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Max file size 10MB • All ATS formats supported
              </p>
            </div>
            {flowError && (
              <p className="text-xs text-red-600 font-medium text-center mb-4">{flowError}</p>
            )}

            <button
              type="button"
              onClick={() => setStep("select-source")}
              className="w-full py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
            >
              Back
            </button>
          </div>
        )}

        {/* ================= STEP 2B: PICK PROFILE OR PAST PROJECT ================= */}
        {step === "pick-source-item" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">Choose a resume</h2>
            </div>

            <div className="mb-6">
              <ResumePicker
                resumes={pastProjects}
                loadingId={loadingSourceId}
                disabled={analyzeExistingMutation.isPending}
                onPick={(id) => {
                  setSelectedProjectId(id);
                  chooseTemplateThen({ kind: "existing", sourceId: id }, "pick-source-item");
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setStep("select-source")}
              className="w-full py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
            >
              Back
            </button>
            {flowError && (
              <p className="text-xs text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP 3: DETAILS, WHAT TO IMPROVE, THE JOB ================= */}
        {/* ---- Missing details the AI asked about (only when it asked) ---- */}
        {step === "enhance-questions" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">Complete Missing Details</h2>
            </div>

            <div className="mb-6">
              <ClarifyingQuestionsForm
                questions={clarifyingQuestions}
                answers={questionAnswers}
                onAnswer={(id, value) => setQuestionAnswers((prev) => ({ ...prev, [id]: value }))}
                pages={questionPages}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!questionPages.isFirstPage) questionPages.prev();
                  else if (sourceType === "upload") setStep("upload-file");
                  else setStep("pick-source-item");
                }}
                className="w-1/3 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={questionPages.isLastPage ? !canSubmitAnswers : !questionPages.pageComplete}
                onClick={questionPages.isLastPage ? () => setStep("improvement-goals") : questionPages.next}
                className="w-2/3 py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{questionPages.isLastPage ? "Continue" : "Next"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ---- What to improve (optional — skipped means our own guidelines) ---- */}
        {step === "improvement-goals" && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">What should we improve?</h2>
            </div>

            <textarea
              rows={5}
              autoFocus
              value={improvementGoal}
              onChange={(e) => setImprovementGoal(e.target.value)}
              placeholder="e.g. Stronger bullet points, add numbers to my achievements, make it fit one page"
              className="w-full p-3 mb-6 rounded-xl bg-white border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 resize-none"
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setImprovementGoal("");
                  setStep("job-ask");
                }}
                className="w-1/3 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Skip
              </button>
              <button
                type="button"
                disabled={!improvementGoal.trim()}
                onClick={() => setStep("job-ask")}
                className="w-2/3 py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setStep(clarifyingQuestions.length ? "enhance-questions" : sourceType === "upload" ? "upload-file" : "pick-source-item")}
              className="mt-3 w-full cursor-pointer py-1 text-xs font-semibold text-neutral-400 transition-colors hover:text-neutral-700"
            >
              Back
            </button>
          </div>
        )}

        {/* ---- Tailor to a job? (a single question, as in New Resume) ---- */}
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
                disabled={isImproving}
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
                disabled={isImproving}
                onClick={() => {
                  setOptionalJd("");
                  handleContinueToTemplate("");
                }}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed"
              >
                {isImproving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isImproving ? "Improving your CV..." : "Skip"}
              </button>
              <button
                type="button"
                disabled={isImproving}
                onClick={() => setStep("improvement-goals")}
                className="mt-1 cursor-pointer py-1 text-xs font-semibold text-neutral-400 transition-colors hover:text-neutral-700 disabled:cursor-not-allowed"
              >
                Back
              </button>
            </div>
            {flowError && <p className="mt-3 text-xs font-medium text-red-600">{flowError}</p>}
          </div>
        )}

        {/* ---- Paste the job ---- */}
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
                disabled={isImproving}
                onClick={() => setStep("job-ask")}
                className="w-1/3 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!optionalJd.trim() || isImproving}
                onClick={() => handleContinueToTemplate()}
                className="w-2/3 py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isImproving ? "Improving..." : "Improve my CV"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && <p className="text-xs text-red-600 font-medium text-center mt-3">{flowError}</p>}
          </div>
        )}

        {/* ================= STEP 4: IMPROVED WORDING → PROFILE ================= */}
        {step === "select-template" && wordingPreview && cvDocumentId && (
          <WordingReviewStep
            key={cvDocumentId}
            cvDocumentId={cvDocumentId}
            preview={wordingPreview}
            onFinish={() => handleFinish()}
            onProRequired={proGate.isProRequired}
          >
            <JobGaps gaps={jobGaps} />
          </WordingReviewStep>
        )}

        {/* ================= STEP 4: READY ================= */}
        {step === "select-template" && !wordingPreview && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">Your improved CV is ready</h2>
            </div>

            <JobGaps gaps={jobGaps} />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("job-ask")}
                className="w-1/3 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleFinish()}
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
