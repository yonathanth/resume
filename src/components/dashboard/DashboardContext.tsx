"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAllDrafts, CV_DRAFTS_QUERY_KEY } from "@/hooks/use-cv-drafts";
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
  CvData,
  TemplateId,
  templateLabel,
} from "./create-flow/types";

interface DashboardContextValue {
  drafts: ResumeDraft[];
  /** True until the user's CVs have loaded the first time. */
  isLoadingDrafts: boolean;
  /** Re-fetches the drafts list from the server — called whenever the
   * builder page is (re)entered so it never shows a stale list. */
  refetchDrafts: () => void;
  setDrafts: React.Dispatch<React.SetStateAction<ResumeDraft[]>>;
  activeEditingCv: CvData | null;
  setActiveEditingCv: React.Dispatch<React.SetStateAction<CvData | null>>;

  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  isStartWithTemplateOpen: boolean;
  setIsStartWithTemplateOpen: (open: boolean) => void;
  /** Set when the create flow was opened from a career profile. */
  preselectedProfileId: string | null;
  preselectedTemplate: TemplateId | undefined;

  handleOpenDraftInEditor: (draft: ResumeDraft) => void;
  handleDuplicateDraft: (draft: ResumeDraft) => void;
  handleDeleteDraft: (id: string) => Promise<void>;
  updateDraftFromSavedCv: (savedCv: CvData) => void;
  handleUseTemplate: (templateId: TemplateId) => void;
  handleCreateCvFromProfile: (profileId: string) => void;
  handleNewResume: () => void;
  goToPastProjects: () => void;
  goToTemplates: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<ResumeDraft[]>([]);
  const { data: allDrafts, isLoading: isLoadingDrafts, refetch: refetchDrafts } = useAllDrafts();

  // Keeps `drafts` in sync with the live query data (not just a one-time
  // seed) — mutations below pair their optimistic `setDrafts` patch with an
  // invalidation of CV_DRAFTS_QUERY_KEY, so the real server-confirmed list
  // flows back in here as soon as that refetch resolves.
  useEffect(() => {
    if (allDrafts) {
      setDrafts(allDrafts);
    }
  }, [allDrafts]);

  const [activeEditingCv, setActiveEditingCv] = useState<CvData | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStartWithTemplateOpen, setIsStartWithTemplateOpen] = useState(false);
  const [preselectedProfileId, setPreselectedProfileId] = useState<string | null>(null);
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
      fullName: savedCv.personalInfo.fullName,
      targetRole: savedCv.targetRole,
      targetCompany: "General Application",
      atsScore: savedCv.atsScore,
      lastEdited: "just now",
      updatedAt: new Date().toISOString(),
      templateName: templateLabel(savedCv.templateStyle),
      templateId: savedCv.templateStyle,
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
    // Instant optimistic update above, then confirm/correct with the real
    // server state — the new/updated CV is already persisted by this point.
    queryClient.invalidateQueries({ queryKey: CV_DRAFTS_QUERY_KEY });
  };

  // Duplicates a draft by copying its REAL content into a new standalone
  // backend document (kept under the same career profile as the original,
  // if any), so editing the copy doesn't start blank.
  const handleDuplicateDraft = async (draft: ResumeDraft) => {
    try {
      const original = await getCvDocument(draft.id);
      const newDoc = await createCvDocument(original.profileId ?? undefined, original.templateId);
      const copyTitle = `${draft.title} (Copy)`;
      await updateCvContent(newDoc.id, { content: original.content, title: copyTitle });
      const duplicated: ResumeDraft = {
        ...toResumeDraft({ ...newDoc, content: original.content, title: copyTitle }),
        title: copyTitle,
      };
      setDrafts((prev) => [duplicated, ...prev]);
      queryClient.invalidateQueries({ queryKey: CV_DRAFTS_QUERY_KEY });
      handleOpenDraftInEditor(duplicated);
    } catch {
      const duplicated: ResumeDraft = {
        ...draft,
        id: `draft-${Date.now()}`,
        title: `${draft.title} (Copy)`,
        lastEdited: "just now",
        updatedAt: new Date().toISOString(),
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
    queryClient.invalidateQueries({ queryKey: CV_DRAFTS_QUERY_KEY });
  };

  const handleUseTemplate = (templateId: TemplateId) => {
    setPreselectedTemplate(templateId);
    setPreselectedProfileId(null);
    setIsStartWithTemplateOpen(true);
    router.push("/dashboard");
  };

  const handleCreateCvFromProfile = (profileId: string) => {
    setPreselectedProfileId(profileId);
    setPreselectedTemplate(undefined);
    setIsCreateModalOpen(true);
    router.push("/dashboard");
  };

  const handleNewResume = () => {
    setPreselectedProfileId(null);
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
        isLoadingDrafts,
        refetchDrafts: () => {
          void refetchDrafts();
        },
        setDrafts,
        activeEditingCv,
        setActiveEditingCv,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isStartWithTemplateOpen,
        setIsStartWithTemplateOpen,
        preselectedProfileId,
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
