"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileText, Eye, EyeOff } from "lucide-react";
import { useRegister, useLogin, useGoogleAuth } from "@/hooks/use-auth";
import { useGoogleIdentity } from "@/hooks/use-google-identity";
import { ApiError } from "@/lib/api";

interface AuthLayoutProps {
  mode: "signup" | "login";
}

interface ResumeCardProps {
  name: string;
  role: string;
  location: string;
  initials: string;
  badge: string;
  badgeColor: string;
  accentBg: string;
  skills: string[];
  experienceCompany: string;
  experienceRole: string;
  impactMetric: string;
  education: string;
}

const templatesData: ResumeCardProps[] = [
  {
    name: "Kidus Haile",
    role: "Senior Cloud Architect",
    location: "Seattle, WA",
    initials: "KH",
    badge: "99% ATS",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    accentBg: "bg-neutral-950",
    skills: ["AWS", "K8s", "Go", "Terraform"],
    experienceCompany: "Apex Cloud",
    experienceRole: "Staff Cloud Engineer",
    impactMetric: "Reduced p99 latency by 58% across 12M daily requests",
    education: "B.S. Computer Engineering, Univ. of Washington",
  },
  {
    name: "Selamawit Bekele",
    role: "Staff Product Designer",
    location: "San Francisco, CA",
    initials: "SB",
    badge: "Design Lead",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    accentBg: "bg-indigo-600",
    skills: ["Figma", "Design Systems", "User Research", "Prototyping"],
    experienceCompany: "Linear & Stripe",
    experienceRole: "Lead UX Architect",
    impactMetric: "Spearheaded design system adopted by 40+ product squads",
    education: "M.Des HCI, Stanford",
  },
  {
    name: "Abebe Tessema",
    role: "Quantitative Analyst",
    location: "New York, NY",
    initials: "AT",
    badge: "Wall St Pass",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    accentBg: "bg-emerald-700",
    skills: ["Python", "C++", "Fixed Income", "Risk Models"],
    experienceCompany: "Goldman Sachs",
    experienceRole: "Quant Researcher",
    impactMetric: "Architected pricing engine with +14.2% Sharpe ratio",
    education: "M.S. Financial Math, Columbia",
  },
  {
    name: "Yohannes Assefa",
    role: "VP of Engineering",
    location: "Austin, TX",
    initials: "YA",
    badge: "Executive Ivy",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    accentBg: "bg-stone-800",
    skills: ["Org Scaling", "Budgeting", "Enterprise SaaS", "Roadmaps"],
    experienceCompany: "Vanguard Tech",
    experienceRole: "Head of Infra",
    impactMetric: "Scaled engineering from 28 to 140+ engineers",
    education: "M.S. Software Mgmt, CMU",
  },
  {
    name: "Bethelhem Desta",
    role: "Lead AI Scientist",
    location: "Boston, MA",
    initials: "BD",
    badge: "100% Pass",
    badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
    accentBg: "bg-teal-700",
    skills: ["PyTorch", "Transformers", "LLMs", "Training"],
    experienceCompany: "Open Foundation AI",
    experienceRole: "Senior Researcher",
    impactMetric: "Authored 4 NeurIPS papers; cut inference costs 45%",
    education: "Ph.D. Computer Science, MIT",
  },
  {
    name: "Marcus Vance",
    role: "Head of Growth",
    location: "San Francisco, CA",
    initials: "MV",
    badge: "FAANG Ready",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    accentBg: "bg-rose-600",
    skills: ["GTM Strategy", "SQL", "CAC/LTV", "Product Growth"],
    experienceCompany: "Scale AI",
    experienceRole: "Growth Lead",
    impactMetric: "Drove 3.8x ARR expansion from $4M to $15.2M",
    education: "B.A. Economics, UC Berkeley",
  },
  {
    name: "Sophia Chen",
    role: "Platform Lead",
    location: "New York, NY",
    initials: "SC",
    badge: "Modern Sans",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    accentBg: "bg-purple-600",
    skills: ["React", "TypeScript", "Next.js", "PostgreSQL"],
    experienceCompany: "Vercel Partner",
    experienceRole: "Platform Architect",
    impactMetric: "Engineered edge mutations for 600K requests/min",
    education: "B.S. CS, Cornell",
  },
  {
    name: "Elena Rostova",
    role: "Brand Director",
    location: "London, UK",
    initials: "ER",
    badge: "Recruiter Vetted",
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    accentBg: "bg-sky-600",
    skills: ["Brand Architecture", "Creative Direction", "Global Campaigns"],
    experienceCompany: "Monzo & Spotify",
    experienceRole: "Brand Strategy Lead",
    impactMetric: "Directed international rebranding yielding +82% awareness",
    education: "B.A. Graphic Design, CSM",
  },
];

function ResumeTemplateCard({ card }: { card: ResumeCardProps }) {
  return (
    <div className="w-[220px] sm:w-[240px] rounded-xl bg-white border border-neutral-200/90 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] p-3 flex flex-col justify-between select-none transition-all hover:shadow-md">
      <div>
        {/* Header with Monogram & Badge */}
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-5 h-5 rounded-md ${card.accentBg} text-white flex items-center justify-center text-[8px] font-bold shrink-0`}
            >
              {card.initials}
            </div>
            <div className="min-w-0">
              <div className="text-[10.5px] font-bold text-neutral-950 truncate leading-tight">
                {card.name}
              </div>
              <div className="text-[8px] text-neutral-500 truncate">
                {card.role}
              </div>
            </div>
          </div>
          <span
            className={`px-1.5 py-0.5 rounded text-[7.5px] font-semibold border ${card.badgeColor} shrink-0 leading-none`}
          >
            {card.badge}
          </span>
        </div>

        {/* Contact Micro-line */}
        <div className="text-[7px] text-neutral-400 mb-2 pb-1.5 border-b border-neutral-100 flex items-center gap-1.5">
          <span>{card.location}</span>
          <span>•</span>
          <span>linkedin.com/in/{card.initials.toLowerCase()}</span>
        </div>

        {/* Experience Section */}
        <div className="mb-2">
          <div className="text-[7.5px] font-bold tracking-wider text-neutral-400 uppercase mb-0.5">
            Experience
          </div>
          <div className="text-[8.5px] font-semibold text-neutral-900 leading-tight">
            {card.experienceRole} •{" "}
            <span className="text-neutral-500 font-normal">
              {card.experienceCompany}
            </span>
          </div>
          <p className="text-[7.5px] text-neutral-600 leading-tight mt-0.5 line-clamp-2">
            • {card.impactMetric}
          </p>
        </div>

        {/* Education Section */}
        <div className="mb-1.5">
          <div className="text-[7.5px] font-bold tracking-wider text-neutral-400 uppercase">
            Education
          </div>
          <div className="text-[7.5px] text-neutral-700 truncate">
            {card.education}
          </div>
        </div>
      </div>

      {/* Skills Pills */}
      <div className="pt-1.5 border-t border-neutral-100 flex flex-wrap gap-1">
        {card.skills.slice(0, 3).map((skill, idx) => (
          <span
            key={idx}
            className="px-1 py-0.5 rounded bg-neutral-100 text-[7px] font-medium text-neutral-700 leading-none"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AuthLayout({ mode }: AuthLayoutProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  const registerMutation = useRegister();
  const loginMutation = useLogin();
  const googleAuthMutation = useGoogleAuth();
  const { promptGoogleSignIn } = useGoogleIdentity();

  const isPending =
    registerMutation.isPending || loginMutation.isPending || googleAuthMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (isSignup) {
        await registerMutation.mutateAsync({ email, password });
      } else {
        await loginMutation.mutateAsync({ email, password });
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  const handleGoogleClick = () => {
    setFormError(null);
    try {
      promptGoogleSignIn((credential) => {
        googleAuthMutation.mutate(credential, {
          onError: (err) => {
            setFormError(err instanceof ApiError ? err.message : "Google sign-in failed");
          },
        });
      });
    } catch {
      setFormError("Google sign-in is not configured");
    }
  };

  // 8 items per column to guarantee seamless, infinite marquee without gaps
  const col1 = [...templatesData.slice(0, 4), ...templatesData.slice(0, 4)];
  const col2 = [...templatesData.slice(4, 8), ...templatesData.slice(4, 8)];
  const col3 = [
    templatesData[2],
    templatesData[0],
    templatesData[6],
    templatesData[4],
    templatesData[2],
    templatesData[0],
    templatesData[6],
    templatesData[4],
  ];

  return (
    <div className="fixed inset-0 w-screen h-screen max-h-screen bg-white text-neutral-900 flex font-sans overflow-hidden select-none">
      {/* LEFT COLUMN: Clean White Auth Form strictly locked to single viewport screen */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-between px-6 sm:px-10 lg:px-12 xl:px-16 py-4 sm:py-5 relative z-20 bg-white overflow-hidden">
        {/* Top Logo */}
        <div className="flex justify-center sm:justify-start shrink-0">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-neutral-950 font-bold tracking-tight group"
          >
            <div className="w-7 h-7 rounded-lg bg-neutral-950 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
              <FileText className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <span className="text-[15px] font-bold tracking-tight">Resumate</span>
          </Link>
        </div>

        {/* Center Form Container - Ultra Compact to guarantee zero overflow */}
        <div className="w-full max-w-[360px] mx-auto my-auto flex flex-col justify-center">
          {/* Header */}
          <div className="text-center sm:text-left mb-4">
            <h1 className="text-2xl sm:text-[25px] font-bold tracking-tight text-neutral-950 leading-tight">
              {isSignup ? "Create your free account" : "Welcome back"}
            </h1>
            <p className="mt-1 text-xs text-neutral-500 font-normal leading-relaxed">
              {isSignup
                ? "Create your free account to tailor resumes and land interviews. No credit card required."
                : "Log in to your account to continue building and tailoring resumes."}
            </p>
          </div>

          {/* Social Auth: Google Button */}
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isPending}
            className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 active:scale-[0.99] font-medium text-xs sm:text-[13px] text-neutral-800 flex items-center justify-center gap-2.5 shadow-2xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <span>Continue with Google</span>
          </button>

          {/* Thin Divider with "or" */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-2 bg-white text-neutral-400 font-medium uppercase tracking-wider">
                or
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 text-xs sm:text-[13px] text-neutral-900 placeholder:text-neutral-400 transition-all"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  isSignup ? "Create a secure password" : "Enter password"
                }
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 text-xs sm:text-[13px] text-neutral-900 placeholder:text-neutral-400 transition-all pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors focus:outline-none cursor-pointer p-0.5"
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Remember Me & Forgot Password on Login */}
            {!isSignup && (
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <label className="flex items-center gap-1.5 text-neutral-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950 cursor-pointer w-3.5 h-3.5"
                  />
                  <span>Remember me</span>
                </label>
                <Link
                  href="#forgot"
                  className="text-neutral-500 hover:text-neutral-900 transition-colors font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {/* Form Error */}
            {formError && (
              <p className="text-[11px] text-red-600 font-medium pt-0.5">{formError}</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-xl bg-neutral-950 text-white font-semibold text-xs sm:text-[13px] hover:bg-neutral-800 active:scale-[0.99] transition-all shadow-xs cursor-pointer mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? "Please wait..." : "Continue"}
            </button>
          </form>

          {/* Legal Terms Disclaimer */}
          <p className="mt-2.5 text-[10px] text-neutral-400 text-center sm:text-left leading-normal">
            By continuing, you agree to Resumate&apos;s{" "}
            <Link href="/#terms" className="underline hover:text-neutral-700">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/#privacy" className="underline hover:text-neutral-700">
              Privacy Policy
            </Link>
            .
          </p>

          {/* Switch Mode: Sign in <-> Sign up */}
          <div className="mt-3 text-center text-xs text-neutral-600">
            {isSignup ? (
              <span>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-neutral-950 hover:underline"
                >
                  Log in
                </Link>
              </span>
            ) : (
              <span>
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-neutral-950 hover:underline"
                >
                  Sign up
                </Link>
              </span>
            )}
          </div>
        </div>

        {/* Bottom Social Proof */}
        <div className="pt-2.5 border-t border-neutral-100 text-center sm:text-left shrink-0">
          <div className="text-[9.5px] font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">
            Trusted by candidates &amp; hiring leaders at
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-5 text-neutral-400 opacity-80">
            <span className="text-[11px] font-semibold tracking-tight">Google</span>
            <span className="text-[11px] font-semibold tracking-tight">Stripe</span>
            <span className="text-[11px] font-semibold tracking-tight">Airbnb</span>
            <span className="text-[11px] font-semibold tracking-tight">McKinsey</span>
            <span className="text-[11px] font-semibold tracking-tight">Meta</span>
            <span className="text-[11px] font-semibold tracking-tight">Spotify</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Absolutely Locked Moving Templates Showcase (Cannot overflow viewport) */}
      <div className="hidden lg:block lg:w-1/2 h-full relative overflow-hidden bg-[#f4f4f6] border-l border-neutral-200/90">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-60 z-10" />

        {/* Absolutely Centered Tilted Canvas (-12 degrees) filling entire right panel */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <div className="flex gap-4 -rotate-12 scale-[1.04] w-[130%] justify-center items-center">
            {/* Column 1: Upward Continuous Loop */}
            <div className="flex flex-col gap-3.5 animate-marquee-up shrink-0">
              {col1.map((card, idx) => (
                <ResumeTemplateCard key={`col1-${idx}`} card={card} />
              ))}
            </div>

            {/* Column 2: Downward Continuous Loop */}
            <div className="flex flex-col gap-3.5 animate-marquee-down shrink-0 -mt-16">
              {col2.map((card, idx) => (
                <ResumeTemplateCard key={`col2-${idx}`} card={card} />
              ))}
            </div>

            {/* Column 3: Upward Slow Continuous Loop */}
            <div className="flex flex-col gap-3.5 animate-marquee-up-slow shrink-0">
              {col3.map((card, idx) => (
                <ResumeTemplateCard key={`col3-${idx}`} card={card} />
              ))}
            </div>
          </div>
        </div>

        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#f4f4f6]/70 via-transparent to-[#f4f4f6]/70 z-20" />
        <div className="absolute inset-y-0 left-0 w-8 pointer-events-none bg-gradient-to-r from-neutral-300/30 to-transparent z-20" />
      </div>
    </div>
  );
}
