"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ClarificationQuestion } from "@/lib/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** However many questions the AI asks, each page of the form shows at most this many. */
export const QUESTIONS_PER_PAGE = 3;

function isEmailQuestion(q: ClarificationQuestion) {
  return q.id === "email" || q.id === "email_address";
}

function questionError(q: ClarificationQuestion, answers: Record<string, string>): string | null {
  const answer = answers[q.id]?.trim() ?? "";
  if (answer && isEmailQuestion(q) && !EMAIL_PATTERN.test(answer)) return "Enter a valid email address";
  return null;
}

/** Whether the form can be submitted: every required question answered, no invalid answers. */
export function getQuestionFormState(questions: ClarificationQuestion[], answers: Record<string, string>) {
  const unansweredRequired = questions.filter((q) => q.required && !answers[q.id]?.trim());
  const canSubmit = unansweredRequired.length === 0 && questions.every((q) => !questionError(q, answers));
  return { unansweredRequired: unansweredRequired.length, canSubmit };
}

/**
 * Splits the AI's questions into pages of QUESTIONS_PER_PAGE. The page resets
 * to the first one whenever a new set of questions arrives.
 */
export function useQuestionPages(questions: ClarificationQuestion[], answers: Record<string, string>) {
  const [state, setState] = useState<{ questions: ClarificationQuestion[]; page: number }>({ questions, page: 0 });
  const pageCount = Math.max(1, Math.ceil(questions.length / QUESTIONS_PER_PAGE));
  const page = state.questions === questions ? Math.min(state.page, pageCount - 1) : 0;
  const pageQuestions = questions.slice(page * QUESTIONS_PER_PAGE, (page + 1) * QUESTIONS_PER_PAGE);

  return {
    page,
    pageCount,
    pageQuestions,
    isFirstPage: page === 0,
    isLastPage: page === pageCount - 1,
    /** This page's required questions are answered and valid. */
    pageComplete: getQuestionFormState(pageQuestions, answers).canSubmit,
    next: () => setState({ questions, page: Math.min(page + 1, pageCount - 1) }),
    prev: () => setState({ questions, page: Math.max(page - 1, 0) }),
  };
}

export type QuestionPages = ReturnType<typeof useQuestionPages>;

interface ClarifyingQuestionsFormProps {
  questions: ClarificationQuestion[];
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
  /** When given, only the current page is shown, with a progress line. */
  pages?: QuestionPages;
  /** Shown when the AI had nothing to ask; omit to render nothing in that case. */
  emptyMessage?: string;
}

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition";

/**
 * The missing-details form used by every create flow: exactly the questions
 * the AI asked (see the backend's clarification rules), never fixed fields.
 */
export function ClarifyingQuestionsForm({ questions, answers, onAnswer, pages, emptyMessage }: ClarifyingQuestionsFormProps) {
  if (questions.length === 0) {
    if (!emptyMessage) return null;
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5 text-sm text-emerald-800 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>{emptyMessage}</span>
      </div>
    );
  }

  const shown = pages ? pages.pageQuestions : questions;
  const firstIndex = pages ? pages.page * QUESTIONS_PER_PAGE : 0;

  return (
    <div>
      {pages && pages.pageCount > 1 && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-neutral-500">
            Questions {firstIndex + 1}–{firstIndex + shown.length} of {questions.length}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: pages.pageCount }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === pages.page ? "w-5 bg-accent" : "w-1.5 bg-neutral-200"}`}
              />
            ))}
          </div>
        </div>
      )}

      <div key={pages?.page ?? 0} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
        {shown.map((q) => {
          const error = questionError(q, answers);
          const value = answers[q.id] ?? "";
          const inputId = `question-${q.id}`;
          return (
            <div key={q.id}>
              <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-neutral-900">
                {q.question}
                {q.required ? (
                  <span className="text-accent"> *</span>
                ) : (
                  <span className="font-normal text-neutral-400"> · optional</span>
                )}
              </label>
              {q.type === "textarea" ? (
                <textarea
                  id={inputId}
                  rows={3}
                  value={value}
                  onChange={(e) => onAnswer(q.id, e.target.value)}
                  className={`${INPUT_CLASS} resize-none`}
                />
              ) : q.type === "select" && q.options?.length ? (
                <select id={inputId} value={value} onChange={(e) => onAnswer(q.id, e.target.value)} className={INPUT_CLASS}>
                  <option value="">Select...</option>
                  {q.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={inputId}
                  type={q.type === "date" ? "date" : isEmailQuestion(q) ? "email" : "text"}
                  value={value}
                  onChange={(e) => onAnswer(q.id, e.target.value)}
                  className={INPUT_CLASS}
                />
              )}
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
