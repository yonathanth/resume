"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { sendFeedback, type RatingTrigger } from "@/lib/api";
import { FEEDBACK_TEXTAREA } from "./FeedbackCard";

const LABELS = ["Not good", "Could be better", "Okay", "Good", "Great"] as const;

/**
 * "How did your CV turn out?" — 1 to 5 stars and an optional comment, in the
 * middle of the screen, with Skip for anyone who'd rather not. `onRated` /
 * `onSkipped` let the host record the answer (see CvRatingHost).
 */
export function CvRatingModal({
  cvDocumentId,
  trigger,
  onRated,
  onSkipped,
  onClose,
}: {
  cvDocumentId: string | null;
  trigger: RatingTrigger;
  onRated: () => void;
  onSkipped: () => void;
  onClose: () => void;
}) {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [thanked, setThanked] = useState(false);

  const skip = () => {
    onSkipped();
    onClose();
  };

  // Escape skips (or closes the thank-you).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (thanked) onClose();
      else skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!thanked) return;
    const timer = setTimeout(onClose, 1800);
    return () => clearTimeout(timer);
  }, [thanked, onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;
    setSending(true);
    try {
      await sendFeedback({
        kind: "cv_rating",
        rating,
        trigger,
        ...(cvDocumentId ? { cvDocumentId } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
    } catch {
      // A failed send never gets in their way.
    } finally {
      setSending(false);
    }
    onRated();
    setThanked(true);
  };

  const shownValue = hover ?? rating;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-rating-title"
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 text-center"
      >
        {thanked ? (
          <div className="py-4">
            <p id="cv-rating-title" className="text-lg font-bold tracking-tight text-neutral-950">
              Thank you!
            </p>
            <p className="mt-1 text-sm text-neutral-500">Good luck with your applications.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 id="cv-rating-title" className="text-lg font-bold tracking-tight text-neutral-950">
              How did your CV turn out?
            </h2>
            <p className="mt-1 text-sm text-neutral-500">Your rating helps us make GoMoxie better.</p>

            <div role="radiogroup" aria-label="Rating" className="mt-5 flex items-center justify-center gap-1" onMouseLeave={() => setHover(null)}>
              {([1, 2, 3, 4, 5] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} of 5: ${LABELS[value - 1]}`}
                  onMouseEnter={() => setHover(value)}
                  onClick={() => setRating(value)}
                  className="p-1 rounded-md cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      shownValue !== null && value <= shownValue ? "fill-amber-400 text-amber-400" : "text-neutral-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="mt-1 h-5 text-xs font-medium text-neutral-500" aria-live="polite">
              {shownValue ? LABELS[shownValue - 1] : ""}
            </p>

            {rating !== null && (
              <>
                <label htmlFor="cv-rating-comment" className="sr-only">
                  Tell us more
                </label>
                <textarea
                  id="cv-rating-comment"
                  rows={3}
                  maxLength={1000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={rating >= 4 ? "What did you like? (optional)" : "What would have made it better? (optional)"}
                  className={`${FEEDBACK_TEXTAREA} text-left`}
                />
              </>
            )}

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={skip}
                className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-semibold text-neutral-700 hover:border-neutral-400 transition-colors cursor-pointer"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={!rating || sending}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                Send rating
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
