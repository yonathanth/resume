"use client";

import React, { useState } from "react";
import { ArrowRight, Copy, Download, FileText, LayoutGrid, List, Plus, Search, Trash2, X } from "lucide-react";
import { ResumeDraft, TemplateId, templateLabel } from "./create-flow/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { CvThumbnail, ResumeCard, downloadDraftPdf, downloadErrorMessage } from "./ResumeCard";
import { ICON_TONES } from "./create-flow/OptionCard";
import { useToast } from "@/components/Toaster";

interface PastProjectsViewProps {
  drafts?: ResumeDraft[];
  /** True until the resumes have loaded — shows placeholders instead of the empty state. */
  isLoading?: boolean;
  onOpenDraft?: (draft: ResumeDraft) => void;
  onDuplicateDraft?: (draft: ResumeDraft) => void;
  onDeleteDraft?: (id: string) => void | Promise<void>;
  onNewResume?: () => void;
  onUseTemplate?: (templateId: TemplateId) => void;
}

// Same field and button styles as the other dashboard pages (Career
// Profiles, Settings).
const FIELD_CLASS =
  "rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition";
const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer";
const ICON_BUTTON = "p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50";

type SortBy = "edited" | "title";
type ViewMode = "grid" | "list";

export function PastProjectsView({
  drafts = [],
  isLoading = false,
  onOpenDraft,
  onDuplicateDraft,
  onDeleteDraft,
  onNewResume,
}: PastProjectsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("edited");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [pendingAction, setPendingAction] = useState<{ type: "delete" | "duplicate"; draft: ResumeDraft } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const toast = useToast();

  const requestAction = (type: "delete" | "duplicate", draft: ResumeDraft) => {
    setDeleteError(null);
    setPendingAction({ type, draft });
  };

  const query = searchQuery.trim().toLowerCase();
  const filteredDrafts = drafts
    .filter((d) => !query || d.title.toLowerCase().includes(query) || d.targetRole.toLowerCase().includes(query))
    .sort((a, b) =>
      sortBy === "title" ? a.title.localeCompare(b.title) : (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
    );

  const handleListDownload = async (draft: ResumeDraft) => {
    setDownloadingId(draft.id);
    try {
      await downloadDraftPdf(draft);
      toast.success("Your PDF is ready", { description: draft.title });
    } catch (err) {
      toast.error(`Couldn't download "${draft.title}"`, { description: downloadErrorMessage(err) });
    } finally {
      setDownloadingId(null);
    }
  };

  const hasDrafts = drafts.length > 0;

  return (
    <div className="px-8 pt-6 pb-10 sm:px-14 sm:pt-8 sm:pb-14 lg:px-20 lg:pt-8 lg:pb-16 max-w-7xl mx-auto w-full">
      {/* Toolbar: search on the left, view controls and the main action on the right. */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-8">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or role"
            aria-label="Search resumes"
            disabled={!hasDrafts}
            className={`${FIELD_CLASS} w-full pl-10 pr-9 py-2.5 disabled:bg-neutral-50`}
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

        <div className="flex items-center gap-2.5 lg:ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            aria-label="Sort resumes"
            className={`${FIELD_CLASS} px-3 py-2.5 font-medium text-neutral-800 cursor-pointer`}
          >
            <option value="edited">Last edited</option>
            <option value="title">A–Z</option>
          </select>

          <div role="group" aria-label="View" className="flex items-center p-1 rounded-lg border border-neutral-300 bg-white">
            {(
              [
                { mode: "grid", Icon: LayoutGrid, label: "Grid view" },
                { mode: "list", Icon: List, label: "List view" },
              ] as const
            ).map(({ mode, Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                title={label}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === mode ? "bg-neutral-950 text-white" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {onNewResume && (
            <button type="button" onClick={onNewResume} className={`${PRIMARY_BUTTON} ml-auto lg:ml-0`}>
              <Plus className="w-4 h-4" />
              New resume
            </button>
          )}
        </div>
      </div>

      {/* Section header, like the Builder's "Recent resumes". */}
      {!isLoading && hasDrafts && (
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-sm font-semibold text-neutral-600">{query ? "Search results" : "All resumes"}</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
            {filteredDrafts.length}
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
          <span className={`w-11 h-11 rounded-xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-b border ${ICON_TONES.neutral}`}>
            {hasDrafts ? <Search className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </span>
          <h2 className="text-base font-bold text-neutral-950">{hasDrafts ? "No matching resumes" : "No resumes yet"}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {hasDrafts ? `Nothing matches “${searchQuery.trim()}”. Try a different search.` : "Every resume you create is saved here."}
          </p>
          {hasDrafts ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-semibold text-neutral-800 hover:border-neutral-400 cursor-pointer"
            >
              Clear search
            </button>
          ) : (
            onNewResume && (
              <button type="button" onClick={onNewResume} className={`${PRIMARY_BUTTON} mt-5`}>
                <Plus className="w-4 h-4" />
                Create your first resume
              </button>
            )
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {filteredDrafts.map((draft) => (
            <ResumeCard
              key={draft.id}
              draft={draft}
              allowDownload
              onOpen={() => onOpenDraft?.(draft)}
              onDuplicate={() => requestAction("duplicate", draft)}
              onDelete={onDeleteDraft ? () => requestAction("delete", draft) : undefined}
            />
          ))}
        </div>
      ) : (
        <ul className="rounded-lg border border-neutral-300 bg-white divide-y divide-neutral-200 overflow-hidden">
          {filteredDrafts.map((draft) => (
            <li key={draft.id} className="group flex items-center gap-4 px-4 py-3 hover:bg-neutral-50 transition-colors">
              <button
                type="button"
                onClick={() => onOpenDraft?.(draft)}
                className="w-11 shrink-0 aspect-[210/297] overflow-hidden rounded border border-neutral-200 cursor-pointer"
                title="Open in editor"
              >
                <CvThumbnail draft={draft} />
              </button>
              <button type="button" onClick={() => onOpenDraft?.(draft)} className="min-w-0 flex-1 text-left cursor-pointer">
                <span className="block text-sm font-semibold text-neutral-950 truncate group-hover:text-accent-strong transition-colors">
                  {draft.title}
                </span>
                <span className="block text-xs text-neutral-500 mt-0.5 truncate">
                  {templateLabel(draft.templateId)} · Edited {draft.lastEdited}
                </span>
              </button>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  disabled={downloadingId === draft.id}
                  onClick={() => handleListDownload(draft)}
                  className={ICON_BUTTON}
                  title={downloadingId === draft.id ? "Preparing PDF..." : "Download PDF"}
                >
                  <Download className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => requestAction("duplicate", draft)} className={ICON_BUTTON} title="Duplicate">
                  <Copy className="w-4 h-4" />
                </button>
                {onDeleteDraft && (
                  <button
                    type="button"
                    onClick={() => requestAction("delete", draft)}
                    className="p-2 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenDraft?.(draft)}
                  className="ml-2 hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-accent-border bg-accent-soft text-accent-strong text-xs font-semibold hover:bg-accent hover:border-accent hover:text-white transition-colors cursor-pointer"
                >
                  Open
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={pendingAction?.type === "delete" ? "Delete this resume?" : "Duplicate this resume?"}
        description={
          pendingAction?.type === "delete"
            ? `"${pendingAction.draft.title}" will be permanently deleted. This can't be undone.`
            : `A copy of "${pendingAction?.draft.title}" will be created and opened for editing.`
        }
        confirmLabel={pendingAction?.type === "delete" ? "Delete" : "Duplicate"}
        processingLabel="Deleting..."
        isProcessing={isDeleting}
        error={deleteError}
        danger={pendingAction?.type === "delete"}
        onCancel={() => setPendingAction(null)}
        onConfirm={async () => {
          if (!pendingAction) return;
          if (pendingAction.type === "duplicate") {
            onDuplicateDraft?.(pendingAction.draft);
            setPendingAction(null);
            return;
          }
          setIsDeleting(true);
          setDeleteError(null);
          try {
            await onDeleteDraft?.(pendingAction.draft.id);
            setPendingAction(null);
          } catch {
            setDeleteError("Could not delete this resume. Please try again.");
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </div>
  );
}
