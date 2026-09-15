"use client";

import React, { useState } from "react";
import { initialResumeData } from "@/data/mockResume";
import { ResumeData } from "@/types/resume";
import {
  Sparkles,
  Download,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export function ResumeTailorPreview() {
  const [resume, setResume] = useState<ResumeData>(initialResumeData);
  const [activeTab, setActiveTab] = useState<"tailor" | "editor" | "preview">("tailor");
  const [jobDescription, setJobDescription] = useState(
    `We are looking for a Senior Full Stack Engineer to lead our next-generation web applications. Requirements: Strong experience in Next.js, React 19, TypeScript, Tailwind CSS, Turbopack, and Distributed Systems. Experience with Microservices, ATS optimization, and high-concurrency systems is a plus.`
  );
  const [atsScore, setAtsScore] = useState(88);
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorSuccess, setTailorSuccess] = useState(false);

  const handleRunTailor = () => {
    setIsTailoring(true);
    setTailorSuccess(false);
    setTimeout(() => {
      setIsTailoring(false);
      setAtsScore(98);
      setTailorSuccess(true);
      // Auto optimize top highlight
      setResume((prev) => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          summary:
            "Senior Full Stack Engineer specializing in Next.js 16, React 19, and Distributed Cloud Architecture. Proven track record optimizing web performance and engineering scalable micro-frontends.",
        },
      }));
    }, 1000);
  };

  return (
    <section id="editor" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-neutral-100">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 mb-3 border border-neutral-200">
            <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
            Interactive Studio Preview
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950">
            Try the AI Resume Generator & Tailor
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Edit your details or paste a job posting to see ATS tailoring in action.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-neutral-100 p-1 rounded-full border border-neutral-200/80">
          <button
            onClick={() => setActiveTab("tailor")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === "tailor"
                ? "bg-white text-neutral-950 shadow-xs font-semibold"
                : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            ATS Tailoring Mode
          </button>
          <button
            onClick={() => setActiveTab("editor")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === "editor"
                ? "bg-white text-neutral-950 shadow-xs font-semibold"
                : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            Quick Editor
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === "preview"
                ? "bg-white text-neutral-950 shadow-xs font-semibold"
                : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            Full Preview
          </button>
        </div>
      </div>

      {/* Main Studio Frame */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-neutral-50/70 border border-neutral-200/90 rounded-3xl p-4 sm:p-6">
        {/* Left Side: Controls / Tailor / Editor */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {activeTab === "tailor" && (
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Target Job Description
                </span>
                <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                  AI Auto-Scan
                </span>
              </div>

              <textarea
                rows={5}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full text-xs text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-neutral-950/10 transition-all resize-none leading-relaxed"
                placeholder="Paste any job description here..."
              />

              {/* ATS Score & Action */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase">
                    Current ATS Match
                  </div>
                  <div className="text-2xl font-bold text-neutral-950 flex items-center gap-2">
                    <span>{atsScore}%</span>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {atsScore >= 95 ? "Excellent Match" : "Good Match"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleRunTailor}
                  disabled={isTailoring}
                  className="px-4 py-2.5 rounded-full bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 active:scale-98 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isTailoring ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Optimizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Tailor Now</span>
                    </>
                  )}
                </button>
              </div>

              {tailorSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Successfully Tailored!</span> Injected high-priority keywords: Next.js 16, Distributed Systems, Turbopack.
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "editor" && (
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Personal Information
              </span>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-neutral-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={resume.personalInfo.fullName}
                    onChange={(e) =>
                      setResume({
                        ...resume,
                        personalInfo: { ...resume.personalInfo, fullName: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-600 mb-1">Headline</label>
                  <input
                    type="text"
                    value={resume.personalInfo.headline}
                    onChange={(e) =>
                      setResume({
                        ...resume,
                        personalInfo: { ...resume.personalInfo, headline: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-600 mb-1">Professional Summary</label>
                  <textarea
                    rows={4}
                    value={resume.personalInfo.summary}
                    onChange={(e) =>
                      setResume({
                        ...resume,
                        personalInfo: { ...resume.personalInfo, summary: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "preview" && (
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Export Options
              </span>
              <p className="text-xs text-neutral-500">
                Download your tailored resume in universal formats optimized for ATS scanners and human recruiters.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => alert("Resume exported as ATS-Compliant PDF!")}
                  className="w-full py-2.5 rounded-full bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Document</span>
                </button>
                <button
                  onClick={() => alert("Resume exported as Word / DOCX!")}
                  className="w-full py-2.5 rounded-full border border-neutral-200 bg-white text-neutral-800 text-xs font-medium hover:bg-neutral-50 transition-all flex items-center justify-center gap-2"
                >
                  <span>Export Word (.docx)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Live Resume Document Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-6 text-left">
            {/* Header */}
            <div className="border-b border-neutral-200 pb-4">
              <h1 className="text-2xl font-bold text-neutral-950 tracking-tight">
                {resume.personalInfo.fullName}
              </h1>
              <p className="text-sm font-semibold text-neutral-700 mt-0.5">
                {resume.personalInfo.headline}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 mt-2">
                <span>{resume.personalInfo.email}</span>
                <span>•</span>
                <span>{resume.personalInfo.phone}</span>
                <span>•</span>
                <span>{resume.personalInfo.location}</span>
                <span>•</span>
                <span className="text-neutral-800 font-medium">{resume.personalInfo.website}</span>
              </div>
            </div>

            {/* Summary */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Professional Summary
              </h2>
              <p className="text-xs text-neutral-700 leading-relaxed">
                {resume.personalInfo.summary}
              </p>
            </div>

            {/* Experience */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                Experience
              </h2>
              <div className="space-y-4">
                {resume.experience.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-950">{exp.role}</span>
                      <span className="text-neutral-500 font-medium">
                        {exp.startDate} – {exp.endDate}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-600 font-medium mb-1.5">
                      {exp.company} {exp.location && `· ${exp.location}`}
                    </div>
                    <ul className="space-y-1">
                      {exp.highlights.map((h, i) => (
                        <li key={i} className="text-xs text-neutral-600 pl-3 relative leading-relaxed">
                          <span className="absolute left-0 text-neutral-400">•</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Skills & Technologies
              </h2>
              <div className="space-y-1.5 text-xs">
                {resume.skills.map((sc, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="font-semibold text-neutral-800 shrink-0">{sc.category}:</span>
                    <span className="text-neutral-600">{sc.items.join(", ")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
            <span>ATS Format: Single Column · Parse Compliant</span>
            <span className="text-emerald-700 font-medium bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live Preview
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
