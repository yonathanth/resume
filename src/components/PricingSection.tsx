"use client";

import React from "react";
import Link from "next/link";
import { Check, ArrowRight, ExternalLink } from "lucide-react";

interface PricingSectionProps {
  onSelectPlan?: (plan: string) => void;
}

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-neutral-100">
      {/* 3-Tier Pricing Grid matching the site's container and padding culture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        
        {/* Tier 1: Pro (Popular) - Crisp Elevated White */}
        <div className="rounded-3xl bg-white border-2 border-neutral-950 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08)] hover:shadow-xl transition-all p-7 sm:p-8 flex flex-col justify-between relative">
          <div>
            {/* Row 1: Title & Popular Badge (Fixed Height: h-8) */}
            <div className="h-8 flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <h3 className="text-2xl font-bold text-neutral-950 tracking-tight">Pro</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-950 text-white shadow-2xs">
                  Popular
                </span>
              </div>
            </div>
            
            {/* Row 2: Subtitle (Fixed Height: h-8) */}
            <p className="h-8 text-xs text-neutral-500 mb-5 font-normal flex items-center">
              For active job seekers & career switchers
            </p>

            {/* Row 3: Price & Billing Cadence (Fixed Height: h-16) */}
            <div className="h-16 flex items-baseline gap-2 mb-6">
              <span className="text-4xl sm:text-5xl font-extrabold text-neutral-950 tracking-tight">
                $10
              </span>
              <div className="text-[11px] text-neutral-500 leading-tight font-medium">
                <div>per month</div>
                <div>billed yearly</div>
              </div>
            </div>

            {/* Row 4: CTA Button (Same level across all 3 cards) */}
            <button
              onClick={() => onSelectPlan?.("Pro")}
              className="w-full py-3.5 rounded-full bg-neutral-950 text-white font-semibold text-sm hover:bg-neutral-800 active:scale-98 transition-all shadow-sm cursor-pointer"
            >
              Get Pro
            </button>

            {/* Row 5: Note under button (Fixed Height: h-6) */}
            <div className="h-6 text-[11px] text-neutral-400 text-center mt-2 mb-6 flex items-center justify-center">
              For 1 job seeker
            </div>

            {/* Row 6: Features List */}
            <div className="pt-6 border-t border-neutral-100">
              <div className="text-xs font-semibold text-neutral-900 mb-3.5">
                Core Pro Capabilities
              </div>
              <ul className="space-y-3">
                {[
                  "Unlimited tailored resumes & cover letters",
                  "Real-time Job Description keyword matching",
                  "AI bullet quantification (XYZ formula)",
                  "ATS scanner & parse compatibility score",
                  "Instant PDF & editable Word (.docx) export",
                  "Access to all recruiter-tested templates",
                  "LinkedIn profile & PDF resume import",
                ].map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-xs text-neutral-700 font-medium">
                    <Check className="w-4 h-4 text-neutral-950 shrink-0 stroke-[2.5]" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Tier 2: Team - Soft Off-White Neutral Shade */}
        <div className="rounded-3xl bg-[#f9f9f9] border border-neutral-200/90 shadow-2xs hover:shadow-md transition-all p-7 sm:p-8 flex flex-col justify-between">
          <div>
            {/* Row 1: Title (Fixed Height: h-8) */}
            <div className="h-8 flex items-center mb-1">
              <h3 className="text-2xl font-bold text-neutral-950 tracking-tight">Team</h3>
            </div>
            
            {/* Row 2: Subtitle (Fixed Height: h-8) */}
            <p className="h-8 text-xs text-neutral-500 mb-5 font-normal flex items-center">
              For career coaches, bootcamps & agencies
            </p>

            {/* Row 3: Price & Billing Cadence (Fixed Height: h-16) */}
            <div className="h-16 flex items-baseline gap-2 mb-6">
              <span className="text-4xl sm:text-5xl font-extrabold text-neutral-950 tracking-tight">
                $16
              </span>
              <div className="text-[11px] text-neutral-500 leading-tight font-medium">
                <div>per member/month</div>
                <div>billed yearly</div>
              </div>
            </div>

            {/* Row 4: CTA Button (Same level across all 3 cards) */}
            <button
              onClick={() => onSelectPlan?.("Team")}
              className="w-full py-3.5 rounded-full border border-neutral-300 bg-white text-neutral-900 font-semibold text-sm hover:bg-neutral-50 hover:border-neutral-400 active:scale-98 transition-all shadow-2xs cursor-pointer"
            >
              Create team
            </button>

            {/* Row 5: Note under button (Fixed Height: h-6) */}
            <div className="h-6 text-[11px] text-neutral-400 text-center mt-2 mb-6 flex items-center justify-center">
              For 1 or more coaches
            </div>

            {/* Row 6: Features List */}
            <div className="pt-6 border-t border-neutral-200/80">
              <div className="text-xs font-semibold text-neutral-900 mb-3.5">
                Everything in Pro plus
              </div>
              <ul className="space-y-3">
                {[
                  { text: "Invite teammates & candidates", soon: false },
                  { text: "Candidate review & feedback dashboard", soon: false },
                  { text: "Shared custom template library", soon: false },
                  { text: "Bulk resume tailoring & ATS scoring", soon: false },
                  { text: "Centralized team billing & seat management", soon: false },
                  { text: "Slack & email notifications", soon: true },
                  { text: "White-label candidate PDF export", soon: false },
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-xs text-neutral-700 font-medium">
                    <Check className="w-4 h-4 text-neutral-950 shrink-0 stroke-[2.5]" />
                    <span className="flex items-center gap-1.5">
                      <span>{item.text}</span>
                      {item.soon && (
                        <span className="text-[9px] font-bold bg-white text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-300">
                          Soon
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Tier 3: Enterprise - Sleek Cool Light Gray Shade */}
        <div className="rounded-3xl bg-[#f3f4f6] border border-neutral-200/90 shadow-2xs hover:shadow-md transition-all p-7 sm:p-8 flex flex-col justify-between">
          <div>
            {/* Row 1: Title (Fixed Height: h-8) */}
            <div className="h-8 flex items-center mb-1">
              <h3 className="text-2xl font-bold text-neutral-950 tracking-tight">Enterprise</h3>
            </div>
            
            {/* Row 2: Subtitle (Fixed Height: h-8) */}
            <p className="h-8 text-xs text-neutral-500 mb-5 font-normal flex items-center">
              For universities, staffing firms & enterprises
            </p>

            {/* Row 3: Price & Billing Cadence (Fixed Height: h-16) */}
            <div className="h-16 flex items-baseline gap-2 mb-6">
              <span className="text-4xl sm:text-5xl font-extrabold text-neutral-950 tracking-tight">
                Custom
              </span>
              <div className="text-[11px] text-neutral-500 leading-tight font-medium">
                <div>tailored volume</div>
                <div>billed annually</div>
              </div>
            </div>

            {/* Row 4: CTA Button (Same level across all 3 cards) */}
            <button
              onClick={() => onSelectPlan?.("Enterprise")}
              className="w-full py-3.5 rounded-full border border-neutral-300 bg-white text-neutral-900 font-semibold text-sm hover:bg-neutral-50 hover:border-neutral-400 active:scale-98 transition-all shadow-2xs cursor-pointer"
            >
              Contact us
            </button>

            {/* Row 5: Note under button (Fixed Height: h-6) */}
            <div className="h-6 text-[11px] text-neutral-400 text-center mt-2 mb-6 flex items-center justify-center">
              Unlimited candidates & staff
            </div>

            {/* Row 6: Features List */}
            <div className="pt-6 border-t border-neutral-200/80">
              <div className="text-xs font-semibold text-neutral-900 mb-3.5">
                Everything in Team plus
              </div>
              <ul className="space-y-3">
                {[
                  "Custom ATS parser rules & benchmarks",
                  "Dedicated career success manager",
                  "SAML & SCIM single sign-on (SSO)",
                  "Custom branding & domain export",
                  "Full REST API access & webhooks",
                  "Enterprise SLA & security compliance",
                  "Tailored onboarding & staff training",
                ].map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-xs text-neutral-700 font-medium">
                    <Check className="w-4 h-4 text-neutral-950 shrink-0 stroke-[2.5]" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* Centered Get started CTA Button directly under pricing */}
      <div className="mt-14 sm:mt-16 text-center flex flex-col items-center justify-center gap-3">
        <Link
          href="/signup"
          className="px-9 py-4 rounded-full bg-neutral-950 text-white font-semibold text-base hover:bg-neutral-800 active:scale-98 transition-all duration-150 shadow-md hover:shadow-lg flex items-center gap-2.5 group cursor-pointer"
        >
          <span>Get started</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-neutral-500 hover:text-neutral-950 transition-colors pt-2 group"
        >
          <span>Explore full dark pricing, team plans &amp; Executive+ add-on</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
