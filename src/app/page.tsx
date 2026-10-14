"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasSession } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { TemplatesSection } from "@/components/TemplatesSection";
import { RealResultsSection } from "@/components/RealResultsSection";
import { HowItWorks } from "@/components/HowItWorks";
import { PricingSection } from "@/components/PricingSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  const router = useRouter();

  // Signed-in visitors go straight to their dashboard. The dashboard's own
  // logo links to "/?home", so they can still open this page on purpose.
  // Only the local "signed in" hint is checked (no refresh call), so
  // logged-out visitors never wait on the network to see the page.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("home")) return;
    if (hasSession()) router.replace("/dashboard");
  }, [router]);

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
