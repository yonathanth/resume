"use client";

import React from "react";
import { Check, Download, MousePointer2, UploadCloud, UserRound } from "lucide-react";
import { useCvTemplates } from "@/hooks/use-cv-templates";
import { Reveal } from "@/components/Reveal";
import { TemplateThumbnail } from "@/components/dashboard/create-flow/TemplateThumbnail";

// The create flow, in the order the dashboard runs it (CreateCvModal):
// the user's info, an optional job post, then the editor.
// Each card's illustration loops a tiny animation of that step.

function Thumb({ index, className = "" }: { index: number; className?: string }) {
  const { data: templates } = useCvTemplates();
  const template = templates?.[index] ?? templates?.[0];
  if (!template) return <div className={`aspect-[210/297] animate-pulse rounded-[5px] bg-neutral-200/70 ${className}`} />;
  return (
    <TemplateThumbnail
      templateId={template.id}
      persona={index}
      title={`${template.name} template example`}
      className={`aspect-[210/297] rounded-[5px] border border-neutral-200 shadow-[0_10px_22px_-12px_rgba(15,17,21,0.35)] ${className}`}
    />
  );
}

// Step 1's cursor hops across three choices, and the ring + lift follow it.
// Each item runs the same 4.8s loop shifted by a third; `--hop` is the
// distance between item centres.
const hopDelay = (i: number) => `${-((3 - i) % 3) * 1.6}s`;

function Selectable({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div className="hiw-tpl-lift" style={{ animationDelay: hopDelay(index) }}>
      {children}
      <div
        className="hiw-tpl-ring pointer-events-none absolute -inset-[5px] rounded-[10px] border-2 border-accent"
        style={{ animationDelay: hopDelay(index) }}
      >
        <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white">
          <Check className="h-2.5 w-2.5 stroke-[3]" />
        </span>
      </div>
    </div>
  );
}

// 1 — the three ways to bring your details, each with a tiny motif of its own.
function UploadMotif() {
  return (
    <div className="relative flex h-12 w-10 items-end justify-center rounded-[4px] border border-neutral-200 bg-white pb-1.5 shadow-sm">
      <div className="w-6 space-y-1">
        <div className="h-1 rounded-full bg-neutral-200" />
        <div className="h-1 w-4/5 rounded-full bg-neutral-200" />
      </div>
      <span className="hiw-bob absolute -top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow-sm">
        <UploadCloud className="h-3 w-3" />
      </span>
    </div>
  );
}

function ScratchMotif() {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="rounded-lg rounded-bl-sm bg-white px-2 py-1 text-[9px] font-medium text-neutral-600 shadow-sm ring-1 ring-neutral-200">
        Your last role?
      </div>
      <div className="flex gap-0.5 self-end rounded-lg rounded-br-sm bg-neutral-950 px-2 py-1.5">
        {[0, 1, 2].map((d) => (
          <span key={d} className="hiw-dot h-1 w-1 rounded-full bg-white" style={{ animationDelay: `${d * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

function ProfileMotif() {
  return (
    <div className="flex w-[78px] items-center gap-1.5 rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-neutral-200">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
        <UserRound className="h-3.5 w-3.5" />
      </span>
      <div className="w-full space-y-1">
        <div className="h-1 rounded-full bg-neutral-300" />
        <div className="h-1 w-2/3 rounded-full bg-neutral-200" />
      </div>
    </div>
  );
}

const SOURCES = [
  { label: "Upload old CV", hint: "PDF or DOCX", Motif: UploadMotif },
  { label: "Start from scratch", hint: "A few questions", Motif: ScratchMotif },
  { label: "Career profile", hint: "Reuse saved info", Motif: ProfileMotif },
];

export function SourceVisual() {
  return (
    <div className="relative flex items-center gap-3" style={{ "--hop": "112px" } as React.CSSProperties}>
      {SOURCES.map(({ label, hint, Motif }, i) => (
        <div key={label} className="relative w-[100px]">
          <Selectable index={i}>
            <div className="flex h-[132px] flex-col items-center justify-between rounded-[10px] border border-neutral-200 bg-white px-2 pb-3 pt-6 shadow-[0_10px_22px_-14px_rgba(15,17,21,0.3)]">
              <div className="flex h-12 items-center">
                <Motif />
              </div>
              <div className="text-center">
                <div className="text-[11px] font-semibold leading-tight text-neutral-900">{label}</div>
                <div className="text-[10px] text-neutral-400">{hint}</div>
              </div>
            </div>
          </Selectable>
        </div>
      ))}
      <MousePointer2 className="hiw-tpl-cursor pointer-events-none absolute left-[58px] top-[72%] h-4 w-4 fill-neutral-950 text-white drop-shadow" />
    </div>
  );
}

// 2 — the job post is scanned and its keywords pop out one by one.
const KEYWORDS = ["Product strategy", "SQL", "A/B testing", "Roadmaps"];

export function JobVisual() {
  return (
    <div className="flex w-[260px] flex-col gap-3">
      <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white p-2.5">
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-neutral-200" />
          <div className="h-1.5 w-11/12 rounded-full bg-neutral-200" />
          <div className="h-1.5 w-4/5 rounded-full bg-neutral-200" />
          <div className="h-1.5 w-2/3 rounded-full bg-neutral-200" />
        </div>
        <div className="hiw-scan pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {KEYWORDS.map((k, i) => (
          <span
            key={k}
            className="hiw-chip flex items-center gap-1 rounded-full border border-accent-border bg-accent-soft px-2 py-0.5 text-[10.5px] font-medium text-accent-strong"
            style={{ animationDelay: `${i * 0.35}s` }}
          >
            <Check className="h-2.5 w-2.5" />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

// 3 — click a line on the preview to edit it, then hit download.
export function EditorVisual() {
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-[96px]">
        <Thumb index={3} />
        <div className="hiw-target pointer-events-none absolute left-[8%] top-[34%] h-[6%] w-[72%] rounded-[2px] border border-accent bg-accent/10" />
        <MousePointer2 className="hiw-cursor pointer-events-none absolute left-[62%] top-[38%] h-4 w-4 fill-neutral-950 text-white drop-shadow" />
      </div>
      <span className="hiw-press flex items-center gap-1.5 rounded-full bg-neutral-950 px-3 py-1.5 text-[11.5px] font-semibold text-white">
        <Download className="h-3.5 w-3.5 text-accent-light" /> PDF
      </span>
    </div>
  );
}

const STEPS: { title: string; body: string; Visual: React.ComponentType }[] = [
  { title: "Share your details", body: "Upload an old CV, answer a few questions, or reuse a saved career profile.", Visual: SourceVisual },
  { title: "Tailor it to the job", body: "Add the job post and we work in the keywords recruiters scan for.", Visual: JobVisual },
  { title: "Download and apply", body: "Click any line to tweak it, then export a PDF.", Visual: EditorVisual },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8">
      {/* Header */}
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-5xl">How it works</h2>
        <p className="mt-4 text-base text-neutral-500 sm:text-lg">From blank page to job-ready resume in three simple steps.</p>
      </Reveal>

      {/* Steps */}
      <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        {STEPS.map(({ title, body, Visual }, i) => (
          <Reveal key={title} delay={i * 100}>
          <div
            className="group h-full rounded-3xl border border-neutral-200 bg-white p-2.5 shadow-[0_12px_32px_-20px_rgba(15,17,21,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_-24px_rgba(15,17,21,0.3)]"
          >
            <div className="relative flex h-[260px] items-center justify-center overflow-hidden rounded-[18px] border border-neutral-100 bg-neutral-50">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="relative lg:scale-90 xl:scale-100">
                <Visual />
              </div>
            </div>
            <div className="px-3.5 pb-4 pt-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-strong">
                  {i + 1}
                </span>
                <h3 className="text-[18px] font-semibold tracking-tight text-neutral-950">{title}</h3>
              </div>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-neutral-500">{body}</p>
            </div>
          </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
