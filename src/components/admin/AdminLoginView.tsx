"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { ApiError } from "@/lib/api";
import { adminLogin } from "@/lib/admin-api";

const INPUT =
  "w-full rounded-xl border border-white/[0.08] bg-[#1a1a1a] px-4 py-3 text-[15px] text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/20 transition-colors";

// The admin sign-in. Uses the admin login endpoint, which only accepts
// administrator accounts, is rate limited, and records every attempt.
export function AdminLoginView({ notice }: { notice: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(notice);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await adminLogin(email, password);
      router.replace("/admin");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code === "INVALID_CREDENTIALS"
            ? "Invalid email or password."
            : err.message
          : "Couldn't reach the server."
      );
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-[#0a0a0a] px-6 py-10 font-sans text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative w-full max-w-[380px]">
        <div className="mx-auto mb-6 flex h-11 w-11 items-center justify-center rounded-[13px] bg-white text-neutral-950">
          <Shield className="h-5 w-5" />
        </div>
        <h1 className="text-center text-[26px] font-bold tracking-tight">FitCV Admin</h1>
        <p className="mt-2 text-center text-[14px] text-neutral-400">Administrator accounts only. Sign-in attempts are logged.</p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" className={INPUT} />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={`${INPUT} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-neutral-200 cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="text-[13.5px] font-medium text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#333333] py-3.5 text-[15px] font-semibold transition-colors hover:bg-[#3b3b3b] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
