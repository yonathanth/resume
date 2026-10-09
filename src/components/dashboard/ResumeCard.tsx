"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Copy, Download, MoreVertical, PenLine, Trash2 } from "lucide-react";
import { ApiError, downloadCvPdf, finalizeCvDocument, getCvThumbnail } from "@/lib/api";
import { CvPreviewFrame } from "./create-flow/CvPreviewFrame";
import { useToast } from "@/components/Toaster";
import { getCvFileName } from "@/lib/utils";
import { ResumeDraft, templateLabel } from "./create-flow/types";

/** A saved CV's first page, rendered by the backend with the CV's own template. */
export function CvThumbnail({ draft, className = "" }: { draft: Pick<ResumeDraft, "id" | "title" | "updatedAt">; className?: string }) {
  const { data, isError } = useQuery({
    // updatedAt busts the cached render after the CV is edited.
    queryKey: ["cv-thumbnail", draft.id, draft.updatedAt],
    queryFn: () => getCvThumbnail(draft.id),
    staleTime: Infinity,
    retry: false,
  });

  return (
    <div className={`relative bg-white overflow-hidden ${className}`}>
      {!data && !isError && <div className="absolute inset-0 animate-pulse bg-neutral-100" />}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-neutral-400">
          Preview unavailable
        </div>
      )}
      <CvPreviewFrame html={data?.html ?? null} bare firstPageOnly title={`${draft.title} preview`} />
    </div>
  );
}

/** Finalizes (validates) the CV and saves its PDF. Throws with a readable message. */
export async function downloadDraftPdf(draft: ResumeDraft): Promise<void> {
  await finalizeCvDocument(draft.id);
  const blob = await downloadCvPdf(draft.id);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getCvFileName(draft.fullName, draft.title);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code === "INCOMPLETE_DOCUMENT") {
    return "Some required details are missing. Open it in the editor to finish it first.";
  }
  return err instanceof ApiError ? err.message : "Could not download this resume. Please try again.";
}

interface ResumeCardProps {
  draft: ResumeDraft;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
  /** Show a Download PDF action. */
  allowDownload?: boolean;
  /** Lighter text, for places where the card shouldn't compete with the page's main actions. */
  quiet?: boolean;
}

// Frosted strip behind the title — same treatment as the Templates cards:
// fully blurred at the bottom, fading out above it, so most of the page shows.
const FROST_MASK = "linear-gradient(to top, black 60%, transparent 100%)";

/** A saved resume: its real first page under a frosted title strip, with actions in a menu. */
export function ResumeCard({ draft, onOpen, onDuplicate, onDelete, allowDownload = false, quiet = false }: ResumeCardProps) {
  const toast = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadDraftPdf(draft);
      toast.success("Your PDF is ready", { description: `Saved as ${getCvFileName(draft.fullName, draft.title)}`, moxie: "downloaded", placement: "top" });
    } catch (err) {
      toast.error(`Couldn't download "${draft.title}"`, { description: downloadErrorMessage(err) });
    } finally {
      setIsDownloading(false);
    }
  };

  const runMenuAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  const menuItemClass =
    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 transition-colors cursor-pointer disabled:opacity-50";

  return (
    <div className="relative group">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        title="Open in editor"
        // clip-path keeps the scaled preview inside the rounded corners.
        className="relative block aspect-[4/5] rounded-lg overflow-hidden [clip-path:inset(0_round_0.5rem)] border border-neutral-200 bg-white hover:border-accent-border transition-colors cursor-pointer focus:outline-none focus-visible:border-accent"
      >
        <CvThumbnail
          draft={draft}
          className="absolute inset-0 group-hover:scale-[1.02] origin-top transition-transform duration-500"
        />

        {/* Frosted glass: the page blurs out toward the bottom... */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/3 backdrop-blur-lg"
          style={{ maskImage: FROST_MASK, WebkitMaskImage: FROST_MASK }}
        />
        {/* ...under a translucent white wash that thickens behind the text. */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-white/80 via-white/45 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 px-5 py-4">
          <h3 className={`truncate tracking-tight ${quiet ? "text-sm font-semibold text-neutral-800" : "text-base font-bold text-neutral-950"}`}>
            {draft.title}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-600">
            <span className="truncate">
              {templateLabel(draft.templateId)} · Edited {draft.lastEdited}
            </span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-auto text-accent-strong opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </p>
        </div>
      </div>

      {/* Outside the clipped card so the dropdown can overflow it. */}
      <div ref={menuRef} className="absolute top-3 right-3 z-10">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Resume actions"
          className={`p-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/70 text-neutral-700 hover:bg-white/85 hover:text-neutral-950 shadow-sm transition-opacity cursor-pointer ${
            menuOpen ? "" : "sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
          }`}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-1.5 w-44 p-1 rounded-xl bg-white border border-neutral-200 shadow-lg"
          >
            <button type="button" role="menuitem" onClick={() => runMenuAction(onOpen)} className={menuItemClass}>
              <PenLine className="w-3.5 h-3.5" />
              Edit
            </button>
            <button type="button" role="menuitem" onClick={() => runMenuAction(onDuplicate)} className={menuItemClass}>
              <Copy className="w-3.5 h-3.5" />
              Duplicate
            </button>
            {allowDownload && (
              <button
                type="button"
                role="menuitem"
                disabled={isDownloading}
                onClick={() => runMenuAction(handleDownload)}
                className={menuItemClass}
              >
                <Download className="w-3.5 h-3.5" />
                {isDownloading ? "Preparing PDF..." : "Download PDF"}
              </button>
            )}
            {onDelete && (
              <>
                <div className="my-1 h-px bg-neutral-100" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runMenuAction(onDelete)}
                  className={`${menuItemClass} text-rose-600 hover:bg-rose-50 hover:text-rose-700`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
