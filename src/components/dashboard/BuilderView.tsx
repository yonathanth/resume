"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDashboard } from "./DashboardContext";
import { isFlowClosed, readOpenFlow } from "@/lib/flow-url";
import {
  FilePlus,
  Target,
  PenLine,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { CreateCvModal } from "./create-flow/CreateCvModal";
import { TailorCvModal } from "./create-flow/TailorCvModal";
import { EnhanceCvModal } from "./create-flow/EnhanceCvModal";
import { CvEditorWorkspace } from "./create-flow/CvEditorWorkspace";
import { ConfirmDialog } from "./ConfirmDialog";
import { ResumeCard } from "./ResumeCard";
import { DashboardMoxie } from "./DashboardMoxie";
import { GettingStartedChecklist } from "./GettingStartedChecklist";
import {
  CvData,
  PastProjectOption,
  defaultSampleCv,
  ResumeDraft,
  INITIAL_DRAFTS,
  TemplateId,
  templateLabel,
  DEFAULT_TEMPLATE_ID,
} from "./create-flow/types";
import { ICON_TONES } from "./create-flow/OptionCard";

export type { ResumeDraft };

// The soft lift the dashboard's action cards share.
const CARD_SHADOW = "shadow-[0_1px_2px_rgba(15,17,21,0.04),0_8px_20px_-14px_rgba(15,17,21,0.18)]";
const CARD_HOVER = "hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(15,17,21,0.04),0_14px_28px_-16px_rgba(15,17,21,0.25)] transition-all duration-200";

// Each action card gets a soft wash in its icon's colour, fading to white,
// with a border and arrow in the same hue.
const ACTION_CARD_COLORS = {
  create: "bg-[linear-gradient(135deg,#fff1e8_0%,#fff8f3_45%,#ffffff_100%)] border-[#f3cfbb] hover:border-[#eab08f]",
  // As strong as the create card's wash, so all three read as real options.
  tailor: {
    card: "bg-[linear-gradient(135deg,#d9edf5_0%,#eef7fa_50%,#ffffff_100%)] border-[#a9d2e1] hover:border-[#6fb2ca]",
    arrow: "bg-sky-600 text-white shadow-[0_4px_10px_-4px_rgba(2,132,199,0.6)] group-hover:bg-sky-700",
  },
  improve: {
    card: "bg-[linear-gradient(135deg,#e9e1fc_0%,#f4f0fe_50%,#ffffff_100%)] border-[#c7b7f0] hover:border-[#a68ce6]",
    arrow: "bg-violet-600 text-white shadow-[0_4px_10px_-4px_rgba(124,58,237,0.6)] group-hover:bg-violet-700",
  },
} as const;

interface BuilderViewProps {
  onOpenStudio?: (draftId?: string) => void;
  onNavigateToPastProjects?: () => void;
  drafts?: ResumeDraft[];
  setDrafts?: React.Dispatch<React.SetStateAction<ResumeDraft[]>>;
  activeEditingCv?: CvData | null;
  setActiveEditingCv?: (cv: CvData | null) => void;
  onOpenDraftInEditor?: (draft: ResumeDraft) => void;
  onDuplicateDraft?: (draft: ResumeDraft) => void;
  onDeleteDraft?: (id: string) => void | Promise<void>;
  onUpdateDraftFromSavedCv?: (savedCv: CvData) => void;
}

export function BuilderView({
  onOpenStudio,
  onNavigateToPastProjects,
  drafts: externalDrafts,
  setDrafts: externalSetDrafts,
  activeEditingCv: externalActiveEditingCv,
  setActiveEditingCv: externalSetActiveEditingCv,
  onOpenDraftInEditor: externalOpenDraftInEditor,
  onDuplicateDraft: externalDuplicateDraft,
  onDeleteDraft: externalDeleteDraft,
  onUpdateDraftFromSavedCv: externalUpdateDraftFromSavedCv,
}: BuilderViewProps) {
  // Local states as fallbacks
  const [localDrafts, setLocalDrafts] = useState<ResumeDraft[]>(INITIAL_DRAFTS);
  const [localActiveEditingCv, setLocalActiveEditingCv] = useState<CvData | null>(
    null
  );

  const drafts = externalDrafts ?? localDrafts;
  const setDrafts = externalSetDrafts ?? setLocalDrafts;
  const activeEditingCv =
    externalActiveEditingCv !== undefined
      ? externalActiveEditingCv
      : localActiveEditingCv;
  const setActiveEditingCv =
    externalSetActiveEditingCv ?? setLocalActiveEditingCv;

  // The open flow is whatever the URL says (see flow-url): a refresh reopens
  // it, Back closes it. One already closed or finished (Back onto its old
  // steps) isn't reopened — the URL goes back to the plain dashboard.
  const { openFlow, closeFlow, openFinishedCv, handleTailorDraft } = useDashboard();
  const searchParams = useSearchParams();
  const urlFlow = readOpenFlow(new URLSearchParams(searchParams.toString()));
  const openFlowNow = urlFlow && !isFlowClosed(urlFlow.session) ? urlFlow : null;
  // Only when the URL itself lands on a closed flow (opening the page, or
  // Back). Not when a flow is closed while its URL is still showing: finishing
  // one marks it closed and then navigates to the editor, and rewriting the
  // URL to /dashboard mid-navigation would cancel that and strand you here.
  const urlSession = urlFlow?.session ?? null;
  const urlFrom = urlFlow?.from ?? "/dashboard";
  const router = useRouter();
  useEffect(() => {
    if (!urlSession || !isFlowClosed(urlSession)) return;
    if (urlFrom === "/dashboard") window.history.replaceState(null, "", "/dashboard");
    else router.replace(urlFrom, { scroll: false });
  }, [urlSession, urlFrom, router]);
  const finishFlow = (cvData: CvData) => {
    if (openFlowNow) void openFinishedCv(cvData, openFlowNow.session, openFlowNow.kind);
  };
  const [pendingAction, setPendingAction] = useState<{
    type: "delete" | "duplicate";
    draft: ResumeDraft;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const requestAction = (type: "delete" | "duplicate", draft: ResumeDraft) => {
    setDeleteError(null);
    setPendingAction({ type, draft });
  };

  const pastProjectsList: PastProjectOption[] = drafts.map((d) => ({
    id: d.id,
    title: d.title,
    role: d.targetRole,
    company: d.targetCompany,
    atsScore: d.atsScore,
    templateStyle: (d.templateId as TemplateId | undefined) ?? DEFAULT_TEMPLATE_ID,
    lastEdited: d.lastEdited,
    updatedAt: d.updatedAt,
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

  // Fallback-only: builds a placeholder CV from a draft's summary fields.
  // Used solely when this component is rendered standalone, without the
  // real DashboardContext handlers (which fetch the CV's actual saved
  // content) passed in as props.
  const localOpenDraftInEditor = (draft: ResumeDraft) => {
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

  const localDeleteDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  // Duplicate draft and immediately open the copied one in editor!
  const localDuplicateDraft = (draft: ResumeDraft) => {
    const duplicated: ResumeDraft = {
      ...draft,
      id: `draft-${Date.now()}`,
      title: `${draft.title} (Copy)`,
      lastEdited: "just now",
      updatedAt: new Date().toISOString(),
    };
    setDrafts((prev) => [duplicated, ...prev]);
    localOpenDraftInEditor(duplicated);
  };

  // Upserts the drafts list from a just-saved CV — fallback-only (the real
  // DashboardContext version also invalidates the cv-drafts query so other
  // views refetch immediately).
  const localUpdateDraftFromSavedCv = (savedCv: CvData) => {
    const newDraft: ResumeDraft = {
      id: savedCv.id && savedCv.id !== "cv-new" ? savedCv.id : `draft-${Date.now()}`,
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
      const existingIdx = prev.findIndex((d) => d.id === newDraft.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newDraft;
        return copy;
      }
      return [newDraft, ...prev];
    });
  };

  const openDraftInEditor = externalOpenDraftInEditor ?? localOpenDraftInEditor;
  const duplicateDraft = externalDuplicateDraft ?? localDuplicateDraft;
  const deleteDraft = externalDeleteDraft ?? localDeleteDraft;
  const updateDraftFromSavedCv = externalUpdateDraftFromSavedCv ?? localUpdateDraftFromSavedCv;

  // If a CV is open for editing, render the Form + Live Preview Combo Workspace
  if (activeEditingCv) {
    return (
      <CvEditorWorkspace
        initialData={activeEditingCv}
        onBack={() => setActiveEditingCv(null)}
        onSave={(savedCv) => {
          updateDraftFromSavedCv(savedCv);
          setActiveEditingCv(null);
        }}
      />
    );
  }

  return (
    <div className="px-8 pt-6 pb-10 sm:px-14 sm:pt-8 sm:pb-14 lg:px-20 lg:pt-8 lg:pb-16 max-w-7xl mx-auto w-full">

      {/* ACTIONS: creating a resume leads; improving, then tailoring, sit beside it. */}
      {/* Create stays a little wider (~55/45) without crowding out the other two. */}
      <div data-tour="builder-actions" className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 mb-14">
        <div
          className={`flex rounded-lg border ${ACTION_CARD_COLORS.create} ${CARD_SHADOW} ${CARD_HOVER}`}
        >
          <button
            type="button"
            onClick={() => openFlow("create")}
            className="group flex-1 flex items-center gap-5 p-6 sm:p-7 text-left rounded-lg cursor-pointer"
          >
            <span className={`w-14 h-14 shrink-0 rounded-xl flex items-center justify-center bg-gradient-to-b border ${ICON_TONES.accent}`}>
              <FilePlus className="w-6 h-6" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base sm:text-lg font-semibold tracking-tight text-neutral-950">Create a new resume</span>
              <span className="block mt-0.5 text-[13px] sm:text-sm text-neutral-500">Start fresh, ready in minutes</span>
            </span>
            {/* Small screens: the same round arrow as Tailor / Improve; sm+: a "Start" button. */}
            <span className="sm:hidden w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-accent text-white shadow-[0_4px_10px_-4px_rgba(249,115,22,0.6)] group-hover:bg-accent-strong transition-colors">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-px transition-transform" />
            </span>
            <span className="hidden sm:inline-flex shrink-0 items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold group-hover:bg-accent-strong transition-colors">
              Start
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {(
            [
              { title: "Improve a CV", description: "Strengthen one you already have", Icon: PenLine, tone: ICON_TONES.violet, colors: ACTION_CARD_COLORS.improve, onClick: () => openFlow("improve") },
              { title: "Tailor to a job", description: "Match your CV to a job posting", Icon: Target, tone: ICON_TONES.sky, colors: ACTION_CARD_COLORS.tailor, onClick: () => openFlow("tailor") },
            ] as const
          ).map(({ title, description, Icon, tone, colors, onClick }) => (
            <button
              key={title}
              type="button"
              onClick={onClick}
              className={`group flex-1 flex items-center gap-4 p-5 rounded-lg border text-left cursor-pointer ${colors.card} ${CARD_SHADOW} ${CARD_HOVER}`}
            >
              <span className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-gradient-to-b border ${tone}`}>
                <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold tracking-tight text-neutral-950">{title}</span>
                <span className="block mt-0.5 text-[13px] text-neutral-600">{description}</span>
              </span>
              <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-colors ${colors.arrow}`}>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-px transition-transform" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* First steps for a new account (hidden once done, or closed). */}
      <GettingStartedChecklist />

      {/* RECENT RESUMES SECTION HEADER WITH 'SEE ALL' BUTTON */}
      <div data-tour="recent-resumes" className="flex items-center justify-between gap-4 mb-5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="whitespace-nowrap text-sm font-semibold text-neutral-600">
            Recent resumes
          </h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
            {drafts.length}
          </span>
        </div>

        {/* See All link redirecting to Past Projects */}
        <button
          type="button"
          onClick={onNavigateToPastProjects}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-neutral-500 hover:text-accent-strong transition-colors cursor-pointer group"
        >
          <span>See all</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* RESUMES WORKSPACE GRID */}
      {drafts.length === 0 ? (
        <div className="px-6 py-12 text-center rounded-3xl bg-neutral-50 border border-neutral-200/80">
          <DashboardMoxie animation="emptyFolder" size={120} className="mx-auto -mt-4 mb-2" />
          <h3 className="text-sm font-bold text-neutral-950">No resumes yet</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {drafts.slice(0, 6).map((draft) => (
            <ResumeCard
              key={draft.id}
              draft={draft}
              onOpen={() => openDraftInEditor(draft)}
              onDuplicate={() => requestAction("duplicate", draft)}
              onDelete={() => requestAction("delete", draft)}
              onTailor={() => handleTailorDraft(draft)}
              quiet
            />
          ))}
        </div>
      )}

      {/* The open flow, from the URL. Each is mounted only while open (keyed
          by this opening), so closing it (X) throws away its progress and the
          next open starts from the first step. Unmounting also cleans up any
          half-made CV (see useDraftCvLifecycle). */}
      {openFlowNow?.kind === "create" && (
        <CreateCvModal
          key={openFlowNow.session}
          isOpen
          onClose={() => closeFlow(openFlowNow.session, openFlowNow.from)}
          onComplete={finishFlow}
          initialTemplate={openFlowNow.template as TemplateId | undefined}
          initialProfileId={openFlowNow.profile ?? null}
        />
      )}
      {openFlowNow?.kind === "tailor" && (
        <TailorCvModal
          key={openFlowNow.session}
          isOpen
          onClose={() => closeFlow(openFlowNow.session, openFlowNow.from)}
          onComplete={finishFlow}
          pastProjects={pastProjectsList}
          initialSourceCvId={openFlowNow.cv ?? null}
          initialTemplate={openFlowNow.template as TemplateId | undefined}
        />
      )}
      {openFlowNow?.kind === "improve" && (
        <EnhanceCvModal
          key={openFlowNow.session}
          isOpen
          onClose={() => closeFlow(openFlowNow.session, openFlowNow.from)}
          onComplete={finishFlow}
          pastProjects={pastProjectsList}
        />
      )}

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={pendingAction?.type === "delete" ? "Delete this resume?" : "Duplicate this resume?"}
        description={
          pendingAction?.type === "delete"
            ? `"${pendingAction.draft.title}" will be permanently deleted. This can't be undone.`
            : `A copy of "${pendingAction?.draft.title}" will be created and opened for editing.`
        }
        confirmLabel={pendingAction?.type === "delete" ? "Delete" : "Duplicate"}
        processingLabel="Deleting..."
        isProcessing={isDeleting}
        error={deleteError}
        danger={pendingAction?.type === "delete"}
        onCancel={() => setPendingAction(null)}
        onConfirm={async () => {
          if (!pendingAction) return;
          if (pendingAction.type === "duplicate") {
            duplicateDraft(pendingAction.draft);
            setPendingAction(null);
            return;
          }
          setIsDeleting(true);
          setDeleteError(null);
          try {
            await deleteDraft(pendingAction.draft.id);
            setPendingAction(null);
          } catch {
            setDeleteError("Could not delete this resume. Please try again.");
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </div>
  );
}
