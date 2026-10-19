"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getActivation, hasSession, updatePrompt, type Activation, type PromptKey } from "@/lib/api";
import { useHasMounted } from "./use-has-mounted";

export const ACTIVATION_QUERY_KEY = ["activation"] as const;

/**
 * The getting-started checklist and the one-time prompts (tour offer, CV
 * rating). Refetched whenever a page using it mounts, so a step done
 * elsewhere (a download in the editor) shows up on return.
 */
export function useActivation(enabled = true) {
  const hasMounted = useHasMounted();
  return useQuery({
    queryKey: ACTIVATION_QUERY_KEY,
    queryFn: getActivation,
    enabled: enabled && hasMounted && hasSession(),
    refetchOnMount: "always",
  });
}

/** Records a prompt being shown / dismissed / completed, updating the cache straight away. */
export function usePromptAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, action }: { key: PromptKey; action: "shown" | "dismissed" | "completed" }) => updatePrompt(key, action),
    onMutate: ({ key, action }) => {
      const now = new Date().toISOString();
      const field = action === "shown" ? "shownAt" : action === "dismissed" ? "dismissedAt" : "completedAt";
      queryClient.setQueryData<Activation>(ACTIVATION_QUERY_KEY, (old) => {
        if (!old) return old;
        const current = old.prompts[key] ?? { shownAt: null, dismissedAt: null, completedAt: null };
        return { ...old, prompts: { ...old.prompts, [key]: { ...current, [field]: current[field] ?? now } } };
      });
    },
  });
}
