"use client";

import { use } from "react";
import { TemplateDetailView } from "@/components/dashboard/TemplateDetailView";
import { useDashboard } from "@/components/dashboard/DashboardContext";

export default function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { handleUseTemplate } = useDashboard();

  // Keyed by id so moving to another template (e.g. from "More templates") starts fresh.
  return <TemplateDetailView key={id} templateId={id} onUseTemplate={handleUseTemplate} />;
}
