"use client";

import React from "react";
import { ArrowRight, Check, Download, FileText, Loader2, MousePointer2, PenLine, UploadCloud, UserRound } from "lucide-react";
import { useCvTemplates } from "@/hooks/use-cv-templates";
import { Reveal } from "@/components/Reveal";
import { TemplateThumbnail } from "@/components/dashboard/create-flow/TemplateThumbnail";
import { Moxie } from "@/components/moxie";

// The create flow, in the order the dashboard runs it (CreateCvModal):
// the user's info, an optional job post, then the editor (CvEditorWorkspace).
// Each card replays its step as a few quick scenes in one panel — the click,
// the work being done, then a tick — on a shared 7.5s loop (globals.css,
// "How it works").

function Thumb({ index, className = "" }: { index: number; className?: string }) {
  const { data: templates } = useCvTemplates();
  const template = templates?.[index] ?? templates?.[0];
  if (!template) return <div className={`aspect-[210/297] animate-pulse rounded-[5px] bg-neutral-200/70 ${className}`} />;
  return (
    <TemplateThumbnail
      templateId={template.id}
      title={`${template.name} template example`}
      className={`aspect-[210/297] rounded-[5px] border border-neutral-200 shadow-[0_10px_22px_-12px_rgba(15,17,21,0.35)] ${className}`}
    />
  );
}

// Each visual is a fixed-size panel (280×200) so the cursor can be steered to
// exact spots; its scenes are stacked inside and crossfade.
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[200px] w-[280px] rounded-xl border border-neutral-200 bg-white shadow-[0_10px_22px_-14px_rgba(15,17,21,0.3)]">
      {children}
    </div>
  );
}

function Cursor({ className }: { className: string }) {
  return (
    <MousePointer2
      className={`pointer-events-none absolute left-0 top-0 z-20 h-4 w-4 fill-neutral-950 text-white drop-shadow ${className}`}
    />
  );
}

/** "Doing it…" with three bouncing dots, over the working scene. */
function WorkingCaption({ children }: { children: React.ReactNode }) {
  return (
    <div className="hiw-caption absolute inset-x-0 top-[26px] flex items-end justify-center gap-[3px] text-[12.5px] font-semibold text-neutral-700">
      {children}
      {[0, 1, 2].map((d) => (
        <span key={d} className="hiw-dot mb-[3px] h-[3px] w-[3px] rounded-full bg-accent" style={{ animationDelay: `${d * 0.15}s` }} />
      ))}
    </div>
  );
}

/** The last scene of every card: a tick pops in and a short line fades up. */
function Done({ children }: { children: React.ReactNode }) {
  return (
    <div className="hiw-done absolute inset-0 flex flex-col items-center justify-center gap-2">
      <span className="hiw-done-tick flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-[0_6px_14px_-6px_var(--accent)]">
        <Check className="h-4 w-4 stroke-[3]" />
      </span>
      <span className="hiw-done-text text-[13.5px] font-bold tracking-tight text-neutral-950">{children}</span>
    </div>
  );
}

// 1 — pick "Upload old CV" in the start dialog, the file drops in, Moxie
// reads it (she stays in her reading scene the whole loop, so she's already
// mid-read when she shows), and it's sorted into your resume.
const START_OPTIONS = [
  { label: "Start from scratch", hint: "Answer a few questions", Icon: PenLine },
  { label: "Upload old CV", hint: "PDF or DOCX", Icon: UploadCloud },
  { label: "Career profile", hint: "Reuse saved info", Icon: UserRound },
];

export function SourceVisual() {
  return (
    <Stage>
      {/* A: "How do you want to start?" */}
      <div className="hiw1-scene-a absolute inset-0 p-3">
        <div className="h-[14px] text-[10.5px] font-bold text-neutral-900">How do you want to start?</div>
        <div className="mt-2 space-y-1.5">
          {START_OPTIONS.map(({ label, hint, Icon }, i) => (
            <div key={label} className="relative flex h-[44px] items-center gap-2.5 rounded-lg border border-neutral-200 px-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-[10.5px] font-semibold leading-tight text-neutral-900">{label}</div>
                <div className="text-[9.5px] text-neutral-400">{hint}</div>
              </div>
              {i === 1 && <div className="hiw1-pick pointer-events-none absolute -inset-px rounded-lg border-2 border-accent bg-accent/5" />}
            </div>
          ))}
        </div>
      </div>

      {/* B: the file goes in */}
      <div className="hiw1-scene-b absolute inset-0 flex flex-col p-3">
        <div className="text-[10.5px] font-bold text-neutral-900">Upload old CV</div>
        <div className="mt-2 flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50">
          <span className="hiw1-file flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[10.5px] font-medium text-neutral-700 shadow-sm">
            <FileText className="h-3.5 w-3.5 text-accent" /> my-cv.pdf
          </span>
          <span className="text-[9.5px] text-neutral-400">PDF or DOCX</span>
        </div>
      </div>

      {/* M: Moxie reads it — worded to fit all three starts */}
      <div className="hiw-work absolute inset-0">
        <WorkingCaption>Reading your details</WorkingCaption>
        <Moxie animation="read" size={100} decorative ticklish className="absolute left-1/2 top-[64px] -translate-x-1/2" />
      </div>

      <Done>Sorted into your resume</Done>
      <Cursor className="hiw1-cursor" />
    </Stage>
  );
}

// 2 — paste the job post (its keywords light up), press "Tailor my CV", a
// bullet is rewritten around those keywords, and it's tailored.
function Kw({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <span className="hiw2-kw rounded-[3px] px-0.5" style={{ animationDelay: `${i * 0.3}s` }}>
      {children}
    </span>
  );
}

export function JobVisual() {
  return (
    <Stage>
      {/* A: the pasted job description */}
      <div className="hiw2-scene-a absolute inset-0 flex flex-col p-3">
        <div className="h-[14px] text-[10.5px] font-bold text-neutral-900">Paste the job description</div>
        <div className="mt-2 h-[104px] rounded-lg border border-neutral-200 bg-neutral-50/60 p-2.5 text-[10px] leading-[1.6] text-neutral-600">
          Senior Accountant. You&apos;ll own <Kw i={0}>month-end close</Kw> and reporting under <Kw i={1}>IFRS</Kw>, and
          reconcile accounts across our <Kw i={2}>branch network</Kw>.
        </div>
        <span className="hiw2-btn mt-2.5 flex h-[30px] items-center justify-center gap-1 rounded-lg bg-neutral-950 text-[10.5px] font-semibold text-white">
          Tailor my CV <ArrowRight className="h-3 w-3" />
        </span>
      </div>

      {/* B: a bullet is rewritten around them */}
      <div className="hiw-work absolute inset-0">
        <WorkingCaption>Tailoring to the job</WorkingCaption>
        <div className="absolute inset-x-4 top-[62px] rounded-lg border border-neutral-200 bg-neutral-50/60 p-2.5">
          <div className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">Experience · Awash Bank</div>
          <div className="relative mt-1 h-[48px] text-[10.5px] leading-[1.5]">
            <p className="hiw2-before absolute inset-0 text-neutral-400">• Did reconciliations for branch accounts.</p>
            <p className="hiw2-after absolute inset-0 text-neutral-800">
              • Ran <b className="font-semibold text-accent-strong">IFRS</b> reconciliations across 40+ branches; cut{" "}
              <b className="font-semibold text-accent-strong">month-end close</b> from 6 to 4 days.
            </p>
          </div>
        </div>
      </div>

      <Done>Tailored to the job</Done>
      <Cursor className="hiw2-cursor" />
    </Stage>
  );
}

// 3 — the editor's preview flags a missing detail; click it, type it in,
// press Download PDF, and it's ready.
export function EditorVisual() {
  return (
    <Stage>
      {/* A: the editor */}
      <div className="hiw3-scene-a absolute inset-0">
        <div className="absolute left-[14px] top-[15px] w-[120px]">
          <Thumb index={3} />
        </div>
        <div className="absolute left-[20px] top-[52px] h-[17px] w-[104px]">
          <span className="hiw3-gap absolute inset-0 flex items-center justify-center rounded-[4px] border border-dashed border-accent bg-accent-soft text-[9px] font-semibold text-accent-strong">
            + Add phone number
          </span>
          <span className="hiw3-filled absolute inset-0 flex items-center justify-center rounded-[4px] border border-emerald-200 bg-emerald-50 font-mono text-[8.5px] font-medium text-emerald-700">
            +251 91 234 5678
          </span>
        </div>

        {/* The field the gap opens */}
        <div className="hiw3-field absolute left-[146px] top-[20px] w-[120px] rounded-lg border border-neutral-200 bg-white p-2 shadow-[0_10px_22px_-12px_rgba(15,17,21,0.35)]">
          <div className="text-[9px] font-semibold text-neutral-500">Phone</div>
          <div className="mt-1 flex h-[22px] items-center rounded-md border border-accent px-1.5 ring-2 ring-accent/15">
            <span className="hiw3-type inline-block overflow-hidden whitespace-nowrap font-mono text-[9px] text-neutral-900">+251 91 234 5678</span>
            <span className="hiw3-caret ml-px h-3 w-px bg-neutral-900" />
          </div>
        </div>

        <span className="hiw3-btn absolute left-[146px] top-[150px] grid h-[30px] w-[120px] rounded-lg bg-neutral-950 text-[10.5px] font-semibold text-white">
          <span className="hiw3-label-idle col-start-1 row-start-1 flex items-center justify-center gap-1.5">
            <Download className="h-3.5 w-3.5 text-accent-light" /> Download PDF
          </span>
          <span className="hiw3-label-busy col-start-1 row-start-1 flex items-center justify-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing…
          </span>
        </span>
      </div>

      <Done>Your PDF is ready</Done>
      <Cursor className="hiw3-cursor" />
    </Stage>
  );
}

const STEPS: { title: string; body: string; Visual: React.ComponentType }[] = [
  { title: "Share your details", body: "Upload an old CV, answer a few questions, or reuse a saved career profile.", Visual: SourceVisual },
  { title: "Tailor it to the job", body: "Add the job post and we work in the keywords recruiters scan for.", Visual: JobVisual },
  { title: "Download and apply", body: "Fill in any gaps it flags, tweak what you like, then download a PDF.", Visual: EditorVisual },
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
