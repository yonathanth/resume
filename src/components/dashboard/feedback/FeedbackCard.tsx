"use client";

import React from "react";
import { X } from "lucide-react";

/** The small floating card the in-editor questions share (bottom corner, out of the editor's way). */
export function FeedbackCard({
  titleId,
  onDismiss,
  children,
}: {
  titleId: string;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      className="toast-enter fixed bottom-4 left-4 right-4 sm:right-auto z-40 sm:w-[360px] rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_12px_32px_-12px_rgba(15,17,21,0.35)]"
    >
      <button
        type="button"
        onClick={onDismiss}
        title="Close"
        aria-label="Close"
        className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
      {children}
    </div>
  );
}

export const FEEDBACK_TEXTAREA =
  "w-full mt-3 px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition resize-none";
export const FEEDBACK_SEND =
  "px-3.5 py-1.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
