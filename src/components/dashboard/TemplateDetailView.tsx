"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, LayoutTemplate } from "lucide-react";
import { useCvTemplates } from "@/hooks/use-cv-templates";
import { getCvTemplateSample } from "@/lib/api";
import { CvPreviewFrame } from "./create-flow/CvPreviewFrame";
import { ICON_TONES } from "./create-flow/OptionCard";
import { TemplateCard } from "./TemplatesView";

interface TemplateDetailViewProps {
  templateId: string;
  onUseTemplate: (templateId: string) => void;
}

const PERSONA_BUTTON =
  "p-2 rounded-lg bg-white border border-neutral-300 text-neutral-700 hover:text-neutral-950 hover:border-neutral-400 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
// How many other templates from the same category to suggest underneath.
const RELATED_COUNT = 4;

/** One template up close: a large real render you can flip through with different example CVs. */
export function TemplateDetailView({ templateId, onUseTemplate }: TemplateDetailViewProps) {
  const { data: templates, isLoading } = useCvTemplates();
  const template = templates?.find((t) => t.id === templateId);
  const [persona, setPersona] = useState(0);

  const { data: sample, isFetching: isSampleLoading } = useQuery({
    queryKey: ["cv-template-sample", templateId, persona],
    queryFn: () => getCvTemplateSample(templateId, persona),
    staleTime: Infinity,
    enabled: Boolean(template),
    // Keep showing the current example while the next one loads.
    placeholderData: (previous) => previous,
  });
  const personaCount = sample?.personaCount ?? 1;

  const backLink = (
    <Link
      href="/dashboard/templates"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-950 transition-colors mb-6"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      All templates
    </Link>
  );

  if (isLoading) {
    return (
      <div className="px-8 pt-6 pb-10 sm:px-14 sm:pt-8 lg:px-20 max-w-7xl mx-auto w-full">
        {backLink}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-10 items-start">
          <div className="max-w-[640px] w-full mx-auto aspect-[210/297] rounded-md bg-neutral-100 animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 w-24 rounded bg-neutral-100 animate-pulse" />
            <div className="h-7 w-48 rounded bg-neutral-100 animate-pulse" />
            <div className="h-16 rounded bg-neutral-100 animate-pulse" />
            <div className="h-11 rounded-lg bg-neutral-100 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="px-8 pt-6 pb-10 sm:px-14 sm:pt-8 lg:px-20 max-w-7xl mx-auto w-full">
        {backLink}
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
          <span className={`w-11 h-11 rounded-xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-b border ${ICON_TONES.neutral}`}>
            <LayoutTemplate className="w-5 h-5" />
          </span>
          <h2 className="text-base font-bold text-neutral-950">This template doesn&apos;t exist</h2>
          <p className="mt-1 text-sm text-neutral-500">It may have been renamed or removed.</p>
          <Link
            href="/dashboard/templates"
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800"
          >
            Browse templates
          </Link>
        </div>
      </div>
    );
  }

  const related = (templates ?? []).filter((t) => t.category === template.category && t.id !== template.id).slice(0, RELATED_COUNT);
  const facts = [
    template.twoColumn ? "Two-column layout" : "Single-column layout",
    template.hasPhoto ? "Has a photo" : "No photo",
    `${template.sections.length} sections`,
  ];

  return (
    <div className="px-8 pt-6 pb-10 sm:px-14 sm:pt-8 sm:pb-14 lg:px-20 lg:pb-16 max-w-7xl mx-auto w-full">
      {backLink}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-10 items-start">
        {/* Large real render, with example CVs to flip through */}
        <div>
          <div
            className={`relative max-w-[640px] mx-auto overflow-hidden border border-neutral-200 rounded-md shadow-lg bg-white transition-opacity ${
              isSampleLoading && sample ? "opacity-70" : ""
            }`}
          >
            <CvPreviewFrame html={sample?.html ?? null} bare title={`${template.name} template`} />
            {!sample && <div className="aspect-[210/297] bg-neutral-100 animate-pulse" />}
          </div>
          {personaCount > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPersona((p) => (p - 1 + personaCount) % personaCount)}
                disabled={isSampleLoading}
                className={PERSONA_BUTTON}
                aria-label="Previous example"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-neutral-600 min-w-[180px] text-center" aria-live="polite">
                Example {persona + 1} of {personaCount}
                {sample?.label ? ` · ${sample.label}` : ""}
              </span>
              <button
                type="button"
                onClick={() => setPersona((p) => (p + 1) % personaCount)}
                disabled={isSampleLoading}
                className={PERSONA_BUTTON}
                aria-label="Next example"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="lg:sticky lg:top-8 rounded-lg border border-neutral-300 bg-white p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-semibold text-neutral-500">{template.category}</p>
              {template.isDefault && (
                <span className="px-1.5 py-0.5 rounded bg-neutral-950 text-[10px] font-semibold uppercase tracking-wide text-white">Default</span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950">{template.name}</h1>
            <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{template.description}</p>
          </div>

          <ul className="space-y-1.5">
            {facts.map((fact) => (
              <li key={fact} className="flex items-center gap-2 text-sm text-neutral-700">
                <Check className="w-4 h-4 text-accent-strong shrink-0" />
                {fact}
              </li>
            ))}
          </ul>

          <div>
            <h2 className="text-xs font-semibold text-neutral-500 mb-2">Sections, in order</h2>
            <div className="flex flex-wrap gap-1.5">
              {template.sections.map((section) => (
                <span key={section.key} className="px-2.5 py-1 rounded-md border border-neutral-200 bg-neutral-50 text-[11px] font-medium text-neutral-700">
                  {section.label}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onUseTemplate(template.id)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Use this template
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="text-sm font-semibold text-neutral-600">More {template.category.toLowerCase()} templates</h2>
            <Link href="/dashboard/templates" className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-accent-strong transition-colors group">
              See all
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
            {related.map((t) => (
              <TemplateCard key={t.id} template={t} onUse={() => onUseTemplate(t.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
