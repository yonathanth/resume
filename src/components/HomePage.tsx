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
import styles from "./HomePage.module.css";
import { LandingDetail } from "./LandingDetail";
import { HiredAtStrip } from "./landing/HiredAtStrip";
import { ResultsCarousel } from "./landing/ResultsCarousel";

// The single before & after ("Recruiters give you six seconds", Robel Kassa) —
// hidden for now; the swipeable "Real results" stories below take its place.
const SHOW_SIX_SECONDS = false;

export function HomePage() {
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

      {/* A warm wash behind the hero */}
      <div className={styles.heroGlow} aria-hidden="true" />

      {/* Floating Pill Navigation */}
      <Navbar />

      {/* Main Content Sections */}
      <main className="relative z-10 flex flex-col">
        {/* Mobbin-inspired Hero */}
        <Hero />

        {/* Where users got hired */}
        <HiredAtStrip />

        {/* How It Works (Directly below Hero) */}
        <div className={`${styles.sectionScene} ${styles.panel}`}>
          <LandingDetail kind="keywords" />
          <HowItWorks />
        </div>

        {/* Templates Showcase */}
        <div className={styles.sectionScene}>
          <LandingDetail kind="templates" />
          <TemplatesSection />
        </div>

        {/* Real Results: Before & After CV Comparison */}
        {SHOW_SIX_SECONDS && <RealResultsSection />}

        {/* More before & afters to swipe through */}
        <div className={styles.panel}>
          <ResultsCarousel />
        </div>

        {/* Pricing (Free, Pro) */}
        <div className={styles.sectionScene}>
          <LandingDetail kind="ready" />
          <PricingSection />
        </div>
      </main>

      {/* Minimal Footer */}
      <Footer />
    </div>
  );
}
