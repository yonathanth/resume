"use client";

import { isPaidPlan } from "@/lib/api";
import React from "react";
import { Moxie, type MoxieProps } from "@/components/moxie";
import { useSubscriptionStatus } from "@/hooks/use-subscription";

/** Moxie inside the dashboard: wears her crown for Pro accounts, like everywhere else she appears there. */
export function DashboardMoxie(props: Omit<MoxieProps, "crowned">) {
  const crowned = isPaidPlan(useSubscriptionStatus().data);
  return <Moxie decorative {...props} crowned={crowned} />;
}
