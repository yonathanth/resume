"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Entitlement, ExemptionKey, FlowKey, GrantableFeature, UserDetail } from "@/lib/admin-api";
import { errorText } from "@/lib/admin-format";
import { useToast } from "@/components/Toaster";
import { Badge, type BadgeTone } from "@/components/admin/ui";

// Labels and helpers shared by the user list and the user detail tabs.

export const FLOWS: FlowKey[] = ["create", "tailor", "improve"];

export const FLOW_LABELS: Record<FlowKey, string> = {
  create: "Create",
  tailor: "Tailor",
  improve: "Improve",
};

export const FEATURE_LABELS: Record<GrantableFeature, string> = {
  careerProfiles: "Career profiles",
  polishSummary: "AI summary polish",
  cvImport: "CV upload import",
  beta: "Beta program",
};

export const EXEMPTION_LABELS: Record<ExemptionKey, string> = {
  aiRateLimit: "Skip AI rate limit",
  generationQuota: "Unlimited generations without Pro",
};

export const PLAN_LABELS = {
  pro: "Pro (any)",
  paid: "Paid",
  grant: "Complimentary only",
  free: "Free",
} as const;

export function featureLabel(key: string | null): string {
  if (!key) return "—";
  return (FEATURE_LABELS as Record<string, string>)[key] ?? (EXEMPTION_LABELS as Record<string, string>)[key] ?? key;
}

/** Human description of a grant (the detail endpoint doesn't send `label`). */
export function describeGrant(e: Pick<Entitlement, "kind" | "feature" | "flow" | "amount">): string {
  switch (e.kind) {
    case "PRO_ACCESS":
      return "Pro access";
    case "FEATURE":
      return featureLabel(e.feature);
    case "LIMIT_ADJUSTMENT": {
      const amount = e.amount ?? 0;
      const flow = e.flow ? FLOW_LABELS[e.flow] ?? e.flow : "?";
      return `${amount > 0 ? "+" : ""}${amount} free ${flow.toLowerCase()} uses`;
    }
    case "EXEMPTION":
      return `Exemption: ${featureLabel(e.feature)}`;
    default:
      return e.kind;
  }
}

export const KIND_LABELS: Record<Entitlement["kind"], string> = {
  PRO_ACCESS: "Pro access",
  FEATURE: "Single feature",
  LIMIT_ADJUSTMENT: "Free-use limit",
  EXEMPTION: "Exemption",
};

export type GrantState = "active" | "expired" | "revoked" | "scheduled";

/** Same rule as the backend's isGrantActive, with its `active` flag taking precedence. */
export function grantState(e: Entitlement): GrantState {
  if (e.revokedAt) return "revoked";
  if (e.active) return "active";
  const now = Date.now();
  if (new Date(e.startsAt).getTime() > now) return "scheduled";
  if (e.expiresAt && new Date(e.expiresAt).getTime() <= now) return "expired";
  return "active";
}

const GRANT_STATE_TONES: Record<GrantState, BadgeTone> = { active: "good", expired: "neutral", revoked: "bad", scheduled: "info" };

export function GrantStateBadge({ state }: { state: GrantState }) {
  return <Badge tone={GRANT_STATE_TONES[state]}>{state}</Badge>;
}

export function ProBadge({ isPro, proSource }: { isPro: boolean; proSource: "subscription" | "grant" | null }) {
  if (!isPro) return <Badge>Free</Badge>;
  return (
    <Badge tone="accent" title={proSource === "grant" ? "Pro from a manual grant (not a payment)" : "Pro from a paid subscription"}>
      Pro · {proSource === "grant" ? "complimentary" : "paid"}
    </Badge>
  );
}

export function displayName(account: Pick<UserDetail["account"], "fullName" | "firstName" | "lastName" | "email">): string {
  const parts = [account.firstName, account.lastName].filter(Boolean).join(" ");
  return account.fullName || parts || account.email;
}

/** Refreshes this user's detail and every users list after a change. */
export function useInvalidateUser(userId: string) {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "entitlements"] }),
      ]),
    [queryClient, userId]
  );
}

/**
 * Runs an admin action: toasts success or the backend's error message,
 * refreshes the user's queries, and rethrows on failure so an
 * <ActionDialog> stays open with the error.
 */
export function useUserAction(userId: string) {
  const toast = useToast();
  const invalidate = useInvalidateUser(userId);
  return useCallback(
    async <T,>(fn: () => Promise<T>, opts: { success?: string | ((result: T) => void); error: string }): Promise<T> => {
      try {
        const result = await fn();
        if (typeof opts.success === "function") opts.success(result);
        else if (opts.success) toast.success(opts.success);
        await invalidate();
        return result;
      } catch (err) {
        toast.error(opts.error, { description: errorText(err) });
        throw err;
      }
    },
    [toast, invalidate]
  );
}
