"use client";

import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  FileText,
  Copy,
  Trash2,
  Download,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Plus,
} from "lucide-react";
import { ResumeDraft, INITIAL_DRAFTS, TemplateId } from "./create-flow/types";

interface PastProjectsViewProps {
  drafts?: ResumeDraft[];
  onOpenDraft?: (draft: ResumeDraft) => void;
  onDuplicateDraft?: (draft: ResumeDraft) => void;
  onDeleteDraft?: (id: string) => void;
  onNewResume?: () => void;
  onUseTemplate?: (templateId: TemplateId) => void;
}

export function PastProjectsView({
  drafts = INITIAL_DRAFTS,
  onOpenDraft,
  onDuplicateDraft,
  onDeleteDraft,
  onNewResume,
}: PastProjectsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"edited" | "score" | "title">("edited");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  // Filter and sort drafts
  const filteredDrafts = drafts
    .filter(
      (d) =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.targetRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.targetCompany.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "score") return b.atsScore - a.atsScore;
      if (sortBy === "title") return a.title.localeCompare(b.title);
      return 0;
    });

  const handleDownloadSimulation = (draftId: string) => {
    setDownloadSuccessId(draftId);
    setTimeout(() => {
      setDownloadSuccessId(null);
    }, 2000);
  };

  return (
    <div className="px-8 py-10 sm:px-14 sm:py-14 lg:px-20 lg:py-16 max-w-7xl mx-auto w-full">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950">
              Past Projects
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
              {drafts.length} Projects Saved
            </span>
          </div>
          <p className="text-sm text-neutral-500">
            View, duplicate, search, and manage all your saved resume drafts and past tailoring projects.
          </p>
        </div>

        {onNewResume && (
          <button
            type="button"
            onClick={onNewResume}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-950 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New CV</span>
          </button>
        )}
      </div>

      {/* TOOLBAR FROM SCREENSHOT: Search, Sort Dropdown & Grid/List Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-8">
        {/* Search input with rounded pill style matching screenshot */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resumes..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white border border-neutral-200/90 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 shadow-2xs transition-all"
          />
        </div>

        {/* Right side controls matching screenshot: Sort & View Mode */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Sort Dropdown / Button styled like screenshot */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort resumes"
              className="pl-3.5 pr-8 py-2 rounded-2xl bg-white border border-neutral-200/90 text-xs font-medium text-neutral-800 hover:border-neutral-300 focus:outline-none cursor-pointer appearance-none shadow-2xs"
            >
              <option value="edited">Last Edited</option>
              <option value="score">Highest ATS</option>
              <option value="title">Alphabetical</option>
            </select>
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Grid / List View Toggle pill box matching screenshot */}
          <div className="flex items-center p-0.5 rounded-2xl bg-neutral-100/90 border border-neutral-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-neutral-950 shadow-xs"
                  : "text-neutral-400 hover:text-neutral-800"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-neutral-950 shadow-xs"
                  : "text-neutral-400 hover:text-neutral-800"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RESUMES WORKSPACE: GRID OR LIST VIEW */}
      {filteredDrafts.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-neutral-50 border border-neutral-200/80">
          <FileText className="w-9 h-9 text-neutral-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-neutral-950">No matching projects found</h3>
          <p className="text-xs text-neutral-500 mt-1">
            Try adjusting your search or sort query.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrafts.map((draft) => (
            <div
              key={draft.id}
              className="rounded-3xl bg-white border border-neutral-200/90 shadow-2xs hover:shadow-lg hover:border-neutral-300 transition-all p-6 flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Card Top: Title & ATS Score Badge */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="min-w-0">
                    <h3
                      onClick={() => onOpenDraft?.(draft)}
                      className="text-sm font-bold text-neutral-950 tracking-tight truncate hover:underline cursor-pointer"
                    >
                      {draft.title}
                    </h3>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      Target: {draft.targetCompany} • {draft.targetRole}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {draft.atsScore}% ATS
                  </span>
                </div>

                {/* Simulated Document Thumbnail Strip */}
                <div
                  onClick={() => onOpenDraft?.(draft)}
                  className="my-4 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 flex flex-col gap-1.5 cursor-pointer hover:bg-neutral-100/70 transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-2.5 h-2.5 rounded-sm ${draft.accentColor}`} />
                    <div className="w-20 h-1.5 bg-neutral-300 rounded-full" />
                  </div>
                  <div className="w-full h-1 bg-neutral-200 rounded-full" />
                  <div className="w-4/5 h-1 bg-neutral-200 rounded-full" />
                  <div className="w-2/3 h-1 bg-neutral-200 rounded-full" />
                </div>

                {/* Matched Keywords Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {draft.matchedKeywords.slice(0, 3).map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-neutral-100 text-[10px] font-medium text-neutral-700"
                    >
                      {kw}
                    </span>
                  ))}
                  {draft.matchedKeywords.length > 3 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] text-neutral-400">
                      +{draft.matchedKeywords.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer: Metadata & Actions */}
              <div className="pt-3.5 border-t border-neutral-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-400">
                  {draft.lastEdited}
                </span>

                <div className="flex items-center gap-1">
                  {/* Download Action */}
                  <button
                    type="button"
                    onClick={() => handleDownloadSimulation(draft.id)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                    title="Download PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Copy Button (Copies and opens the copied one) */}
                  <button
                    type="button"
                    onClick={() => onDuplicateDraft?.(draft)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                    title="Duplicate & Edit Resume"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Action */}
                  {onDeleteDraft && (
                    <button
                      type="button"
                      onClick={() => onDeleteDraft(draft.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete draft"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Primary Edit / Open Studio Button */}
                  <button
                    type="button"
                    onClick={() => onOpenDraft?.(draft)}
                    className="ml-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-950 text-white font-bold text-[11px] hover:bg-neutral-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>Edit</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {downloadSuccessId === draft.id && (
                <div className="absolute inset-x-0 bottom-0 py-1.5 bg-emerald-600 text-white text-[11px] font-bold text-center animate-in fade-in duration-200">
                  PDF Generated &amp; Downloaded!
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-2xs divide-y divide-neutral-100 overflow-hidden">
          {filteredDrafts.map((draft) => (
            <div
              key={draft.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/80 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-3.5 h-3.5 rounded-md ${draft.accentColor} shrink-0`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h3
                      onClick={() => onOpenDraft?.(draft)}
                      className="text-sm font-bold text-neutral-950 tracking-tight truncate hover:underline cursor-pointer"
                    >
                      {draft.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      {draft.atsScore}% ATS
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                    <span>{draft.targetRole}</span>
                    <span>•</span>
                    <span>{draft.targetCompany}</span>
                    <span>•</span>
                    <span>{draft.lastEdited}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadSimulation(draft.id)}
                  className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                  title="Download PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicateDraft?.(draft)}
                  className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                  title="Duplicate & Open Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {onDeleteDraft && (
                  <button
                    type="button"
                    onClick={() => onDeleteDraft(draft.id)}
                    className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenDraft?.(draft)}
                  className="px-4 py-2 rounded-xl bg-neutral-950 text-white font-bold text-xs hover:bg-neutral-800 transition-colors cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                >
                  <span>Open Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
