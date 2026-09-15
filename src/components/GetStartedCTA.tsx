"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

interface GetStartedCTAProps {
  onStartBuilding?: () => void;
}

export function GetStartedCTA({ onStartBuilding }: GetStartedCTAProps) {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
      {/* Dark High-Impact Banner Card */}
      <div className="relative rounded-3xl bg-[#0e0e0e] border border-neutral-800 text-white p-10 sm:p-14 lg:p-16 text-center overflow-hidden shadow-2xl">
        
        {/* Subtle radial ambient glow */}
        <div className="absolute inset-0 bg-radial from-neutral-800/30 via-transparent to-transparent pointer-events-none" />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          
          {/* Top Pill Tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-900 text-neutral-300 border border-neutral-800 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Start Building for Free</span>
          </div>

          {/* Bold Headline */}
          <h2 className="text-3xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-white leading-[1.08]">
            Ready to land your dream role? <br />
            <span className="text-neutral-400 font-normal">Start crafting your resume today.</span>
          </h2>

          {/* Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-neutral-400 font-normal max-w-lg leading-relaxed">
            Tailor your experience against any job description in 30 seconds and boost your interview callback rate.
          </p>

          {/* Primary CTA Button */}
          <div className="mt-9 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-9 py-4 rounded-full bg-white text-neutral-950 font-semibold text-base hover:bg-neutral-100 active:scale-98 transition-all duration-150 shadow-lg flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Get started free</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Reassurance text */}
          <p className="mt-4 text-xs text-neutral-500 font-normal">
            No credit card required · Free ATS score in 30 seconds · Export PDF & Word
          </p>

        </div>
      </div>
    </section>
  );
}
