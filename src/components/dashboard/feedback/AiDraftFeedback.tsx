"use client";

import React, { useEffect, useState } from "react";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { sendFeedback, type AiDraftReason, type CvFlowType } from "@/lib/api";
import { FEEDBACK_SEND, FEEDBACK_TEXTAREA, FeedbackCard } from "./FeedbackCard";

const REASONS: { value: AiDraftReason; label: string }[] = [
  { value: "wrong_details", label: "Wrong details" },
  { value: "too_generic", label: "Too generic" },
  { value: "missing_experience", label: "Left things out" },
  { value: "bad_wording", label: "Wording sounds off" },
  { value: "too_long", label: "Too long" },
  { value: "other", label: "Something else" },
];

/** Long enough to have looked the draft over; short enough to still be on it. */
const ASK_AFTER_MS = 6000;

/**
 * "How's this first draft?" — thumbs up or down on a CV a flow just wrote,
 * with an optional reason and comment on a thumbs down. Asked once, when the
 * editor opens straight from a flow (?fresh=<flow>); the param is dropped
 * from the address right away so a refresh doesn't ask again.
 */
export function AiDraftFeedback({
  cvDocumentId,
  flowType,
  hidden = false,
}: {
  cvDocumentId: string;
  flowType: CvFlowType;
  /** Kept mounted but not drawn (another card has the corner). */
  hidden?: boolean;
}) {
  const [stage, setStage] = useState<"waiting" | "ask" | "why" | "thanks" | "closed">("waiting");
  const [reason, setReason] = useState<AiDraftReason | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("fresh")) {
      url.searchParams.delete("fresh");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
    const timer = setTimeout(() => setStage((s) => (s === "waiting" ? "ask" : s)), ASK_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (stage !== "thanks") return;
    const timer = setTimeout(() => setStage("closed"), 2200);
    return () => clearTimeout(timer);
  }, [stage]);

  if (hidden || stage === "waiting" || stage === "closed") return null;

  const send = async (rating: 1 | -1, withDetails = false) => {
    setSending(true);
    try {
      await sendFeedback({
        kind: "ai_draft",
        rating,
        cvDocumentId,
        flowType,
        ...(withDetails && reason ? { reason } : {}),
        ...(withDetails && comment.trim() ? { comment: comment.trim() } : {}),
      });
    } catch {
      // Feedback is a nice-to-have: a failed send never bothers them.
    } finally {
      setSending(false);
    }
  };

  return (
    <FeedbackCard titleId="ai-draft-feedback-title" onDismiss={() => setStage("closed")}>
      {stage === "ask" && (
        <>
          <p id="ai-draft-feedback-title" className="text-sm font-semibold text-neutral-950 pr-6">
            How&apos;s this first draft?
          </p>
          <p className="mt-0.5 text-[13px] text-neutral-500">Your answer helps us write better CVs.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStage("thanks");
                void send(1);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-800 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
            >
              <ThumbsUp className="w-4 h-4" /> Looks good
            </button>
            <button
              type="button"
              onClick={() => {
                setStage("why");
                // Recorded now, in case they close the card without saying why.
                void send(-1);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-800 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 transition-colors cursor-pointer"
            >
              <ThumbsDown className="w-4 h-4" /> Needs work
            </button>
          </div>
        </>
      )}

      {stage === "why" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await send(-1, true);
            setStage("thanks");
          }}
        >
          <p id="ai-draft-feedback-title" className="text-sm font-semibold text-neutral-950 pr-6">
            What was off?
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {REASONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={reason === value}
                onClick={() => setReason(reason === value ? null : value)}
                className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                  reason === value ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 text-neutral-700 hover:border-neutral-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label htmlFor="ai-draft-comment" className="sr-only">
            Anything else?
          </label>
          <textarea
            id="ai-draft-comment"
            rows={2}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything else? (optional)"
            className={FEEDBACK_TEXTAREA}
          />
          <div className="mt-3 flex justify-end">
            <button type="submit" disabled={sending || (!reason && !comment.trim())} className={FEEDBACK_SEND}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
            </button>
          </div>
        </form>
      )}

      {stage === "thanks" && (
        <p id="ai-draft-feedback-title" className="text-sm font-semibold text-neutral-950 pr-6">
          Thanks, that helps.
        </p>
      )}
    </FeedbackCard>
  );
}
