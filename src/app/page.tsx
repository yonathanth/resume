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
  const scrollToEditor = () => {
    const el = document.getElementById("editor");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfdfd] text-neutral-900 selection:bg-neutral-950 selection:text-white relative font-sans">
      {/* Subtle background radial dot pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

      {/* Floating Pill Navigation */}
      <Navbar onOpenEditor={scrollToEditor} />

      {/* Main Content Sections */}
      <main className="relative z-10 flex flex-col">
        {/* Mobbin-inspired Hero */}
        <Hero onStartBuilding={scrollToEditor} />

        {/* How It Works (Directly below Hero) */}
        <HowItWorks />

        {/* Templates Showcase */}
        <TemplatesSection onSelectTemplate={() => scrollToEditor()} />

        {/* Real Results: Before & After CV Comparison */}
        <RealResultsSection onTryItYourself={scrollToEditor} />

        {/* 3-Tier Pricing (Pro, Team, Enterprise) */}
        <PricingSection onSelectPlan={() => scrollToEditor()} />
      </main>

      {/* Minimal Footer */}
      <Footer />
    </div>
  );
}
