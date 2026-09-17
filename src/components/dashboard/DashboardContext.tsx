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
  ApiError,
  getCvDocument,
  deleteCvDocument,
  createCvDocument,
  updateCvContent,
} from "@/lib/api";
import { toResumeDraft } from "@/lib/cv-mapper";
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
  handleDeleteDraft: (id: string) => Promise<void>;
  updateDraftFromSavedCv: (savedCv: CvData) => void;
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

  // Seed saved profiles from the backend once on load; local edits (creating
  // a new one) take over from there.
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

  // Opens a draft in its own dedicated editor page (a real route, not an
  // overlay component swapped in over whichever page triggered it) — the
  // page itself fetches the CV's real saved content by id.
  const handleOpenDraftInEditor = (draft: ResumeDraft) => {
    router.push(`/dashboard/editor/${draft.id}`);
  };

  // Upserts the drafts list from a just-saved CV — shared by the editor page
  // and the "open studio directly" flow after generating a new CV.
  const updateDraftFromSavedCv = (savedCv: CvData) => {
    const id = savedCv.id && savedCv.id !== "cv-new" ? savedCv.id : `draft-${Date.now()}`;
    const newDraft: ResumeDraft = {
      id,
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
      const existingIdx = prev.findIndex((d) => d.id === id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newDraft;
        return copy;
      }
      return [newDraft, ...prev];
    });
  };

  // Duplicates a draft by copying its REAL content into a new standalone
  // backend document (kept under the same career profile as the original,
  // if any), so editing the copy doesn't start blank.
  const handleDuplicateDraft = async (draft: ResumeDraft) => {
    try {
      const original = await getCvDocument(draft.id);
      const newDoc = await createCvDocument(original.profileId ?? undefined);
      const copyTitle = `${draft.title} (Copy)`;
      await updateCvContent(newDoc.id, { content: original.content, title: copyTitle });
      const duplicated: ResumeDraft = {
        ...toResumeDraft({ ...newDoc, content: original.content, title: copyTitle }),
        title: copyTitle,
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

  // Waits for the actual backend delete before removing it from the local
  // list, so callers can show a real "Deleting..." state and surface a real
  // failure instead of silently pretending it succeeded. A 404 means this
  // was never a real backend document (e.g. a local-only fallback draft) —
  // still safe to remove locally in that case.
  const handleDeleteDraft = async (id: string) => {
    try {
      await deleteCvDocument(id);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        throw err;
      }
    }
    setDrafts((prev) => prev.filter((d) => d.id !== id));
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
        updateDraftFromSavedCv,
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
