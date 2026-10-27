"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookmarkPlus, ChevronDown, User } from "lucide-react";
import {
  ApiError,
  ProfileChangeDetail,
  ProfileChangeSummary,
  suggestProfileForCv,
  syncCvIntoProfile,
} from "@/lib/api";
import { useInvalidateProfiles } from "@/hooks/use-profiles";
import { useBackgroundProfileSync } from "@/hooks/use-background-profile-sync";
import { useUpdateProfile as useUpdateAccount } from "@/hooks/use-auth";
import { ProfessionInput } from "@/components/dashboard/ProfessionInput";
import { MoxieMoment } from "@/components/moxie";
import { describeChangeCounts, isEmptyChange, sectionLabel } from "@/components/dashboard/career-profiles/profile-sections";
import { ProfileChangeList } from "@/components/dashboard/career-profiles/ProfileChangeList";
import { CenteredSpinner } from "@/components/CenteredSpinner";

// The last step of making a CV: offer to keep the matching career profile up
// to date (or start one). Shown after the CV is ready, so it never stands
// between the user and their CV. Behaviour follows the account's
// profileAutoSync setting: "ask" shows the card, "never" skips updates, and
// "always" never reaches this step — the flows sync in the background instead
// (see useBackgroundProfileSync). If the setting only turns out to be
// "always" here, it hands over to the background sync and moves on.

interface ProfileSyncStepProps {
  cvDocumentId: string;
  /** The CV's role, used as the default name for a new profile. */
  roleTitle: string;
  /** Set when the CV was written from a profile: only new facts go back, never its wording. */
  sourceProfile: { id: string; title: string } | null;
  /** Whether the user typed anything new in this flow (extra details, answers). */
  hasNewDetails: boolean;
  /** The CV was tailored to a job — only its facts can be saved. */
  tailored: boolean;
  /** Extra content shown above the actions (e.g. job gaps). */
  children?: React.ReactNode;
  /** Opens the editor. */
  onFinish: () => void;
  /** Returns true when the error was a Pro paywall (and handled). */
  onProRequired: (err: unknown) => boolean;
}

const BUTTON_PRIMARY =
  "w-full py-3.5 rounded-lg bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed";
const BUTTON_SECONDARY =
  "w-full py-2.5 rounded-xl border border-neutral-200 text-neutral-600 font-semibold text-sm hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

/** "See what changes": the item-by-item list, or per-section counts from a server that doesn't send items. */
function ChangeDetails({ summary, details }: { summary: ProfileChangeSummary; details: ProfileChangeDetail[] | null | undefined }) {
  if (details && details.length > 0) return <ProfileChangeList details={details} />;
  return <SummaryDetails summary={summary} />;
}

/** Collapsed by default, so the card stays short; one tap shows every item. */
function DetailsToggle({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 mb-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold text-neutral-700 cursor-pointer"
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && children}
    </div>
  );
}

function SummaryDetails({ summary }: { summary: ProfileChangeSummary }) {
  const rows = new Map<string, string[]>();
  for (const [key, n] of Object.entries(summary.added)) if (n) rows.set(key, [...(rows.get(key) ?? []), `${n} new`]);
  for (const [key, n] of Object.entries(summary.updated)) if (n) rows.set(key, [...(rows.get(key) ?? []), `${n} with new details`]);
  return (
    <ul className="mt-3 space-y-1 text-xs text-neutral-600">
      {[...rows].map(([key, parts]) => (
        <li key={key} className="flex justify-between gap-3">
          <span className="capitalize">{sectionLabel(key)}</span>
          <span className="text-neutral-500">{parts.join(", ")}</span>
        </li>
      ))}
      <li className="pt-2 text-neutral-500">Nothing in the profile is replaced or removed, and anything you edited by hand is left alone.</li>
    </ul>
  );
}

export function ProfileSyncStep({
  cvDocumentId,
  roleTitle,
  sourceProfile,
  hasNewDetails,
  tailored,
  children,
  onFinish,
  onProRequired,
}: ProfileSyncStepProps) {
  const factsOnly = Boolean(sourceProfile) || tailored;
  const invalidateProfiles = useInvalidateProfiles();
  const updateAccount = useUpdateAccount();

  const background = useBackgroundProfileSync();

  // What the CV would add to its profile, or to a new one.
  const suggestion = useQuery({
    queryKey: ["profile-suggestion", cvDocumentId, factsOnly, sourceProfile?.id ?? null],
    queryFn: () => suggestProfileForCv({ cvDocumentId, factsOnly, profileId: sourceProfile?.id }),
    // A CV from a profile with nothing new to add has nothing to ask about.
    enabled: !(sourceProfile && !hasNewDetails),
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const [newTitle, setNewTitle] = useState(roleTitle);
  const [alwaysUpdate, setAlwaysUpdate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ id: string; title: string } | null>(null);
  // The profile it was just saved to — Moxie files it away, then on to the editor.
  const [savedTo, setSavedTo] = useState<string | null>(null);

  const data = suggestion.data;
  const automatic = data?.autoSync === "always";

  // Updates are automatic: no step — sync in the background and open the editor.
  const handedOver = useRef(false);
  useEffect(() => {
    if (!automatic || handedOver.current) return;
    handedOver.current = true;
    background.syncCv({ cvDocumentId, factsOnly, sourceProfileId: sourceProfile?.id, roleTitle });
    onFinish();
  }, [automatic, background, cvDocumentId, factsOnly, sourceProfile?.id, roleTitle, onFinish]);
  // A CV written from a profile goes back to that profile, whatever its role matched.
  const target = sourceProfile
    ? {
        profileId: sourceProfile.id,
        title: sourceProfile.title,
        preview: data?.target?.preview ?? (data?.match?.profileId === sourceProfile.id ? data.match.preview : null),
        details: data?.target?.details ?? (data?.match?.profileId === sourceProfile.id ? data.match.details : undefined),
      }
    : data?.match
      ? { profileId: data.match.profileId, title: data.match.title, preview: data.match.preview, details: data.match.details }
      : null;

  // Saves to a profile, then opens the editor.
  const apply = async (input: { profileId?: string; title?: string }) => {
    setBusy(true);
    setError(null);
    setConflict(null);
    try {
      const result = await syncCvIntoProfile({ cvDocumentId, factsOnly, ...input });
      invalidateProfiles(result.profile.id);
      if (alwaysUpdate) updateAccount.mutate({ profileAutoSync: "always" });
      setSavedTo(result.profile.title);
    } catch (err) {
      if (onProRequired(err)) return;
      if (err instanceof ApiError && err.code === "PROFILE_ROLE_EXISTS" && typeof err.details.existingProfileId === "string") {
        setConflict({ id: err.details.existingProfileId, title: String(err.details.existingProfileTitle ?? "that role") });
        return;
      }
      setError(err instanceof ApiError ? err.message : "Could not update your profile. Your CV is saved either way.");
    } finally {
      setBusy(false);
    }
  };

  const header = (title: string, body?: React.ReactNode) => (
    <div className="text-center mb-5">
      <span className="w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-b from-violet-500 to-violet-600 border border-violet-600 text-white">
        <User className="w-5 h-5" />
      </span>
      <h2 className="text-xl font-bold tracking-tight text-neutral-950">{title}</h2>
      {body && <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">{body}</p>}
    </div>
  );

  const footer = (
    <>
      {error && <p className="text-xs text-red-600 font-medium text-center mb-2">{error}</p>}
      {conflict && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-3 text-sm text-amber-900">
          <p className="font-semibold">You already have a &ldquo;{conflict.title}&rdquo; profile.</p>
          <button type="button" disabled={busy} onClick={() => apply({ profileId: conflict.id })} className={`${BUTTON_PRIMARY} mt-3 py-2.5`}>
            Add to {conflict.title} instead
          </button>
        </div>
      )}
    </>
  );

  // ---- just saved: Moxie files it away (profiles are Pro, so she wears her crown), then on to the editor
  if (savedTo !== null) {
    return <MoxieMoment animation="saved" message={`Saved to your ${savedTo} profile`} crowned durationMs={2400} onDone={onFinish} />;
  }

  // ---- a CV written from a profile, with nothing new to give back
  if (sourceProfile && !hasNewDetails) {
    return (
      <div>
        {header("Your CV is ready")}
        {children}
        <button type="button" onClick={onFinish} className={BUTTON_PRIMARY}>
          Continue
        </button>
      </div>
    );
  }

  // ---- loading (or handing over to the background sync)
  if (suggestion.isLoading || automatic) return <CenteredSpinner caption="Checking your career profiles…" className="py-16" />;

  // ---- suggestion failed: never block the CV over it
  if (suggestion.isError && !sourceProfile) {
    if (onProRequired(suggestion.error)) return null;
    return (
      <div>
        {header("Your CV is ready")}
        {children}
        <p className="text-xs text-neutral-500 text-center mb-3">We couldn&apos;t check your career profiles right now.</p>
        <button type="button" onClick={onFinish} className={BUTTON_PRIMARY}>
          Continue
        </button>
      </div>
    );
  }

  // ---- updates switched off in settings
  if (data?.autoSync === "never" && !sourceProfile && data.match) {
    return (
      <div>
        {header("Your CV is ready")}
        {children}
        <p className="text-xs text-neutral-500 text-center mb-3">
          Profile updates are off, so your {data.match.title} profile wasn&apos;t changed. You can turn them on in Account Settings.
        </p>
        <button type="button" onClick={onFinish} className={BUTTON_PRIMARY}>
          Continue
        </button>
      </div>
    );
  }

  // ---- update an existing profile
  if (target) {
    const counts = target.preview ? describeChangeCounts(target.preview) : "";
    // Nothing to add (or nothing we can show): don't ask to update the profile.
    const nothingNew = !counts;
    return (
      <div>
        {header(
          nothingNew ? "Your CV is ready" : `Update your ${target.title} profile?`,
          nothingNew
            ? `Your ${target.title} profile already has everything in this CV.`
            : counts
              ? sourceProfile
                ? `What's new in this CV goes back to it: ${counts}.`
                : `This CV adds ${counts}.`
              : undefined
        )}

        {target.preview && !nothingNew && (
          <DetailsToggle label="See exactly what changes">
            <ChangeDetails summary={target.preview} details={target.details} />
          </DetailsToggle>
        )}

        {children}
        {footer}

        <div className="space-y-2">
          {nothingNew ? (
            <button type="button" disabled={busy} onClick={() => apply({ profileId: target.profileId })} className={BUTTON_PRIMARY}>
              {busy ? "Opening..." : "Continue"}
            </button>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={() => apply({ profileId: target.profileId })} className={BUTTON_PRIMARY}>
                <BookmarkPlus className="w-4 h-4" />
                {busy ? "Saving..." : "Update profile and Continue"}
              </button>
              <button type="button" disabled={busy} onClick={onFinish} className={BUTTON_SECONDARY}>
                Not now
              </button>
              {!sourceProfile && (
                <label className="flex items-center justify-center gap-2 pt-1 text-xs text-neutral-500 cursor-pointer">
                  <input type="checkbox" checked={alwaysUpdate} onChange={(e) => setAlwaysUpdate(e.target.checked)} className="accent-neutral-900" />
                  Always update my profiles automatically
                </label>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- no matching profile: offer a new one (always asks)
  const related = data?.related ?? [];
  return (
    <div>
      {header("Save this as a career profile?", "Your next CV for this role can start from it.")}

      <div className="rounded-xl border-2 border-dashed border-neutral-300 p-4 bg-neutral-50/70 mb-4 space-y-2">
        <label className="block text-xs font-bold text-neutral-700">Role</label>
        <ProfessionInput value={newTitle} onChange={setNewTitle} placeholder="e.g. Backend Developer" />
      </div>

      {data && !isEmptyChange(data.newProfilePreview) && (
        <DetailsToggle label="See what it will include">
          <ChangeDetails summary={data.newProfilePreview} details={data.newProfileDetails} />
        </DetailsToggle>
      )}

      {children}
      {footer}

      <div className="space-y-2">
        <button type="button" disabled={busy || !newTitle.trim()} onClick={() => apply({ title: newTitle.trim() })} className={BUTTON_PRIMARY}>
          <BookmarkPlus className="w-4 h-4" />
          {busy ? "Saving..." : "Create profile and Continue"}
        </button>
        {related.length > 0 && (
          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500 mb-2">Or add it to a related profile instead:</p>
            <div className="flex flex-wrap gap-1.5">
              {related.map((r) => (
                <button
                  key={r.profileId}
                  type="button"
                  disabled={busy}
                  onClick={() => apply({ profileId: r.profileId })}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-800 hover:border-neutral-400 cursor-pointer disabled:opacity-60"
                >
                  {r.title}
                </button>
              ))}
            </div>
          </div>
        )}
        <button type="button" disabled={busy} onClick={onFinish} className={BUTTON_SECONDARY}>
          Not now
        </button>
      </div>
    </div>
  );
}
