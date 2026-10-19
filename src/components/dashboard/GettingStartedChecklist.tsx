"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { useActivation, usePromptAction } from "@/hooks/use-activation";
import { useMe } from "@/hooks/use-auth";
import { track } from "@/lib/analytics";
import { useDashboard } from "./DashboardContext";

interface Item {
  key: string;
  title: string;
  hint: string;
  done: boolean;
  /** A button's action, or a link. Absent while the step can't be taken yet. */
  onClick?: () => void;
  href?: string;
}

/**
 * Three first steps on the Builder: a first CV, its PDF, and keeping it as a
 * Career Profile (or, without Pro, tailoring a CV to a job — profiles are a
 * Pro feature and a checklist shouldn't end at a paywall). Done steps tick
 * off from what the server knows; the card goes away once all three are done
 * or they close it, for good (on every device).
 */
export function GettingStartedChecklist() {
  const { data: activation } = useActivation();
  const { data: me } = useMe();
  const { drafts, openFlow, handleOpenDraftInEditor } = useDashboard();
  const promptAction = usePromptAction();
  const prompt = activation?.prompts.checklist;

  const steps = activation?.steps;
  const latest = drafts[0];
  const items: Item[] = steps
    ? [
        {
          key: "first_cv",
          title: "Create your first CV",
          hint: "About five minutes, start to finish.",
          done: steps.firstCv,
          onClick: () => openFlow(me?.signupIntent ?? "create"),
        },
        {
          key: "download",
          title: "Download it as a PDF",
          hint: "Ready to send to employers.",
          done: steps.pdfDownloaded,
          onClick: latest ? () => handleOpenDraftInEditor(latest) : undefined,
        },
        activation.canUseCareerProfiles
          ? {
              key: "career_profile",
              title: "Save it to a Career Profile",
              hint: "Your next CV for the same role starts half-written.",
              done: steps.careerProfile,
              href: "/dashboard/career-profiles",
            }
          : {
              key: "tailor",
              title: "Tailor a CV to a job",
              hint: "Paste a job posting; we match your CV to it.",
              done: steps.tailoredCv,
              onClick: () => openFlow("tailor"),
            },
      ]
    : [];
  const doneCount = items.filter((i) => i.done).length;
  const allDone = items.length > 0 && doneCount === items.length;
  const visible = Boolean(steps) && !prompt?.dismissedAt && !prompt?.completedAt;

  // Shown / finished, once each (the server keeps the first time).
  const recorded = useRef<{ shown: boolean; completed: boolean }>({ shown: false, completed: false });
  useEffect(() => {
    if (!visible) return;
    if (allDone && !recorded.current.completed) {
      recorded.current.completed = true;
      promptAction.mutate({ key: "checklist", action: "completed" });
    } else if (!prompt?.shownAt && !recorded.current.shown) {
      recorded.current.shown = true;
      promptAction.mutate({ key: "checklist", action: "shown" });
    }
  }, [visible, allDone, prompt?.shownAt, promptAction]);

  if (!visible || allDone) return null;

  const clicked = (item: Item) => track("checklist_item_clicked", { item: item.key });

  return (
    <section aria-labelledby="getting-started-title" className="relative mb-12 rounded-lg border border-neutral-200 bg-white p-5 sm:p-6">
      <button
        type="button"
        onClick={() => promptAction.mutate({ key: "checklist", action: "dismissed" })}
        title="Hide"
        aria-label="Hide getting started"
        className="absolute top-3 right-3 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3 pr-8">
        <h2 id="getting-started-title" className="text-sm font-semibold text-neutral-950">
          Getting started
        </h2>
        <span className="text-xs font-medium text-neutral-500 tabular-nums">
          {doneCount} of {items.length} done
        </span>
        <span className="hidden sm:block h-1.5 w-24 rounded-full bg-neutral-100 overflow-hidden" aria-hidden="true">
          <span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
        </span>
      </div>

      <ol className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.map((item, i) => {
          const body = (
            <>
              <span
                className={`w-7 h-7 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold ${
                  item.done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-neutral-300 bg-white text-neutral-500"
                }`}
              >
                {item.done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${item.done ? "text-neutral-400 line-through" : "text-neutral-950"}`}>
                  {item.title}
                </span>
                <span className="block mt-0.5 text-xs text-neutral-500 leading-snug">{item.hint}</span>
              </span>
              {!item.done && (item.onClick || item.href) && (
                <ArrowRight className="w-4 h-4 shrink-0 text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:text-neutral-700" />
              )}
            </>
          );
          const cls = "group w-full h-full flex items-center gap-3 rounded-lg border border-neutral-200 p-3.5 text-left transition-colors";
          return (
            <li key={item.key}>
              {item.done || (!item.onClick && !item.href) ? (
                <div className={`${cls} ${item.done ? "bg-neutral-50/70" : "opacity-60"}`}>{body}</div>
              ) : item.href ? (
                <Link href={item.href} onClick={() => clicked(item)} className={`${cls} hover:border-neutral-300 hover:bg-neutral-50/60`}>
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    clicked(item);
                    item.onClick?.();
                  }}
                  className={`${cls} hover:border-neutral-300 hover:bg-neutral-50/60 cursor-pointer`}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
