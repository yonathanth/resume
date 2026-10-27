"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { ApiError, RESEND_COOLDOWN_SECONDS, forgotPassword, resendRetryAfter, resetPassword, unsubscribeFromAnnouncements } from "@/lib/api";
import { useCooldown } from "@/hooks/use-cooldown";

// Password reset (request + choose a new password) and the one-click
// announcement unsubscribe page. Same look as VerifyEmailView.

const buttonClass =
  "w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#333333] py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#3b3b3b] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

const inputClass =
  "w-full rounded-xl border border-white/[0.06] bg-[#262626] px-3.5 py-3 text-[14.5px] text-white placeholder:text-neutral-500 transition-all focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20";

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex h-dvh w-full items-center justify-center overflow-y-auto overflow-x-hidden overscroll-none bg-[#0a0a0a] px-6 font-sans text-white">
      <div className="w-full max-w-[380px] py-10 text-center">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">{title}</h1>
        {children}
        <p className="mt-8 text-[14px] text-neutral-500">
          <Link href="/login" className="font-semibold text-accent-light transition-colors hover:text-accent-mid">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ForgotPasswordView() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cooldown = useCooldown();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await forgotPassword(email);
      setNotice("If an account uses that email, a reset link is on its way. It works once, for 60 minutes.");
      cooldown.start(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const retryAfter = resendRetryAfter(err);
      if (retryAfter) cooldown.start(retryAfter);
      else setError(err instanceof ApiError ? err.message : "Couldn't send the email. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Frame title="Reset your password">
      <p className="mt-4 text-[14.5px] leading-relaxed text-neutral-400">Enter your account email and we&apos;ll send you a link to choose a new password.</p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-3 text-left">
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={inputClass} />
        <button type="submit" disabled={pending || cooldown.secondsLeft > 0} className={buttonClass}>
          {pending ? "Sending…" : cooldown.secondsLeft > 0 ? `Send again in ${cooldown.secondsLeft}s` : "Send reset link"}
        </button>
      </form>
      {notice && <p className="mt-4 text-[13.5px] font-medium text-neutral-300">{notice}</p>}
      {error && <p className="mt-4 text-[13.5px] font-medium text-red-400">{error}</p>}
    </Frame>
  );
}

export function ResetPasswordView({ token }: { token: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : "This reset link is incomplete. Request a new one.");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("The passwords don't match.");
    setPending(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Frame title={done ? "Password updated" : "Choose a new password"}>
      {done ? (
        <p className="mt-4 text-[14.5px] leading-relaxed text-neutral-400">
          Your password was changed and every device was signed out. Taking you to the log-in page…
        </p>
      ) : (
        <>
          {token && (
            <form onSubmit={submit} className="mt-8 flex flex-col gap-3 text-left">
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (8+ characters)"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-neutral-500 hover:text-neutral-200"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <input
                type={show ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                className={inputClass}
              />
              <button type="submit" disabled={pending} className={buttonClass}>
                {pending ? "Saving…" : "Save new password"}
              </button>
            </form>
          )}
          {error && (
            <div className="mt-4">
              <p className="text-[13.5px] font-medium text-red-400">{error}</p>
              <Link href="/forgot-password" className="mt-2 inline-block text-[13.5px] font-semibold text-accent-light hover:text-accent-mid">
                Request a new link
              </Link>
            </div>
          )}
        </>
      )}
    </Frame>
  );
}

export function UnsubscribeView({ u, t }: { u: string | null; t: string | null }) {
  const [state, setState] = useState<"working" | "done" | "error">(u && t ? "working" : "error");

  useEffect(() => {
    if (!u || !t) return;
    let cancelled = false;
    unsubscribeFromAnnouncements(u, t)
      .then(() => !cancelled && setState("done"))
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [u, t]);

  return (
    <Frame title={state === "done" ? "You're unsubscribed" : state === "error" ? "Link not valid" : "Unsubscribing…"}>
      <p className="mt-4 text-[14.5px] leading-relaxed text-neutral-400">
        {state === "done"
          ? "You won't get product announcement emails any more. Account, security and billing emails still arrive. You can turn announcements back on in Settings → Notifications."
          : state === "error"
            ? "This unsubscribe link is invalid or incomplete. You can change email preferences any time in Settings → Notifications."
            : "One moment."}
      </p>
    </Frame>
  );
}
