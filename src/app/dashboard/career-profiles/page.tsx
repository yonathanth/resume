"use client";

import { CareerProfilesView } from "@/components/dashboard/CareerProfilesView";
import { useDashboard } from "@/components/dashboard/DashboardContext";

export default function CareerProfilesPage() {
  const { handleCreateCvFromProfile } = useDashboard();

  return <CareerProfilesView onCreateCvFromProfile={handleCreateCvFromProfile} />;
}
