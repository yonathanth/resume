"use client";

import { use } from "react";
import { ProfileEditorView } from "@/components/dashboard/career-profiles/ProfileEditorView";

// One career profile: its content (editable on Pro), the CVs linked to it,
// and its change history.
export default function CareerProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = use(params);
  return <ProfileEditorView profileId={profileId} />;
}
