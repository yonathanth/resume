"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { GoogleIcon } from "@/components/AuthLayout";
import { ApiError, getAccessToken, googleSignInUrl, login, refreshAccessToken, register, setAccessToken } from "@/lib/api";
import { GOOGLE_POPUP_MESSAGE, type GooglePopupMessage } from "@/lib/google-popup";
import { saveQuickIntent, type QuickIntent } from "@/lib/quick-links";

/**
 * Try first, sign up later. Inside an <AccountGateProvider> (the public /try
 * pages) a visitor can go through a flow without an account; the moment it
 * needs one — the first AI call, or opening the editor — `requireAccount()`
 * opens a sign-up pop-up over the flow and resolves once they're in, so the
 * flow carries on right where it was. Nothing reaches the AI before that.
 * Outside a provider (the dashboard) everyone is signed in: it resolves at once.
 */
interface AccountGate {
  /** No account yet: hide what needs one (career profiles, saved resumes). */
  isGuest: boolean;
  /** True once there's an account (straight away if there already is); false if they closed the pop-up. */
  requireAccount: () => Promise<boolean>;
}

const SIGNED_IN: AccountGate = { isGuest: false, requireAccount: async () => true };
const AccountGateContext = createContext<AccountGate>(SIGNED_IN);

export function useAccountGate(): AccountGate {
  return useContext(AccountGateContext);
}

export function AccountGateProvider({
  fallbackIntent,
  children,
}: {
  /** Where to pick up if Google has to take over the whole tab (pop-up blocked). */
  fallbackIntent: QuickIntent;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [signedIn, setSignedIn] = useState(false);
  const [checked, setChecked] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const pending = useRef<((ok: boolean) => void) | null>(null);

  // Someone already signed in (a session cookie from before) isn't a guest.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getAccessToken() ?? (await refreshAccessToken());
      if (cancelled) return;
      setSignedIn(Boolean(token));
      setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const settle = useCallback((ok: boolean) => {
    setPopupOpen(false);
    pending.current?.(ok);
    pending.current = null;
  }, []);

  const onSignedIn = useCallback(() => {
    setSignedIn(true);
    // Account-only data (their plan, profile, details) can load now.
    queryClient.invalidateQueries();
    settle(true);
  }, [queryClient, settle]);

  const requireAccount = useCallback(async () => {
    if (signedIn || getAccessToken()) return true;
    return new Promise<boolean>((resolve) => {
      pending.current = resolve;
      setPopupOpen(true);
    });
  }, [signedIn]);

  // A guest until we know otherwise, so account-only options never flash up for one.
  return (
    <AccountGateContext.Provider value={{ isGuest: !checked || !signedIn, requireAccount }}>
      {children}
      {popupOpen && (
        <SignUpPopup fallbackIntent={fallbackIntent} onSignedIn={onSignedIn} onClose={() => settle(false)} />
      )}
    </AccountGateContext.Provider>
  );
}

// The flow modals' own field and button styles (see FlowUI, ProfileSyncStep), so this reads as one of them.
const FIELD =
  "w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition";
const BUTTON_PRIMARY =
  "w-full py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed";
const BUTTON_SECONDARY =
  "w-full py-3 rounded-xl border border-neutral-200 bg-white text-sm font-bold text-neutral-800 hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

function SignUpPopup({
  fallbackIntent,
  onSignedIn,
  onClose,
}: {
  fallbackIntent: QuickIntent;
  onSignedIn: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waitingForGoogle, setWaitingForGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleWindow = useRef<Window | null>(null);

  // Google sign-in runs in its own small window and reports back here, so this page — and the flow — stay put.
  useEffect(() => {
    const onMessage = async (event: MessageEvent<GooglePopupMessage>) => {
      if (event.origin !== window.location.origin || event.data?.type !== GOOGLE_POPUP_MESSAGE) return;
      setWaitingForGoogle(false);
      if (!event.data.ok) {
        setError("Google sign-in didn't go through. Please try again.");
        return;
      }
      // The pop-up shares this page's storage and cookies, so the session is already here.
      const token = getAccessToken() ?? (await refreshAccessToken());
      if (token) onSignedIn();
      else setError("Google sign-in didn't go through. Please try again.");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onSignedIn]);

  // Closed the Google window without finishing: let them try again.
  useEffect(() => {
    if (!waitingForGoogle) return;
    const timer = setInterval(() => {
      if (googleWindow.current?.closed) setWaitingForGoogle(false);
    }, 500);
    return () => clearInterval(timer);
  }, [waitingForGoogle]);

  const continueWithGoogle = () => {
    setError(null);
    const width = 480;
    const height = 640;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(googleSignInUrl(), "google-sign-in", `width=${width},height=${height},left=${left},top=${top}`);
    if (!popup) {
      // Pop-ups blocked: Google takes over this tab instead, and the dashboard opens this flow afresh after.
      saveQuickIntent(fallbackIntent);
      window.location.href = googleSignInUrl();
      return;
    }
    googleWindow.current = popup;
    setWaitingForGoogle(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { accessToken } = mode === "signup" ? await register(email, password) : await login(email, password);
      setAccessToken(accessToken);
      onSignedIn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || waitingForGoogle;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-gate-title"
        className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-neutral-200/90 bg-white p-7 shadow-2xl animate-in zoom-in-95 sm:p-9"
      >
        <button
          type="button"
          onClick={onClose}
          title="Close"
          aria-label="Close"
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-white/80 backdrop-blur text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <h2 id="account-gate-title" className="text-xl font-bold tracking-tight text-neutral-950">
            {mode === "signup" ? "Create your free account to continue" : "Log in to continue"}
          </h2>
        </div>

        <button type="button" onClick={continueWithGoogle} disabled={disabled} className={BUTTON_SECONDARY}>
          {waitingForGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          {waitingForGoogle ? "Finish in the Google window…" : "Continue with Google"}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs font-medium text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          or
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            className={FIELD}
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              className={`${FIELD} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 hover:text-neutral-800 cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 font-medium text-center">{error}</p>}
          <button type="submit" disabled={disabled} className={`${BUTTON_PRIMARY} mt-1`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signup" ? "Create account and Continue" : "Log in and Continue"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-neutral-500">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError(null);
            }}
            className="font-semibold text-accent-strong hover:text-accent cursor-pointer"
          >
            {mode === "signup" ? "Log in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}
