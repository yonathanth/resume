"use client";

import React, { useState } from "react";
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  Download,
  PenTool,
  Check,
  Search,
} from "lucide-react";

export function HowItWorks() {
  const [selectedMethod, setSelectedMethod] = useState<"upload" | "form" | "desc">("upload");
  const [selectedTemplate, setSelectedTemplate] = useState<number>(0);

  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-neutral-100">
      {/* Section Header - Literally "How it works" */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-neutral-950">
          How it works
        </h2>
        <p className="mt-3 text-base sm:text-lg text-neutral-500 font-normal">
          From your raw experience to a tailored, recruiter-ready resume in just four simple steps.
        </p>
      </div>

      {/* 2x2 Grid Layout inspired by screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        
        {/* Step 1: Select a method to tell us about yourself */}
        <div className="group rounded-3xl bg-white border border-neutral-200/90 hover:border-neutral-300 p-6 sm:p-7 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all">
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-neutral-400 mb-1.5 font-mono">
              Step 01
            </div>
            <h3 className="text-xl font-bold text-neutral-950 mb-2">
              Select a method to tell us about yourself
            </h3>
            <p className="text-sm text-neutral-500 leading-relaxed mb-6">
              Choose your preferred way to input your career history — upload an existing CV, fill out a guided form, or paste a description about yourself.
            </p>
          </div>

          {/* Interactive Micro-UI Mockup for Step 1 */}
          <div className="w-full rounded-2xl bg-neutral-50 border border-neutral-200/70 p-4 flex flex-col gap-2.5">
            {/* Method Option A: Upload Existing CV */}
            <div
              onClick={() => setSelectedMethod("upload")}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                selectedMethod === "upload"
                  ? "bg-white border-neutral-950 shadow-xs ring-1 ring-neutral-950/10"
                  : "bg-white/60 border-neutral-200 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedMethod === "upload" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-900">Upload existing CV</div>
                  <div className="text-[10px] text-neutral-400">PDF, DOCX, or LinkedIn export</div>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === "upload" ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300"}`}>
                {selectedMethod === "upload" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </div>

            {/* Method Option B: Fill out forms */}
            <div
              onClick={() => setSelectedMethod("form")}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                selectedMethod === "form"
                  ? "bg-white border-neutral-950 shadow-xs ring-1 ring-neutral-950/10"
                  : "bg-white/60 border-neutral-200 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedMethod === "form" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-900">Fill out step-by-step form</div>
                  <div className="text-[10px] text-neutral-400">Guided fields for experience & education</div>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === "form" ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300"}`}>
                {selectedMethod === "form" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </div>

            {/* Method Option C: Self Description */}
            <div
              onClick={() => setSelectedMethod("desc")}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                selectedMethod === "desc"
                  ? "bg-white border-neutral-950 shadow-xs ring-1 ring-neutral-950/10"
                  : "bg-white/60 border-neutral-200 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedMethod === "desc" ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-900">Paste career summary</div>
                  <div className="text-[10px] text-neutral-400">Write freely & let AI structure it</div>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMethod === "desc" ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300"}`}>
                {selectedMethod === "desc" && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Add a job description (Optional) */}
        <div className="group rounded-3xl bg-white border border-neutral-200/90 hover:border-neutral-300 p-6 sm:p-7 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-400 font-mono">
                Step 02
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                Optional
              </span>
            </div>
            <h3 className="text-xl font-bold text-neutral-950 mb-2">
              Add a target job description
            </h3>
            <p className="text-sm text-neutral-500 leading-relaxed mb-6">
              Paste the job posting to match requirements, inject missing industry keywords, and tailor your bullet points specifically for that position.
            </p>
          </div>

          {/* Micro-UI Mockup for Step 2 */}
          <div className="w-full rounded-2xl bg-neutral-50 border border-neutral-200/70 p-4 flex flex-col justify-between gap-3 min-h-[175px]">
            {/* Input Box representation */}
            <div className="p-3 rounded-xl bg-white border border-neutral-200 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
                <span className="font-medium flex items-center gap-1 text-neutral-700">
                  <Search className="w-3 h-3 text-neutral-400" /> Target Job Requirements
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                  Live Scanner
                </span>
              </div>
              <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed italic">
                &ldquo;Seeking a Senior Engineer experienced in building distributed systems, TypeScript, Next.js, and high-concurrency cloud architecture...&rdquo;
              </p>
            </div>

            {/* Keyword chips extracted */}
            <div>
              <div className="text-[10px] font-semibold uppercase text-neutral-400 tracking-wider mb-1.5">
                Keywords Extracted & Matched:
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Next.js 16
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Distributed Systems
                </span>
                <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-medium border border-neutral-200">
                  + TypeScript
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Select a CV template */}
        <div className="group rounded-3xl bg-white border border-neutral-200/90 hover:border-neutral-300 p-6 sm:p-7 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all">
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-neutral-400 mb-1.5 font-mono">
              Step 03
            </div>
            <h3 className="text-xl font-bold text-neutral-950 mb-2">
              Select a CV template
            </h3>
            <p className="text-sm text-neutral-500 leading-relaxed mb-6">
              Pick from recruiter-approved single-column, executive, or modern minimal templates guaranteed to parse flawlessly through every ATS parser.
            </p>
          </div>

          {/* Micro-UI Mockup for Step 3: 3 Mini Template Cards */}
          <div className="w-full rounded-2xl bg-neutral-50 border border-neutral-200/70 p-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: "Modern Minimal", style: "tech", label: "Tech" },
                { name: "Executive Serif", style: "exec", label: "Executive" },
                { name: "High-Density", style: "ats", label: "Strict ATS" },
              ].map((tpl, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedTemplate(i)}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between h-28 cursor-pointer transition-all ${
                    selectedTemplate === i
                      ? "bg-white border-neutral-950 shadow-xs ring-2 ring-neutral-950/10"
                      : "bg-white/70 border-neutral-200 hover:bg-white"
                  }`}
                >
                  <div className="space-y-1.5">
                    {/* Simulated header */}
                    <div className="flex items-center justify-between">
                      <div className={`w-6 h-1.5 rounded-full ${selectedTemplate === i ? "bg-neutral-900" : "bg-neutral-400"}`} />
                      {selectedTemplate === i && (
                        <div className="w-3.5 h-3.5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[8px]">
                          ✓
                        </div>
                      )}
                    </div>
                    {/* Simulated lines */}
                    <div className="w-full h-1 bg-neutral-200 rounded-full" />
                    <div className="w-4/5 h-1 bg-neutral-150 rounded-full" />
                    <div className="w-2/3 h-1 bg-neutral-100 rounded-full" />
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-neutral-900 leading-tight truncate">
                      {tpl.name}
                    </div>
                    <div className="text-[8px] text-neutral-400 font-medium">
                      {tpl.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 4: Have your CV generated */}
        <div className="group rounded-3xl bg-white border border-neutral-200/90 hover:border-neutral-300 p-6 sm:p-7 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all">
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-neutral-400 mb-1.5 font-mono">
              Step 04
            </div>
            <h3 className="text-xl font-bold text-neutral-950 mb-2">
              Have your CV generated & tailored
            </h3>
            <p className="text-sm text-neutral-500 leading-relaxed mb-6">
              Watch our AI engine generate high-scoring achievement bullets, optimize your summary, and package your tailored resume ready for instant download.
            </p>
          </div>

          {/* Micro-UI Mockup for Step 4 */}
          <div className="w-full rounded-2xl bg-neutral-50 border border-neutral-200/70 p-4 flex flex-col justify-between gap-3 min-h-[175px]">
            {/* Generated status indicator */}
            <div className="p-3 rounded-xl bg-white border border-neutral-200 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-950">CV Generation Complete</div>
                  <div className="text-[10px] text-emerald-700 font-medium">98% ATS Pass Score Guaranteed</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-950 text-white">
                Ready
              </span>
            </div>

            {/* Export Buttons Representation */}
            <div className="grid grid-cols-2 gap-2">
              <div className="py-2.5 px-3 rounded-xl bg-neutral-950 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer hover:bg-neutral-800 transition-all">
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </div>
              <div className="py-2.5 px-3 rounded-xl bg-white border border-neutral-300 text-neutral-800 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-neutral-50 transition-all cursor-pointer">
                <span>Export Word (.docx)</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
