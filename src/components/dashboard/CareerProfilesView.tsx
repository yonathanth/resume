"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Crown, FilePlus, Loader2, Plus, UserCheck, X } from "lucide-react";
import { ApiCareerProfile, ApiError } from "@/lib/api";
import { useCreateProfile, useProfiles } from "@/hooks/use-profiles";
import { useSubscriptionStatus } from "@/hooks/use-subscription";
import { ICON_TONES, OptionTone } from "./create-flow/OptionCard";
import { DashboardMoxie } from "./DashboardMoxie";
import { ProfessionInput } from "./ProfessionInput";
import { ProUpgradeModal } from "./ProUpgradeModal";
import { ChipListEditor, LABEL_CLASS } from "./career-profiles/ProfileSectionEditor";
import { tempId } from "./career-profiles/profile-sections";

interface CareerProfilesViewProps {
  onCreateCvFromProfile?: (profileId: string) => void;
}

// Each profile gets a soft tile colour so the grid is easy to scan.
const PROFILE_TONES: OptionTone[] = ["accent", "sky", "violet", "emerald"];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function profileFacts(profile: ApiCareerProfile): string[] {
  const { counts } = profile;
  return [
    counts.experience ? plural(counts.experience, "role") : null,
    counts.skills ? plural(counts.skills, "skill") : null,
    counts.education ? `${counts.education} education` : null,
    counts.projects ? plural(counts.projects, "project") : null,
  ].filter((f): f is string => Boolean(f));
}

export function CareerProfilesView({ onCreateCvFromProfile }: CareerProfilesViewProps) {
  const router = useRouter();
  const { data: profiles = [], isLoading } = useProfiles();
  const isPro = useSubscriptionStatus().data?.isPro ?? false;
  const createProfile = useCreateProfile();

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [newSkills, setNewSkills] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [existing, setExisting] = useState<{ id: string; title: string } | null>(null);

  const openNew = () => {
    if (!isPro) {
      setPaywallOpen(true);
      return;
    }
    setNewRole("");
    setCopyFrom("");
    setNewSkills([]);
    setCreateError(null);
    setExisting(null);
    setIsNewOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.trim()) return;
    setCreateError(null);
    setExisting(null);
    try {
      const profile = await createProfile.mutateAsync({
        title: newRole.trim(),
        ...(copyFrom ? { copyFromProfileId: copyFrom } : {}),
        ...(newSkills.length && !copyFrom ? { content: { skills: newSkills.map((name) => ({ id: tempId(), name })) } } : {}),
      });
      setIsNewOpen(false);
      router.push(`/dashboard/career-profiles/${profile.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "PRO_REQUIRED") {
        setIsNewOpen(false);
        setPaywallOpen(true);
        return;
      }
      if (err instanceof ApiError && err.code === "PROFILE_ROLE_EXISTS" && typeof err.details.existingProfileId === "string") {
        setExisting({ id: err.details.existingProfileId, title: String(err.details.existingProfileTitle ?? "this role") });
        return;
      }
      setCreateError(err instanceof ApiError ? err.message : "Could not create this profile. Please try again.");
    }
  };

  return (
    <div className="px-8 pt-6 pb-10 sm:px-14 sm:pt-8 sm:pb-14 lg:px-20 lg:pt-8 lg:pb-16 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <h1 className="text-xl font-bold text-neutral-950 tracking-tight">Career profiles</h1>
          <p className="mt-1 text-sm text-neutral-500 leading-relaxed">
            One profile per role you go for. Each holds your experience, skills and education for that role, so every
            new CV starts from everything you&apos;ve already told us.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-950 text-white font-semibold text-sm hover:bg-neutral-800 transition-colors self-start sm:self-auto cursor-pointer"
        >
          {isPro ? <Plus className="w-4 h-4" /> : <Crown className="w-4 h-4 text-accent-light" />}
          New profile
        </button>
      </div>

      {!isPro && profiles.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">Your profiles are read-only on the free plan. Upgrade to edit them and build CVs from them.</p>
          <button type="button" onClick={() => setPaywallOpen(true)} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-950 text-white text-xs font-semibold cursor-pointer">
            <Crown className="w-3.5 h-3.5" /> Upgrade
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-24 text-neutral-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
          <DashboardMoxie animation="emptyFolder" size={120} className="mx-auto -mt-4 mb-2" />
          <h2 className="text-base font-bold text-neutral-950">No profiles yet</h2>
          <p className="mt-1 text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
            {isPro
              ? "Create one for a role you're targeting, or save the next CV you make to a profile."
              : "Career profiles are part of FitCV Pro. Keep everything for a role in one place and build tailored CVs from it."}
          </p>
          <button
            type="button"
            onClick={openNew}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-950 text-white font-semibold text-sm hover:bg-neutral-800 cursor-pointer"
          >
            {isPro ? <Plus className="w-4 h-4" /> : <Crown className="w-4 h-4 text-accent-light" />}
            {isPro ? "Create a profile" : "Upgrade to Pro"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {profiles.map((profile, idx) => {
            const tone = PROFILE_TONES[idx % PROFILE_TONES.length];
            const facts = profileFacts(profile);
            return (
              <div
                key={profile.id}
                className="group relative flex flex-col rounded-lg border border-neutral-300 bg-gradient-to-b from-white to-neutral-50 p-5 hover:border-accent-border transition-colors"
              >
                <Link
                  href={`/dashboard/career-profiles/${profile.id}`}
                  className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label={`Open ${profile.title}`}
                />
                <div className="flex items-start gap-3.5">
                  <span className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-b border ${ICON_TONES[tone]}`}>
                    <UserCheck className="w-[18px] h-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-neutral-950 tracking-tight truncate">{profile.title}</h3>
                    <p className="text-xs text-neutral-500 truncate">
                      {profile.headline && profile.headline !== profile.title ? profile.headline : profile.occupationCategory || "Career profile"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs text-neutral-600 min-h-[2.5rem]">
                  {facts.length ? facts.join(" · ") : "Empty so far. Open it to add your experience and skills."}
                </p>

                <div className="mt-5 pt-4 border-t border-neutral-200 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-neutral-500">
                    {plural(profile.documentCount, "CV")} · updated {new Date(profile.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => (isPro ? onCreateCvFromProfile?.(profile.id) : setPaywallOpen(true))}
                    className="relative z-10 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-strong hover:text-accent cursor-pointer"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    Create CV
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}

          {isPro && (
            <button
              type="button"
              onClick={openNew}
              className="group flex flex-col items-center justify-center gap-3 min-h-[200px] rounded-lg border border-dashed border-neutral-300 bg-white/60 text-center hover:border-accent-border hover:bg-white transition-colors cursor-pointer"
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-b border ${ICON_TONES.neutral} group-hover:text-accent transition-colors`}>
                <Plus className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-neutral-950">New profile</span>
                <span className="block mt-0.5 text-xs text-neutral-500">Another role you&apos;re going for</span>
              </span>
            </button>
          )}
        </div>
      )}

      {/* ================= NEW PROFILE MODAL ================= */}
      {isNewOpen && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsNewOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-profile-title"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setIsNewOpen(false)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <form onSubmit={handleCreate} className="flex flex-col min-h-0 flex-1">
              <div className="flex-1 min-h-0 overflow-y-auto p-7 sm:p-8">
                <div className="text-center mb-7">
                  <span className={`w-11 h-11 rounded-xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-b border ${ICON_TONES.accent}`}>
                    <Plus className="w-5 h-5" />
                  </span>
                  <h3 id="new-profile-title" className="text-xl font-bold tracking-tight text-neutral-950">
                    New career profile
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1">One profile per role. You&apos;ll fill in the details next.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={LABEL_CLASS}>
                      Role <span className="text-accent">*</span>
                    </label>
                    <ProfessionInput value={newRole} onChange={setNewRole} autoFocus placeholder="e.g. Backend Developer" />
                    <p className="mt-1.5 text-xs text-neutral-500">The role itself, not a company. Seniority (Senior, Lead…) is fine.</p>
                  </div>

                  {profiles.length > 0 && (
                    <div>
                      <label className={LABEL_CLASS}>Start from</label>
                      <select
                        value={copyFrom}
                        onChange={(e) => setCopyFrom(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10"
                      >
                        <option value="">An empty profile</option>
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            A copy of {p.title}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1.5 text-xs text-neutral-500">Handy for a related role: copy your history, then adjust it.</p>
                    </div>
                  )}

                  {!copyFrom && (
                    <div>
                      <label className={LABEL_CLASS}>Skills (optional)</label>
                      <ChipListEditor values={newSkills} onChange={setNewSkills} placeholder="e.g. Node.js, PostgreSQL" />
                    </div>
                  )}
                </div>

                {existing && (
                  <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    You already have a profile for this role: <span className="font-semibold">{existing.title}</span>.{" "}
                    <Link href={`/dashboard/career-profiles/${existing.id}`} className="font-semibold underline">
                      Open it
                    </Link>
                  </div>
                )}
                {createError && <p className="mt-4 text-xs text-red-600 font-medium text-center">{createError}</p>}
              </div>

              <div className="shrink-0 px-7 sm:px-8 py-4 border-t border-neutral-200 bg-neutral-50/80 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-semibold text-neutral-700 hover:border-neutral-400 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProfile.isPending || !newRole.trim()}
                  className="flex-[1.4] px-4 py-2.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createProfile.isPending ? "Creating..." : "Create profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProUpgradeModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} reason="Career profiles are part of FitCV Pro." />
    </div>
  );
}
