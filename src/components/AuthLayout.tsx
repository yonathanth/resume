"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useRegister, useLogin, useResendVerification } from "@/hooks/use-auth";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { useCvTemplates } from "@/hooks/use-cv-templates";
import { TemplateThumbnail } from "@/components/dashboard/create-flow/TemplateThumbnail";
import { ApiError, AuthResponse, googleSignInUrl, resendRetryAfter, setAccessToken } from "@/lib/api";
import { EmailCodeEntry } from "@/components/EmailCodeEntry";
import { describeQuickIntent, peekQuickIntent } from "@/lib/quick-links";
import { isOwnPopup, reportToOpener } from "@/lib/google-popup";

interface AuthLayoutProps {
  mode: "signup" | "login";
}

// ---------------------------------------------------------------------------
// Right panel: a steeply slanted wall of real templates (the colourful ones
// first) mixed with a few brand-coloured tiles, each column drifting slowly
// and endlessly. A column holds its set twice and slides by exactly one set,
// so the loop has no seam; every set is taller than the slanted panel, so no
// gap ever opens at the ends.
// ---------------------------------------------------------------------------

const COLOURFUL_FIRST = [
  "midnight",
  "capsule",
  "timeline",
  "crest",
  "spark",
  "campus",
  "linen",
  "accent",
  "bubble",
  "sidebar",
  "halo",
  "slate",
  "curve",
  "formal",
  "focus",
  "prose",
  "stack",
];

type WallItem = { kind: "cv"; slot: number } | { kind: "tile"; tile: number };

const TILES = [
  { className: "bg-accent text-white", eyebrow: "GoMoxie", text: "Land the interview." },
  { className: "bg-accent-soft text-neutral-950", eyebrow: "AI tailoring", text: "Made for every job you apply to." },
  { className: "bg-neutral-800 text-white", eyebrow: "ATS-friendly", text: "Passes the scan.", accent: true },
  { className: "bg-[#ffe3d1] text-neutral-950", eyebrow: "Templates", text: "Simple to academic." },
];

// Four columns of six items — five templates and one tile, the tile at a
// different height in each. At 240px wide a set is ~2,100px tall, comfortably
// more than the ~1,400px of a column that shows through the slanted panel.
const COLUMNS: { items: WallItem[]; direction: "up" | "down"; seconds: number }[] = [0, 1, 2, 3].map((col) => {
  const items: WallItem[] = [0, 1, 2, 3, 4].map((i) => ({ kind: "cv", slot: col * 5 + i }));
  items.splice((col * 2 + 1) % 6, 0, { kind: "tile", tile: col });
  return { items, direction: col % 2 ? "down" : "up", seconds: 90 + col * 12 };
});

function Tile({ tile }: { tile: number }) {
  const t = TILES[tile % TILES.length];
  return (
    <div className={`flex aspect-[210/297] w-full flex-col justify-between rounded-lg p-5 ${t.className}`}>
      <span className={`text-[12px] font-semibold uppercase tracking-[0.14em] ${t.accent ? "text-accent-light" : "opacity-60"}`}>{t.eyebrow}</span>
      <span className="text-[30px] font-bold leading-[1.1] tracking-tight">{t.text}</span>
    </div>
  );
}

function TemplateWall() {
  const { data: templates } = useCvTemplates();
  const all = (templates ?? []).map((t) => t.id);
  const ids = [...COLOURFUL_FIRST.filter((id) => all.includes(id)), ...all.filter((id) => !COLOURFUL_FIRST.includes(id))];

  return (
    // A large square, centred on the panel and rotated, with the columns hung
    // from its top edge — so each column starts just above what's visible.
    <div className="absolute left-1/2 top-1/2 flex h-[1600px] w-[1600px] -translate-x-1/2 -translate-y-1/2 -rotate-[30deg] items-start justify-center gap-4">
      {COLUMNS.map((column, col) => (
        <div
          key={col}
          className="auth-wall-col flex w-[240px] shrink-0 flex-col gap-4 pb-4"
          style={{
            marginTop: col % 2 ? -160 : 0,
            animation: `${column.direction === "up" ? "marquee-up" : "marquee-down"} ${column.seconds}s linear infinite`,
          }}
        >
          {[...column.items, ...column.items].map((item, i) =>
            item.kind === "tile" ? (
              <Tile key={i} tile={item.tile} />
            ) : ids.length ? (
              <TemplateThumbnail
                key={i}
                templateId={ids[item.slot % ids.length]}
                title="Resume template example"
                className="aspect-[210/297] w-full rounded-lg"
              />
            ) : (
              <div key={i} className="aspect-[210/297] w-full animate-pulse rounded-lg bg-neutral-800" />
            ),
          )}
        </div>
      ))}
    </div>
  );
}

// The wall is desktop-only; don't mount its iframes on small screens at all.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

const inputClass =
  "w-full rounded-xl border border-white/[0.06] bg-[#262626] px-3.5 py-3 text-[14.5px] text-white placeholder:text-neutral-500 transition-all focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20";

export function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  GOOGLE_CANCELLED: "Google sign-in was cancelled.",
  GOOGLE_NOT_CONFIGURED: "Google sign-in is not configured.",
  EMAIL_NOT_VERIFIED: "Your Google account's email is not verified.",
  // Not Google-specific: also sent by apiFetch when a signed-in account is suspended.
  ACCOUNT_SUSPENDED: "This account has been suspended. Contact support if you think this is a mistake.",
  REGISTRATION_CLOSED: "New sign-ups are paused right now. Please try again later.",
};

export function AuthLayout({ mode }: AuthLayoutProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isDesktop = useIsDesktop();

  const isSignup = mode === "signup";

  const router = useRouter();
  const registerMutation = useRegister();
  const loginMutation = useLogin();
  const resendMutation = useResendVerification();
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false);
  // Set once a code has been emailed (sign-up, or logging in unconfirmed): the form gives way to the code boxes.
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);
  // Set when login finds the password right but the email unconfirmed.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const isPending = registerMutation.isPending || loginMutation.isPending || isGoogleRedirecting;

  // The backend's Google callback sends failures back as /login?error=CODE.
  // Read only after mount (window), and hidden once the user tries again.
  const hasMounted = useHasMounted();
  const [showGoogleError, setShowGoogleError] = useState(true);
  const googleErrorCode = hasMounted ? new URLSearchParams(window.location.search).get("error") : null;
  const googleError = googleErrorCode
    ? GOOGLE_ERROR_MESSAGES[googleErrorCode] ?? "Google sign-in failed. Please try again."
    : null;
  const displayedError = formError ?? (showGoogleError ? googleError : null);

  // Google failed inside the sign-up pop-up's Google window: report it to the page that opened it, and close.
  useEffect(() => {
    if (googleErrorCode && isOwnPopup()) reportToOpener({ ok: false, code: googleErrorCode });
  }, [googleErrorCode]);

  // Arrived from a quick link (/go/...): say what they'll go on to do once they're in.
  const quickIntent = hasMounted ? peekQuickIntent() : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setShowGoogleError(false);
    setUnverifiedEmail(null);
    try {
      if (isSignup) {
        const result = await registerMutation.mutateAsync({ email, password });
        setSentToEmail(result.email);
      } else {
        await loginMutation.mutateAsync({ email, password });
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") setUnverifiedEmail(email);
      setFormError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  // Logged in with an unconfirmed email: send a code and go to the code boxes.
  // Rate-limited means a code went out moments ago — that one still works.
  const sendCodeTo = async (toEmail: string) => {
    try {
      await resendMutation.mutateAsync(toEmail);
    } catch (err) {
      if (!resendRetryAfter(err)) {
        setFormError(err instanceof ApiError ? err.message : "Couldn't send a code. Try again.");
        return;
      }
    }
    setFormError(null);
    setUnverifiedEmail(null);
    setSentToEmail(toEmail);
  };

  // Code accepted: signed in, on to the dashboard (which opens any quick-link intent).
  const handleVerified = (session: AuthResponse) => {
    setAccessToken(session.accessToken);
    router.push("/dashboard");
  };

  const handleGoogleClick = () => {
    setFormError(null);
    setShowGoogleError(false);
    setIsGoogleRedirecting(true);
    window.location.href = googleSignInUrl();
  };

  return (
    <div className="fixed inset-0 flex h-screen w-screen overflow-hidden bg-[#0a0a0a] font-sans text-white selection:bg-white selection:text-neutral-950">
      {/* Left: the form */}
      <div className="relative z-20 flex h-full w-full flex-col overflow-y-auto px-6 py-6 sm:px-10 lg:w-1/2 lg:px-14 xl:px-20">
        {/* Dot grid + a faint warm glow, as on the pricing page */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-[320px] w-[480px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(255,122,46,0.10),transparent)] blur-3xl" />

        <div className="relative mx-auto my-auto w-full max-w-[380px] py-10">
          {sentToEmail ? (
            <EmailCodeEntry
              email={sentToEmail}
              theme="dark"
              onVerified={handleVerified}
              onChangeEmail={() => setSentToEmail(null)}
            />
          ) : (
          <>
          <h1 className="text-center text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[32px]">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          {quickIntent && (
            <p className="mt-2 text-center text-sm text-neutral-400">
              {isSignup ? "Sign up" : "Log in"} to {describeQuickIntent(quickIntent)}.
            </p>
          )}

          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isPending}
            className="mt-9 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-white/[0.06] bg-[#262626] px-4 py-3 text-[14.5px] font-semibold text-white transition-colors hover:border-white/10 hover:bg-[#2e2e2e] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          <div className="my-6 flex items-center gap-3 text-[12px] font-medium text-neutral-500">
            <span className="h-px flex-1 bg-neutral-800" />
            or
            <span className="h-px flex-1 bg-neutral-800" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className={inputClass}
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? "Create a password" : "Password"}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-neutral-500 transition-colors hover:text-neutral-200 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {!isSignup && (
              <Link href="/forgot-password" className="-mt-1 self-end text-[13px] font-medium text-neutral-400 transition-colors hover:text-neutral-200">
                Forgot password?
              </Link>
            )}

            {displayedError && <p className="text-[13.5px] font-medium text-red-400">{displayedError}</p>}
            {unverifiedEmail && (
              <button
                type="button"
                onClick={() => sendCodeTo(unverifiedEmail)}
                disabled={resendMutation.isPending}
                className="cursor-pointer self-start text-[13.5px] font-medium text-accent-light transition-colors hover:text-accent-mid disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resendMutation.isPending ? "Sending…" : "Email me a code to confirm it"}
              </button>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#333333] py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#3b3b3b] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Please wait…" : isSignup ? "Create account" : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-[14px] text-neutral-500">
            {isSignup ? "Already have an account? " : "New to GoMoxie? "}
            <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-accent-light transition-colors hover:text-accent-mid">
              {isSignup ? "Log in" : "Create an account"}
            </Link>
          </p>
          </>
          )}
        </div>

        <p className="relative text-center text-[12.5px] leading-relaxed text-neutral-500">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-neutral-300 underline decoration-neutral-700 underline-offset-2 hover:text-white">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-neutral-300 underline decoration-neutral-700 underline-offset-2 hover:text-white">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      {/* Right: the slanted, drifting wall */}
      <div className="relative hidden h-full overflow-hidden border-l border-neutral-900 bg-[#111113] lg:block lg:w-1/2" aria-hidden>
        <div className="pointer-events-none absolute inset-0">{isDesktop && <TemplateWall />}</div>
      </div>
    </div>
  );
}
