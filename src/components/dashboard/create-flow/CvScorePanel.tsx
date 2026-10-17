"use client";

import React, { useState } from "react";
import { ArrowRight, Briefcase, Check, Crown, Lightbulb, Loader2, RefreshCw, Sparkles, Wand, X } from "lucide-react";
import type { CvReviewTip } from "@/lib/api";
import { pointsLost, scoreTone, type CvScore, type JobRequirementsState, type PolishTarget, type ScoreCheck } from "@/lib/cv-score";
import { inputClass } from "./EditorFields";

/** The score as a ring — used on the badge and at the top of the panel. */
function ScoreRing({ score, size }: { score: number; size: number }) {
  const stroke = size > 40 ? 5 : 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(score);
  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e5e5" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className={`absolute font-bold tabular-nums ${tone.text} ${size > 40 ? "text-lg" : "text-xs"}`}>{score}</span>
    </span>
  );
}

const polishKey = (target: PolishTarget) => (target.kind === "bullets" && target.index !== undefined ? `bullets:${target.index}` : target.kind);

export interface CvScorePanelProps {
  score: CvScore;
  isPro: boolean;
  job: JobRequirementsState;
  jobDescription: string;
  onJobDescriptionChange: (text: string) => void;
  analyzingJob: boolean;
  jobError: string | null;
  onRetryJob: () => void;
  onGoTo: (check: ScoreCheck) => void;
  /** Rewrites the given targets (Pro). `key` identifies the button that asked, for its spinner. */
  onPolish: (targets: PolishTarget[] | "all", key: string) => void;
  polishingKey: string | null;
  onReview: () => void;
  reviewing: boolean;
  tips: CvReviewTip[] | null;
  onUpgrade: () => void;
}

/**
 * The editor's CV score: a ring in the top bar that opens a breakdown of what
 * is losing points, with "Go to" for each and — for Pro — AI polish for the
 * ones AI can fix without inventing anything.
 */
export function CvScorePanel(props: CvScorePanelProps) {
  const { score, isPro, job, polishingKey } = props;
  const [open, setOpen] = useState(false);
  const [editingJd, setEditingJd] = useState(false);
  const tone = scoreTone(score.total);

  const issues = score.checks.filter((c) => c.status !== "pass").sort((a, b) => pointsLost(b) - pointsLost(a));
  const aiFixable = issues.filter((c) => c.fix === "ai" && c.polish);
  const manual = issues.filter((c) => c.fix === "manual");
  const busy = polishingKey !== null;

  const polishButton = (targets: PolishTarget[] | "all", key: string, label: string, primary = false) => {
    const spinning = polishingKey === key;
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => (isPro ? props.onPolish(targets, key) : props.onUpgrade())}
        title={isPro ? "Rewrite with AI. You can undo it." : "AI polish is part of FitCV Pro"}
        className={
          primary
            ? "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-accent hover:bg-accent-strong text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            : "inline-flex items-center gap-1 px-2 py-1 rounded-md border border-accent-border text-xs font-semibold text-accent-strong hover:bg-accent-soft transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        }
      >
        {spinning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isPro ? <Wand className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5" />}
        {spinning ? "Polishing…" : label}
      </button>
    );
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-tour="editor-score"
        className="inline-flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-lg border border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 transition-colors cursor-pointer"
        title="CV score: click to see what's missing"
        aria-expanded={open}
      >
        <ScoreRing score={score.total} size={30} />
        <span className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-[11px] font-medium text-neutral-500">CV score</span>
          <span className={`text-xs font-semibold ${tone.text}`}>{issues.length ? `${issues.length} to improve` : "All checks pass"}</span>
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="CV score"
            className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-auto sm:right-0 sm:mt-2 z-50 sm:w-[26rem] max-h-[calc(100vh-5rem)] overflow-y-auto rounded-lg border border-neutral-300 bg-white shadow-xl"
          >
            {/* Header */}
            <div className="p-4 flex items-center gap-4 border-b border-neutral-200">
              <ScoreRing score={score.total} size={64} />
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-bold ${tone.text}`}>{tone.label}</div>
                <p className="text-xs text-neutral-500 leading-relaxed mt-0.5">
                  Every CV is scored by the same {score.categories.length} checks
                  {job.status === "ready" ? <>, including how well it matches <strong className="text-neutral-700">{job.data.title || "the job"}</strong></> : ""}.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 cursor-pointer" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Categories */}
            <div className="px-4 py-3 space-y-2 border-b border-neutral-200">
              {score.categories.map((c) => {
                const pct = c.max ? Math.round((c.score / c.max) * 100) : 0;
                return (
                  <div key={c.key} className="flex items-center gap-3 text-xs">
                    <span className="w-28 shrink-0 font-medium text-neutral-700">{c.label}</span>
                    <span className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                      <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: scoreTone(pct).ring }} />
                    </span>
                    <span className="w-14 text-right tabular-nums text-neutral-500">
                      {Math.round(c.score)}/{Math.round(c.max)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Job match */}
            <div className="px-4 py-3 border-b border-neutral-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                  <Briefcase className="w-3.5 h-3.5 text-neutral-500" />
                  {job.status === "none" ? "Score against a job" : "Job match"}
                </span>
                <button type="button" onClick={() => setEditingJd((v) => !v)} className="text-xs font-semibold text-accent-strong hover:underline cursor-pointer">
                  {editingJd ? "Done" : job.status === "none" ? "Add job description" : "Edit job description"}
                </button>
              </div>
              {editingJd && (
                <textarea
                  value={props.jobDescription}
                  onChange={(e) => props.onJobDescriptionChange(e.target.value)}
                  rows={6}
                  placeholder="Paste the job posting. Your score then includes how well your CV matches it."
                  className={`${inputClass} text-xs leading-relaxed resize-y`}
                />
              )}
              {job.status === "none" && !editingJd && (
                <p className="text-xs text-neutral-500 leading-relaxed">Paste a job posting and 30% of the score becomes how well your CV matches it.</p>
              )}
              {job.status === "pending" &&
                (props.jobError ? (
                  <div className="flex items-center justify-between gap-2 text-xs text-red-700">
                    <span>{props.jobError}</span>
                    <button type="button" onClick={props.onRetryJob} className="inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer">
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                ) : (
                  <p className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {props.analyzingJob ? "Reading the job description…" : "Waiting for you to finish typing…"}
                  </p>
                ))}
              {job.status === "invalid" && (
                <p className="text-xs text-amber-700 leading-relaxed">That doesn&apos;t look like a job description, so it isn&apos;t part of the score.</p>
              )}
              {job.status === "ready" && score.jobMatch && (
                <div className="space-y-2">
                  <p className="text-xs text-neutral-600">
                    <strong className="text-neutral-800">{score.jobMatch.coverage}%</strong> of the required skills appear in your CV.
                  </p>
                  {[
                    { label: "Required", skills: score.jobMatch.required },
                    { label: "Nice to have", skills: score.jobMatch.preferred },
                  ]
                    .filter((g) => g.skills.length > 0)
                    .map((g) => (
                      <div key={g.label}>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">{g.label}</div>
                        <div className="flex flex-wrap gap-1">
                          {g.skills.map((s) => (
                            <span
                              key={s.skill}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                                s.found ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-white border-neutral-300 text-neutral-500"
                              }`}
                              title={s.found ? "Found in your CV" : "Not in your CV. Add it only if you have it"}
                            >
                              {s.found ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />}
                              {s.skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* What's missing */}
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-neutral-800">{issues.length ? "What's costing points" : "Nothing to fix"}</span>
                {aiFixable.length > 0 && polishButton("all", "all", isPro ? "Polish all" : "Polish all (Pro)")}
              </div>
              {issues.length === 0 && (
                <p className="text-xs text-neutral-500">Every check passes. Nice work.</p>
              )}
              <ul className="space-y-1.5">
                {issues.map((check) => (
                  <li key={check.id} className="rounded-lg border border-neutral-200 p-2.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold text-neutral-900">{check.label}</span>
                          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-red-600">−{pointsLost(check)}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-neutral-600 leading-relaxed">{check.message}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          props.onGoTo(check);
                          setOpen(false);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                      >
                        Go to <ArrowRight className="w-3 h-3" />
                      </button>
                      {check.fix === "ai" && check.polish
                        ? polishButton([check.polish], polishKey(check.polish), "Polish")
                        : <span className="text-[11px] text-neutral-400">Only you can add this</span>}
                    </div>
                  </li>
                ))}
              </ul>
              {manual.length > 0 && aiFixable.length > 0 && (
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  AI polish rewrites what&apos;s already there. It never invents numbers, skills or experience, so the
                  {manual.length === 1 ? " item" : ` ${manual.length} items`} marked &ldquo;Only you can add this&rdquo; need your input to reach 100.
                </p>
              )}
            </div>

            {/* AI check */}
            <div className="px-4 py-3 border-t border-neutral-200 space-y-2 bg-neutral-50/60">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                  <Lightbulb className="w-3.5 h-3.5 text-neutral-500" /> AI check
                </span>
                <button
                  type="button"
                  onClick={props.onReview}
                  disabled={props.reviewing}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {props.reviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {props.reviewing ? "Reviewing…" : props.tips ? "Check again" : "Get tips"}
                </button>
              </div>
              {!props.tips && <p className="text-xs text-neutral-500">A recruiter-style read of your CV. Tips don&apos;t change the score.</p>}
              {props.tips && props.tips.length === 0 && <p className="text-xs text-neutral-500">No further tips. It reads well.</p>}
              {props.tips && props.tips.length > 0 && (
                <ul className="space-y-1.5">
                  {props.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-neutral-700 leading-relaxed flex gap-2">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-neutral-400 shrink-0" />
                      <span>{tip.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
