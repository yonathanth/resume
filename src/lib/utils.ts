import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Short avatar label derived from the real signed-in user — falls back to
// the email's local part, then a generic placeholder. Never a hardcoded
// example name/initials.
export function getInitials(fullName?: string | null, email?: string | null): string {
  const name = fullName?.trim();
  if (name) {
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
    if (initials) return initials;
  }
  const emailLocal = email?.split("@")[0]?.trim();
  if (emailLocal) return emailLocal.slice(0, 2).toUpperCase();
  return "?";
}

export function getDisplayName(fullName?: string | null, email?: string | null): string {
  return fullName?.trim() || email?.trim() || "Account";
}

// Name a downloaded CV for the recruiter who receives it: "Jane-Doe-Resume.pdf"
// (first + last name; middle names dropped). Falls back to the CV's title,
// then plain "Resume". Keep in sync with cvFileName in resume-back's cv.routes.ts.
export function getCvFileName(fullName?: string | null, fallbackTitle?: string | null): string {
  const toSlug = (s: string) =>
    s
      .split(/\s+/)
      .map((part) => part.replace(/[^\p{L}\p{N}'-]/gu, ""))
      .filter(Boolean);

  const nameParts = toSlug(fullName ?? "");
  const base =
    nameParts.length > 1
      ? [nameParts[0], nameParts[nameParts.length - 1]]
      : nameParts.length === 1
        ? nameParts
        : toSlug(fallbackTitle ?? "");

  return [...base, "Resume"].join("-") + ".pdf";
}

// Avatar background for an account: looks random, but is stable for a given
// user (hashed from their id), so it never changes between visits. The
// palette deliberately leaves out pinks, purples and baby blues — colours
// commonly read as belonging to one group of people — and orange/amber, which
// would blur into the site's accent colour. Full class strings so Tailwind
// keeps them.
const AVATAR_COLORS = [
  "bg-emerald-600",
  "bg-teal-600",
  "bg-cyan-700",
  "bg-lime-700",
  "bg-green-700",
  "bg-stone-600",
  "bg-slate-600",
] as const;

export function getAvatarColor(seed?: string | null): string {
  if (!seed) return "bg-neutral-500";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
