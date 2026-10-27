"use client";

import React, { useState } from "react";
import { Search, X } from "lucide-react";
import { groupTemplatesByCategory, useCvTemplates } from "@/hooks/use-cv-templates";
import { ApiCvTemplate } from "@/lib/api";
import { TemplateCard } from "@/components/dashboard/TemplatesView";
import { Reveal } from "@/components/Reveal";

// The public templates page's gallery: the same cards as the dashboard's
// TemplatesView (preview with a frosted name strip, "Use this template"
// under it). A card opens that template's own page (/templates/<id>); "Use
// this template" starts a CV with it straight away, no account needed yet.

const ALL = "All";

// One to four to a row (gap-x-6 is 1.5rem between cards), as in the dashboard.
const CARD_WIDTH = "w-full sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] xl:w-[calc((100%-4.5rem)/4)]";

export function TemplatesGallery() {
  const { data: templates, isLoading, isError } = useCvTemplates();
  const [category, setCategory] = useState<string>(ALL);
  const [searchQuery, setSearchQuery] = useState("");

  const groups = templates ? groupTemplatesByCategory(templates) : [];
  // One flat list in the backend's gallery order (the default, then the
  // newest); the filter chips are the only grouping.
  const ordered = templates ?? [];
  const query = searchQuery.trim().toLowerCase();
  const matchesSearch = (t: ApiCvTemplate) =>
    !query || t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query);
  const matching = ordered.filter(matchesSearch);
  const visible = category === ALL ? matching : matching.filter((t) => t.category === category);
  const filters = [
    { name: ALL, count: matching.length },
    ...groups.map((g) => ({ name: g.category, count: g.templates.filter(matchesSearch).length })),
  ];

  return (
    <div>
      <Reveal delay={100} className="flex flex-col items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates"
            aria-label="Search templates"
            className="w-full rounded-full border border-neutral-300 bg-white py-2.5 pl-10 pr-9 text-sm text-neutral-900 placeholder:text-neutral-400 transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-neutral-400 hover:text-neutral-800"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {groups.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Category">
            {filters.map(({ name, count }) => {
              const isActive = category === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  aria-pressed={isActive}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors ${
                    isActive
                      ? "border-accent bg-accent text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:text-neutral-950"
                  }`}
                >
                  {name}
                  <span className={`ml-1.5 ${isActive ? "text-white/75" : "text-neutral-400"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </Reveal>

      {isError && <p className="mt-10 text-center text-sm text-red-600">Couldn&apos;t load templates. Please refresh to try again.</p>}

      {!isLoading && !isError && visible.length === 0 && (
        <p className="mt-12 text-center text-sm text-neutral-500">No templates match. Try a different search or category.</p>
      )}

      {/* A wrapping row rather than a grid, so a last row that isn't full sits centred */}
      <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-10">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`${CARD_WIDTH} flex flex-col gap-3`}>
                <div className="aspect-[4/5] animate-pulse rounded-lg bg-neutral-100" />
                <div className="h-10 animate-pulse rounded-lg bg-neutral-100" />
              </div>
            ))
          : visible.map((template, i) => (
              // Cards fade up as they scroll in, staggered across each row.
              <Reveal key={template.id} delay={(i % 4) * 80} className={CARD_WIDTH}>
                <TemplateCard
                  template={template}
                  href={`/templates/${template.id}`}
                  useHref={`/try/create?template=${encodeURIComponent(template.id)}`}
                />
              </Reveal>
            ))}
      </div>
    </div>
  );
}
