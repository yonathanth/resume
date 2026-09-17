"use client";

import { PastProjectsView } from "@/components/dashboard/PastProjectsView";
import { useDashboard } from "@/components/dashboard/DashboardContext";

export default function PastProjectsPage() {
  const {
    drafts,
    handleOpenDraftInEditor,
    handleDuplicateDraft,
    handleDeleteDraft,
    handleNewResume,
    handleUseTemplate,
  } = useDashboard();

  return (
    <PastProjectsView
      drafts={drafts}
      onOpenDraft={handleOpenDraftInEditor}
      onDuplicateDraft={handleDuplicateDraft}
      onDeleteDraft={handleDeleteDraft}
      onNewResume={handleNewResume}
      onUseTemplate={handleUseTemplate}
    />
  );
}
