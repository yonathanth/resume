"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
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
import type { FlowKind } from "@/lib/flow-drafts";
import { dashboardFlowHref, markFlowClosed } from "@/lib/flow-url";
import { editorHref, ensureSavedCv, fillAccountFromFinishedCv } from "@/lib/finished-cv";
import { clearTryHandoff } from "@/lib/try-handoff";
import { ME_QUERY_KEY } from "@/hooks/use-auth";
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

  handleOpenDraftInEditor: (draft: ResumeDraft) => void;
  handleDuplicateDraft: (draft: ResumeDraft) => void;
  handleDeleteDraft: (id: string) => Promise<void>;
  updateDraftFromSavedCv: (savedCv: CvData) => void;
  handleUseTemplate: (templateId: TemplateId) => void;
  handleCreateCvFromProfile: (profileId: string) => void;
  handleNewResume: () => void;
  /** Opens a flow on the Builder — in its URL, so a refresh reopens it and Back closes it (see flow-url). */
  openFlow: (flow: FlowKind, options?: { template?: string; profile?: string }) => void;
  /** Closes the open flow (✕): back to the plain dashboard URL. */
  closeFlow: (session: string, from?: string) => void;
  /** A flow finished: its CV opens on its own editor page, in place of the flow's URL. */
  openFinishedCv: (cv: CvData, session: string, flow: FlowKind) => Promise<void>;
  goToPastProjects: () => void;
  goToTemplates: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

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

  // Every flow opens through its URL (see flow-url): from any dashboard page,
  // it lands on the Builder with the flow open on top.
  const openFlow = (flow: FlowKind, options: { template?: string; profile?: string } = {}) => {
    router.push(dashboardFlowHref(flow, { ...options, from: pathname }), { scroll: false });
  };

  // Back to the page the flow was opened from (Past projects, Templates…).
  // Closing or finishing a flow ends a /try handoff (see lib/try-handoff):
  // onboarding no longer waits for it.
  const closeFlow = (session: string, from = "/dashboard") => {
    markFlowClosed(session);
    clearTryHandoff();
    router.replace(from, { scroll: false });
  };

  const openFinishedCv = async (cv: CvData, session: string, flow: FlowKind) => {
    markFlowClosed(session);
    try {
      const id = await ensureSavedCv(cv);
      queryClient.invalidateQueries({ queryKey: CV_DRAFTS_QUERY_KEY });
      // A first CV can answer onboarding's questions (a /try sign-up, or an upload during onboarding).
      const user = await fillAccountFromFinishedCv(id, flow);
      if (user) queryClient.setQueryData(ME_QUERY_KEY, user);
      clearTryHandoff();
      router.replace(editorHref(id, flow), { scroll: false });
    } catch {
      // Couldn't save it as a document just now: open it here, where the editor saves it on the first change.
      clearTryHandoff();
      router.replace("/dashboard", { scroll: false });
      setActiveEditingCv(cv);
    }
  };

  const handleUseTemplate = (templateId: TemplateId) => openFlow("create", { template: templateId });
  const handleCreateCvFromProfile = (profileId: string) => openFlow("create", { profile: profileId });
  const handleNewResume = () => openFlow("create");

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
        handleOpenDraftInEditor,
        handleDuplicateDraft,
        handleDeleteDraft,
        updateDraftFromSavedCv,
        handleUseTemplate,
        handleCreateCvFromProfile,
        handleNewResume,
        openFlow,
        closeFlow,
        openFinishedCv,
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
