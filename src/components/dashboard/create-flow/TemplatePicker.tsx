"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { groupTemplatesByCategory, useCvTemplates } from "@/hooks/use-cv-templates";
import type { ApiCvTemplate } from "@/lib/api";
import { TemplateId } from "./types";
import { TemplateThumbnail } from "./TemplateThumbnail";

const ALL = "All";
// Blur fades in from the bottom: fully blurred behind the text, clear over the top.
const FROST_MASK = "linear-gradient(to top, black 70%, transparent 100%)";

interface TemplatePickerProps {
  selectedId: TemplateId;
  onSelect: (id: TemplateId) => void;
  /** Double-click a template to select it and move on straight away. */
  onConfirm?: (id: TemplateId) => void;
}

/**
 * Real template previews (GET /api/v1/templates) in one list, filterable by category.
 * Columns follow the picker's own width, so it works in narrow and wide modals.
 */
export function TemplatePicker({ selectedId, onSelect, onConfirm }: TemplatePickerProps) {
  const { data: templates, isLoading, isError } = useCvTemplates();
  const [category, setCategory] = useState(ALL);

  if (isLoading) {
    return (
      <div className="@container">
        <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (isError || !templates?.length) {
    return <p className="text-xs text-red-600 text-center py-6">Couldn&apos;t load templates. Please try again.</p>;
  }

  const groups = groupTemplatesByCategory(templates);
  // One flat list in the backend's gallery order (the default, then the
  // newest); the filter chips are the only grouping.
  const ordered = templates ?? [];
  const visible = category === ALL ? ordered : ordered.filter((t) => t.category === category);

  const renderCard = (tmpl: ApiCvTemplate) => {
    const isSelected = selectedId === tmpl.id;
    const tags = [tmpl.twoColumn && "Two-column", tmpl.hasPhoto && "Photo"].filter(Boolean) as string[];
    return (
      <button
        key={tmpl.id}
        type="button"
        onClick={() => onSelect(tmpl.id)}
        onDoubleClick={() => onConfirm?.(tmpl.id)}
        aria-pressed={isSelected}
        // clip-path (not just overflow-hidden) so the scaled preview iframe
        // can't poke out past the rounded corners.
        className="group relative block w-full aspect-[4/5] rounded-lg overflow-hidden [clip-path:inset(0_round_0.5rem)] border border-neutral-200 hover:border-neutral-300 bg-white text-left transition-colors cursor-pointer focus:outline-none focus-visible:border-neutral-900"
      >
        <TemplateThumbnail
          templateId={tmpl.id}
          className="absolute inset-0 origin-top transition-transform duration-500 group-hover:scale-[1.02]"
          title={`${tmpl.name} template`}
        />

        {/* Same frosted glass as the resume cards: blur fading in from the bottom... */}
        <div
          className="absolute inset-x-0 bottom-0 h-[42%] backdrop-blur-lg"
          style={{ maskImage: FROST_MASK, WebkitMaskImage: FROST_MASK }}
        />
        {/* ...under a translucent white wash that thickens behind the text. */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/75 via-white/40 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-bold text-neutral-950 tracking-tight truncate">{tmpl.name}</h3>
            {tags.map((tag) => (
              <span
                key={tag}
                className="shrink-0 px-1.5 py-0.5 rounded-md bg-white/70 border border-white/80 text-[10px] font-medium text-neutral-600"
              >
                {tag}
              </span>
            ))}
          </div>
          {/* Phones (one card per row): the name only. */}
          {tmpl.description && (
            <div className="hidden @sm:block">
              <p className="mt-1 text-xs text-neutral-600 leading-snug line-clamp-2">{tmpl.description}</p>
            </div>
          )}
        </div>

        {isSelected && (
          <>
            {/* Drawn on top of the preview with the card's own radius, so the corners always match. */}
            <span className="pointer-events-none absolute -inset-px rounded-lg border-2 border-neutral-900" />
            <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center ring-2 ring-white">
              <Check className="w-4 h-4" strokeWidth={2.5} />
            </span>
          </>
        )}
      </button>
    );
  };

  return (
    <div className="@container">
      {groups.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {[ALL, ...groups.map((g) => g.category)].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                category === c
                  ? "bg-accent text-white border-accent"
                  : "bg-white text-neutral-600 border-neutral-200 hover:text-neutral-950 hover:border-neutral-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 gap-5">{visible.map(renderCard)}</div>
    </div>
  );
}
