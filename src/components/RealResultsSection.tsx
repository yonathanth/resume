"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  XCircle,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Zap,
} from "lucide-react";

interface RealResultsSectionProps {
  onTryItYourself?: () => void;
}

export function RealResultsSection({ onTryItYourself }: RealResultsSectionProps) {
  const [activeTab, setActiveTab] = useState<"tech" | "product">("tech");

  const examples = {
    tech: {
      candidate: "Kidus Haile",
      role: "Senior Full Stack / Cloud Architect",
      targetCompany: "Vercel / Stripe",
      before: {
        title: "Web Developer",
        summary: "Hardworking developer with good skills in JavaScript and web development seeking a software engineering job. Good team player.",
        bullets: [
          "Worked on frontend website features using React and HTML.",
          "Helped fix bugs in backend code and wrote tests when needed.",
          "Maintained company database and wrote SQL queries for team.",
        ],
        score: 41,
        issues: [
          "Zero quantified metrics or measurable business outcomes",
          "Passive, weak verbs ('Worked on', 'Helped fix')",
          "Missing high-value keywords: Next.js 16, Distributed Systems, CI/CD",
        ],
      },
      after: {
        title: "Senior Full Stack & Cloud Architect",
        summary: "Cloud-native engineer with 6+ years architecting distributed microservices and low-latency web platforms. Proven track record scaling systems to 1M+ MAU.",
        bullets: [
          "Architected low-latency micro-frontends with Next.js 16 & TypeScript, cutting p99 load times by 44% for 140k+ daily active users.",
          "Engineered distributed event-driven pipelines with Go & Apache Kafka, processing 12M+ daily webhook events with 99.99% uptime.",
          "Automated containerized CI/CD infrastructure via Docker & Terraform on AWS, slashing deploy lead times from 45 min to 6 min.",
        ],
        score: 98,
        improvements: [
          "+57% ATS keyword density match",
          "Quantified business results on every single bullet point",
          "Engineered for strict applicant tracking algorithms",
        ],
      },
    },
    product: {
      candidate: "Selamawit Bekele",
      role: "Staff Product Designer",
      targetCompany: "Linear / Figma",
      before: {
        title: "UI Designer",
        summary: "Creative designer with experience making wireframes and prototypes in Figma. Passionate about user interfaces and user experience.",
        bullets: [
          "Designed wireframes and mockups for web and mobile apps.",
          "Attended sprint meetings and talked with engineers.",
          "Updated company style guide and designed icons.",
        ],
        score: 44,
        issues: [
          "Lacks business metrics (conversion, retention, task speed)",
          "Vague scope of leadership and collaboration",
          "Missing core keywords: Design Systems, A/B Testing, Cross-Functional",
        ],
      },
      after: {
        title: "Staff Product Designer & Design Systems Lead",
        summary: "Product designer with 7+ years leading end-to-end UX architecture for complex B2B SaaS workflows. Built multi-brand design systems adopted across 30+ engineering squads.",
        bullets: [
          "Built and scaled universal design system with 250+ accessible Figma components, reducing design-to-production handoff cycle by 35%.",
          "Spearheaded redesign of enterprise checkout funnel, driving a 22% uplift in conversion and unlocking $2.8M in annualized pipeline.",
          "Conducted 40+ user research sessions and iterative A/B validation tests, reducing onboarding drop-off rate by 29%.",
        ],
        score: 97,
        improvements: [
          "+53% ATS keyword density match",
          "Direct attribution to revenue & conversion metrics",
          "Leadership & systems scale clearly demonstrated",
        ],
      },
    },
  };

  const current = examples[activeTab];

  return (
    <section id="results" className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-neutral-100">
      {/* Section Header - Without Real Results Tag */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-neutral-950 leading-tight">
          See the difference <br />
          <span className="text-neutral-400 font-normal">between ignored and interviewed.</span>
        </h2>
        
        <p className="mt-4 text-base sm:text-lg text-neutral-500 max-w-xl mx-auto leading-relaxed">
          Recruiters spend an average of 6 seconds per resume. Here is how Resumate transforms passive bullets into interview-winning achievements.
        </p>

        {/* Role Toggle Switcher */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center p-1 rounded-full bg-neutral-100 border border-neutral-200">
            <button
              onClick={() => setActiveTab("tech")}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "tech"
                  ? "bg-white text-neutral-950 shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-950"
              }`}
            >
              Engineering & Cloud (Kidus)
            </button>
            <button
              onClick={() => setActiveTab("product")}
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "product"
                  ? "bg-white text-neutral-950 shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-950"
              }`}
            >
              Product & Design (Selamawit)
            </button>
          </div>
        </div>
      </div>

      {/* Before vs After Dual Card Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        
        {/* LEFT CARD: The "Bad" CV (Before) */}
        <div className="rounded-3xl bg-neutral-50/70 border border-neutral-200/80 p-6 sm:p-8 flex flex-col justify-between shadow-2xs relative overflow-hidden">
          {/* Top Status Bar */}
          <div>
            <div className="flex items-center justify-between pb-5 border-b border-neutral-200/60 mb-5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Before · Un-tailored CV
                </span>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                <span>{current.before.score}% ATS Score</span>
              </div>
            </div>

            {/* Simulated Candidate Header */}
            <div className="mb-5">
              <div className="text-sm font-bold text-neutral-700">{current.candidate}</div>
              <div className="text-xs text-neutral-400 mt-0.5">{current.before.title}</div>
            </div>

            {/* Summary */}
            <div className="p-3.5 rounded-xl bg-white border border-neutral-200/80 text-xs text-neutral-500 leading-relaxed mb-5 italic">
              &ldquo;{current.before.summary}&rdquo;
            </div>

            {/* Bullets */}
            <div className="space-y-3 mb-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Experience Bullets:
              </div>
              {current.before.bullets.map((b, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white border border-neutral-200/70 text-xs text-neutral-600 leading-relaxed flex items-start gap-2.5"
                >
                  <span className="text-red-400 font-bold mt-0.5 text-sm">•</span>
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnostic Warnings */}
          <div className="pt-4 border-t border-neutral-200/60">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Diagnostic Flaws:</span>
            </div>
            <div className="space-y-1.5">
              {current.before.issues.map((iss, i) => (
                <div key={i} className="text-xs text-neutral-500 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                  <span>{iss}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT CARD: The "Enhanced" CV (After) */}
        <div className="rounded-3xl bg-white border-2 border-neutral-950 p-6 sm:p-8 flex flex-col justify-between shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] relative overflow-hidden ring-4 ring-neutral-950/5">
          
          {/* Top Status Bar */}
          <div>
            <div className="flex items-center justify-between pb-5 border-b border-neutral-100 mb-5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-950 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
                  After · Resumate Tailored
                </span>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300/80 flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{current.after.score}% ATS Score · Interview Ready</span>
              </div>
            </div>

            {/* Candidate Header */}
            <div className="mb-5">
              <div className="text-sm font-bold text-neutral-950">{current.candidate}</div>
              <div className="text-xs text-neutral-600 font-medium mt-0.5">{current.after.title}</div>
            </div>

            {/* Enhanced Summary */}
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs text-neutral-700 leading-relaxed mb-5 font-medium">
              &ldquo;{current.after.summary}&rdquo;
            </div>

            {/* Enhanced Bullets */}
            <div className="space-y-3 mb-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-950 flex items-center justify-between">
                <span>Tailored Achievement Bullets:</span>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                  XYZ Metric Formula
                </span>
              </div>
              {current.after.bullets.map((b, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-neutral-950 text-white text-xs leading-relaxed flex items-start gap-2.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-neutral-100">{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Advantages */}
          <div className="pt-4 border-t border-neutral-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-2.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Engineered Advancements:</span>
            </div>
            <div className="space-y-1.5">
              {current.after.improvements.map((imp, i) => (
                <div key={i} className="text-xs text-neutral-700 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{imp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Center Action: Larger "Try it for yourself" Button with text below */}
      <div className="mt-16 text-center max-w-xl mx-auto flex flex-col items-center">
        <Link
          href="#editor"
          onClick={onTryItYourself}
          className="w-full sm:w-auto px-9 py-4.5 rounded-full bg-neutral-950 text-white font-semibold text-base sm:text-lg hover:bg-neutral-800 active:scale-98 transition-all duration-150 shadow-lg hover:shadow-xl flex items-center justify-center gap-2.5 group cursor-pointer"
        >
          <span>Try it for yourself</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>

        <p className="mt-4 text-sm sm:text-base text-neutral-500 font-normal">
          Test your existing resume against any job description in 30 seconds
        </p>
      </div>
    </section>
  );
}
