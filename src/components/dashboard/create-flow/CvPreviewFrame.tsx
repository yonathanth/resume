"use client";

import React, { useEffect, useRef, useState } from "react";
import { paginatePreview } from "@/lib/preview-pagination";

// An A4 sheet is 210mm ≈ 794px wide. Editor previews draw it inside a 24px
// gutter; thumbnails ("bare") are just the sheet. The frame renders the HTML
// at its natural width and scales it down to whatever width the container has.
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const GUTTER = 48;

interface CvPreviewFrameProps {
  /** A complete HTML document from the backend (preview or template sample). */
  html: string | null;
  /** Extra zoom on top of fit-to-width, e.g. 1.25 for 125%. */
  zoom?: number;
  /** Clip to the first page (gallery thumbnails) instead of the full document. */
  firstPageOnly?: boolean;
  /** The HTML is a bare sheet (thumbnail render) rather than an editor preview. */
  bare?: boolean;
  className?: string;
  title?: string;
  /**
   * Editor preview: called with the content path of whatever text the user
   * clicked ("experience.0.role"; see lib/preview-paths.ts). Hovering
   * outlines the clickable text.
   */
  onPick?: (path: string) => void;
}

/**
 * Shows backend-rendered CV HTML in an iframe, scaled to fit. The HTML comes
 * from the same template the PDF is printed from, so this is what the
 * download will look like; editor previews are split into A4 pages where the
 * PDF breaks them (lib/preview-pagination.ts). The sandbox allows no scripts, forms or navigation;
 * `allow-same-origin` only lets this component measure the document height.
 */
export function CvPreviewFrame({
  html,
  zoom = 1,
  firstPageOnly = false,
  bare = false,
  className = "",
  title = "CV preview",
  onPick,
}: CvPreviewFrameProps) {
  const NATURAL_WIDTH = bare ? A4_WIDTH : A4_WIDTH + GUTTER;
  const NATURAL_PAGE_HEIGHT = bare ? A4_HEIGHT : A4_HEIGHT + GUTTER;
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // The hovered value's box, in the iframe's own (unscaled) pixels.
  const [hoverBox, setHoverBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(A4_HEIGHT + GUTTER);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLoad = async (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    if (firstPageOnly) return;
    const iframe = e.currentTarget;
    const doc = iframe.contentDocument;
    if (!doc) return;
    if (!bare) {
      // Measure with the template's own fonts, then split into pages. The
      // iframe is made tall first: finding where a line starts needs it on screen.
      await doc.fonts?.ready.catch(() => undefined);
      if (iframe.contentDocument !== doc) return; // a newer render replaced it
      iframe.style.height = `${doc.documentElement.scrollHeight * 2 + 2000}px`;
      try {
        paginatePreview(doc);
      } catch {
        // A layout it can't split still shows, as one long sheet.
      }
    }
    // The body's own height: the document's would include the stretched viewport.
    const height = Math.max(NATURAL_PAGE_HEIGHT, Math.ceil(doc.body.getBoundingClientRect().height));
    iframe.style.height = `${height}px`;
    setContentHeight(height);
  };

  const scale = containerWidth ? (containerWidth / NATURAL_WIDTH) * zoom : 0;

  // The iframe takes no pointer events (it can't scroll or capture the
  // wheel); a point on the scaled sheet is mapped back into its document to
  // find the tagged value under the pointer.
  const pickAt = (e: React.MouseEvent<HTMLDivElement>): { path: string; element: Element } | null => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !scale) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const target = doc.elementFromPoint((e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale);
    const tagged = target?.closest<HTMLElement>("[data-cv]");
    if (tagged?.dataset.cv) return { path: tagged.dataset.cv, element: tagged };
    // The placeholder photo has no text to tag.
    const missing = target?.closest<HTMLElement>("[data-missing]");
    return missing ? { path: `${missing.dataset.missing}.photo`, element: missing } : null;
  };
  const height = firstPageOnly ? NATURAL_PAGE_HEIGHT : contentHeight;

  return (
    <div ref={containerRef} className={`w-full ${zoom > 1 ? "overflow-x-auto" : "overflow-hidden"} ${className}`}>
      {html && scale > 0 && (
        <div
          className="relative"
          style={{ height: height * scale, width: NATURAL_WIDTH * scale, cursor: hoverBox ? "pointer" : undefined }}
          onMouseMove={
            onPick
              ? (e) => {
                  const hit = pickAt(e);
                  const box = hit?.element.getBoundingClientRect();
                  setHoverBox(box ? { left: box.left, top: box.top, width: box.width, height: box.height } : null);
                }
              : undefined
          }
          onMouseLeave={onPick ? () => setHoverBox(null) : undefined}
          onClick={
            onPick
              ? (e) => {
                  const hit = pickAt(e);
                  if (hit) onPick(hit.path);
                }
              : undefined
          }
        >
          {hoverBox && (
            <div
              aria-hidden
              className="absolute z-10 pointer-events-none rounded-[3px] bg-accent/[0.06] ring-1 ring-accent/25"
              style={{
                left: hoverBox.left * scale - 2,
                top: hoverBox.top * scale - 1,
                width: hoverBox.width * scale + 4,
                height: hoverBox.height * scale + 2,
              }}
            />
          )}
          <iframe
            ref={iframeRef}
            title={title}
            srcDoc={html}
            sandbox="allow-same-origin"
            scrolling="no"
            onLoad={handleLoad}
            style={{
              width: NATURAL_WIDTH,
              height,
              border: "none",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              pointerEvents: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}
