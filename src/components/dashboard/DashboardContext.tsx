"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useAllDrafts } from "@/hooks/use-cv-drafts";
import { useProfiles } from "@/hooks/use-profiles";
import {
  getCvDocument,
  deleteCvDocument,
  getUnfiledProfile,
  createCvDocument,
  updateCvContent,
} from "@/lib/api";
import { applyCvContent, createBlankCv, toResumeDraft } from "@/lib/cv-mapper";
import {
  ResumeDraft,
  CareerProfile,
  CvData,
  TemplateId,
} from "./create-flow/types";

interface DashboardContextValue {
  drafts: ResumeDraft[];
  setDrafts: React.Dispatch<React.SetStateAction<ResumeDraft[]>>;
  savedProfiles: CareerProfile[];
  setSavedProfiles: React.Dispatch<React.SetStateAction<CareerProfile[]>>;
  activeEditingCv: CvData | null;
  setActiveEditingCv: React.Dispatch<React.SetStateAction<CvData | null>>;

  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  isStartWithTemplateOpen: boolean;
  setIsStartWithTemplateOpen: (open: boolean) => void;
  preselectedCareerProfile: CareerProfile | null;
  preselectedTemplate: TemplateId | undefined;

  handleOpenDraftInEditor: (draft: ResumeDraft) => void;
  handleDuplicateDraft: (draft: ResumeDraft) => void;
  handleDeleteDraft: (id: string) => void;
  handleUseTemplate: (templateId: TemplateId) => void;
  handleCreateCvFromProfile: (profile: CareerProfile) => void;
  handleNewResume: () => void;
  goToPastProjects: () => void;
  goToTemplates: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [drafts, setDrafts] = useState<ResumeDraft[]>([]);
  const { data: allDrafts } = useAllDrafts();
  const hasHydratedDrafts = useRef(false);

  // Seed the drafts list from every CV the user owns across all profiles,
  // once on load; local edits (duplicate/delete/save) take over from there.
  useEffect(() => {
    if (allDrafts && !hasHydratedDrafts.current) {
      hasHydratedDrafts.current = true;
      setDrafts(allDrafts);
    }
  }, [allDrafts]);

  const [savedProfiles, setSavedProfiles] = useState<CareerProfile[]>([]);
  const { data: fetchedProfiles } = useProfiles();
  const hasHydratedProfiles = useRef(false);

  // Seed saved profiles from the backend (excludes the hidden "Unfiled CVs"
  // bucket) once on load; local edits (creating a new one) take over from
  // there.
  useEffect(() => {
    if (fetchedProfiles && !hasHydratedProfiles.current) {
      hasHydratedProfiles.current = true;
      setSavedProfiles(fetchedProfiles);
    }
  }, [fetchedProfiles]);

  const [activeEditingCv, setActiveEditingCv] = useState<CvData | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStartWithTemplateOpen, setIsStartWithTemplateOpen] = useState(false);
  const [preselectedCareerProfile, setPreselectedCareerProfile] = useState<CareerProfile | null>(null);
  const [preselectedTemplate, setPreselectedTemplate] = useState<TemplateId | undefined>(undefined);

  // Opens a draft in the editor with its REAL saved content — falls back to
  // the blank skeleton only if this isn't a real backend document (e.g. a
  // duplicate created before the backend call below could resolve).
  const handleOpenDraftInEditor = async (draft: ResumeDraft) => {
    let draftCv: CvData = createBlankCv({
      id: draft.id,
      title: draft.title,
      targetRole: draft.targetRole,
      atsScore: draft.atsScore,
      skills: draft.matchedKeywords,
    });

    try {
      const doc = await getCvDocument(draft.id);
      draftCv = applyCvContent(draftCv, doc.content);
    } catch {
      // Not a real backend document — keep the blank skeleton.
    }

    setActiveEditingCv(draftCv);
    router.push("/dashboard");
  };

  // Duplicates a draft by copying its REAL content into a new backend
  // document in the unfiled bucket, so editing the copy doesn't start blank.
  const handleDuplicateDraft = async (draft: ResumeDraft) => {
    try {
      const original = await getCvDocument(draft.id);
      const bucket = await getUnfiledProfile();
      const newDoc = await createCvDocument(bucket.id);
      await updateCvContent(newDoc.id, { content: original.content });
      const duplicated: ResumeDraft = {
        ...toResumeDraft({ ...newDoc, content: original.content }),
        title: `${draft.title} (Copy)`,
      };
      setDrafts((prev) => [duplicated, ...prev]);
      handleOpenDraftInEditor(duplicated);
    } catch {
      const duplicated: ResumeDraft = {
        ...draft,
        id: `draft-${Date.now()}`,
        title: `${draft.title} (Copy)`,
        lastEdited: "Just now",
      };
      setDrafts((prev) => [duplicated, ...prev]);
      handleOpenDraftInEditor(duplicated);
    }
  };

  const handleDeleteDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    deleteCvDocument(id).catch(() => {
      // Not a real backend document (e.g. a local-only fallback draft) — ignore.
    });
  };

  const handleUseTemplate = (templateId: TemplateId) => {
    setPreselectedTemplate(templateId);
    setPreselectedCareerProfile(null);
    setIsStartWithTemplateOpen(true);
    router.push("/dashboard");
  };

  const handleCreateCvFromProfile = (profile: CareerProfile) => {
    setPreselectedCareerProfile(profile);
    setPreselectedTemplate(undefined);
    setIsCreateModalOpen(true);
    router.push("/dashboard");
  };

  const handleNewResume = () => {
    setPreselectedCareerProfile(null);
    setPreselectedTemplate(undefined);
    setIsCreateModalOpen(true);
    router.push("/dashboard");
  };

  const goToPastProjects = () => router.push("/dashboard/past-projects");
  const goToTemplates = () => router.push("/dashboard/templates");

  return (
    <DashboardContext.Provider
      value={{
        drafts,
        setDrafts,
        savedProfiles,
        setSavedProfiles,
        activeEditingCv,
        setActiveEditingCv,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isStartWithTemplateOpen,
        setIsStartWithTemplateOpen,
        preselectedCareerProfile,
        preselectedTemplate,
        handleOpenDraftInEditor,
        handleDuplicateDraft,
        handleDeleteDraft,
        handleUseTemplate,
        handleCreateCvFromProfile,
        handleNewResume,
        goToPastProjects,
        goToTemplates,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within a DashboardProvider");
  return ctx;
}
