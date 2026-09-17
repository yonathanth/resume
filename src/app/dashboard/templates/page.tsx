"use client";

import { TemplatesView } from "@/components/dashboard/TemplatesView";
import { useDashboard } from "@/components/dashboard/DashboardContext";

export default function TemplatesPage() {
  const { handleUseTemplate } = useDashboard();

  return <TemplatesView onUseTemplate={handleUseTemplate} />;
}
