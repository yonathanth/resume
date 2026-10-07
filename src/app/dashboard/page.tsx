"use client";

import { BuilderView } from "@/components/dashboard/BuilderView";
import { useDashboard } from "@/components/dashboard/DashboardContext";

export default function BuilderPage() {
  const {
    drafts,
    setDrafts,
    activeEditingCv,
    setActiveEditingCv,
    handleOpenDraftInEditor,
    handleDuplicateDraft,
    handleDeleteDraft,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isStartWithTemplateOpen,
    setIsStartWithTemplateOpen,
    preselectedProfileId,
    preselectedTemplate,
    goToPastProjects,
    goToTemplates,
  } = useDashboard();

  return (
    <BuilderView
      drafts={drafts}
      setDrafts={setDrafts}
      activeEditingCv={activeEditingCv}
      setActiveEditingCv={setActiveEditingCv}
      onOpenDraftInEditor={handleOpenDraftInEditor}
      onDuplicateDraft={handleDuplicateDraft}
      onDeleteDraft={handleDeleteDraft}
      isCreateModalOpenExternal={isCreateModalOpen}
      onCloseCreateModalExternal={() => setIsCreateModalOpen(false)}
      isStartWithTemplateModalOpenExternal={isStartWithTemplateOpen}
      onCloseStartWithTemplateModalExternal={() => setIsStartWithTemplateOpen(false)}
      preselectedProfileId={preselectedProfileId}
      preselectedTemplate={preselectedTemplate}
      onNavigateToPastProjects={goToPastProjects}
      onNavigateToTemplates={goToTemplates}
    />
  );
}
