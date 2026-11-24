"use client";

import React, { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface TemplateThumbnailProps {
  templateId: string;
  className?: string;
  title?: string;
  /** Render one of the landing page's before/after people instead of the template's sample person. */
  story?: string;
  /** Load straight away instead of when scrolled near (for thumbnails above the fold). */
  eager?: boolean;
}

/**
 * The first page of a template, rendered by the backend with a fictional
 * sample CV (the same template the PDF is printed from) as a small cached
 * image: a plain <img>, lazy-loaded, so a gallery of them stays fast.
 */
export function TemplateThumbnail({ templateId, className = "", title, story, eager = false }: TemplateThumbnailProps) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const query = story ? `?story=${encodeURIComponent(story)}` : "";
  const src = `${API_URL}/api/v1/templates/${encodeURIComponent(templateId)}/thumb.webp${query}`;

  return (
    <div className={`relative bg-white overflow-hidden ${className}`}>
      {state === "loading" && <div className="absolute inset-0 animate-pulse bg-neutral-100" />}
      {state === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-neutral-400">
          Preview unavailable
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- served (and cached) by the API, not Next's image optimizer
        <img
          key={src}
          // A cached image can finish before React attaches onLoad (it would then stay invisible): check on mount.
          ref={(img) => {
            if (img?.complete && state === "loading") setState(img.naturalWidth > 0 ? "loaded" : "error");
          }}
          src={src}
          alt={title ?? `${templateId} template`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-300 ${state === "loaded" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
