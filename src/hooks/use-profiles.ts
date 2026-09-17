"use client";

import { useQuery } from "@tanstack/react-query";
import { listProfiles, getProfileSkills, getProfileSummary } from "@/lib/api";
import { toCareerProfile } from "@/lib/cv-mapper";
import { CareerProfile } from "@/components/dashboard/create-flow/types";

// Real career profiles the user has created — standalone CV documents with
// no profile attached simply don't appear here.
export function useProfiles() {
  return useQuery({
    queryKey: ["career-profiles"],
    queryFn: async (): Promise<CareerProfile[]> => {
      const profiles = await listProfiles();
      return profiles.map(toCareerProfile);
    },
  });
}

// Deduped skills aggregated across every CV under the user's real career
// profiles — powers the "Master Skills Inventory" section.
export function useProfileSkills() {
  return useQuery({
    queryKey: ["profile-skills"],
    queryFn: async () => (await getProfileSkills()).skills,
  });
}

// AI-derived trajectory summary (domain, highlight, skills, target
// companies, readiness score) for one profile — only fetched while its
// preview modal is open.
export function useProfileSummary(profileId: string | null) {
  return useQuery({
    queryKey: ["profile-summary", profileId],
    queryFn: () => getProfileSummary(profileId as string),
    enabled: Boolean(profileId),
  });
}
