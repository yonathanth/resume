"use client";

import { ApiError, applyCvWording, suggestProfileForCv, syncCvIntoProfile, type WordingPreview } from "@/lib/api";
import { useMe } from "@/hooks/use-auth";
import { useInvalidateProfiles } from "@/hooks/use-profiles";
import { useToast } from "@/components/Toaster";
import { isEmptyChange } from "@/components/dashboard/career-profiles/profile-sections";

// With profile updates set to automatic (Account Settings → profileAutoSync
// "always"), a finished CV goes into the matching career profile — or a new
// one — without a step in the flow. It runs after the editor opens, and a
// short toast says what changed. Nothing is shown when nothing changed.

export function useBackgroundProfileSync() {
  const { data: me } = useMe();
  const invalidateProfiles = useInvalidateProfiles();
  const toast = useToast();

  const announce = (created: boolean, profile: { id: string; title: string }) =>
    toast.success(created ? `New career profile: ${profile.title}` : `${profile.title} profile updated`, {
      id: `profile-sync-${profile.id}`,
      description: "See it in Career Profiles.",
      placement: "top",
    });

  const failed = () =>
    toast.error("Couldn't update your career profile", {
      id: "profile-sync-failed",
      description: "Your CV is saved. You can update the profile from its page.",
      duration: 6000,
    });

  /** A new CV's facts → its profile (the source profile, the matching one, or a new one). */
  const syncCv = (input: { cvDocumentId: string; factsOnly: boolean; sourceProfileId?: string | null; roleTitle: string }) => {
    void (async () => {
      try {
        const { cvDocumentId, factsOnly, sourceProfileId } = input;
        const found = await suggestProfileForCv({ cvDocumentId, factsOnly, profileId: sourceProfileId ?? undefined });
        // Into the profile it came from, or the one its role matched.
        const existing = sourceProfileId
          ? {
              id: sourceProfileId,
              preview: found.target?.preview ?? (found.match?.profileId === sourceProfileId ? found.match.preview : null),
            }
          : found.match
            ? { id: found.match.profileId, preview: found.match.preview }
            : null;
        if (existing) {
          if (!existing.preview || isEmptyChange(existing.preview)) return;
          const result = await syncCvIntoProfile({ cvDocumentId, factsOnly, profileId: existing.id });
          invalidateProfiles(result.profile.id);
          announce(false, result.profile);
          return;
        }
        // No profile for this role yet: start one.
        const title = input.roleTitle.trim();
        if (!title || isEmptyChange(found.newProfilePreview)) return;
        try {
          const result = await syncCvIntoProfile({ cvDocumentId, factsOnly, title });
          invalidateProfiles(result.profile.id);
          announce(result.created, result.profile);
        } catch (err) {
          // A profile for this role already exists under another name: add to it instead.
          if (err instanceof ApiError && err.code === "PROFILE_ROLE_EXISTS" && typeof err.details.existingProfileId === "string") {
            const result = await syncCvIntoProfile({ cvDocumentId, factsOnly, profileId: err.details.existingProfileId });
            invalidateProfiles(result.profile.id);
            announce(false, result.profile);
            return;
          }
          throw err;
        }
      } catch {
        failed();
      }
    })();
  };

  /** Enhance's improved wording → the profile, skipping entries the user edited by hand. */
  const applyWording = (cvDocumentId: string, preview: WordingPreview & { profile: NonNullable<WordingPreview["profile"]> }) => {
    const keys = preview.proposals.filter((p) => !p.locked).map((p) => p.key);
    if (keys.length === 0) return;
    void (async () => {
      try {
        await applyCvWording(preview.profile.id, { cvDocumentId, version: preview.profile.version, keys });
        invalidateProfiles(preview.profile.id);
        announce(false, preview.profile);
      } catch {
        failed();
      }
    })();
  };

  return {
    /** The account's setting; undefined while it loads. */
    autoSync: me?.profileAutoSync,
    syncCv,
    applyWording,
  };
}
