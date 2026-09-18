"use client";

import React, { useRef, useState } from "react";
import {
  Briefcase,
  Layers,
  Sparkles,
  FileText,
  Upload,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  ChevronRight,
  PenTool,
  BookmarkPlus,
  SlidersHorizontal,
  AlertCircle,
  FileCheck,
  Zap,
} from "lucide-react";
import {
  CvData,
  CareerProfile,
  PastProjectOption,
  TemplateId,
  TEMPLATE_OPTIONS,
  SAMPLE_CAREER_PROFILES,
  SAMPLE_PAST_PROJECTS,
  SAMPLE_JOB_DESCRIPTIONS,
  defaultSampleCv,
} from "./types";
import {
  useAnalyzeFreestyle,
  useAnalyzeUpload,
  useAnalyzeExisting,
  useRefineCv,
  useFinalizeCvProfile,
} from "@/hooks/use-cv-generation";
import { applyCvContent } from "@/lib/cv-mapper";
import { ClarificationQuestion, CVContentDTO } from "@/lib/api";
import { useDraftCvLifecycle } from "@/hooks/use-draft-cv-lifecycle";

interface TailorCvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (cvData: CvData) => void;
  careerProfiles?: CareerProfile[];
  pastProjects?: PastProjectOption[];
  onSaveCareerProfile?: (profile: CareerProfile) => void;
}

type TailorStep =
  | "select-source"
  | "pick-source-item"
  | "new-cv-method"
  | "new-cv-scratch-choice"
  | "new-cv-freestyle"
  | "new-cv-missing"
  | "new-cv-upload"
  | "new-cv-analyzing"
  | "jd-and-slider"
  | "ai-clarifying"
  | "select-template";

export function TailorCvModal({
  isOpen,
  onClose,
  onComplete,
  careerProfiles = SAMPLE_CAREER_PROFILES,
  pastProjects = SAMPLE_PAST_PROJECTS,
  onSaveCareerProfile,
}: TailorCvModalProps) {
  const [step, setStep] = useState<TailorStep>("select-source");

  // Source selection: 'profile' | 'past-project' | 'new-cv'
  const [sourceType, setSourceType] = useState<
    "profile" | "past-project" | "new-cv"
  >("profile");
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    careerProfiles[0]?.id || "profile-cloud-architect"
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    pastProjects[0]?.id || "draft-1"
  );

  // New CV / Scratch sub-flow states
  const [newCvMethod, setNewCvMethod] = useState<"scratch" | "upload">("scratch");
  const [scratchType, setScratchType] = useState<"freestyle" | "guided">("freestyle");
  const [freestyleStory, setFreestyleStory] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [missingMetric, setMissingMetric] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Job Description state
  const [targetRole, setTargetRole] = useState("Staff Distributed Systems Engineer");
  const [targetCompany, setTargetCompany] = useState("Stripe");
  const [jobDescription, setJobDescription] = useState(
    SAMPLE_JOB_DESCRIPTIONS[0]?.content || ""
  );

  // 0 to 10 Scroll / Slider
  const [alignmentLevel, setAlignmentLevel] = useState<number>(7);

  // AI Clarifying questions state
  const [clarifyingMetric, setClarifyingMetric] = useState("");
  const [clarifyingTech, setClarifyingTech] = useState("");
  const [isEditingJdInDrawer, setIsEditingJdInDrawer] = useState(false);

  // Template selection state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("tech");

  // Real backend integration now covers every source — "new-cv" via
  // analyze/upload, "profile"/"past-project" via pulling their real saved
  // content (see handlePrepareExistingSource). All downstream logic keys off
  // `cvDocumentId` actually being set, not the source type itself.
  const [cvDocumentId, setCvDocumentId] = useState<string | null>(null);
  const [latestContent, setLatestContent] = useState<CVContentDTO | undefined>(undefined);
  const [analyzedSourceText, setAnalyzedSourceText] = useState("");
  const [flowError, setFlowError] = useState<string | null>(null);

  // AI clarification questions surfaced by /cv/analyze (additive to the
  // hardcoded clarifying questions below) and job-compatibility gaps
  // surfaced after tailoring — both optional, shown only when non-empty.
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarificationQuestion[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [jobGaps, setJobGaps] = useState<string[]>([]);

  // A CV document created mid-flow should never outlive an abandoned
  // session — only a completed flow keeps it (see markCompleted() below).
  const { markCompleted } = useDraftCvLifecycle(isOpen, cvDocumentId);

  const analyzeMutation = useAnalyzeFreestyle();
  const analyzeUploadMutation = useAnalyzeUpload();
  const analyzeExistingMutation = useAnalyzeExisting();
  const refineMutation = useRefineCv();
  const finalizeMutation = useFinalizeCvProfile();

  if (!isOpen) return null;

  // Pulls the REAL content behind the selected career profile or past
  // project (never the fabricated skeleton) before moving to the JD step.
  // Tailoring "from a career profile" keeps the new CV attached to that same
  // profile — it's a new document for the same trajectory, not a detached one.
  const handlePrepareExistingSource = async () => {
    setFlowError(null);
    try {
      const { cvDocumentId: docId, sourceText, document } =
        await analyzeExistingMutation.mutateAsync(
          sourceType === "past-project"
            ? { sourceCvId: selectedProjectId }
            : { sourceProfileId: selectedProfileId, targetProfileId: selectedProfileId }
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
      setPhone(personal.phone || phone);
      setStep("jd-and-slider");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Could not load that resume. Please try again.");
    }
  };

  // Handle real file upload — OCRs/extracts the file server-side, then runs
  // the extracted text through the AI parse (same as CreateCvModal's upload flow).
  const handleUploadFile = async (file: File) => {
    setFlowError(null);
    setUploadedFileName(file.name);
    setStep("new-cv-analyzing");
    setUploadProgress(15);

    const progressTimer = setInterval(() => {
      setUploadProgress((p) => (p < 90 ? p + 15 : p));
    }, 400);

    try {
      const { cvDocumentId: docId, sourceText, document } =
        await analyzeUploadMutation.mutateAsync(file);
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
      setPhone(personal.phone ?? "");
      setStep("new-cv-missing");
    } catch (err) {
      clearInterval(progressTimer);
      setFlowError(
        err instanceof Error ? err.message : "Could not read this file. Please try a different one."
      );
      setStep("new-cv-upload");
    }
  };

  // Handle freestyle story analysis — sends the story to the backend AI
  // parser and seeds the baseline-details form with what it actually found.
  const handleAnalyzeStory = async () => {
    setFlowError(null);
    const text =
      freestyleStory.trim() ||
      "I've been working as a Senior Cloud Architect for 7 years, specializing in AWS, Kubernetes, Terraform, and Go. Led distributed systems at Stripe and Vercel, managing multi-region clusters for 12M+ daily requests. Graduated from UC Berkeley in Computer Science.";
    setFreestyleStory(text);

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
      setPhone(personal.phone ?? "");
      setStep("new-cv-missing");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Could not analyze your story. Please try again.");
    }
  };

  // Derive active base CV from source
  const getBaseCv = (): CvData => {
    if (sourceType === "profile") {
      const found = careerProfiles.find((p) => p.id === selectedProfileId);
      return found?.cvData || defaultSampleCv;
    } else if (sourceType === "past-project") {
      const found = pastProjects.find((p) => p.id === selectedProjectId);
      return found?.cvData || defaultSampleCv;
    }
    return {
      ...defaultSampleCv,
      title: `${targetRole} – ${targetCompany || "Tailored"}`,
      targetRole: targetRole || defaultSampleCv.targetRole,
      summary: freestyleStory || defaultSampleCv.summary,
      personalInfo: {
        ...defaultSampleCv.personalInfo,
        fullName: fullName || defaultSampleCv.personalInfo.fullName,
        email: email || defaultSampleCv.personalInfo.email,
        phone: phone || defaultSampleCv.personalInfo.phone,
      },
    };
  };

  // Renders any AI-surfaced clarification questions additively below the
  // hardcoded clarifying-metric/tech fields — only appears when the analyze
  // step actually flagged something it couldn't confidently infer.
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
            <label className="text-xs font-bold text-neutral-950 block mb-1">
              {q.question}
              {!q.required && " (Optional)"}
            </label>
            {q.type === "textarea" ? (
              <textarea
                rows={2}
                value={questionAnswers[q.id] ?? ""}
                onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={q.reason}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-neutral-50/50"
              />
            ) : q.type === "select" && q.options?.length ? (
              <select
                value={questionAnswers[q.id] ?? ""}
                onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-white"
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
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-neutral-50/50"
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Compute alignment level description
  const getAlignmentLabel = (val: number) => {
    if (val <= 3) {
      return {
        title: "Fact-Strict Grounding (0-3)",
        desc: "Strictly anchored to your existing CV facts and vocabulary. Minimal rephrasing, no extrapolation.",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      };
    } else if (val <= 7) {
      return {
        title: "Balanced Alignment (4-7)",
        desc: "Balances your genuine achievements with target JD terminology and ATS keyword prioritization.",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      };
    } else {
      return {
        title: "High-Impact Targeting (8-10)",
        desc: "Aggressively optimizes syntax, bullet metrics, and executive summary to mirror the employer's core competencies.",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      };
    }
  };

  const alignmentInfo = getAlignmentLabel(alignmentLevel);

  // Generate finalized tailored CV
  const buildTailoredCv = (): CvData => {
    const base = getBaseCv();
    let tailored: CvData = {
      ...base,
      id: `tailored-${Date.now()}`,
      title: `${targetRole} (${targetCompany || "Tailored"})`,
      targetRole: targetRole || base.targetRole,
      templateStyle: selectedTemplate,
      atsScore: Math.min(99, 90 + Math.floor(alignmentLevel * 0.9)),
      jobDescription,
      tailorAlignmentScore: alignmentLevel,
    };

    if (cvDocumentId && latestContent) {
      tailored = applyCvContent(tailored, latestContent);
    } else if (tailored.experiences.length > 0) {
      const updatedBullets = [...tailored.experiences[0].bullets];
      if (clarifyingMetric || missingMetric) {
        updatedBullets[0] = `Engineered and scaled distributed infrastructure: ${clarifyingMetric || missingMetric}, directly aligning with ${targetCompany} performance benchmarks.`;
      }
      if (clarifyingTech) {
        updatedBullets[1] = `Architected mission-critical services leveraging ${clarifyingTech} to guarantee fault tolerance and high throughput.`;
      }
      tailored.experiences[0] = {
        ...tailored.experiences[0],
        role: targetRole || tailored.experiences[0].role,
        bullets: updatedBullets,
      };
    }

    return tailored;
  };

  const saveNewProfile = (finalCv: CvData, profileId: string) => {
    if (!onSaveCareerProfile) return;
    // Local-only fallback path (no real backend document) — domain is
    // normally AI-derived from real CV content, so there's nothing real to
    // put here rather than a fabricated one; targetCompanies only includes
    // what the user actually typed.
    const newProfile: CareerProfile = {
      id: profileId,
      roleTitle: targetRole || finalCv.targetRole,
      domain: "",
      readinessScore: finalCv.atsScore,
      targetCompanies: targetCompany ? [targetCompany] : [],
      skills: finalCv.skills.slice(0, 8),
      highlight: clarifyingMetric || missingMetric || finalCv.experiences[0]?.bullets[0] || "",
      cvData: finalCv,
    };
    onSaveCareerProfile(newProfile);
  };

  const handleFinish = async (action: "create" | "attach" | "none", existingProfileId?: string) => {
    setFlowError(null);

    if (cvDocumentId) {
      try {
        const { profileId } = await finalizeMutation.mutateAsync({
          cvDocumentId,
          action,
          targetRole: targetRole || defaultSampleCv.targetRole,
          existingProfileId,
        });

        const finalCv = { ...buildTailoredCv(), id: cvDocumentId };
        if (action === "create" && profileId) saveNewProfile(finalCv, profileId);
        markCompleted();
        onComplete(finalCv);
      } catch (err) {
        setFlowError(err instanceof Error ? err.message : "Something went wrong saving your CV");
      }
      return;
    }

    const finalCv = buildTailoredCv();
    if (action === "create") saveNewProfile(finalCv, `profile-${Date.now()}`);
    onComplete(finalCv);
  };

  // "Continue to Template" from AI Clarification — folds the job description,
  // alignment slider, and clarifying answers into the backend document via
  // the same refine endpoint CreateCvModal uses (enhancementLevel here comes
  // from the 0–10 alignment slider instead of a fixed default).
  const handleContinueToTemplate = async () => {
    setFlowError(null);
    if (!cvDocumentId) {
      setStep("select-template");
      return;
    }

    const extraLines = [
      `Target role: ${targetRole}`,
      phone.trim() && `Phone: ${phone}`,
      missingMetric.trim() && `Key achievement: ${missingMetric}`,
      clarifyingMetric.trim() && `Strongest verifiable metric: ${clarifyingMetric}`,
      clarifyingTech.trim() && `Key tools/frameworks to emphasize: ${clarifyingTech}`,
      ...clarifyingQuestions
        .filter((q) => questionAnswers[q.id]?.trim())
        .map((q) => `${q.question} ${questionAnswers[q.id].trim()}`),
    ].filter(Boolean);
    const augmentedText = `${analyzedSourceText}\n\n${extraLines.join("\n")}`;

    try {
      const document = await refineMutation.mutateAsync({
        cvDocumentId,
        sourceText: augmentedText,
        jobDescription: jobDescription || undefined,
        name: fullName || undefined,
        enhancementLevel: alignmentLevel / 10,
      });
      if ("mismatch" in document) {
        setFlowError(document.reason);
        return;
      }
      setLatestContent(document.content);
      setJobGaps(document.jobAnalysis?.gaps ?? []);
      setStep("select-template");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Could not tailor your CV. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-neutral-200 animate-in zoom-in-95 duration-200 p-6 sm:p-8">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-950 block">
                Tailor to Job Description
              </span>
              <span className="text-[10px] text-neutral-400">
                AI Alignment &amp; Keyword Match
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= STEP 1: SELECT SOURCE (3 Options) ================= */}
        {step === "select-source" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Select Your Foundation
              </h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Choose the starting source you want the AI to tailor against the job description.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {/* Option 1: Start from Career Profile */}
              <button
                type="button"
                onClick={() => {
                  setSourceType("profile");
                  setStep("pick-source-item");
                }}
                className="w-full p-4 rounded-2xl border border-neutral-200 hover:border-neutral-900 hover:shadow-xs bg-neutral-50/60 text-left transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0 group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-950 block">
                      Start from Career Profile
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Use a verified master trajectory ({careerProfiles.length} saved profiles)
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Option 2: Start from Past Project / Resume */}
              <button
                type="button"
                onClick={() => {
                  setSourceType("past-project");
                  setStep("pick-source-item");
                }}
                className="w-full p-4 rounded-2xl border border-neutral-200 hover:border-neutral-900 hover:shadow-xs bg-neutral-50/60 text-left transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-950 block">
                      Start from Past Project / Resume
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Tailor an existing draft or past resume ({pastProjects.length} available)
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Option 3: New CV (From Scratch or Upload) */}
              {/* Explicitly requested: "lets have the create new cv flow when the user selects from scratch on tailor to jd" */}
              <button
                type="button"
                onClick={() => {
                  setSourceType("new-cv");
                  setStep("new-cv-method");
                }}
                className="w-full p-4 rounded-2xl border border-neutral-200 hover:border-neutral-900 hover:shadow-xs bg-neutral-50/60 text-left transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center border border-violet-100 shrink-0 group-hover:scale-105 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-950 block">
                      New CV / From Scratch
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Create new CV from scratch or upload old resume, tailored to the JD
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2A: PICK SPECIFIC PROFILE OR PROJECT ================= */}
        {step === "pick-source-item" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold text-neutral-950">
                {sourceType === "profile" ? "Select Career Profile" : "Select Past Project / Resume"}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Pick the baseline profile to align with the target role.
              </p>
            </div>

            <div className="space-y-2.5 mb-6 max-h-[300px] overflow-y-auto pr-1">
              {sourceType === "profile"
                ? careerProfiles.map((p) => {
                    const isSelected = selectedProfileId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProfileId(p.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-neutral-100 border-neutral-950 ring-1 ring-neutral-950"
                            : "bg-neutral-50/60 border-neutral-200 hover:bg-neutral-100/50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-950">
                              {p.roleTitle}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {p.readinessScore}% Match
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5 truncate max-w-xs">
                            {p.domain} • {p.skills.slice(0, 4).join(", ")}
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-neutral-950 bg-neutral-950" : "border-neutral-300"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    );
                  })
                : pastProjects.map((proj) => {
                    const isSelected = selectedProjectId === proj.id;
                    return (
                      <div
                        key={proj.id}
                        onClick={() => setSelectedProjectId(proj.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-neutral-100 border-neutral-950 ring-1 ring-neutral-950"
                            : "bg-neutral-50/60 border-neutral-200 hover:bg-neutral-100/50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-950">
                              {proj.title}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              {proj.atsScore}% ATS
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {proj.role} • {proj.company} ({proj.lastEdited})
                          </p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-neutral-950 bg-neutral-950" : "border-neutral-300"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    );
                  })}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("select-source")}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={analyzeExistingMutation.isPending}
                onClick={handlePrepareExistingSource}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{analyzeExistingMutation.isPending ? "Loading..." : "Add Job Description"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && (
              <p className="text-[11px] text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP 2B-1: NEW CV START METHOD (Scratch vs Upload) ================= */}
        {/* Exact same starting choices as Create New CV Flow */}
        {step === "new-cv-method" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                New CV Creation Method
              </h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Choose how you would like to provide your background before tailoring.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => {
                  setNewCvMethod("scratch");
                  setStep("new-cv-scratch-choice");
                }}
                className="w-full p-4 rounded-2xl border border-neutral-200 hover:border-neutral-900 bg-neutral-50/60 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900 shrink-0 group-hover:scale-105 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-950 block">
                      Start from scratch
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Write your career narrative in plain text or guided form
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewCvMethod("upload");
                  setStep("new-cv-upload");
                }}
                className="w-full p-4 rounded-2xl border border-neutral-200 hover:border-neutral-900 bg-neutral-50/60 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900 shrink-0 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-950 block">
                      Upload old CV / resume
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Upload existing PDF or Word file to extract and tailor
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep("select-source")}
              className="w-full py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer text-center"
            >
              Back to Foundation Choices
            </button>
          </div>
        )}

        {/* ================= STEP 2B-2: SCRATCH CHOICE (Freestyle vs Guided) ================= */}
        {step === "new-cv-scratch-choice" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                How would you like to build?
              </h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Free style story typing or guided structured questions.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => {
                  setScratchType("freestyle");
                  setStep("new-cv-freestyle");
                }}
                className="w-full p-4 rounded-2xl border border-neutral-200 hover:border-neutral-900 bg-neutral-50/60 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-950 block">
                      Free Style
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Type your career background in natural language
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setScratchType("guided");
                  setStep("new-cv-missing");
                }}
                className="w-full p-4 rounded-2xl border border-neutral-200 hover:border-neutral-900 bg-neutral-50/60 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-950 block">
                      Filling Form / Guided
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Step-by-step form prompts with auto-completed missing items
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep("new-cv-method")}
              className="w-full py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer text-center"
            >
              Back
            </button>
          </div>
        )}

        {/* ================= STEP 2B-3: FREESTYLE CAREER NARRATIVE ================= */}
        {step === "new-cv-freestyle" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Describe Your Career
              </h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Type what you did, your top achievements, skills, and past companies.
              </p>
            </div>

            <div className="space-y-3 mb-5">
              <textarea
                rows={5}
                value={freestyleStory}
                onChange={(e) => setFreestyleStory(e.target.value)}
                placeholder="e.g. Senior Cloud Architect with 7 years leading AWS & Kubernetes platforms at Stripe and Vercel. Managed multi-region clusters for 12M+ daily requests with Go & Terraform..."
                className="w-full p-3.5 rounded-2xl bg-neutral-100/90 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 border-none resize-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">Need inspiration?</span>
                <button
                  type="button"
                  onClick={() =>
                    setFreestyleStory(
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
                onClick={() => setStep("new-cv-scratch-choice")}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={analyzeMutation.isPending}
                onClick={handleAnalyzeStory}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{analyzeMutation.isPending ? "Analyzing..." : "Analyze & Complete Details"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && (
              <p className="text-[11px] text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP 2B-4: UPLOAD CV ================= */}
        {step === "new-cv-upload" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Upload Old Resume
              </h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
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
                if (file) handleUploadFile(file);
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-300 hover:border-neutral-950 rounded-2xl p-6 text-center transition-all cursor-pointer bg-neutral-50/50 mb-4"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center mx-auto mb-2.5">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-neutral-950">
                {uploadedFileName ? uploadedFileName : "Click or drop old resume here"}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Supports PDF, DOCX (up to 10MB)
              </p>
            </div>
            {flowError && (
              <p className="text-[11px] text-red-600 font-medium text-center mb-4">{flowError}</p>
            )}

            <button
              type="button"
              onClick={() => setStep("new-cv-method")}
              className="w-full py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
            >
              Back
            </button>
          </div>
        )}

        {/* ================= STEP 2B-5: UPLOAD SCANNING ANIMATION ================= */}
        {step === "new-cv-analyzing" && (
          <div className="py-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-neutral-950 text-white flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-950">
                Parsing Background &amp; Credentials
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Extracting work history from {uploadedFileName || "document"}...
              </p>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden max-w-xs mx-auto">
              <div
                className="bg-neutral-950 h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2B-6: MISSING ESSENTIALS PROMPT ================= */}
        {/* Exact same missing details step as Create New CV Flow */}
        {step === "new-cv-missing" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-5">
              {/* <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold mb-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Essential Verification</span>
              </div> */}
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Confirm Baseline Details
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Ensure these details are accurate before tailoring to the target job description:
              </p>
            </div>

            <div className="space-y-3 mb-6">
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
                  Phone Number
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
                  Key Accomplishment Metric (Google XYZ) (Optional)
                </label>
                <input
                  type="text"
                  value={missingMetric}
                  onChange={(e) => setMissingMetric(e.target.value)}
                  placeholder="e.g. Reduced p99 latency by 44% and saved $320K/yr"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 text-xs text-neutral-900 border-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (newCvMethod === "scratch") {
                    setStep("new-cv-freestyle");
                  } else {
                    setStep("new-cv-upload");
                  }
                }}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!targetRole.trim() || !phone.trim()}
                onClick={() => setStep("jd-and-slider")}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Add Job Description &amp; Calibrate</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: JOB DESCRIPTION & 0-10 SLIDER ================= */}
        {step === "jd-and-slider" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold text-neutral-950">
                Target Job Description &amp; Alignment
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Paste the JD and calibrate how closely the AI matches the requirements.
              </p>
            </div>

            {/* Quick Sample Presets */}
            <div className="mb-3">
              <span className="text-[11px] font-semibold text-neutral-500 block mb-1.5">
                Quick 1-Click Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_JOB_DESCRIPTIONS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setTargetRole(preset.targetRole);
                      setTargetCompany(preset.company);
                      setJobDescription(preset.content);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-[11px] font-semibold text-neutral-700 transition-colors cursor-pointer"
                  >
                    {preset.company} ({preset.title.split(" ")[0]})
                  </button>
                ))}
              </div>
            </div>

            {/* Job Description Textarea */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-950">
                  Job Description
                </label>
                <span className="text-[11px] text-neutral-400">
                  {targetRole} @ {targetCompany || "Employer"}
                </span>
              </div>
              <textarea
                rows={4}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description or requirements here..."
                className="w-full p-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 bg-neutral-50/60 focus:outline-none focus:ring-2 focus:ring-neutral-950/10 focus:border-neutral-950 font-sans"
              />
            </div>

            {/* 0 to 10 Scroll / Slider */}
            {/* Explicitly requested: "0 - 10 scroll so they can choose how they want the ai to extend the cv to the job (0 grounded to original cv, while 10 more closer to the job)" */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-700" />
                  <span className="text-xs font-bold text-neutral-950">
                    AI Alignment Degree:
                  </span>
                </div>
                <span className="text-sm font-black text-neutral-950 px-2 py-0.5 rounded-md bg-white border border-neutral-200 shadow-2xs">
                  {alignmentLevel} / 10
                </span>
              </div>

              {/* Slider Input */}
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={alignmentLevel}
                onChange={(e) => setAlignmentLevel(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-950"
              />

              {/* Scale Labels */}
              <div className="flex justify-between text-[10px] text-neutral-400 font-semibold px-0.5">
                <span>0: Strictly Grounded</span>
                <span>5: Balanced</span>
                <span>10: Deep JD Match</span>
              </div>

              {/* Dynamic Description Box */}
              <div className="pt-2 border-t border-neutral-200/80">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${alignmentInfo.badgeColor}`}>
                    {alignmentInfo.title}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  {alignmentInfo.desc}
                </p>
              </div>
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
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep("ai-clarifying")}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>AI Clarification Check</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: AI CLARIFYING QUESTIONS & JD REFINEMENT ================= */}
        {/* Explicitly requested: "then ask if there is sth the ai wants to know before continuing then the same steps after that (but they can also edit job description here)" */}
        {step === "ai-clarifying" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-[11px] font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Pre-Flight Alignment</span>
              </div>
              <h2 className="text-lg font-bold text-neutral-950">
                Anything the AI should know before tailoring?
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Answer these targeted questions or skip to jump straight into template selection.
              </p>
            </div>

            <div className="space-y-3.5 mb-5">
              {/* Clarifying Question 1 */}
              <div>
                <label className="text-xs font-bold text-neutral-950 block mb-1">
                  1. What is your strongest verifiable metric for this role?
                </label>
                <input
                  type="text"
                  value={clarifyingMetric}
                  onChange={(e) => setClarifyingMetric(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-neutral-50/50"
                  placeholder="e.g. Scaled to 14M daily transactions with 99.999% uptime"
                />
              </div>

              {/* Clarifying Question 2 */}
              <div>
                <label className="text-xs font-bold text-neutral-950 block mb-1">
                  2. Key tools or frameworks you want front-and-center?
                </label>
                <input
                  type="text"
                  value={clarifyingTech}
                  onChange={(e) => setClarifyingTech(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-neutral-50/50"
                  placeholder="e.g. AWS EKS, Terraform, Go, Redis, Prometheus"
                />
              </div>

              {renderClarifyingQuestions()}

              {/* Editable Job Description Drawer (as requested: "they can also edit job description here") */}
              <div className="rounded-xl border border-neutral-200 p-3 bg-neutral-50/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-neutral-600" />
                    Target Job Description
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingJdInDrawer(!isEditingJdInDrawer)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {isEditingJdInDrawer ? "Done Editing" : "Edit JD"}
                  </button>
                </div>

                {isEditingJdInDrawer ? (
                  <textarea
                    rows={4}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full mt-2 p-2.5 rounded-lg border border-neutral-300 text-xs bg-white text-neutral-900"
                  />
                ) : (
                  <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                    {jobDescription || "No job description added yet."}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("jd-and-slider")}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={refineMutation.isPending}
                onClick={handleContinueToTemplate}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{refineMutation.isPending ? "Tailoring..." : "Continue to Template"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && (
              <p className="text-[11px] text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP 5: SELECT TEMPLATE ================= */}
        {step === "select-template" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold text-neutral-950">
                Choose Design Archetype
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Select an ATS-validated format for {targetRole}.
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

            <div className="space-y-2.5 mb-6 max-h-[280px] overflow-y-auto pr-1">
              {TEMPLATE_OPTIONS.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-neutral-100 border-neutral-950 ring-1 ring-neutral-950"
                        : "bg-neutral-50/60 border-neutral-200 hover:bg-neutral-100/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-950">
                          {tmpl.name}
                        </span>
                        <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-md bg-neutral-200/80 text-neutral-700">
                          {tmpl.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {tmpl.fontFamily} • {tmpl.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {tmpl.atsScore}% ATS
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? "border-neutral-950 bg-neutral-950" : "border-neutral-300"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("ai-clarifying")}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={finalizeMutation.isPending}
                onClick={() => handleFinish("none")}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{finalizeMutation.isPending ? "Saving..." : "Open in Studio"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && (
              <p className="text-[11px] text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
