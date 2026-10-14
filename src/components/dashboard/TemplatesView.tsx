"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, LayoutTemplate, RotateCw, Search, X } from "lucide-react";
import { groupTemplatesByCategory, SHOW_PHOTO_TEMPLATES, useCvTemplates } from "@/hooks/use-cv-templates";
import { ApiCvTemplate } from "@/lib/api";
import { TemplateThumbnail } from "./create-flow/TemplateThumbnail";
import { ICON_TONES } from "./create-flow/OptionCard";
import { TemplateId } from "./create-flow/types";

const ALL = "All";
// Frosted strip behind the name: fully blurred at the bottom, fading out above it.
const FROST_MASK = "linear-gradient(to top, black 60%, transparent 100%)";

// Same field style as the other dashboard pages (Past Projects, Career Profiles).
const FIELD_CLASS =
  "rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition";

type PhotoFilter = "any" | "with" | "without";

/** "Professional · Two-column · Photo" — what a template is, at a glance. */
export function templateFacts(template: ApiCvTemplate): string {
  return [template.category, template.twoColumn ? "Two-column" : "Single column", template.hasPhoto && "Photo"]
    .filter((part, i, all) => part && all.indexOf(part) === i)
    .join(" · ");
}

interface TemplateCardProps {
  template: ApiCvTemplate;
  onUse: () => void;
}

export function TemplateCard({ template, onUse }: TemplateCardProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* The card opens the template's detail page. */}
      <Link
        href={`/dashboard/templates/${template.id}`}
        title={`Preview ${template.name}`}
        // clip-path keeps the scaled preview iframe inside the rounded corners.
        className="group relative block aspect-[4/5] rounded-lg overflow-hidden [clip-path:inset(0_round_0.5rem)] border border-neutral-200 bg-white hover:border-accent-border transition-colors focus:outline-none focus-visible:border-accent"
      >
        <TemplateThumbnail
          templateId={template.id}
          className="absolute inset-0 origin-top transition-transform duration-500 group-hover:scale-[1.02]"
          title={`${template.name} template`}
        />

        {template.isDefault && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-neutral-950/85 text-[10px] font-semibold uppercase tracking-wide text-white">
            Default
          </span>
        )}
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/85 backdrop-blur border border-white text-[11px] font-semibold text-neutral-800 shadow-sm opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          <Eye className="w-3 h-3" /> Preview
        </span>

        {/* Frosted glass: the page blurs out toward the bottom... */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/3 backdrop-blur-lg"
          style={{ maskImage: FROST_MASK, WebkitMaskImage: FROST_MASK }}
        />
        {/* ...under a translucent white wash that thickens behind the text. */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-white/80 via-white/45 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 px-5 py-4">
          <h3 className="text-base font-bold text-neutral-950 tracking-tight truncate">{template.name}</h3>
          <p className="mt-0.5 text-xs text-neutral-600 truncate">{templateFacts(template)}</p>
        </div>
      </Link>

      <button
        type="button"
        onClick={onUse}
        className="group/use w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-accent-border bg-accent-soft text-accent-strong text-sm font-semibold hover:bg-accent hover:border-accent hover:text-white hover:shadow-[0_6px_16px_-8px_color-mix(in_srgb,var(--accent)_60%,transparent)] transition-all cursor-pointer"
      >
        Use this template
        <ArrowRight className="w-4 h-4 group-hover/use:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}

interface TemplatesViewProps {
  onUseTemplate: (templateId: TemplateId) => void;
}

export function TemplatesView({ onUseTemplate }: TemplatesViewProps) {
  const { data: templates, isLoading, isError, refetch, isRefetching } = useCvTemplates();
  const [category, setCategory] = useState<string>(ALL);
  const [photo, setPhoto] = useState<PhotoFilter>("any");
  const [searchQuery, setSearchQuery] = useState("");

  const groups = templates ? groupTemplatesByCategory(templates) : [];
  // One flat list in the backend's gallery order (the default, then the
  // newest); the filter chips are the only grouping.
  const ordered = templates ?? [];
  const query = searchQuery.trim().toLowerCase();
  const matchesSearchAndPhoto = (t: ApiCvTemplate) =>
    (!query || t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)) &&
    (photo === "any" || (photo === "with") === t.hasPhoto);
  const matching = ordered.filter(matchesSearchAndPhoto);
  const visible = category === ALL ? matching : matching.filter((t) => t.category === category);
  // Chip counts follow the search and photo filter, so a chip never promises templates that aren't there.
  const filters = [
    { name: ALL, count: matching.length },
    ...groups.map((g) => ({ name: g.category, count: g.templates.filter(matchesSearchAndPhoto).length })),
  ];
  const isFiltered = Boolean(query) || photo !== "any" || category !== ALL;

  const clearFilters = () => {
    setSearchQuery("");
    setPhoto("any");
    setCategory(ALL);
  };

  return (
    <div className="px-8 pt-6 pb-10 sm:px-14 sm:pt-8 sm:pb-14 lg:px-20 lg:pt-8 lg:pb-16 max-w-7xl mx-auto w-full">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates"
            aria-label="Search templates"
            className={`${FIELD_CLASS} w-full pl-10 pr-9 py-2.5`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-neutral-400 hover:text-neutral-800 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {/* Only offered while photo templates are listed (they're hidden for now). */}
        {SHOW_PHOTO_TEMPLATES && (
          <select
            value={photo}
            onChange={(e) => setPhoto(e.target.value as PhotoFilter)}
            aria-label="Photo"
            className={`${FIELD_CLASS} px-3 py-2.5 font-medium text-neutral-800 cursor-pointer lg:ml-auto self-start lg:self-auto`}
          >
            <option value="any">Photo: any</option>
            <option value="with">With a photo</option>
            <option value="without">Without a photo</option>
          </select>
        )}
      </div>

      {/* Category chips */}
      {groups.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Category">
          {filters.map(({ name, count }) => {
            const isActive = category === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setCategory(name)}
                aria-pressed={isActive}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  isActive
                    ? "bg-neutral-950 text-white border-neutral-950"
                    : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400 hover:text-neutral-950"
                }`}
              >
                {name}
                <span className={`ml-1.5 ${isActive ? "text-white/70" : "text-neutral-400"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {isError ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
          <h2 className="text-base font-bold text-neutral-950">Couldn&apos;t load templates</h2>
          <p className="mt-1 text-sm text-neutral-500">Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 cursor-pointer disabled:opacity-60"
          >
            <RotateCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-[4/5] rounded-lg bg-neutral-100 animate-pulse" />
              <div className="h-10 rounded-lg bg-neutral-100 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-sm font-semibold text-neutral-600">{category === ALL ? "All templates" : category}</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">{visible.length}</span>
            {isFiltered && (
              <button type="button" onClick={clearFilters} className="ml-auto text-xs font-medium text-neutral-500 hover:text-accent-strong cursor-pointer">
                Clear filters
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
              <span className={`w-11 h-11 rounded-xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-b border ${ICON_TONES.neutral}`}>
                <LayoutTemplate className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-neutral-950">No templates match</h2>
              <p className="mt-1 text-sm text-neutral-500">Try a different search or filter.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-semibold text-neutral-800 hover:border-neutral-400 cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
              {visible.map((template) => (
                <TemplateCard key={template.id} template={template} onUse={() => onUseTemplate(template.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
