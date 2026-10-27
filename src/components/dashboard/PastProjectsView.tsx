"use client";

import React, { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { ResumeDraft, TemplateId } from "./create-flow/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { ResumeCard } from "./ResumeCard";
import { useDashboard } from "./DashboardContext";
import { DashboardMoxie } from "./DashboardMoxie";
import { SortMenu } from "./SortMenu";

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

type SortBy = "edited" | "title";
const SORT_OPTIONS = [
  { value: "edited", label: "Last edited" },
  { value: "title", label: "A–Z" },
] as const;

export function PastProjectsView({
  drafts = [],
  isLoading = false,
  onOpenDraft,
  onDuplicateDraft,
  onDeleteDraft,
  onNewResume,
}: PastProjectsViewProps) {
  const { handleTailorDraft } = useDashboard();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("edited");
  const [pendingAction, setPendingAction] = useState<{ type: "delete" | "duplicate"; draft: ResumeDraft } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const hasDrafts = drafts.length > 0;

  return (
    <div className="px-8 pt-6 pb-10 sm:px-14 sm:pt-8 sm:pb-14 lg:px-20 lg:pt-8 lg:pb-16 max-w-7xl mx-auto w-full">
      {/* Toolbar, same as Career profiles: search, then "New resume" at the
          right end (icon-only on phones). Sorting sits on the list's header. */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="relative min-w-0 flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or role"
            aria-label="Search resumes"
            disabled={!hasDrafts}
            className={`${FIELD_CLASS} w-full h-10 pl-10 pr-9 disabled:bg-neutral-50`}
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

        {onNewResume && (
          <button type="button" onClick={onNewResume} aria-label="New resume" title="New resume" className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-neutral-950 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors cursor-pointer sm:w-auto sm:px-4 lg:ml-auto">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline whitespace-nowrap">New resume</span>
          </button>
        )}
      </div>

      {/* Section header, like the Builder's "Recent resumes". */}
      {!isLoading && hasDrafts && (
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-sm font-semibold text-neutral-600">{query ? "Search results" : "All resumes"}</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
            {filteredDrafts.length}
          </span>
          <div className="ml-auto">
            <SortMenu compact value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} label="Sort resumes" />
          </div>
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
          {/* Searching with a magnifying glass when a search finds nothing; peering into an empty folder when there are none yet. */}
          <DashboardMoxie animation={hasDrafts ? "searching" : "emptyFolder"} size={120} className="mx-auto -mt-4 mb-2" />
          <h2 className="text-base font-bold text-neutral-950">{hasDrafts ? "No matching resumes" : "No resumes yet"}</h2>
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {filteredDrafts.map((draft) => (
            <ResumeCard
              key={draft.id}
              draft={draft}
              allowDownload
              onOpen={() => onOpenDraft?.(draft)}
              onDuplicate={() => requestAction("duplicate", draft)}
              onDelete={onDeleteDraft ? () => requestAction("delete", draft) : undefined}
              onTailor={() => handleTailorDraft(draft)}
            />
          ))}
        </div>
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
