"use client";

import { Suspense, useEffect } from "react";
import { BuilderView } from "@/components/dashboard/BuilderView";
import { useDashboard } from "@/components/dashboard/DashboardContext";

export default function BuilderPage() {
  const {
    drafts,
    setDrafts,
    refetchDrafts,
    activeEditingCv,
    setActiveEditingCv,
    handleOpenDraftInEditor,
    handleDuplicateDraft,
    handleDeleteDraft,
    updateDraftFromSavedCv,
    goToPastProjects,
    goToTemplates,
  } = useDashboard();

  // The dashboard is a persistent layout (DashboardProvider never remounts
  // while navigating within /dashboard/*), so its one-time query load would
  // otherwise go stale — re-fetch the resume list every time this page is
  // actually (re)entered.
  useEffect(() => {
    refetchDrafts();
    // Only on entering this page, not on every drafts/refetch identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // BuilderView reads the open flow from the URL (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <BuilderView
        drafts={drafts}
        setDrafts={setDrafts}
        activeEditingCv={activeEditingCv}
        setActiveEditingCv={setActiveEditingCv}
        onOpenDraftInEditor={handleOpenDraftInEditor}
        onDuplicateDraft={handleDuplicateDraft}
        onDeleteDraft={handleDeleteDraft}
        onUpdateDraftFromSavedCv={updateDraftFromSavedCv}
        onNavigateToPastProjects={goToPastProjects}
        onNavigateToTemplates={goToTemplates}
      />
    </Suspense>
  );
}
