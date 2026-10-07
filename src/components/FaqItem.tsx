"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import type { Faq } from "@/lib/help-content";

/** One question in a help-center FAQ list; the answer shows when open. */
export function FaqItem({ faq, isOpen, onToggle }: { faq: Faq; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-neutral-200 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full py-4 text-left flex items-center justify-between gap-4 cursor-pointer group"
      >
        <span className={`text-sm font-semibold ${isOpen ? "text-neutral-950" : "text-neutral-800 group-hover:text-neutral-950"}`}>
          {faq.q}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? "rotate-180 text-accent" : "text-neutral-400"}`}
        />
      </button>
      {isOpen && <p className="pb-4 -mt-1 text-sm text-neutral-600 leading-relaxed max-w-3xl">{faq.a}</p>}
    </div>
  );
}
