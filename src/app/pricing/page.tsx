"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Check,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Award,
  Building2,
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How does the ATS score & keyword optimization work?",
    answer:
      "Resumate parses target job descriptions using the exact same parsing algorithms used by Greenhouse, Lever, and Workday. It extracts mandatory hard skills, qualifications, and action verbs, and helps you rewrite bullet points using Google's proven XYZ formula ('Accomplished [X] as measured by [Y], by doing [Z]').",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. You can cancel your Pro subscription at any time with a single click from your account dashboard. You will retain full Pro access until the end of your current paid month.",
  },
  {
    question: "What formats can I export my resume and cover letter to?",
    answer:
      "All plans include instant export to high-resolution, machine-readable PDF (standard for ATS applications) as well as fully editable Microsoft Word (.docx) documents.",
  },
  {
    question: "What is included in the Explore Executive+ add-on?",
    answer:
      "Executive+ unlocks full access to 140+ real, offer-producing resumes, portfolio breakdowns, and recruiter interview notes from verified candidates who landed offers at Google, Goldman Sachs, McKinsey, Stripe, Apple, and Amazon.",
  },
  {
    question: "Do you offer student or non-profit discounts?",
    answer:
      "Yes! We offer a 50% discount on the Pro plan for active university students, bootcamps, and non-profit career centers. Reach out to support@resumate.ai with your institutional email.",
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-white selection:text-neutral-950 relative font-sans flex flex-col justify-between overflow-x-hidden">
      {/* Background ambient subtle glow & dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-gradient-to-b from-neutral-800/15 via-neutral-900/5 to-transparent blur-3xl pointer-events-none" />

      {/* Floating Dark Pill Navigation */}
      <Navbar theme="dark" />

      {/* Main Container */}
      <main className="relative z-10 pt-32 sm:pt-36 pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {/* Header matching Mobbin reference */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-5">
            Craft like a Pro.
          </h1>
          <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed font-normal">
            Get full access to AI resume tailoring, ATS keyword optimization,
            unlimited exports, and verified hiring benchmarks.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 sm:mt-14 items-stretch max-w-3xl mx-auto">
          {/* Tier 1: Pro (Popular) */}
          <div className="rounded-3xl bg-[#141416] border border-neutral-700/80 shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:border-neutral-500 transition-all p-7 sm:p-8 flex flex-col justify-between relative group">
            <div>
              {/* Title & Popular Badge */}
              <div className="h-8 flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    Pro
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#27272a] text-neutral-200 border border-neutral-700">
                    Popular
                  </span>
                </div>
              </div>

              {/* Subtitle */}
              <p className="h-8 text-xs text-neutral-400 mb-5 font-normal flex items-center">
                For active job seekers & career switchers
              </p>

              {/* Price & Cadence */}
              <div className="h-16 flex items-baseline gap-2 mb-6">
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                  $5
                </span>
                <div className="text-[11px] text-neutral-400 leading-tight font-medium">
                  <div>per month</div>
                  <div>billed monthly</div>
                </div>
              </div>

              {/* CTA Button: Solid White Button */}
              <Link
                href="/signup"
                className="w-full py-3.5 rounded-full bg-white text-neutral-950 font-semibold text-sm hover:bg-neutral-200 active:scale-98 transition-all shadow-sm cursor-pointer flex items-center justify-center"
              >
                Get Pro
              </Link>

              {/* Note under button */}
              <div className="h-6 text-[11px] text-neutral-500 text-center mt-2.5 mb-6 flex items-center justify-center">
                For 1 job seeker
              </div>

              {/* Features List */}
              <div className="pt-6 border-t border-neutral-800">
                <div className="text-xs font-semibold text-white mb-3.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Core Pro Capabilities</span>
                </div>
                <ul className="space-y-3">
                  {[
                    "Unlimited tailored resumes & cover letters",
                    "Real-time JD keyword & ATS match scoring",
                    "AI bullet quantification (XYZ formula)",
                    "ATS parse verification (Lever, Greenhouse)",
                    "Instant PDF & editable Word (.docx) export",
                    "Access to all 24+ recruiter-tested templates",
                    "LinkedIn profile & PDF resume 1-click import",
                    "Unlimited custom job role profiles",
                  ].map((feat, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2.5 text-xs text-neutral-300 font-medium"
                    >
                      <Check className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Tier 2: Enterprise */}
          <div className="rounded-3xl bg-[#141416] border border-neutral-800/90 hover:border-neutral-700 transition-all p-7 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Title */}
              <div className="h-8 flex items-center mb-1">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Enterprise
                </h3>
              </div>

              {/* Subtitle */}
              <p className="h-8 text-xs text-neutral-400 mb-5 font-normal flex items-center">
                For universities, staffing firms & enterprise
              </p>

              {/* Price & Cadence */}
              <div className="h-16 flex items-baseline gap-2 mb-6">
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                  Custom
                </span>
                <div className="text-[11px] text-neutral-400 leading-tight font-medium">
                  <div>tailored volume</div>
                  <div>billed annually</div>
                </div>
              </div>

              {/* CTA Button: Dark with Subtle Border */}
              <Link
                href="/signup"
                className="w-full py-3.5 rounded-full border border-neutral-700 bg-[#1e1e21] text-white font-semibold text-sm hover:bg-neutral-800 hover:border-neutral-600 active:scale-98 transition-all shadow-2xs cursor-pointer flex items-center justify-center"
              >
                Contact us
              </Link>

              {/* Note under button */}
              <div className="h-6 text-[11px] text-neutral-500 text-center mt-2.5 mb-6 flex items-center justify-center">
                Unlimited candidates & staff
              </div>

              {/* Features List */}
              <div className="pt-6 border-t border-neutral-800">
                <div className="text-xs font-semibold text-white mb-3.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Everything in Pro plus</span>
                </div>
                <ul className="space-y-3">
                  {[
                    "Custom ATS parser rules & benchmarks",
                    "Dedicated career success manager",
                    "SAML & SCIM single sign-on (SSO)",
                    "Custom university/firm branding & domain",
                    "Full REST API access & webhooks",
                    "Enterprise SLA & SOC-2 compliance",
                    "Tailored onboarding & staff training",
                  ].map((feat, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2.5 text-xs text-neutral-300 font-medium"
                    >
                      <Check className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Add-on Banner Section (Matching media_1788511576796.png) */}
        <div className="mt-20 sm:mt-28 rounded-3xl bg-[#141416] border border-neutral-800/90 p-8 sm:p-10 lg:p-12 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Info Column */}
            <div className="lg:col-span-6 flex flex-col items-start">
              {/* Badge */}
              <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-[#222226] text-neutral-300 border border-neutral-700/80 mb-6">
                Add-on
              </span>

              {/* Title */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">
                Explore Executive+
              </h2>

              {/* Description */}
              <p className="text-neutral-400 text-sm sm:text-base leading-relaxed mb-8 max-w-xl font-normal">
                Add-on for ambitious professionals and coaching teams. Access to
                over 140+ verified real resumes &amp; portfolio benchmarks across
                Big Tech, Wall Street, Top Consulting &amp; more for $39/mo.
                Billed yearly.
              </p>

              {/* Action Button */}
              <button
                type="button"
                className="px-8 py-3.5 rounded-full bg-white text-neutral-950 font-semibold text-sm hover:bg-neutral-200 active:scale-98 transition-all cursor-pointer shadow-sm"
              >
                Read more
              </button>

              {/* Footnote */}
              <span className="text-xs text-neutral-500 mt-5">
                Available on the Enterprise plan
              </span>
            </div>

            {/* Right 6 Dark Icon Cards (Matching Mobbin Layout) */}
            <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-2 gap-4 sm:gap-5">
              {/* Card 1: Google */}
              <div className="rounded-2xl bg-[#1c1c1f] border border-neutral-800/90 hover:border-neutral-700 p-5 sm:p-6 flex flex-col items-center text-center justify-center gap-3 transition-all hover:bg-[#212126] group cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-[#28282d] border border-neutral-700/70 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white tracking-tight">
                    Google
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Staff SWE &amp; L6 PM
                  </div>
                </div>
              </div>

              {/* Card 2: Goldman Sachs */}
              <div className="rounded-2xl bg-[#1c1c1f] border border-neutral-800/90 hover:border-neutral-700 p-5 sm:p-6 flex flex-col items-center text-center justify-center gap-3 transition-all hover:bg-[#212126] group cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-[#7399c6] flex items-center justify-center text-[#1c1c1f] font-serif font-black text-base shadow-xs group-hover:scale-105 transition-transform">
                  GS
                </div>
                <div>
                  <div className="text-sm font-semibold text-white tracking-tight">
                    Goldman Sachs
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Quant &amp; Investment Banking
                  </div>
                </div>
              </div>

              {/* Card 3: McKinsey & Company */}
              <div className="rounded-2xl bg-[#1c1c1f] border border-neutral-800/90 hover:border-neutral-700 p-5 sm:p-6 flex flex-col items-center text-center justify-center gap-3 transition-all hover:bg-[#212126] group cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-[#002244] border border-neutral-700/60 flex items-center justify-center text-white font-serif font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
                  McK
                </div>
                <div>
                  <div className="text-sm font-semibold text-white tracking-tight">
                    McKinsey &amp; Co.
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Strategy &amp; Engagement Mgr
                  </div>
                </div>
              </div>

              {/* Card 4: Stripe */}
              <div className="rounded-2xl bg-[#1c1c1f] border border-neutral-800/90 hover:border-neutral-700 p-5 sm:p-6 flex flex-col items-center text-center justify-center gap-3 transition-all hover:bg-[#212126] group cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-[#635BFF] flex items-center justify-center text-white font-bold text-xl shadow-xs group-hover:scale-105 transition-transform">
                  S
                </div>
                <div>
                  <div className="text-sm font-semibold text-white tracking-tight">
                    Stripe
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Infrastructure &amp; Growth
                  </div>
                </div>
              </div>

              {/* Card 5: Apple */}
              <div className="rounded-2xl bg-[#1c1c1f] border border-neutral-800/90 hover:border-neutral-700 p-5 sm:p-6 flex flex-col items-center text-center justify-center gap-3 transition-all hover:bg-[#212126] group cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-[#28282d] border border-neutral-700/70 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 fill-white" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-5.77-8.91-10.29-19.14-13.56-30.7-3.27-11.56-4.9-22.39-4.9-32.49 0-14.9 3.59-27.18 10.77-36.83 7.18-9.65 16.32-14.6 27.42-14.86 4.89 0 10.12 1.24 15.69 3.73 5.57 2.49 9.38 3.79 11.44 3.79 1.85 0 5.83-1.34 11.95-4.02 6.12-2.68 11.66-3.89 16.63-3.62 12.62.65 22.8 5.25 30.55 13.8-11.09 6.74-16.52 16.14-16.3 28.2.22 9.57 3.97 17.59 11.25 24.06 7.28 6.47 16.02 10.23 26.22 11.29-2.61 8.05-5.98 16.09-10.12 24.12zM119.22 33.15c0-7.18 2.61-13.91 7.83-20.19 5.22-6.28 11.53-10.43 18.93-12.45.22 1.3.33 2.39.33 3.26 0 7.18-2.66 14.13-7.99 20.87-5.33 6.74-11.9 10.97-19.72 12.71-.22-1.3-.38-2.7-.38-4.2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white tracking-tight">
                    Apple
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Hardware &amp; Systems Arch
                  </div>
                </div>
              </div>

              {/* Card 6: Amazon */}
              <div className="rounded-2xl bg-[#1c1c1f] border border-neutral-800/90 hover:border-neutral-700 p-5 sm:p-6 flex flex-col items-center text-center justify-center gap-3 transition-all hover:bg-[#212126] group cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-[#232F3E] border border-[#FF9900]/40 flex items-center justify-center text-[#FF9900] font-black text-xl shadow-xs group-hover:scale-105 transition-transform">
                  a
                </div>
                <div>
                  <div className="text-sm font-semibold text-white tracking-tight">
                    Amazon
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Principal TPM &amp; AWS Arch
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Value Trust Grid */}
        <div className="mt-20 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#121214] border border-neutral-800 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#1c1c1f] border border-neutral-700/60 flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">
                99% ATS Parse Guarantee
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Tested across Greenhouse, Lever, Workday, and Taleo to ensure
                zero unread or garbled tables.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#121214] border border-neutral-800 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#1c1c1f] border border-neutral-700/60 flex items-center justify-center text-white shrink-0">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">
                1-Click Tailor per Application
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Paste any job description and generate targeted bullet points
                quantified with impact metrics.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#121214] border border-neutral-800 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#1c1c1f] border border-neutral-700/60 flex items-center justify-center text-white shrink-0">
              <Award className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">
                Recruiter-Approved Design
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Typography, hierarchy, and micro-spacing vetted by former tech &amp;
                finance talent partners.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive FAQ Section */}
        <div className="mt-24 sm:mt-32 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
              Frequently asked questions
            </h2>
            <p className="text-neutral-400 text-sm">
              Everything you need to know about our plans, billing, and resume
              features.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#141416] border border-neutral-800/90 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#18181b] transition-colors"
                  >
                    <span className="text-sm sm:text-base font-semibold text-white">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-white" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-neutral-400 leading-relaxed border-t border-neutral-800/50">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA Callout */}
        <div className="mt-24 sm:mt-32 rounded-3xl bg-gradient-to-b from-[#18181c] to-[#121214] border border-neutral-800 p-8 sm:p-12 text-center max-w-4xl mx-auto">
          <h3 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Ready to stand out in the applicant pool?
          </h3>
          <p className="text-neutral-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Join thousands of professionals landing interviews at top companies
            with tailored, high-scoring resumes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-neutral-950 font-semibold text-sm hover:bg-neutral-200 active:scale-98 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <span>Start building for free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/#templates"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full border border-neutral-700 bg-[#1e1e21] text-white font-semibold text-sm hover:bg-neutral-800 active:scale-98 transition-all"
            >
              Explore all templates
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
