"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Loader2, UserCheck } from "lucide-react";
import type { ApiCareerProfile } from "@/lib/api";
import { SOFT_TONES } from "./OptionCard";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "3 roles · 12 skills" — what a profile has to build from. */
function profileFacts(profile: ApiCareerProfile): string {
  const { counts } = profile;
  return [
    counts.experience && plural(counts.experience, "role"),
    counts.skills && plural(counts.skills, "skill"),
    counts.education && `${counts.education} education`,
    counts.projects && plural(counts.projects, "project"),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** A profile needs at least some experience or skills to write a CV from. */
export function isProfileUsable(profile: ApiCareerProfile): boolean {
  return Boolean(profile.counts.experience || profile.counts.skills);
}

/**
 * The user's career profiles as a simple list — the profile counterpart of
 * ResumePicker. Clicking one picks it straight away. Empty profiles are shown
 * but can't be picked, so nobody finds out after choosing a template.
 */
export function ProfilePicker({
  profiles,
  onPick,
  onManageProfiles,
  loadingId,
  disabled = false,
}: {
  profiles: ApiCareerProfile[];
  onPick: (profile: ApiCareerProfile) => void;
  /** Leaving the flow for the Career Profiles page (e.g. to close the modal first). */
  onManageProfiles?: () => void;
  loadingId?: string | null;
  disabled?: boolean;
}) {
  if (profiles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-neutral-900">No career profiles yet</p>
        <p className="mt-1 text-sm text-neutral-500">Create one for a role you&apos;re going for, then come back here.</p>
        <Link
          href="/dashboard/career-profiles"
          onClick={onManageProfiles}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-strong hover:text-accent"
        >
          Go to Career Profiles
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-h-[360px] space-y-2 overflow-y-auto p-1">
      {profiles.map((profile) => {
        const usable = isProfileUsable(profile);
        const facts = profileFacts(profile);
        return (
          <button
            key={profile.id}
            type="button"
            disabled={disabled || !usable}
            onClick={() => onPick(profile)}
            className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 text-left transition-colors hover:border-accent-border disabled:cursor-not-allowed disabled:hover:border-neutral-200"
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${SOFT_TONES.lavender} ${usable ? "" : "opacity-50"}`}>
              <UserCheck className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm font-semibold ${usable ? "text-neutral-900" : "text-neutral-400"}`}>{profile.title}</span>
              <span className="block truncate text-xs text-neutral-500">
                {usable ? facts : "Empty — add your experience on the Career Profiles page first"}
              </span>
            </span>
            {loadingId === profile.id ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" />
            ) : (
              usable && <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}
