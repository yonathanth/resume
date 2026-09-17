"use client";

import { use } from "react";
import { PastProjectsView } from "@/components/dashboard/PastProjectsView";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { useDraftsForProfile } from "@/hooks/use-cv-drafts";

export default function ProfileResumesPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = use(params);
  const { handleOpenDraftInEditor, handleDuplicateDraft, handleDeleteDraft } = useDashboard();
  const { data: drafts } = useDraftsForProfile(profileId);

  return (
    <PastProjectsView
      drafts={drafts ?? []}
      onOpenDraft={handleOpenDraftInEditor}
      onDuplicateDraft={handleDuplicateDraft}
      onDeleteDraft={handleDeleteDraft}
    />
  );
}
