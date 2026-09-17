"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CvEditorWorkspace } from "@/components/dashboard/create-flow/CvEditorWorkspace";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { getCvDocument } from "@/lib/api";
import { applyCvContent, createBlankCv, toResumeDraft } from "@/lib/cv-mapper";
import { CvData } from "@/components/dashboard/create-flow/types";

// A dedicated page (its own route) for editing a CV, rather than an overlay
// component swapped in over whichever page triggered it — reachable and
// refreshable directly at /dashboard/editor/[id]. Always loads the
// document's real saved content fresh from the backend.
export default function CvEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { updateDraftFromSavedCv } = useDashboard();
  const [cvData, setCvData] = useState<CvData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCvData(null);
    setNotFound(false);

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
          skills: draft.matchedKeywords,
        });
        setCvData(applyCvContent(blank, doc.content));
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-[#f5f5f7]">
        <p className="text-sm text-neutral-600">This resume could not be found.</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 rounded-xl bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!cvData) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#f5f5f7]">
        <span className="text-sm text-neutral-500">Loading resume...</span>
      </div>
    );
  }

  return (
    <CvEditorWorkspace
      initialData={cvData}
      onBack={() => router.push("/dashboard")}
      onSave={(savedCv) => {
        updateDraftFromSavedCv(savedCv);
        router.push("/dashboard");
      }}
    />
  );
}
