"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiCareerProfileDetail,
  ProfileContentDTO,
  createProfile,
  deleteProfile,
  getProfile,
  listProfiles,
  revertProfileChange,
  updateProfile,
} from "@/lib/api";

export const PROFILES_QUERY_KEY = ["career-profiles"] as const;
const profileKey = (id: string) => ["career-profile", id] as const;

// The user's career profiles (one per role). Readable on every plan, so a
// downgraded user still sees what they made; writes are Pro-only server-side.
export function useProfiles() {
  return useQuery({ queryKey: PROFILES_QUERY_KEY, queryFn: listProfiles });
}

export function useProfile(id: string | null) {
  return useQuery({
    queryKey: profileKey(id ?? ""),
    queryFn: () => getProfile(id as string),
    enabled: Boolean(id),
  });
}

/** Keeps the list and the one profile's cache in step after any write. */
function useSyncProfileCache() {
  const queryClient = useQueryClient();
  return (profile?: ApiCareerProfileDetail) => {
    if (profile) queryClient.setQueryData(profileKey(profile.id), profile);
    queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
  };
}

export function useCreateProfile() {
  const sync = useSyncProfileCache();
  return useMutation({
    mutationFn: createProfile,
    onSuccess: (profile) => sync(profile),
  });
}

export function useUpdateProfile(id: string) {
  const sync = useSyncProfileCache();
  return useMutation({
    mutationFn: (input: { version: number; title?: string; occupationId?: string | null; content?: ProfileContentDTO }) =>
      updateProfile(id, input),
    onSuccess: (profile) => sync(profile),
  });
}

export function useRevertProfileChange(id: string) {
  const sync = useSyncProfileCache();
  return useMutation({
    mutationFn: ({ changeId, version }: { changeId: string; version: number }) => revertProfileChange(id, changeId, version),
    onSuccess: (profile) => sync(profile),
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProfile,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: profileKey(id) });
      queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
    },
  });
}

/** Call after a CV was linked to / merged into a profile outside these hooks. */
export function useInvalidateProfiles() {
  const queryClient = useQueryClient();
  return (profileId?: string | null) => {
    queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
    if (profileId) queryClient.invalidateQueries({ queryKey: profileKey(profileId) });
  };
}
