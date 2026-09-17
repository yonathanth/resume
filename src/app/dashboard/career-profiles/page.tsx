"use client";

import { CareerProfilesView } from "@/components/dashboard/CareerProfilesView";
import { useDashboard } from "@/components/dashboard/DashboardContext";

export default function CareerProfilesPage() {
  const { savedProfiles, setSavedProfiles, handleCreateCvFromProfile } = useDashboard();

  return (
    <CareerProfilesView
      profiles={savedProfiles}
      onCreateCvFromProfile={handleCreateCvFromProfile}
      onSaveTrajectory={(t) => setSavedProfiles((prev) => [t, ...prev])}
    />
  );
}
