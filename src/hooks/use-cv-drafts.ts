"use client";

import { useQuery } from "@tanstack/react-query";
import { listCvDocuments } from "@/lib/api";
import { toResumeDraft } from "@/lib/cv-mapper";
import { ResumeDraft } from "@/components/dashboard/create-flow/types";

// Every CV document the user owns, across all of their career profiles and
// standalone (unattached) documents alike, mapped to the local ResumeDraft
// shape the Past Projects / Builder views render.
export function useAllDrafts() {
  return useQuery({
    queryKey: ["cv-drafts"],
    queryFn: async (): Promise<ResumeDraft[]> => {
      const documents = await listCvDocuments();
      return documents.map(toResumeDraft);
    },
  });
}
