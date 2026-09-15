"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  FileCheck,
  Zap,
  Mail,
  ExternalLink,
} from "lucide-react";

export function HelpView() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does the ATS Parse score work?",
      a: "Our scanner tests your resume against parser rules used by Greenhouse, Lever, Workday, and Taleo. It verifies that headers, dates, company names, and bullet points are extracted into standard JSON data without garbled characters or skipped sections.",
    },
    {
      q: "What is Google's XYZ formula?",
      a: "Google recruiters look for achievements formatted as: 'Accomplished [X] as measured by [Y], by doing [Z]'. For example: 'Reduced API response times [X] by 44% [Y], by implementing distributed Redis caching and query batching [Z]'.",
    },
    {
      q: "How many keywords should I match from the job posting?",
      a: "Aim for a keyword match score between 85% and 95%. Going above 95% often sounds robotic, while falling below 70% puts your application at risk of being filtered out by automated screening filters.",
    },
    {
      q: "Should I submit PDF or Word (.docx)?",
      a: "PDF is recommended for 98% of direct applications because it preserves typography and layout perfectly. Only submit Word (.docx) if the employer or staffing agency explicitly requests it.",
    },
  ];

  return (
    <div className="px-8 py-10 sm:px-14 sm:py-14 lg:px-20 lg:py-16 max-w-5xl mx-auto w-full">
      {/* Top Header */}
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950">
          Help
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Frequently asked questions, ATS optimization checklists, and recruiter advice.
        </p>
      </div>

      <div className="space-y-8">
        {/* ATS Golden Rules Checklist */}
        <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-2xs p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-neutral-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-neutral-950">
              ATS Compliance Checklist
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-neutral-700">
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-neutral-950 block mb-0.5">
                  Standard Section Headings
                </strong>
                Use standard names: &ldquo;Experience&rdquo;, &ldquo;Education&rdquo;, &ldquo;Skills&rdquo;. Avoid obscure titles like &ldquo;My Journey&rdquo;.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-neutral-950 block mb-0.5">
                  Quantified XYZ Impact
                </strong>
                Every bullet point should show measurable metrics: percentage improvements, dollar values, user counts, or latency reductions.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-neutral-950 block mb-0.5">
                  No Unparseable Columns
                </strong>
                Avoid complex multi-layer nested graphic tables. Resumate templates are pre-engineered for 100% clean OCR parsing.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                4
              </span>
              <div>
                <strong className="text-neutral-950 block mb-0.5">
                  Targeted Keywords
                </strong>
                Mirror the exact technology names and certifications stated in the job description (e.g. &ldquo;Kubernetes&rdquo; vs &ldquo;K8s&rdquo;).
              </div>
            </div>
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-2xs p-6 sm:p-8">
          <h2 className="text-base font-bold text-neutral-950 mb-5">
            Frequently Asked Questions
          </h2>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-neutral-200/80 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50/70"
                  >
                    <span className="text-sm font-semibold text-neutral-900">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${
                        isOpen ? "rotate-180 text-neutral-950" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-xs text-neutral-600 leading-relaxed border-t border-neutral-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Support */}
        <div className="rounded-3xl bg-neutral-950 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold">Need assistance with your resume?</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Our career coaches and support team are available to review your tailored drafts.
            </p>
          </div>
          <a
            href="mailto:support@resumate.ai"
            className="px-5 py-2.5 rounded-xl bg-white text-neutral-950 font-semibold text-xs hover:bg-neutral-200 transition-colors shrink-0"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
