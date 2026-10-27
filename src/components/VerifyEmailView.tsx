"use client";

import { useState } from "react";
import Link from "next/link";
import { useVerifyEmail, useResendVerification } from "@/hooks/use-auth";
import { ApiError, RESEND_COOLDOWN_SECONDS, resendRetryAfter } from "@/lib/api";
import { useCooldown } from "@/hooks/use-cooldown";

const buttonClass =
  "w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#333333] py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#3b3b3b] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

const inputClass =
  "w-full rounded-xl border border-white/[0.06] bg-[#262626] px-3.5 py-3 text-[14.5px] text-white placeholder:text-neutral-500 transition-all focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20";

// Landing page for the link in the confirmation email. Opening the link
// changes nothing — email scanners open links too — only the button confirms.
// On success useVerifyEmail stores the session and goes to /dashboard.
export function VerifyEmailView({ token }: { token: string | null }) {
  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendVerification();
  const [error, setError] = useState<string | null>(token ? null : "This confirmation link is incomplete.");
  const [resendEmail, setResendEmail] = useState("");
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const resendCooldown = useCooldown();

  const handleConfirm = async () => {
    if (!token) return;
    setError(null);
    try {
      await verifyMutation.mutateAsync(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendNotice(null);
    try {
      await resendMutation.mutateAsync(resendEmail);
      setResendNotice("If that email is waiting for confirmation, a new link is on its way.");
      resendCooldown.start(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const retryAfter = resendRetryAfter(err);
      if (retryAfter) {
        resendCooldown.start(retryAfter);
        return;
      }
      setResendNotice(err instanceof ApiError ? err.message : "Couldn't send the email. Try again.");
    }
  };

  const confirmed = verifyMutation.isSuccess;

  return (
    <div className="fixed inset-0 flex h-dvh w-full items-center justify-center overflow-y-auto overflow-x-hidden overscroll-none bg-[#0a0a0a] px-6 font-sans text-white">
      <div className="w-full max-w-[380px] py-10 text-center">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">Confirm your email</h1>
        <p className="mt-4 text-[14.5px] leading-relaxed text-neutral-400">
          {confirmed
            ? "Email confirmed. Taking you to your dashboard…"
            : "Click the button below to confirm your email address and sign in."}
        </p>

        {token && !error && (
          <button type="button" onClick={handleConfirm} disabled={verifyMutation.isPending || confirmed} className={`${buttonClass} mt-8`}>
            {verifyMutation.isPending || confirmed ? "Confirming…" : "Confirm email"}
          </button>
        )}

        {error && (
          <div className="mt-8 text-left">
            <p className="text-[13.5px] font-medium text-red-400">{error}</p>
            <form onSubmit={handleResend} className="mt-4 flex flex-col gap-3">
              <input
                type="email"
                required
                autoComplete="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="Your email address"
                className={inputClass}
              />
              <button
                type="submit"
                disabled={resendMutation.isPending || resendCooldown.secondsLeft > 0}
                className={buttonClass}
              >
                {resendMutation.isPending
                  ? "Sending…"
                  : resendCooldown.secondsLeft > 0
                    ? `Send a new link in ${resendCooldown.secondsLeft}s`
                    : "Send a new link"}
              </button>
            </form>
            {resendNotice && <p className="mt-3 text-[13.5px] font-medium text-neutral-300">{resendNotice}</p>}
          </div>
        )}

        <p className="mt-8 text-[14px] text-neutral-500">
          <Link href="/login" className="font-semibold text-accent-light transition-colors hover:text-accent-mid">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
