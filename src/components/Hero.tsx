"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface HeroProps {
  onStartBuilding?: () => void;
}

interface MiniResume {
  name: string;
  role: string;
  initials: string;
  tag: string;
  tagDotColor: string;
  accentBg: string;
  skills: string[];
}

const miniResumes: MiniResume[] = [
  {
    name: "Kidus Haile",
    role: "Senior Cloud Architect",
    initials: "KH",
    tag: "Tailored",
    tagDotColor: "bg-emerald-500",
    accentBg: "bg-neutral-950",
    skills: ["AWS", "K8s", "Go"],
  },
  {
    name: "Selamawit Bekele",
    role: "Staff Product Designer",
    initials: "SB",
    tag: "Enhanced",
    tagDotColor: "bg-indigo-500",
    accentBg: "bg-indigo-600",
    skills: ["Figma", "Design Sys", "UX"],
  },
  {
    name: "Yohannes Assefa",
    role: "VP of Engineering",
    initials: "YA",
    tag: "Created",
    tagDotColor: "bg-blue-500",
    accentBg: "bg-stone-800",
    skills: ["Strategy", "Scale"],
  },
  {
    name: "Bethelhem Desta",
    role: "Lead AI Scientist",
    initials: "BD",
    tag: "Optimized",
    tagDotColor: "bg-amber-500",
    accentBg: "bg-emerald-700",
    skills: ["Python", "PyTorch", "LLMs"],
  },
];

export function Hero({ onStartBuilding }: HeroProps) {
  const [activeResumeIndex, setActiveResumeIndex] = useState(0);

  // Cycle through different resumes automatically every 2.8s
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveResumeIndex((prev) => (prev + 1) % miniResumes.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const activeMini = miniResumes[activeResumeIndex];

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto py-12">
      <div className="flex flex-col items-center">
        
        {/* Dynamic Stacked Miniature Resume Cards */}
        <div
          className="relative mb-8 group cursor-pointer select-none"
          onClick={() => setActiveResumeIndex((prev) => (prev + 1) % miniResumes.length)}
          title="Click to switch resume"
        >
          {/* Layer 3 (back resume sheet) */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-26 sm:w-22 sm:h-28 rounded-xl bg-neutral-200/90 border border-neutral-300/80 -rotate-8 scale-90 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-85 shadow-xs p-2 flex flex-col gap-1">
            <div className="w-6 h-1 bg-neutral-300 rounded-full" />
            <div className="w-full h-0.5 bg-neutral-300/80 rounded-full" />
            <div className="w-3/4 h-0.5 bg-neutral-300/70 rounded-full" />
          </div>
          
          {/* Layer 2 (middle resume sheet) */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-20 h-26 sm:w-22 sm:h-28 rounded-xl bg-neutral-100 border border-neutral-200 rotate-4 scale-95 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-95 shadow-xs p-2 flex flex-col gap-1">
            <div className="w-8 h-1 bg-neutral-300 rounded-full" />
            <div className="w-full h-0.5 bg-neutral-200 rounded-full" />
            <div className="w-4/5 h-0.5 bg-neutral-200 rounded-full" />
          </div>

          {/* Layer 1 (front active mini resume card - Ethiopian names & details inside) */}
          <div className="relative w-20 h-26 sm:w-22 sm:h-28 rounded-xl bg-white border border-neutral-200/90 shadow-[0_10px_24px_-6px_rgba(0,0,0,0.1)] p-2 sm:p-2.5 text-left flex flex-col justify-between overflow-visible transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
            
            {/* Dynamic Status Tag */}
            <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-white text-neutral-800 text-[8px] font-semibold tracking-tight shadow-sm border border-neutral-200/90 flex items-center gap-1.5 z-10">
              <span className={`w-1.5 h-1.5 rounded-full ${activeMini.tagDotColor} animate-pulse`} />
              <span>{activeMini.tag}</span>
            </div>

            {/* Mini Resume Header with Name & Role inside */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`w-3.5 h-3.5 rounded-full ${activeMini.accentBg} text-[7px] font-bold text-white flex items-center justify-center shrink-0`}>
                  {activeMini.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] sm:text-[10px] font-bold text-neutral-950 truncate leading-tight">
                    {activeMini.name}
                  </div>
                  <div className="text-[7px] sm:text-[8px] text-neutral-500 truncate leading-none">
                    {activeMini.role}
                  </div>
                </div>
              </div>

              {/* Simulated Resume Content Lines */}
              <div className="space-y-1 pt-1 border-t border-neutral-100">
                <div className="w-full h-0.5 bg-neutral-200 rounded-full" />
                <div className="w-4/5 h-0.5 bg-neutral-100 rounded-full" />
                <div className="w-full h-0.5 bg-neutral-100 rounded-full" />
              </div>
            </div>

            {/* Resume Skills Pills */}
            <div className="pt-0.5 flex flex-wrap gap-0.5">
              {activeMini.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-1 py-0.5 rounded bg-neutral-100 text-[6.5px] font-medium text-neutral-700 leading-none"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Main Headline - Initial Scale & Weight directly below the icon */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-bold tracking-tight text-neutral-950 max-w-4xl leading-[1.08] sm:leading-[1.06]">
          Craft resumes that <br className="hidden sm:inline" />
          land interviews.
        </h1>

        {/* Sub-headline */}
        <p className="mt-6 text-lg sm:text-xl text-neutral-500 font-normal max-w-2xl mx-auto leading-relaxed">
          Featuring real-time ATS keyword matching, tailored bullet generation,
          and recruiter-tested modern templates — updated weekly.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-center">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-neutral-950 text-white font-medium text-[14px] sm:text-[15px] hover:bg-neutral-800 active:scale-98 transition-all duration-150 shadow-sm flex items-center justify-center gap-2"
          >
            <span>Get started free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="#templates"
            className="w-full sm:w-auto px-7 py-3 rounded-full border border-neutral-300 bg-white text-neutral-900 font-medium text-[14px] sm:text-[15px] hover:bg-neutral-50 hover:border-neutral-400 active:scale-98 transition-all duration-150 flex items-center justify-center gap-2 shadow-2xs"
          >
            <span>Explore templates</span>
            <ArrowRight className="w-4 h-4 text-neutral-500" />
          </Link>
        </div>
      </div>
    </section>
  );
}
