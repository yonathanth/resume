"use client";

import React, { useState } from "react";
import Link from "next/link";
import { groupTemplatesByCategory, useCvTemplates } from "@/hooks/use-cv-templates";
import { ApiCvTemplate } from "@/lib/api";
import { TemplateThumbnail } from "@/components/dashboard/create-flow/TemplateThumbnail";
import { Reveal } from "@/components/Reveal";

// The public templates page's gallery — the same backend-rendered previews as
// the dashboard's TemplatesView, but every card leads to sign-up.

const ALL = "All";

function TemplateCard({ template, persona }: { template: ApiCvTemplate; persona: number }) {
  const tags = [template.twoColumn && "Two-column", template.hasPhoto && "Photo"].filter(Boolean) as string[];

  return (
    <Link href="/signup" className="group flex flex-col focus:outline-none">
      {/* clip-path keeps the preview iframe inside the rounded corners. */}
      <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white transition-all duration-300 [clip-path:inset(0_round_0.5rem)] group-hover:-translate-y-1 group-hover:border-accent-border group-hover:shadow-[0_18px_40px_-24px_rgba(15,17,21,0.3)] group-focus-visible:border-accent">
        <TemplateThumbnail
          templateId={template.id}
          persona={persona}
          title={`${template.name} template example`}
          className="aspect-[210/297] w-full"
        />
        {/* Hover prompt */}
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="inline-flex translate-y-1 items-center rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold tracking-[-0.01em] text-white shadow-[0_10px_24px_-10px_rgba(255,94,31,0.6)] transition-transform duration-200 group-hover:translate-y-0">
            Use this template
          </span>
        </div>
      </div>
      <div className="mt-3.5">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[16px] font-semibold tracking-tight text-neutral-950">{template.name}</h3>
          {tags.map((tag) => (
            <span key={tag} className="shrink-0 rounded-md border border-neutral-200 px-1.5 py-0.5 text-[10.5px] font-medium text-neutral-500">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export function TemplatesGallery() {
  const { data: templates, isLoading, isError } = useCvTemplates();
  const [category, setCategory] = useState<string>(ALL);

  const groups = templates ? groupTemplatesByCategory(templates) : [];
  const ordered = groups.flatMap((g) => g.templates);
  const visible = category === ALL ? ordered : ordered.filter((t) => t.category === category);
  const filters = [{ name: ALL, count: ordered.length }, ...groups.map((g) => ({ name: g.category, count: g.templates.length }))];

  return (
    <div>
      {groups.length > 1 && (
        <Reveal delay={100} className="flex flex-wrap justify-center gap-2">
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
        </Reveal>
      )}

      {isError && <p className="mt-10 text-center text-sm text-red-600">Couldn&apos;t load templates. Please refresh to try again.</p>}

      <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[210/297] animate-pulse rounded-lg bg-neutral-100" />
                <div className="mt-3.5 h-5 w-1/2 animate-pulse rounded bg-neutral-100" />
              </div>
            ))
          : visible.map((template, i) => (
              // Cards fade up as they scroll in, staggered across each row.
              <Reveal key={template.id} delay={(i % 3) * 90}>
                <TemplateCard template={template} persona={i % 5} />
              </Reveal>
            ))}
      </div>
    </div>
  );
}
