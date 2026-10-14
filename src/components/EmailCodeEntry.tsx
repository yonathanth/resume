"use client";

import React, { useEffect, useRef, useState } from "react";
import { ClipboardPaste, Loader2 } from "lucide-react";
import { useCooldown } from "@/hooks/use-cooldown";
import { useHasMounted } from "@/hooks/use-has-mounted";
import {
  ApiError,
  AuthResponse,
  RESEND_COOLDOWN_SECONDS,
  resendRetryAfter,
  resendVerification,
  verifyEmailCode,
} from "@/lib/api";

const LENGTH = 6;

const THEMES = {
  // The /signup and /login pages.
  dark: {
    title: "text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[32px]",
    text: "text-[14.5px] leading-relaxed text-neutral-400",
    strong: "font-semibold text-neutral-200",
    box: "border-white/[0.08] bg-[#262626] text-white focus:border-accent/60 focus:ring-accent/20",
    error: "text-red-400",
    notice: "text-neutral-300",
    link: "text-accent-light hover:text-accent-mid",
    muted: "text-neutral-500",
    paste: "border-white/[0.08] bg-[#262626] text-white hover:bg-[#2e2e2e]",
  },
  // The sign-up pop-up over the try flows.
  light: {
    title: "text-xl font-bold tracking-tight text-neutral-950",
    text: "text-sm leading-relaxed text-neutral-500",
    strong: "font-semibold text-neutral-800",
    box: "border-neutral-300 bg-white text-neutral-950 focus:border-accent focus:ring-accent/10",
    error: "text-red-600",
    notice: "text-neutral-600",
    link: "text-accent-strong hover:text-accent",
    muted: "text-neutral-400",
    paste: "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100",
  },
};

/** The first 6-digit code in some copied text ("482913", "482 913", or a whole sentence around it). */
function findCode(text: string): string | null {
  const match = text.match(/(?<!\d)\d{3}[\s-]?\d{3}(?!\d)/);
  return match ? match[0].replace(/\D/g, "") : null;
}

/**
 * "Enter the code we emailed you": six boxes that take typing, pasting (the
 * whole code into any box) and the phone's one-time-code autofill, and check
 * the code as soon as the sixth digit is in. By default it confirms a
 * sign-up (signed in on success); `verify`/`resend` swap in another code
 * flow, e.g. changing the account email. The caller decides what happens on
 * success. A code was just sent when this appears, so the resend button
 * starts on its cooldown.
 */
export function EmailCodeEntry<T = AuthResponse>({
  email,
  theme,
  onVerified,
  onChangeEmail,
  titleId,
  verify,
  resend: resendCode,
}: {
  email: string;
  theme: "dark" | "light";
  /** For a dialog labelled by this screen's heading. */
  titleId?: string;
  onVerified: (result: T) => void;
  onChangeEmail: () => void;
  /** Checks a code; defaults to confirming the sign-up of `email`. */
  verify?: (code: string) => Promise<T>;
  /** Sends a new code; defaults to resending the sign-up code to `email`. */
  resend?: () => Promise<unknown>;
}) {
  const t = THEMES[theme];
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(""));
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const cooldown = useCooldown();
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const startCooldown = cooldown.start;
  // Only where the browser lets a page read the clipboard; decided after
  // mount, so the server render and the first client render agree.
  const hasMounted = useHasMounted();
  const canPaste = hasMounted && typeof navigator.clipboard?.readText === "function";

  useEffect(() => {
    startCooldown(RESEND_COOLDOWN_SECONDS);
    boxes.current[0]?.focus();
  }, [startCooldown]);

  const clear = () => {
    setDigits(Array(LENGTH).fill(""));
    boxes.current[0]?.focus();
  };

  const check = async (code: string) => {
    setChecking(true);
    setError(null);
    setNotice(null);
    try {
      onVerified(verify ? await verify(code) : ((await verifyEmailCode(email, code)) as T));
    } catch (err) {
      // The message says what to do: try again, or send a new code.
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      clear();
    } finally {
      setChecking(false);
    }
  };

  // Writes digits from `index` on (one typed, or a whole pasted code), then
  // checks the code once all six are in.
  const fill = (index: number, input: string) => {
    const incoming = input.replace(/\D/g, "");
    if (!incoming) return;
    // A full code arriving in one go (paste, autofill) replaces everything.
    const start = incoming.length >= LENGTH ? 0 : index;
    const next = [...digits];
    for (let i = 0; i < incoming.length && start + i < LENGTH; i++) next[start + i] = incoming[i];
    setDigits(next);
    setError(null);
    const firstEmpty = next.findIndex((d) => !d);
    if (firstEmpty === -1) {
      boxes.current[LENGTH - 1]?.blur();
      if (!checking) void check(next.join(""));
    } else {
      boxes.current[Math.min(firstEmpty, start + incoming.length)]?.focus();
    }
  };

  // Copied from the email, one tap here: fills the boxes and checks the code.
  const pasteFromClipboard = async () => {
    setNotice(null);
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setError("Your browser didn't allow reading the clipboard. Paste into the boxes instead.");
      return;
    }
    const code = findCode(text);
    if (!code) {
      setError("There's no 6-digit code on your clipboard. Copy it from the email first.");
      return;
    }
    fill(0, code);
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      boxes.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      boxes.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < LENGTH - 1) {
      boxes.current[index + 1]?.focus();
    }
  };

  const resend = async () => {
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      await (resendCode ? resendCode() : resendVerification(email));
      setNotice("A new code is on its way. Earlier codes no longer work.");
      cooldown.start(RESEND_COOLDOWN_SECONDS);
      clear();
    } catch (err) {
      const retryAfter = resendRetryAfter(err);
      if (retryAfter) cooldown.start(retryAfter);
      else setError(err instanceof ApiError ? err.message : "Couldn't send a new code. Try again.");
    } finally {
      setSending(false);
    }
  };

  const resendLabel = sending
    ? "Sending…"
    : cooldown.secondsLeft > 0
      ? `Send a new code in ${cooldown.secondsLeft}s`
      : "Send a new code";

  return (
    <div className="text-center">
      <h2 id={titleId} className={t.title}>
        Check your email
      </h2>
      <p className={`mt-3 ${t.text}`}>
        Enter the 6-digit code we sent to
        {/* Its own line, so the address only wraps when it can't fit at all. */}
        <span className={`block ${t.strong} [overflow-wrap:anywhere]`}>{email}</span>
      </p>

      <div className="mt-7 flex justify-center gap-2" role="group" aria-label="Confirmation code">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            value={digit}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              if (!value) {
                const next = [...digits];
                next[i] = "";
                setDigits(next);
                return;
              }
              // Typing over a filled box keeps the new digit; a whole code (autofill) fills them all.
              fill(i, value.length > 1 && value.length < LENGTH ? value.slice(-1) : value);
            }}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => {
              e.preventDefault();
              fill(i, e.clipboardData.getData("text"));
            }}
            onFocus={(e) => e.target.select()}
            disabled={checking}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={LENGTH}
            aria-label={`Digit ${i + 1}`}
            className={`h-13 w-11 rounded-xl border text-center text-2xl font-bold tabular-nums transition focus:outline-none focus:ring-4 disabled:opacity-60 sm:w-12 ${t.box}`}
          />
        ))}
      </div>

      {canPaste && (
        <button
          type="button"
          onClick={pasteFromClipboard}
          disabled={checking}
          className={`mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${t.paste}`}
        >
          <ClipboardPaste className="h-4 w-4" />
          Paste code
        </button>
      )}

      <div className="mt-4 min-h-[20px] text-[13.5px] font-medium">
        {checking ? (
          <span className={`inline-flex items-center gap-2 ${t.notice}`}>
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </span>
        ) : error ? (
          <p className={t.error}>{error}</p>
        ) : notice ? (
          <p className={t.notice}>{notice}</p>
        ) : (
          <p className={t.muted}>The code expires in 15 minutes.</p>
        )}
      </div>

      <button
        type="button"
        onClick={resend}
        disabled={sending || checking || cooldown.secondsLeft > 0}
        className={`mt-5 cursor-pointer text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${t.link}`}
      >
        {resendLabel}
      </button>
      <p className={`mt-3 text-[13px] ${t.muted}`}>
        Wrong email?{" "}
        <button type="button" onClick={onChangeEmail} className={`cursor-pointer font-semibold transition-colors ${t.link}`}>
          Change it
        </button>
      </p>
    </div>
  );
}
