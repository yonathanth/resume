"use client";

import React, { useState } from "react";
import type { ProfileChangeDetail } from "@/lib/api";
import { sectionLabel } from "./profile-sections";

// "See what changes" for a career profile update: item by item, grouped by
// section — what's new, what gains details (and which), and what's left
// alone on purpose (edited by hand, or removed before). Built from the
// merge's own record of what it does, so it's exactly what saving will do.

const CHIP_SECTIONS = new Set(["skills", "interests"]);
const BULLETS_SHOWN = 3;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const TAGS: Record<ProfileChangeDetail["change"], { label: string; className: string }> = {
  added: { label: "New", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  updated: { label: "More details", className: "border-sky-200 bg-sky-50 text-sky-700" },
  kept_edited: { label: "Kept as you edited it", className: "border-neutral-200 bg-white text-neutral-500" },
  kept_removed: { label: "Not added back", className: "border-neutral-200 bg-white text-neutral-500" },
};

function Bullets({ items }: { items: string[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, BULLETS_SHOWN);
  return (
    <ul className="mt-1.5 space-y-1">
      {shown.map((b, i) => (
        <li key={i} className="flex gap-1.5 text-xs leading-snug text-neutral-600">
          <span className="font-bold text-emerald-600">+</span>
          <span className="break-words">{b}</span>
        </li>
      ))}
      {items.length > BULLETS_SHOWN && (
        <li>
          <button type="button" onClick={() => setAll((v) => !v)} className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 cursor-pointer">
            {all ? "Show fewer" : `+${items.length - BULLETS_SHOWN} more`}
          </button>
        </li>
      )}
    </ul>
  );
}

function Row({ detail }: { detail: ProfileChangeDetail }) {
  const tag = TAGS[detail.change];
  const quiet = detail.change === "kept_edited" || detail.change === "kept_removed";
  return (
    <li className="py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm font-semibold break-words ${quiet ? "text-neutral-500" : "text-neutral-900"}`}>{detail.label}</p>
          {detail.sublabel && <p className="text-xs text-neutral-500 break-words">{detail.sublabel}</p>}
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${tag.className}`}>{tag.label}</span>
      </div>
      {detail.text && <p className="mt-1 text-xs leading-relaxed text-neutral-600 line-clamp-3 break-words">{detail.text}</p>}
      {detail.filled && detail.filled.length > 0 && <p className="mt-1 text-xs text-neutral-600">Fills in: {detail.filled.join(", ")}</p>}
      {detail.newValues && detail.newValues.length > 0 && <p className="mt-1 text-xs text-neutral-600">Adds: {detail.newValues.join(", ")}</p>}
      {detail.newBullets && detail.newBullets.length > 0 && <Bullets items={detail.newBullets} />}
      {detail.change === "kept_edited" && <p className="mt-1 text-xs text-neutral-500">You edited this by hand, so updates leave it alone.</p>}
      {detail.change === "kept_removed" && <p className="mt-1 text-xs text-neutral-500">You removed this from the profile before.</p>}
    </li>
  );
}

export function ProfileChangeList({ details, footnote = true }: { details: ProfileChangeDetail[]; footnote?: boolean }) {
  // Sections in the order the merge met them.
  const groups = new Map<string, ProfileChangeDetail[]>();
  for (const d of details) groups.set(d.section, [...(groups.get(d.section) ?? []), d]);

  return (
    <div className="mt-3">
      <div className="max-h-80 overflow-y-auto pr-1 space-y-4">
        {[...groups].map(([section, items]) => (
          <section key={section}>
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{capitalize(sectionLabel(section))}</h4>
            {CHIP_SECTIONS.has(section) ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {items.map((d, i) => (
                  <span
                    key={i}
                    title={TAGS[d.change].label}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      d.change === "added" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-neutral-200 bg-white text-neutral-500 line-through"
                    }`}
                  >
                    {d.change === "added" && "+ "}
                    {d.label}
                  </span>
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-neutral-200/70">
                {items.map((d, i) => (
                  <Row key={i} detail={d} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {footnote && (
        <p className="mt-3 border-t border-neutral-200 pt-2.5 text-xs text-neutral-500">
          Nothing already in the profile is replaced or removed. You can undo any update from the profile&apos;s History.
        </p>
      )}
    </div>
  );
}
