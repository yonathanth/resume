"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileQuestion } from "lucide-react";
import { CvEditorWorkspace } from "@/components/dashboard/create-flow/CvEditorWorkspace";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { useRefreshSubscriptionStatus } from "@/hooks/use-subscription";
import { getCvDocument, type CvFlowType } from "@/lib/api";
import { AiDraftFeedback } from "@/components/dashboard/feedback/AiDraftFeedback";
import { notifyCvDownloaded, notifyLeftEditor } from "@/lib/cv-rating";

const FLOW_KINDS: readonly CvFlowType[] = ["create", "tailor", "improve"];

/** ?fresh=<flow>: the CV was just written by that flow (see editorHref). */
function readFreshFlow(): CvFlowType | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("fresh") as CvFlowType | null;
  return value && FLOW_KINDS.includes(value) ? value : null;
}
import { applyCvContent, createBlankCv, toResumeDraft } from "@/lib/cv-mapper";
import { CvData, DEFAULT_TEMPLATE_ID } from "@/components/dashboard/create-flow/types";

// A dedicated page (its own route) for editing a CV, rather than an overlay
// component swapped in over whichever page triggered it — reachable and
// refreshable directly at /dashboard/editor/[id]. Always loads the
// document's real saved content fresh from the backend. Opened straight from
// a flow, it asks how the draft came out. Downloads and leaving it are
// announced for the CV rating (see CvRatingHost in the dashboard layout).
export default function CvEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { updateDraftFromSavedCv } = useDashboard();
  const refreshSubscriptionStatus = useRefreshSubscriptionStatus();
  // Keyed by document id, so navigating to another resume shows the loading
  // state again instead of the previous one's content.
  const [loaded, setLoaded] = useState<{ id: string; cv: CvData | null; notFound: boolean } | null>(null);
  const cvData = loaded?.id === id ? loaded.cv : null;
  const notFound = loaded?.id === id && loaded.notFound;
  // Read once: the feedback card drops the param from the address when it opens.
  // (Nothing that uses it renders before the CV has loaded, so the server render is unaffected.)
  const [freshFlow] = useState(readFreshFlow);

  useEffect(() => {
    let cancelled = false;

    getCvDocument(id)
      .then((doc) => {
        if (cancelled) return;
        // Derive the title/role/score the same way the drafts list does, so
        // the editor doesn't fall back to "Untitled Resume" for a document
        // that already has a real generated title.
        const draft = toResumeDraft(doc);
        const blank = createBlankCv({
          id: doc.id,
          title: draft.title,
          targetRole: draft.targetRole,
          atsScore: draft.atsScore,
          // The backend resolves legacy ids to a real template, so any stored id is renderable.
          templateStyle: doc.templateId || DEFAULT_TEMPLATE_ID,
          // Kept as it is: the editor saves it back with every change.
          jobDescription: doc.jobDescription ?? undefined,
          // Stored requirements always belong to the stored job description (the backend clears them when it changes).
          jobRequirements:
            doc.jobRequirements && doc.jobDescription ? { forJobDescription: doc.jobDescription, data: doc.jobRequirements.data } : null,
        });
        setLoaded({ id, cv: applyCvContent(blank, doc.content), notFound: false });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ id, cv: null, notFound: true });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-neutral-50 p-6">
        <div className="w-full max-w-sm rounded-lg border border-neutral-300 bg-white p-7 text-center">
          <span className="w-11 h-11 mx-auto mb-4 rounded-xl flex items-center justify-center bg-neutral-100 border border-neutral-200 text-neutral-500">
            <FileQuestion className="w-5 h-5" />
          </span>
          <h1 className="text-base font-bold text-neutral-950">We couldn&apos;t find this resume</h1>
          <p className="mt-1 text-sm text-neutral-500">It may have been deleted, or the link is wrong.</p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard/past-projects")}
              className="px-4 py-2.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              See all resumes
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2.5 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-700 hover:border-neutral-400 transition-colors cursor-pointer"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!cvData) {
    return <EditorSkeleton />;
  }

  return (
    <>
      <CvEditorWorkspace
        initialData={cvData}
        onBack={() => {
          notifyLeftEditor(id);
          router.push("/dashboard");
        }}
        onSave={(savedCv) => {
          notifyLeftEditor(id);
          updateDraftFromSavedCv(savedCv);
          refreshSubscriptionStatus();
          router.push("/dashboard");
        }}
        onDownloaded={notifyCvDownloaded}
      />
      {freshFlow && <AiDraftFeedback cvDocumentId={id} flowType={freshFlow} />}
    </>
  );
}

const shimmer = "animate-pulse rounded-md bg-neutral-200/70";

/** The editor's layout in outline — same bars, columns, and sheet position — so nothing jumps when it loads. */
function EditorSkeleton() {
  return (
    <div className="h-screen w-full flex flex-col bg-[#fdfdfd] overflow-hidden" aria-busy="true" aria-label="Loading resume">
      {/* Top bar: back, name, save state | template, preview PDF, download */}
      <div className="h-16 shrink-0 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${shimmer} rounded-lg`} />
          <div className={`h-5 w-40 sm:w-56 ${shimmer}`} />
          <div className={`w-5 h-5 ${shimmer} rounded-full`} />
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-9 w-10 sm:w-28 ${shimmer} rounded-lg`} />
          <div className={`h-9 w-10 md:w-32 ${shimmer} rounded-lg`} />
          <div className="h-9 w-10 sm:w-36 rounded-lg bg-accent/25 animate-pulse" />
        </div>
      </div>

      {/* Section tabs across both columns */}
      <div className="shrink-0 bg-white border-b border-neutral-200 px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-hidden">
        {[72, 88, 96, 84, 76, 64, 92].map((w, i) => (
          <div key={i} className={`h-9 shrink-0 rounded-lg ${i === 0 ? "border border-neutral-300 bg-neutral-50" : shimmer}`} style={{ width: w }} />
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Form column: section header, then fields in a card */}
        <div className="w-full lg:w-[48%] bg-[#fafafa] border-r border-neutral-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-5 border-b border-neutral-200">
            <div className="w-9 h-9 rounded-lg bg-accent/25 animate-pulse" />
            <div className="space-y-2">
              <div className={`h-4 w-36 ${shimmer}`} />
              <div className={`h-3 w-52 ${shimmer}`} />
            </div>
          </div>
          <div className="rounded-lg border border-neutral-300 bg-white p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-2">
                <div className={`h-3 w-20 ${shimmer}`} />
                <div className={`h-10 ${shimmer} rounded-lg`} />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-neutral-300 bg-white p-5 space-y-3">
            <div className={`h-3 w-16 ${shimmer}`} />
            <div className={`h-10 ${shimmer} rounded-lg`} />
            <div className="h-11 rounded-lg border border-dashed border-neutral-300" />
          </div>
        </div>

        {/* Preview column: toolbar, then the A4 sheet where the preview draws it */}
        <div className="hidden lg:flex flex-1 flex-col bg-[#ebebed]">
          <div className="px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
            <div className="h-9 w-44 rounded-lg bg-white border border-neutral-300" />
          </div>
          <div className="px-6 lg:px-8 flex justify-center">
            {/* The preview frame draws the sheet inside a 24px gutter (24/842 of its width). */}
            <div className="w-full max-w-[720px] px-[2.85%] pt-[2.85%]">
              <div className="aspect-[210/297] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.15)] p-[8%] space-y-3">
                <div className={`h-6 w-1/2 ${shimmer}`} />
                <div className={`h-3 w-2/3 ${shimmer}`} />
                <div className="pt-4 space-y-2">
                  <div className={`h-3.5 w-1/4 ${shimmer}`} />
                  <div className={`h-2.5 w-full ${shimmer}`} />
                  <div className={`h-2.5 w-11/12 ${shimmer}`} />
                  <div className={`h-2.5 w-4/5 ${shimmer}`} />
                </div>
                <div className="pt-4 space-y-2">
                  <div className={`h-3.5 w-1/3 ${shimmer}`} />
                  <div className={`h-2.5 w-full ${shimmer}`} />
                  <div className={`h-2.5 w-5/6 ${shimmer}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
