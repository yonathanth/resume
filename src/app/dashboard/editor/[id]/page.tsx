"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, FileQuestion } from "lucide-react";
import { CvEditorWorkspace } from "@/components/dashboard/create-flow/CvEditorWorkspace";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { useRefreshSubscriptionStatus } from "@/hooks/use-subscription";
import { ApiError, getCvDocument, type CvFlowType } from "@/lib/api";
import { EditorSkeleton } from "@/components/dashboard/create-flow/EditorSkeleton";
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
  // "not_found" only when the server says so (404); any other failure (a database
  // hiccup, a dropped connection) is "failed": the CV is fine, it just didn't load.
  const [loaded, setLoaded] = useState<{ id: string; cv: CvData | null; error: "not_found" | "failed" | null; version: number } | null>(null);
  // Bumped to load the CV again (it was tailored in place, or after a failed load); the editor remounts once it has.
  const [version, setVersion] = useState(0);
  const cvData = loaded?.id === id ? loaded.cv : null;
  const loadError = loaded?.id === id && loaded.version === version ? loaded.error : null;
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
        setLoaded({ id, cv: applyCvContent(blank, doc.content), error: null, version });
      })
      .catch((err) => {
        if (cancelled) return;
        const notFound = err instanceof ApiError && (err.status === 404 || err.status === 403);
        // A failed reload keeps the CV on screen rather than replacing it with an error.
        setLoaded((prev) =>
          !notFound && prev?.id === id && prev.cv ? prev : { id, cv: null, error: notFound ? "not_found" : "failed", version }
        );
      });

    return () => {
      cancelled = true;
    };
  }, [id, version]);

  if (loadError && !cvData) {
    const failed = loadError === "failed";
    const Icon = failed ? CloudOff : FileQuestion;
    return (
      <div className="h-screen w-full flex items-center justify-center bg-neutral-50 p-6">
        <div className="w-full max-w-sm rounded-lg border border-neutral-300 bg-white p-7 text-center">
          <span className="w-11 h-11 mx-auto mb-4 rounded-xl flex items-center justify-center bg-neutral-100 border border-neutral-200 text-neutral-500">
            <Icon className="w-5 h-5" />
          </span>
          <h1 className="text-base font-bold text-neutral-950">
            {failed ? "We couldn't open this resume" : "We couldn't find this resume"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {failed
              ? "Your resume is safe. We couldn't reach our servers just now, so please try again in a moment."
              : "It may have been deleted, or the link is wrong."}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => (failed ? setVersion((v) => v + 1) : router.push("/dashboard/past-projects"))}
              className="px-4 py-2.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {failed ? "Try again" : "See all resumes"}
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
        key={`${id}:${loaded?.version ?? 0}`}
        initialData={cvData}
        onReload={() => setVersion((v) => v + 1)}
        introduceScore={Boolean(freshFlow)}
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
