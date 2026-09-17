"use client";

import React, { useRef, useState } from "react";
import {
  Sparkles,
  Upload,
  Layers,
  FileText,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  BookmarkPlus,
  Zap,
  SlidersHorizontal,
  ChevronRight,
  FileCheck,
} from "lucide-react";
import {
  CvData,
  CareerProfile,
  PastProjectOption,
  TemplateId,
  TEMPLATE_OPTIONS,
  SAMPLE_CAREER_PROFILES,
  SAMPLE_PAST_PROJECTS,
  defaultSampleCv,
} from "./types";
import {
  useAnalyzeUpload,
  useAnalyzeExisting,
  useRefineCv,
  useFinalizeCvProfile,
} from "@/hooks/use-cv-generation";
import { applyCvContent } from "@/lib/cv-mapper";
import { CVContentDTO } from "@/lib/api";

interface EnhanceCvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (cvData: CvData) => void;
  careerProfiles?: CareerProfile[];
  pastProjects?: PastProjectOption[];
  onSaveCareerProfile?: (profile: CareerProfile) => void;
}

type EnhanceStep =
  | "select-source"
  | "pick-source-item"
  | "upload-file"
  | "improvement-goals"
  | "select-template";

const PRESET_GOALS = [
  "Quantify metrics using Google XYZ formula (Accomplished [X] by doing [Z] measured by [Y])",
  "Boost ATS keyword density and score to 98%+",
  "Condense into a high-impact, modern 1-page executive format",
  "Emphasize cloud architecture, Kubernetes scale, and latency reduction",
  "Upgrade leadership, mentorship, and team scaling accomplishments",
];

export function EnhanceCvModal({
  isOpen,
  onClose,
  onComplete,
  careerProfiles = SAMPLE_CAREER_PROFILES,
  pastProjects = SAMPLE_PAST_PROJECTS,
  onSaveCareerProfile,
}: EnhanceCvModalProps) {
  const [step, setStep] = useState<EnhanceStep>("select-source");

  // Source state: 'upload' | 'profile' | 'past-project'
  const [sourceType, setSourceType] = useState<"upload" | "profile" | "past-project">("upload");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    careerProfiles[0]?.id || "profile-cloud-architect"
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    pastProjects[0]?.id || "draft-1"
  );

  // Improvement goals state
  const [improvementGoal, setImprovementGoal] = useState<string>(
    "Quantify metrics using Google XYZ formula and emphasize cloud architecture scalability."
  );

  // Optional Job Description (as requested across flows)
  const [optionalJd, setOptionalJd] = useState<string>("");
  const [showOptionalJd, setShowOptionalJd] = useState<boolean>(false);

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("tech");

  // Real backend integration now covers every source — "upload" via OCR,
  // "profile"/"past-project" via pulling their real saved content (see
  // handlePrepareExistingSource). Downstream logic keys off `cvDocumentId`
  // actually being set, not the source type itself.
  const [cvDocumentId, setCvDocumentId] = useState<string | null>(null);
  const [defaultProfileId, setDefaultProfileId] = useState<string | null>(null);
  const [latestContent, setLatestContent] = useState<CVContentDTO | undefined>(undefined);
  const [analyzedSourceText, setAnalyzedSourceText] = useState("");
  const [flowError, setFlowError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeUploadMutation = useAnalyzeUpload();
  const analyzeExistingMutation = useAnalyzeExisting();
  const refineMutation = useRefineCv();
  const finalizeMutation = useFinalizeCvProfile();

  if (!isOpen) return null;

  // Real file upload — OCRs/extracts the file server-side, then runs the
  // extracted text through the AI parse (same as CreateCvModal's upload flow).
  const handleUploadFile = async (file: File) => {
    setFlowError(null);
    setUploadedFileName(file.name);
    try {
      const { profileId, cvDocumentId: docId, sourceText, document } =
        await analyzeUploadMutation.mutateAsync(file);
      if ("mismatch" in document) {
        setFlowError(document.reason);
        return;
      }
      setDefaultProfileId(profileId);
      setCvDocumentId(docId);
      setLatestContent(document.content);
      setAnalyzedSourceText(sourceText);
    } catch (err) {
      setFlowError(
        err instanceof Error ? err.message : "Could not read this file. Please try a different one."
      );
    }
  };

  // Pulls the REAL content behind the selected career profile or past
  // project (never the fabricated skeleton) before moving to the goals step.
  const handlePrepareExistingSource = async () => {
    setFlowError(null);
    try {
      const { profileId, cvDocumentId: docId, sourceText, document } =
        await analyzeExistingMutation.mutateAsync(
          sourceType === "past-project"
            ? { sourceCvId: selectedProjectId }
            : { sourceProfileId: selectedProfileId }
        );
      if ("mismatch" in document) {
        setFlowError(document.reason);
        return;
      }
      setDefaultProfileId(profileId);
      setCvDocumentId(docId);
      setLatestContent(document.content);
      setAnalyzedSourceText(sourceText);
      setStep("improvement-goals");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Could not load that resume. Please try again.");
    }
  };

  const getBaseCv = (): CvData => {
    if (sourceType === "profile") {
      const p = careerProfiles.find((item) => item.id === selectedProfileId);
      return p?.cvData || defaultSampleCv;
    } else if (sourceType === "past-project") {
      const proj = pastProjects.find((item) => item.id === selectedProjectId);
      return proj?.cvData || defaultSampleCv;
    }
    return {
      ...defaultSampleCv,
      title: uploadedFileName
        ? `Enhanced – ${uploadedFileName.replace(/\.[^/.]+$/, "")}`
        : "Enhanced Cloud Architect Resume",
    };
  };

  const buildEnhancedCv = (): CvData => {
    const base = getBaseCv();
    let enhanced: CvData = {
      ...base,
      id: `enhanced-${Date.now()}`,
      title: `${base.targetRole} (Enhanced)`,
      templateStyle: selectedTemplate,
      atsScore: Math.min(99, Math.max(base.atsScore, 97)),
      enhancementFocus: improvementGoal,
      jobDescription: optionalJd || undefined,
    };

    if (cvDocumentId && latestContent) {
      enhanced = applyCvContent(enhanced, latestContent);
    } else if (enhanced.experiences.length > 0 && improvementGoal) {
      // Apply quantified XYZ formula enhancement to bullets
      const updatedBullets = [...enhanced.experiences[0].bullets];
      updatedBullets[0] = `Architected mission-critical cloud platform, driving a 44% reduction in p99 latency across 12M+ daily active requests by adopting Go microservices and Kubernetes (XYZ Formula).`;
      enhanced.experiences[0] = {
        ...enhanced.experiences[0],
        bullets: updatedBullets,
      };
    }

    return enhanced;
  };

  const saveNewProfile = (finalCv: CvData, profileId: string) => {
    if (!onSaveCareerProfile) return;
    const newProfile: CareerProfile = {
      id: profileId,
      roleTitle: finalCv.targetRole,
      domain: "Enhanced Systems Trajectory",
      readinessScore: finalCv.atsScore,
      targetCompanies: ["Top Tech & Scale-ups"],
      skills: finalCv.skills.slice(0, 8),
      highlight: finalCv.experiences[0]?.bullets[0] || "Enhanced master trajectory",
      cvData: finalCv,
    };
    onSaveCareerProfile(newProfile);
  };

  // "Apply & Select Template" / "Skip instructions" — re-runs generation
  // with the enhancement instructions folded in (or omitted, for skip) and a
  // high enhancementLevel, since "Enhance" implies an aggressive rewrite
  // rather than the neutral default.
  const handleContinueToTemplate = async (goalOverride?: string) => {
    setFlowError(null);
    const goal = goalOverride !== undefined ? goalOverride : improvementGoal;

    if (!cvDocumentId) {
      setStep("select-template");
      return;
    }

    const augmentedText = goal.trim()
      ? `${analyzedSourceText}\n\nEnhancement focus: ${goal}`
      : analyzedSourceText;

    try {
      const document = await refineMutation.mutateAsync({
        cvDocumentId,
        sourceText: augmentedText,
        jobDescription: optionalJd || undefined,
        enhancementLevel: 0.8,
      });
      if ("mismatch" in document) {
        setFlowError(document.reason);
        return;
      }
      setLatestContent(document.content);
      setStep("select-template");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Could not enhance your CV. Please try again.");
    }
  };

  const handleFinish = async (shouldSaveProfile: boolean) => {
    setFlowError(null);

    if (cvDocumentId && defaultProfileId) {
      try {
        const { profileId } = await finalizeMutation.mutateAsync({
          cvDocumentId,
          currentProfileId: defaultProfileId,
          shouldSaveProfile,
          targetRole: getBaseCv().targetRole,
        });

        const finalCv = { ...buildEnhancedCv(), id: cvDocumentId };
        if (shouldSaveProfile) saveNewProfile(finalCv, profileId);
        onComplete(finalCv);
      } catch (err) {
        setFlowError(err instanceof Error ? err.message : "Something went wrong saving your CV");
      }
      return;
    }

    const finalCv = buildEnhancedCv();
    if (shouldSaveProfile) saveNewProfile(finalCv, `profile-${Date.now()}`);
    onComplete(finalCv);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-neutral-200 animate-in zoom-in-95 duration-200 p-6 sm:p-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-950 block">
                Enhance Existing CV
              </span>
              <span className="text-[10px] text-neutral-400">
                AI Bullet Quantification &amp; ATS Boost
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
        {/* Explicitly requested: "first three options upload existing cv, start from career profile or past project" */}
        {step === "select-source" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                Choose CV to Enhance
              </h2>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Select where your baseline resume content is located.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {/* Option 1: Upload Existing CV */}
              <button
                type="button"
                onClick={() => {
                  setSourceType("upload");
                  setStep("upload-file");
                }}
                className="w-full p-4 rounded-2xl border border-neutral-200 hover:border-neutral-900 hover:shadow-xs bg-neutral-50/60 text-left transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center border border-violet-100 shrink-0 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-950 block">
                      Upload Existing CV
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Upload your PDF or Word resume for instant AI analysis
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Option 2: Start from Career Profile */}
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
                      Enhance one of your master credentials ({careerProfiles.length} profiles)
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Option 3: Past Project */}
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
                      Past Project / Resume Draft
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Pick from previously created resumes ({pastProjects.length} drafts)
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2A: UPLOAD FILE DROPZONE ================= */}
        {step === "upload-file" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold text-neutral-950">
                Upload Resume Document
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
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
                if (file) handleUploadFile(file);
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-200 rounded-2xl p-6 text-center hover:border-neutral-900 transition-colors bg-neutral-50/50 mb-4 cursor-pointer"
            >
              <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-neutral-800">
                {analyzeUploadMutation.isPending
                  ? "Analyzing..."
                  : uploadedFileName
                    ? uploadedFileName
                    : "Click or drag PDF / DOCX resume"}
              </p>
              <p className="text-[11px] text-neutral-400 mt-1">
                Max file size 10MB • All ATS formats supported
              </p>
            </div>
            {flowError && (
              <p className="text-[11px] text-red-600 font-medium text-center mb-4">{flowError}</p>
            )}

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
                disabled={analyzeUploadMutation.isPending || !cvDocumentId}
                onClick={() => setStep("improvement-goals")}
                className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue to Goals</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2B: PICK PROFILE OR PAST PROJECT ================= */}
        {step === "pick-source-item" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold text-neutral-950">
                {sourceType === "profile" ? "Select Career Profile" : "Select Past Project"}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Choose the foundation you wish to enhance.
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
                            {p.domain}
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
                            {proj.role} • {proj.company}
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
                <span>{analyzeExistingMutation.isPending ? "Loading..." : "Continue to Goals"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {flowError && (
              <p className="text-[11px] text-red-600 font-medium text-center mt-3">{flowError}</p>
            )}
          </div>
        )}

        {/* ================= STEP 3: WHAT TO IMPROVE DESCRIPTION ================= */}
        {/* Explicitly requested: "on all cases they will be asked for what they want to be improved description (they can skip this and edit on the form)" */}
        {step === "improvement-goals" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold text-neutral-950">
                What would you like to improve?
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Instruct the AI on what to focus on, or skip directly to edit on the form.
              </p>
            </div>

            {/* Suggested Preset Goals */}
            <div className="space-y-1.5 mb-4">
              <span className="text-[11px] font-semibold text-neutral-500 block">
                Quick 1-Click Improvement Prompts:
              </span>
              <div className="flex flex-col gap-1.5">
                {PRESET_GOALS.slice(0, 3).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImprovementGoal(preset)}
                    className={`p-2.5 rounded-xl border text-left text-[11px] transition-all cursor-pointer ${
                      improvementGoal === preset
                        ? "bg-neutral-100 border-neutral-950 font-bold text-neutral-950"
                        : "bg-neutral-50/70 border-neutral-200 text-neutral-700 hover:bg-neutral-100/50 font-medium"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Description Textarea */}
            <div className="mb-4">
              <label className="text-xs font-bold text-neutral-950 block mb-1">
                Custom Enhancement Instructions
              </label>
              <textarea
                rows={3}
                value={improvementGoal}
                onChange={(e) => setImprovementGoal(e.target.value)}
                placeholder="e.g. Rewrite bullets with strong action verbs, emphasize Kubernetes scale..."
                className="w-full p-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 bg-neutral-50/60 focus:outline-none focus:ring-2 focus:ring-neutral-950/10 focus:border-neutral-950"
              />
            </div>

            {/* Optional Job Description Accordion (as requested across flows) */}
            <div className="rounded-xl border border-neutral-200 p-3 bg-neutral-50/60 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700">
                  Target Job Description (Optional)
                </span>
                <button
                  type="button"
                  onClick={() => setShowOptionalJd(!showOptionalJd)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  {showOptionalJd ? "Hide" : optionalJd ? "Edit JD" : "+ Add JD"}
                </button>
              </div>

              {showOptionalJd && (
                <textarea
                  rows={3}
                  value={optionalJd}
                  onChange={(e) => setOptionalJd(e.target.value)}
                  placeholder="Paste target job requirements if you want the enhancement optimized for a specific role..."
                  className="w-full mt-2 p-2.5 rounded-lg border border-neutral-300 text-xs bg-white text-neutral-900"
                />
              )}
            </div>

            {/* Action Buttons: Includes "Skip and edit on the form" as explicitly requested */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (sourceType === "upload") setStep("upload-file");
                    else setStep("pick-source-item");
                  }}
                  className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={refineMutation.isPending}
                  onClick={() => handleContinueToTemplate()}
                  className="w-2/3 py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-xs hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span>{refineMutation.isPending ? "Enhancing..." : "Apply & Select Template"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Explicit Skip Action */}
              <button
                type="button"
                disabled={refineMutation.isPending}
                onClick={() => {
                  setImprovementGoal("");
                  handleContinueToTemplate("");
                }}
                className="w-full py-2.5 text-center text-xs font-semibold text-neutral-500 hover:text-neutral-950 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Skip instructions &mdash; edit directly on the form
              </button>
              {flowError && (
                <p className="text-[11px] text-red-600 font-medium text-center">{flowError}</p>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 4: SELECT TEMPLATE ================= */}
        {step === "select-template" && (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold text-neutral-950">
                Select Template Archetype
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Choose the visual layout for your enhanced CV.
              </p>
            </div>

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
                onClick={() => setStep("improvement-goals")}
                className="w-1/3 py-3 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={finalizeMutation.isPending}
                onClick={() => handleFinish(false)}
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
