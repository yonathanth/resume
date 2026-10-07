"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { TemplatesSection } from "@/components/TemplatesSection";
import { RealResultsSection } from "@/components/RealResultsSection";
import { HowItWorks } from "@/components/HowItWorks";
import { PricingSection } from "@/components/PricingSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fdfdfd] text-neutral-900 selection:bg-neutral-950 selection:text-white relative font-sans">
      {/* Subtle background radial dot pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

      {/* Floating Pill Navigation */}
      <Navbar />

      {/* Main Content Sections */}
      <main className="relative z-10 flex flex-col">
        {/* Mobbin-inspired Hero */}
        <Hero />

        {/* How It Works (Directly below Hero) */}
        <HowItWorks />

        {/* Templates Showcase */}
        <TemplatesSection />

        {/* Real Results: Before & After CV Comparison */}
        <RealResultsSection />

        {/* Pricing (Free, Pro) */}
        <PricingSection />
      </main>

      {/* Minimal Footer */}
      <Footer />
    </div>
  );
}
