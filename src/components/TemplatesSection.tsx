"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

interface TemplatesSectionProps {
  onSelectTemplate?: (templateId: string) => void;
}

interface TemplateCardData {
  id: string;
  name: string;
  role: string;
  category: string;
  accent: string;
  badge: string;
}

const cardsData: Record<string, TemplateCardData> = {
  // Left Flank (Left-most two templates)
  card1: {
    id: "card1",
    name: "Kidus Haile",
    role: "Senior Cloud Architect",
    category: "Tech & Cloud",
    accent: "bg-neutral-950",
    badge: "99% ATS",
  },
  card2: {
    id: "card2",
    name: "Abebe Tessema",
    role: "Quantitative Analyst",
    category: "Finance",
    accent: "bg-emerald-700",
    badge: "100% Pass",
  },

  // Center Arch (Curving over headline)
  card3: {
    id: "card3",
    name: "Selamawit Bekele",
    role: "Staff Product Designer",
    category: "Product & UX",
    accent: "bg-indigo-600",
    badge: "Staff Level",
  },
  card4: {
    id: "card4",
    name: "Yohannes Assefa",
    role: "VP of Engineering",
    category: "Executive",
    accent: "bg-stone-800",
    badge: "Editorial",
  },
  card5: {
    id: "card5",
    name: "Bethelhem Desta",
    role: "Lead AI Scientist",
    category: "AI & Research",
    accent: "bg-teal-700",
    badge: "High Density",
  },

  // Right Flank (Right-most two templates)
  card6: {
    id: "card6",
    name: "Marcus Vance",
    role: "Head of Operations",
    category: "Leadership",
    accent: "bg-amber-800",
    badge: "Executive",
  },
  card7: {
    id: "card7",
    name: "Dawit Mengistu",
    role: "Full Stack Platform Lead",
    category: "Engineering",
    accent: "bg-blue-600",
    badge: "Modern Sans",
  },
};

function BiggerTemplateCard({
  data,
  onClick,
}: {
  data: TemplateCardData;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="w-36 h-48 sm:w-42 sm:h-54 lg:w-46 lg:h-58 rounded-2xl bg-white border border-neutral-200/90 shadow-[0_10px_26px_-8px_rgba(0,0,0,0.08)] hover:shadow-2xl hover:-translate-y-1.5 p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-300 relative overflow-hidden select-none cursor-pointer"
    >
      {/* Top accent bar */}
      <div className={`h-1.5 w-8 rounded-full ${data.accent} mb-1`} />

      {/* Header info with clear typography */}
      <div>
        <div className="text-xs sm:text-sm font-bold text-neutral-900 leading-tight truncate">
          {data.name}
        </div>
        <div className="text-[10px] sm:text-[11px] text-neutral-500 font-medium truncate leading-none mt-1">
          {data.role}
        </div>

        {/* Clean simulated content lines */}
        <div className="space-y-1.5 pt-3">
          <div className="w-full h-1 bg-neutral-200 rounded-full" />
          <div className="w-5/6 h-1 bg-neutral-150 rounded-full" />
          <div className="w-full h-1 bg-neutral-100 rounded-full" />
          <div className="w-4/5 h-1 bg-neutral-100 rounded-full" />
          <div className="w-2/3 h-1 bg-neutral-100 rounded-full" />
        </div>
      </div>

      {/* Bottom badge row */}
      <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
        <span className="text-[8px] sm:text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">
          {data.category}
        </span>
        <span className="text-[8px] sm:text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
          {data.badge}
        </span>
      </div>
    </div>
  );
}

export function TemplatesSection({ onSelectTemplate }: TemplatesSectionProps) {
  const handleCta = () => {
    const el = document.getElementById("editor") || document.getElementById("results");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
    onSelectTemplate?.("modern-minimal");
  };

  return (
    <div id="templates" className="py-24 border-t border-neutral-100 overflow-hidden relative">
      {/* Background vertical dotted guidelines */}
      <div className="absolute inset-0 flex justify-around pointer-events-none opacity-20 px-8">
        <div className="w-px h-full border-r border-dashed border-neutral-400" />
        <div className="w-px h-full border-r border-dashed border-neutral-400" />
        <div className="w-px h-full border-r border-dashed border-neutral-400" />
        <div className="w-px h-full border-r border-dashed border-neutral-400" />
        <div className="w-px h-full border-r border-dashed border-neutral-400" />
        <div className="w-px h-full border-r border-dashed border-neutral-400" />
      </div>

      {/* Arched Templates Showcase Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Ghost background outline cards floating near top */}
        <div className="w-full flex justify-between px-16 -mb-8 opacity-30 pointer-events-none hidden xl:flex">
          <div className="w-36 h-20 rounded-2xl border-2 border-dashed border-neutral-300" />
          <div className="w-36 h-20 rounded-2xl border-2 border-dashed border-neutral-300" />
          <div className="w-36 h-20 rounded-2xl border-2 border-dashed border-neutral-300" />
        </div>

        {/* 3-Bay Composition: Left Flank (Elevated) + Center Arch & Content + Right Flank (Elevated) */}
        <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 xl:gap-8 relative">
          
          {/* Left Flank: The two left-most templates shifted a little UP compared to neighboring Card 3 */}
          <div className="hidden lg:flex flex-col gap-4 xl:gap-5 shrink-0 -translate-y-8 xl:-translate-y-12">
            <BiggerTemplateCard data={cardsData.card1} onClick={handleCta} />
            <BiggerTemplateCard data={cardsData.card2} onClick={handleCta} />
          </div>

          {/* Center Bay: Top Arch (3 Cards) + Centered Content shifted down */}
          <div className="flex flex-col items-center text-center max-w-2xl px-2">
            
            {/* Top Arch: Neighboring cards 3 & 5 sit lower than the elevated outer flanks */}
            <div className="flex items-end justify-center gap-3 sm:gap-5 mb-20 sm:mb-24 lg:mb-28 pt-2">
              <div className="translate-y-8">
                <BiggerTemplateCard data={cardsData.card3} onClick={handleCta} />
              </div>
              <div className="translate-y-0">
                <BiggerTemplateCard data={cardsData.card4} onClick={handleCta} />
              </div>
              <div className="translate-y-8">
                <BiggerTemplateCard data={cardsData.card5} onClick={handleCta} />
              </div>
            </div>

            {/* Center Content: Shifted down from the templates above */}
            <div className="relative z-10 max-w-xl mx-auto pt-2 sm:pt-4">
              {/* Headline: Line 1 Black, Line 2 Soft Gray */}
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-bold tracking-tight text-neutral-950 leading-[1.08]">
                Recruiter-tested templates <br />
                <span className="text-neutral-400 font-normal">from various industries</span>
              </h2>

              {/* Subtitle */}
              <p className="mt-5 text-base sm:text-lg text-neutral-500 font-normal leading-relaxed">
                Learn why candidates trust our ATS-tailored layouts to pass automated screening and land dream roles.
              </p>

              {/* CTA Button */}
              <div className="mt-9 flex justify-center">
                <button
                  onClick={handleCta}
                  className="px-8 py-3.5 rounded-full bg-neutral-950 text-white font-medium text-sm hover:bg-neutral-800 active:scale-98 transition-all duration-150 shadow-sm flex items-center gap-2 group cursor-pointer"
                >
                  <span>Explore all templates</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Flank: The two right-most templates shifted a little UP compared to neighboring Card 5 */}
          <div className="hidden lg:flex flex-col gap-4 xl:gap-5 shrink-0 -translate-y-8 xl:-translate-y-12">
            <BiggerTemplateCard data={cardsData.card6} onClick={handleCta} />
            <div className="transform lg:rotate-3 lg:hover:rotate-0 transition-transform duration-300 shadow-2xl">
              <BiggerTemplateCard data={cardsData.card7} onClick={handleCta} />
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
