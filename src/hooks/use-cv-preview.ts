"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { previewCvHtml, CVContentDTO, ApiError } from "@/lib/api";

const DEBOUNCE_MS = 350;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Live preview HTML for the editor: re-renders the CV with the backend
 * template shortly after the user stops typing. The last good render stays
 * on screen while a new one is in flight (or if it fails), and a stale
 * response can never replace a newer one — React Query keys each render by
 * the exact content it was made from.
 */
export function useCvPreview(templateId: string, content: CVContentDTO, showMissing = false) {
  // Keyed on the serialized content so only real edits trigger a render.
  // Only typing is debounced: switching between the two views (as downloaded
  // / with gaps) is immediate, and each is cached once rendered.
  const key = JSON.stringify([templateId, content]);
  const debouncedKey = useDebouncedValue(key, DEBOUNCE_MS);

  const query = useQuery({
    queryKey: ["cv-preview", debouncedKey, showMissing],
    queryFn: () => {
      const [tpl, body] = JSON.parse(debouncedKey) as [string, CVContentDTO];
      return previewCvHtml(tpl, body, showMissing);
    },
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    retry: false,
  });

  return {
    html: query.data?.html ?? null,
    error: query.error ? (query.error instanceof ApiError ? query.error.message : "Preview unavailable") : null,
    isRendering: key !== debouncedKey || query.isFetching,
  };
}
