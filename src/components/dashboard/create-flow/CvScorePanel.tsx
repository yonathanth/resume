"use client";

import React, { useState } from "react";
import { ArrowRight, Briefcase, Check, Crown, Lightbulb, Loader2, Lock, Plus, RefreshCw, Wand, WandSparkles, X } from "lucide-react";
import type { CvReviewTip } from "@/lib/api";
import {
  JOB_WEIGHT,
  QUALITY_WEIGHT,
  overallGain,
  scoreTone,
  type CvScore,
  type JobRequirementsState,
  type PolishTarget,
  type ScoreCheck,
} from "@/lib/cv-score";
import { inputClass } from "./EditorFields";

/** The score to aim for, shown as the goal under the ring. */
const TARGET_SCORE = 75;

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
      <span className={`absolute font-bold tabular-nums ${tone.text} ${size > 40 ? "text-lg" : "text-[13px]"}`}>{score}</span>
    </span>
  );
}

function ScoreBar({ label, score, hint }: { label: string; score: number; hint?: string }) {
  return (
    <div className="flex items-center gap-3 text-[13px]" title={hint}>
      <span className="w-24 shrink-0 font-medium text-neutral-700">{label}</span>
      <span className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
        <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${score}%`, background: scoreTone(score).ring }} />
      </span>
      <span className="w-14 text-right tabular-nums font-semibold text-neutral-700">{score}/100</span>
    </div>
  );
}

const polishKey = (target: PolishTarget) => (target.kind === "bullets" && target.index !== undefined ? `bullets:${target.index}` : target.kind);
const fmtGain = (n: number) => (n >= 1 ? `+${Math.round(n)}` : "+<1");

/** A template section and how filled it is — the chips at the top of the panel. */
export interface SectionStatus {
  key: string;
  label: string;
  state: "done" | "partial" | "empty";
  /** What's missing, for a partial section. */
  detail?: string;
}

export interface CvScorePanelProps {
  score: CvScore;
  /** AI polish is available. */
  isPro: boolean;
  /** On a paid plan: sees the full breakdown, not just what's missing. */
  isSubscribed: boolean;
  sections: SectionStatus[];
  onOpenSection: (section: string) => void;
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
  /** Show the "CV score" label beside the ring on phones too (it's hidden there in the cramped top bar). */
  labelOnPhones?: boolean;
  /** Fill the width it's given (the phone preview's top bar). */
  fill?: boolean;
  /** The tour points at this one (only one visible copy should be). Default true. */
  tour?: boolean;
  /** Where the dropdown opens on phones, below whatever bar holds the badge. */
  phoneDropdownTop?: string;
}

/**
 * The editor's CV score: a ring that opens what's missing (for everyone),
 * each with the points it adds, and — on a paid plan — the full breakdown
 * with AI polish for what AI can fix without inventing anything.
 */
export function CvScorePanel(props: CvScorePanelProps) {
  const { score, isPro, isSubscribed, job, polishingKey } = props;
  const [open, setOpen] = useState(false);
  const [editingJd, setEditingJd] = useState(false);
  const tone = scoreTone(score.total);

  const failing = score.checks.filter((c) => c.status !== "pass");
  const byGain = (a: ScoreCheck, b: ScoreCheck) => overallGain(score, b) - overallGain(score, a);
  const missing = failing.filter((c) => c.kind === "missing").sort(byGain);
  const improve = failing.filter((c) => c.kind === "improve").sort(byGain);
  const missingGain = missing.reduce((s, c) => s + overallGain(score, c), 0);
  const improveGain = improve.reduce((s, c) => s + overallGain(score, c), 0);
  const aiFixable = improve.filter((c) => c.fix === "ai" && c.polish);
  const busy = polishingKey !== null;
  const hasJob = score.job !== undefined;

  const close = () => setOpen(false);

  const polishButton = (targets: PolishTarget[] | "all", key: string, label: string) => {
    const spinning = polishingKey === key;
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => (isPro ? props.onPolish(targets, key) : props.onUpgrade())}
        title={isPro ? "Rewrite with AI. You can undo it." : "AI polish comes with Plus and Pro"}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-accent-border text-xs font-semibold text-accent-strong hover:bg-accent-soft transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {spinning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isPro ? <Wand className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5" />}
        {spinning ? "Polishing…" : label}
      </button>
    );
  };

  const checkItem = (check: ScoreCheck, withPolish: boolean) => (
    <li key={check.id} className="rounded-lg border border-neutral-200 p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-neutral-900">{check.label}</span>
        <span className="shrink-0 text-xs font-bold tabular-nums text-emerald-700">{fmtGain(overallGain(score, check))}</span>
      </div>
      <p className="mt-0.5 text-[13px] text-neutral-600 leading-relaxed">{check.message}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            props.onGoTo(check);
            close();
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
        >
          Go to <ArrowRight className="w-3 h-3" />
        </button>
        {withPolish && check.fix === "ai" && check.polish && polishButton([check.polish], polishKey(check.polish), "Polish")}
      </div>
    </li>
  );

  const badgeHint = missing.length
    ? `Add ${missing.length} for ${fmtGain(missingGain)}`
    : improve.length
      ? `${improve.length} to improve`
      : "All checks pass";

  return (
    <div className={props.fill ? "relative min-w-0" : "relative"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-tour={props.tour === false ? undefined : "editor-score"}
        className={`${props.fill ? "w-full" : ""} inline-flex items-center gap-2 pl-1 pr-1 ${props.labelOnPhones ? "pr-3" : "sm:pr-3"} py-1 rounded-lg border bg-white transition-colors cursor-pointer ${
          open ? "border-neutral-400" : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
        }`}
        title="Your CV score. Click to see what to add for a better score"
        aria-expanded={open}
      >
        <ScoreRing score={score.total} size={36} />
        <span className={`${props.labelOnPhones ? "flex" : "hidden sm:flex"} flex-col items-start leading-tight`}>
          <span className="text-xs font-medium text-neutral-500">CV score</span>
          <span className={`text-sm font-semibold whitespace-nowrap ${missing.length ? "text-emerald-700" : tone.text}`}>{badgeHint}</span>
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div
            role="dialog"
            aria-label="CV score"
            className={`fixed sm:absolute inset-x-3 sm:inset-x-auto ${props.phoneDropdownTop ?? "top-[4.5rem]"} sm:top-auto sm:right-0 sm:mt-2 z-50 sm:w-[26rem] max-h-[calc(100dvh-9rem)] sm:max-h-[calc(100dvh-14rem)] overflow-y-auto rounded-lg border border-neutral-300 bg-white shadow-xl`}
          >
            {/* Overall */}
            <div className="p-4 border-b border-neutral-200 space-y-3">
              <div className="flex items-center gap-4">
                <ScoreRing score={score.total} size={64} />
                <div className="min-w-0 flex-1">
                  <div className={`text-base font-bold ${tone.text}`}>{tone.label}</div>
                  <p className="text-[13px] text-neutral-500 leading-relaxed mt-0.5">
                    {score.total >= TARGET_SCORE ? (
                      <>Above the {TARGET_SCORE} we recommend.</>
                    ) : (
                      <>
                        Aim for <strong className="text-neutral-700">{TARGET_SCORE}+</strong>.
                        {missing.length > 0 && <> Adding what&apos;s missing below gets you {fmtGain(missingGain)}.</>}
                      </>
                    )}
                  </p>
                </div>
                <button type="button" onClick={close} className="self-start p-1.5 rounded-md text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 cursor-pointer" aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {hasJob && (
                <div className="space-y-1.5">
                  <ScoreBar label="CV quality" score={score.quality} hint="How complete and well written your CV is, for any job" />
                  <ScoreBar label="Job match" score={score.job!} hint="How well your CV matches the job description" />
                  <p className="text-[11px] text-neutral-500">
                    Overall for {score.jobMatch?.title || "this job"} = {Math.round(QUALITY_WEIGHT * 100)}% CV quality + {Math.round(JOB_WEIGHT * 100)}% job match.
                  </p>
                </div>
              )}
            </div>

            {/* Sections */}
            <div className="px-4 py-3 border-b border-neutral-200">
              <div className="text-sm font-semibold text-neutral-900 mb-2">Your sections</div>
              <div className="flex flex-wrap gap-1.5">
                {props.sections.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      props.onOpenSection(s.key);
                      close();
                    }}
                    title={s.state === "done" ? "Complete" : s.state === "partial" ? s.detail ?? "Missing details" : "Not added yet. Click to add it"}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      s.state === "done"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                        : s.state === "partial"
                          ? "bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
                          : "border border-dashed border-neutral-300 text-neutral-500 hover:border-neutral-400 hover:text-neutral-800"
                    }`}
                  >
                    {s.state === "done" ? <Check className="w-3 h-3" /> : s.state === "partial" ? <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> : <Plus className="w-3 h-3" />}
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-neutral-500 leading-relaxed">
                Optional sections like awards or publications never lower your score. Add them if you have them.
              </p>
            </div>

            {/* What's missing — for everyone */}
            <div className="px-4 py-3 border-b border-neutral-200 space-y-2">
              <div className="text-sm font-semibold text-neutral-900">{missing.length ? "Add these for a better score" : "Nothing missing"}</div>
              {missing.length === 0 && <p className="text-xs text-neutral-500">Every detail is there.</p>}
              <ul className="space-y-1.5">{missing.map((check) => checkItem(check, isSubscribed))}</ul>
            </div>

            {/* Job match */}
            <div className="px-4 py-3 border-b border-neutral-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
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
                  placeholder="Paste the job posting. You'll get a job match score, and it counts for 40% of your overall score."
                  className={`${inputClass} text-xs leading-relaxed resize-y`}
                />
              )}
              {job.status === "none" && !editingJd && (
                <p className="text-xs text-neutral-500 leading-relaxed">Paste a job posting to see how well your CV matches it, and which skills it asks for that you haven&apos;t listed.</p>
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

            {/* The full breakdown — paid plans */}
            {isSubscribed ? (
              <>
                <div className="px-4 py-3 border-b border-neutral-200 space-y-2">
                  <div className="text-sm font-semibold text-neutral-900">Score breakdown</div>
                  {score.categories.map((c) => (
                    <ScoreBar key={c.key} label={c.label} score={c.max ? Math.round((c.score / c.max) * 100) : 0} />
                  ))}
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-neutral-900">{improve.length ? "Improve what's there" : "Nothing to improve"}</span>
                    {aiFixable.length > 0 && polishButton("all", "all", "Polish all")}
                  </div>
                  {improve.length === 0 && <p className="text-xs text-neutral-500">Every check passes. Nice work.</p>}
                  <ul className="space-y-1.5">{improve.map((check) => checkItem(check, true))}</ul>
                </div>
                <div className="px-4 py-3 border-t border-neutral-200 space-y-2 bg-neutral-50/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                      <Lightbulb className="w-3.5 h-3.5 text-neutral-500" /> AI check
                    </span>
                    <button
                      type="button"
                      onClick={props.onReview}
                      disabled={props.reviewing}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {props.reviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <WandSparkles className="w-3.5 h-3.5" />}
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
              </>
            ) : (
              improve.length > 0 && (
                <div className="px-4 py-3">
                  <button
                    type="button"
                    onClick={props.onUpgrade}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-left transition-colors cursor-pointer"
                  >
                    <span className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-white border border-neutral-200">
                      <Lock className="w-4 h-4 text-neutral-500" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold text-neutral-900">
                        {improve.length} more way{improve.length === 1 ? "" : "s"} to improve · {fmtGain(improveGain)}
                      </span>
                      <span className="block text-[11px] text-neutral-500 leading-relaxed">
                        The full breakdown, wording checks and AI polish come with Plus and Pro.
                      </span>
                    </span>
                    <Crown className="w-4 h-4 text-accent-strong shrink-0" />
                  </button>
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
