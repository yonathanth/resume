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
import { FeaturesSection } from "./landing/FeaturesSection";
import { MoxiePeek } from "./landing/MoxiePeek";
import { ReviewsSection } from "./landing/ReviewsSection";

// The single before & after ("Recruiters give you six seconds", Robel Kassa) —
// hidden for now; the swipeable "Real results" stories below take its place.
const SHOW_SIX_SECONDS = false;

// "Helping job seekers land roles at 1,000+ companies like…" — hidden until
// the companies and count in lib/social-proof.ts are real ones.
const SHOW_HIRED_AT = false;

// The reviews and "500+ reviews / 10,000+ users" stats — hidden until
// REVIEWS and REVIEW_STATS in lib/social-proof.ts are real ones.
const SHOW_REVIEWS = false;

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
    <div className="min-h-screen overflow-x-clip bg-[#fdfdfd] text-neutral-900 selection:bg-neutral-950 selection:text-white relative font-sans">

      {/* A warm wash behind the hero */}
      <div className={styles.heroGlow} aria-hidden="true" />

      {/* Floating Pill Navigation */}
      <Navbar />

      {/* Main Content Sections */}
      <main className="relative z-10 flex flex-col">
        {/* Mobbin-inspired Hero */}
        <Hero />

        {/* Where users got hired */}
        {SHOW_HIRED_AT && <HiredAtStrip />}

        {/* Everything it does: create, improve, tailor, and the tools around them */}
        <div className={`${styles.sectionScene} ${styles.glowRight}`}>
          <LandingDetail kind="resume" />
          <FeaturesSection />
        </div>

        {/* How It Works (Directly below Hero) */}
        <div className={`${styles.sectionScene} ${styles.glowLeft}`}>
          <LandingDetail kind="keywords" />
          <HowItWorks />
        </div>

        {/* Templates Showcase */}
        <div className={`${styles.sectionScene} ${styles.glowRight}`}>
          <LandingDetail kind="templates" />
          <TemplatesSection />
        </div>

        {/* Real Results: Before & After CV Comparison */}
        {SHOW_SIX_SECONDS && <RealResultsSection />}

        {/* What users say */}
        {SHOW_REVIEWS && (
          <div className={`${styles.sectionScene} ${styles.glowLeft}`}>
            <ReviewsSection />
          </div>
        )}

        {/* Pricing (Free, Pro) */}
        <div className={`${styles.sectionScene} ${styles.glowRight}`}>
          <LandingDetail kind="ready" />
          <PricingSection />
        </div>
      </main>

      {/* Minimal Footer */}
      <Footer />

      {/* Moxie, peeking in from the bottom-right edge with a quick start */}
      <MoxiePeek />
    </div>
  );
}
