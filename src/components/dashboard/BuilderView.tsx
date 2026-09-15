"use client";

import React, { useState } from "react";
import {
  Plus,
  Briefcase,
  Sparkles,
  LayoutTemplate,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  MoreVertical,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Download,
  Copy,
  Trash2,
  X,
  FileText,
  Clock,
  ChevronRight,
  Zap,
} from "lucide-react";
import { CreateCvModal } from "./create-flow/CreateCvModal";
import { TailorCvModal } from "./create-flow/TailorCvModal";
import { EnhanceCvModal } from "./create-flow/EnhanceCvModal";
import { CvEditorWorkspace } from "./create-flow/CvEditorWorkspace";
import {
  CvData,
  CareerProfile,
  PastProjectOption,
  SAMPLE_CAREER_PROFILES,
  defaultSampleCv,
  ResumeDraft,
  INITIAL_DRAFTS,
  TemplateId,
} from "./create-flow/types";

export type { ResumeDraft };

interface BuilderViewProps {
  onOpenStudio?: (draftId?: string) => void;
  onNavigateToTemplates?: () => void;
  onNavigateToPastProjects?: () => void;
  drafts?: ResumeDraft[];
  setDrafts?: React.Dispatch<React.SetStateAction<ResumeDraft[]>>;
  savedProfiles?: CareerProfile[];
  setSavedProfiles?: React.Dispatch<React.SetStateAction<CareerProfile[]>>;
  activeEditingCv?: CvData | null;
  setActiveEditingCv?: (cv: CvData | null) => void;
  isCreateModalOpenExternal?: boolean;
  onCloseCreateModalExternal?: () => void;
  isStartWithTemplateModalOpenExternal?: boolean;
  onCloseStartWithTemplateModalExternal?: () => void;
  preselectedCareerProfile?: CareerProfile | null;
  preselectedTemplate?: TemplateId;
}

export function BuilderView({
  onOpenStudio,
  onNavigateToTemplates,
  onNavigateToPastProjects,
  drafts: externalDrafts,
  setDrafts: externalSetDrafts,
  savedProfiles: externalProfiles,
  setSavedProfiles: externalSetProfiles,
  activeEditingCv: externalActiveEditingCv,
  setActiveEditingCv: externalSetActiveEditingCv,
  isCreateModalOpenExternal = false,
  onCloseCreateModalExternal,
  isStartWithTemplateModalOpenExternal = false,
  onCloseStartWithTemplateModalExternal,
  preselectedCareerProfile,
  preselectedTemplate,
}: BuilderViewProps) {
  // Local states as fallbacks
  const [localDrafts, setLocalDrafts] = useState<ResumeDraft[]>(INITIAL_DRAFTS);
  const [localSavedProfiles, setLocalSavedProfiles] = useState<CareerProfile[]>(
    SAMPLE_CAREER_PROFILES
  );
  const [localActiveEditingCv, setLocalActiveEditingCv] = useState<CvData | null>(
    null
  );

  const drafts = externalDrafts ?? localDrafts;
  const setDrafts = externalSetDrafts ?? setLocalDrafts;
  const savedProfiles = externalProfiles ?? localSavedProfiles;
  const setSavedProfiles = externalSetProfiles ?? setLocalSavedProfiles;
  const activeEditingCv =
    externalActiveEditingCv !== undefined
      ? externalActiveEditingCv
      : localActiveEditingCv;
  const setActiveEditingCv =
    externalSetActiveEditingCv ?? setLocalActiveEditingCv;

  // Internal Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [startWithTemplateOpen, setStartWithTemplateOpen] = useState(false);
  const [tailorModalOpen, setTailorModalOpen] = useState(false);
  const [enhanceModalOpen, setEnhanceModalOpen] = useState(false);

  const handleSaveCareerProfile = (newProfile: CareerProfile) => {
    setSavedProfiles((prev) => [newProfile, ...prev]);
  };

  const pastProjectsList: PastProjectOption[] = drafts.map((d) => ({
    id: d.id,
    title: d.title,
    role: d.targetRole,
    company: d.targetCompany,
    atsScore: d.atsScore,
    templateStyle: (d.templateName.includes("Tech")
      ? "tech"
      : d.templateName.includes("Ivy")
      ? "executive"
      : d.templateName.includes("Wall")
      ? "finance"
      : "swiss") as any,
    lastEdited: d.lastEdited,
    cvData: {
      ...defaultSampleCv,
      id: d.id,
      title: d.title,
      targetRole: d.targetRole,
      atsScore: d.atsScore,
      skills:
        d.matchedKeywords.length > 0 ? d.matchedKeywords : defaultSampleCv.skills,
    },
  }));

  const handleOpenDraftInEditor = (draft: ResumeDraft) => {
    const draftCv: CvData = {
      ...defaultSampleCv,
      id: draft.id,
      title: draft.title,
      targetRole: draft.targetRole,
      atsScore: draft.atsScore,
      skills:
        draft.matchedKeywords.length > 0
          ? draft.matchedKeywords
          : defaultSampleCv.skills,
    };
    setActiveEditingCv(draftCv);
  };

  const handleDeleteDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  // Duplicate draft and immediately open the copied one in editor!
  const handleDuplicateDraft = (draft: ResumeDraft) => {
    const duplicated: ResumeDraft = {
      ...draft,
      id: `draft-${Date.now()}`,
      title: `${draft.title} (Copy)`,
      lastEdited: "Just now",
    };
    setDrafts((prev) => [duplicated, ...prev]);
    handleOpenDraftInEditor(duplicated);
  };

  // If a CV is open for editing, render the Form + Live Preview Combo Workspace
  if (activeEditingCv) {
    return (
      <CvEditorWorkspace
        initialData={activeEditingCv}
        onBack={() => setActiveEditingCv(null)}
        onSave={(savedCv) => {
          const newDraft: ResumeDraft = {
            id:
              savedCv.id && savedCv.id !== "cv-new"
                ? savedCv.id
                : `draft-${Date.now()}`,
            title: savedCv.title,
            targetRole: savedCv.targetRole,
            targetCompany: "General Application",
            atsScore: savedCv.atsScore,
            lastEdited: "Just now",
            templateName:
              savedCv.templateStyle === "tech"
                ? "Silicon Valley Tech Lead"
                : savedCv.templateStyle === "executive"
                ? "Executive Ivy"
                : "Modern Minimalist",
            accentColor: "bg-neutral-950",
            matchedKeywords: savedCv.skills.slice(0, 5),
          };
          setDrafts((prev) => {
            const existingIdx = prev.findIndex((d) => d.id === newDraft.id);
            if (existingIdx >= 0) {
              const copy = [...prev];
              copy[existingIdx] = newDraft;
              return copy;
            }
            return [newDraft, ...prev];
          });
          setActiveEditingCv(null);
        }}
      />
    );
  }

  return (
    <div className="px-8 py-10 sm:px-14 sm:py-14 lg:px-20 lg:py-16 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950">
          The Builder
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Create, tailor, or enhance your resumes with AI guidance.
        </p>
      </div>

      {/* 4 CORE DASHBOARD ACTION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {/* CARD 1: CREATE NEW CV */}
        <div
          onClick={() => setCreateModalOpen(true)}
          className="rounded-3xl p-5 bg-white border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-neutral-900 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mb-4 shadow-xs group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="text-sm font-bold text-neutral-950 tracking-tight">
              Create New CV
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 font-normal">
              From scratch, old resume, or career profile
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-bold text-neutral-950 group-hover:translate-x-0.5 transition-transform">
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        {/* CARD 2: TAILOR TO JOB DESCRIPTION */}
        <div
          onClick={() => setTailorModalOpen(true)}
          className="rounded-3xl p-5 bg-white border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-neutral-900 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-neutral-950 tracking-tight">
              Tailor to Job Description
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 font-normal">
              0–10 AI match slider &amp; pre-flight checks
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-bold text-neutral-950 group-hover:translate-x-0.5 transition-transform">
            <span>Tailor CV</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        {/* CARD 3: ENHANCE EXISTING CV */}
        <div
          onClick={() => setEnhanceModalOpen(true)}
          className="rounded-3xl p-5 bg-white border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-neutral-900 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-neutral-950 tracking-tight">
              Enhance Existing CV
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 font-normal">
              Quantify metrics &amp; boost ATS score
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-bold text-neutral-950 group-hover:translate-x-0.5 transition-transform">
            <span>Optimize</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        {/* CARD 4: START FROM TEMPLATE */}
        <div
          onClick={() => setStartWithTemplateOpen(true)}
          className="rounded-3xl p-5 bg-white border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-neutral-900 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-neutral-950 tracking-tight">
              Start from Template
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 font-normal">
              Browse 24+ proven layouts
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-bold text-neutral-950 group-hover:translate-x-0.5 transition-transform">
            <span>Explore</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>
      </div>

      {/* RECENT RESUMES SECTION HEADER WITH 'SEE ALL' BUTTON */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold text-neutral-950 tracking-tight">
            Recent Resumes
          </h2>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
            {drafts.length}
          </span>
        </div>

        {/* See All link redirecting to Past Projects */}
        <button
          type="button"
          onClick={onNavigateToPastProjects}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-700 hover:text-neutral-950 transition-colors cursor-pointer group"
        >
          <span>See all</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* RESUMES WORKSPACE GRID */}
      {drafts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-neutral-50 border border-neutral-200/80">
          <FileText className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-neutral-950">No resumes found</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Click &ldquo;Create New CV&rdquo; above to start your first resume.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drafts.slice(0, 6).map((draft) => (
            <div
              key={draft.id}
              className="rounded-3xl bg-white border border-neutral-200/90 shadow-2xs hover:shadow-lg hover:border-neutral-300 transition-all p-6 flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Card Top: Title & ATS Score Badge */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="min-w-0">
                    <h3
                      onClick={() => handleOpenDraftInEditor(draft)}
                      className="text-sm font-bold text-neutral-950 tracking-tight truncate hover:underline cursor-pointer"
                    >
                      {draft.title}
                    </h3>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      Target: {draft.targetCompany} • {draft.targetRole}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {draft.atsScore}% ATS
                  </span>
                </div>

                {/* Simulated Document Thumbnail Strip */}
                <div
                  onClick={() => handleOpenDraftInEditor(draft)}
                  className="my-4 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 flex flex-col gap-1.5 cursor-pointer hover:bg-neutral-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-2.5 h-2.5 rounded-sm ${draft.accentColor}`} />
                    <div className="w-20 h-1.5 bg-neutral-300 rounded-full" />
                  </div>
                  <div className="w-full h-1 bg-neutral-200 rounded-full" />
                  <div className="w-4/5 h-1 bg-neutral-200 rounded-full" />
                  <div className="w-2/3 h-1 bg-neutral-200 rounded-full" />
                </div>

                {/* Matched Keywords Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {draft.matchedKeywords.slice(0, 3).map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-neutral-100 text-[10px] font-medium text-neutral-700"
                    >
                      {kw}
                    </span>
                  ))}
                  {draft.matchedKeywords.length > 3 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] text-neutral-400">
                      +{draft.matchedKeywords.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer: Metadata & Actions */}
              <div className="pt-3.5 border-t border-neutral-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-400">
                  {draft.lastEdited}
                </span>

                <div className="flex items-center gap-1">
                  {/* Copy Button (Copies and opens the copied one) */}
                  <button
                    type="button"
                    onClick={() => handleDuplicateDraft(draft)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                    title="Duplicate & Edit"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Action */}
                  <button
                    type="button"
                    onClick={() => handleDeleteDraft(draft.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete draft"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Primary Edit / Open Studio Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenDraftInEditor(draft)}
                    className="ml-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-950 text-white font-bold text-[11px] hover:bg-neutral-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>Edit</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= MODAL 1: CREATE NEW CV ================= */}
      <CreateCvModal
        isOpen={createModalOpen || isCreateModalOpenExternal}
        onClose={() => {
          setCreateModalOpen(false);
          onCloseCreateModalExternal?.();
        }}
        onComplete={(cvData) => {
          setCreateModalOpen(false);
          onCloseCreateModalExternal?.();
          setActiveEditingCv(cvData);
        }}
        savedProfiles={savedProfiles}
        initialCareerProfile={preselectedCareerProfile}
        initialStep={preselectedCareerProfile ? "select-template" : undefined}
        onSaveCareerProfile={handleSaveCareerProfile}
      />

      {/* ================= MODAL 2: START FROM TEMPLATE ================= */}
      <CreateCvModal
        isOpen={startWithTemplateOpen || isStartWithTemplateModalOpenExternal}
        startWithTemplate={true}
        initialTemplate={
          isStartWithTemplateModalOpenExternal ? preselectedTemplate : undefined
        }
        onClose={() => {
          setStartWithTemplateOpen(false);
          onCloseStartWithTemplateModalExternal?.();
        }}
        onComplete={(cvData) => {
          setStartWithTemplateOpen(false);
          onCloseStartWithTemplateModalExternal?.();
          setActiveEditingCv(cvData);
        }}
        savedProfiles={savedProfiles}
        onSaveCareerProfile={handleSaveCareerProfile}
      />

      {/* ================= MODAL 3: TAILOR TO JOB DESCRIPTION ================= */}
      <TailorCvModal
        isOpen={tailorModalOpen}
        onClose={() => setTailorModalOpen(false)}
        onComplete={(cvData) => {
          setTailorModalOpen(false);
          setActiveEditingCv(cvData);
        }}
        careerProfiles={savedProfiles}
        pastProjects={pastProjectsList}
        onSaveCareerProfile={handleSaveCareerProfile}
      />

      {/* ================= MODAL 4: ENHANCE EXISTING CV ================= */}
      <EnhanceCvModal
        isOpen={enhanceModalOpen}
        onClose={() => setEnhanceModalOpen(false)}
        onComplete={(cvData) => {
          setEnhanceModalOpen(false);
          setActiveEditingCv(cvData);
        }}
        careerProfiles={savedProfiles}
        pastProjects={pastProjectsList}
        onSaveCareerProfile={handleSaveCareerProfile}
      />
    </div>
  );
}
