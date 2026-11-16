"use client";

import React, { useState } from "react";
import { TEMPLATE_NAMES } from "@/lib/og/template-names.generated";

/**
 * Every share image (Open Graph card) on the site, loaded from its real URL,
 * for working on them: edit lib/og/pages.ts (the text and pose) or
 * lib/og/card.tsx (the design), then press Refresh. Each opens full size.
 */
const GROUPS: { title: string; note?: string; cards: { label: string; path: string }[] }[] = [
  {
    title: "Pages",
    cards: [
      { label: "Home", path: "" },
      { label: "How it works", path: "/how-it-works" },
      { label: "Pricing", path: "/pricing" },
      { label: "Templates", path: "/templates" },
      { label: "Sign up", path: "/signup" },
      { label: "Help", path: "/help" },
    ],
  },
  {
    title: "/try flows",
    note: "One per flow: the links to promote on social and in ads.",
    cards: [
      { label: "Create", path: "/try/create" },
      { label: "Tailor", path: "/try/tailor" },
      { label: "Improve", path: "/try/improve" },
    ],
  },
  {
    title: `Template pages (${Object.keys(TEMPLATE_NAMES).length})`,
    note: "One per public template, with its real first page (static pictures, no backend needed).",
    cards: Object.entries(TEMPLATE_NAMES).map(([id, name]) => ({ label: name, path: `/templates/${id}` })),
  },
];

export function OgPreviews() {
  // Bumped by Refresh, so the browser fetches every image again.
  const [version, setVersion] = useState(0);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-neutral-500">Share images (Open Graph, 1200×630)</h2>
        <button
          type="button"
          onClick={() => setVersion((v) => v + 1)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 cursor-pointer hover:border-neutral-300"
        >
          Refresh
        </button>
      </div>

      {GROUPS.map((group) => (
        <div key={group.title} className="mt-6">
          <h3 className="text-[13px] font-semibold text-neutral-800">{group.title}</h3>
          {group.note && <p className="mt-0.5 text-[12.5px] text-neutral-500">{group.note}</p>}
          <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {group.cards.map(({ label, path }) => {
              const src = `${path}/opengraph-image?v=${version}`;
              return (
                <a key={path || "/"} href={src} target="_blank" rel="noreferrer" className="group block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a generated route, shown as is */}
                  <img
                    src={src}
                    alt={`${label} share image`}
                    width={1200}
                    height={630}
                    className="aspect-[1200/630] w-full rounded-lg border border-neutral-200 bg-neutral-100 object-cover transition-shadow group-hover:shadow-md"
                  />
                  <span className="mt-1.5 flex items-center justify-between text-[12.5px]">
                    <span className="font-medium text-neutral-800">{label}</span>
                    <span className="text-neutral-400">{path || "/"}</span>
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
