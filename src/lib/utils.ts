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
