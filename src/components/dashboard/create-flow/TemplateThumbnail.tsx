"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCvTemplateSample } from "@/lib/api";
import { CvPreviewFrame } from "./CvPreviewFrame";

interface TemplateThumbnailProps {
  templateId: string;
  className?: string;
  title?: string;
}

/**
 * The first page of a template, really rendered by the backend with a
 * fictional sample CV — every template list in the app uses this, so what a
 * gallery shows is exactly what the template produces.
 */
export function TemplateThumbnail({ templateId, className = "", title }: TemplateThumbnailProps) {
  const { data, isError } = useQuery({
    queryKey: ["cv-template-sample", templateId],
    queryFn: () => getCvTemplateSample(templateId),
    staleTime: Infinity,
  });

  return (
    <div className={`relative bg-white overflow-hidden ${className}`}>
      {!data && !isError && <div className="absolute inset-0 animate-pulse bg-neutral-100" />}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-neutral-400">
          Preview unavailable
        </div>
      )}
      <CvPreviewFrame html={data?.html ?? null} bare firstPageOnly title={title ?? `${templateId} template`} />
    </div>
  );
}
