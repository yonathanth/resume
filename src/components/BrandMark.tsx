"use client";

import React from "react";
import { MoxieLogo } from "@/components/moxie/MoxieLogos";
import { useSubscriptionStatus } from "@/hooks/use-subscription";

/**
 * The brand mark: Moxie's still logo (Peepers — see MoxieLogos). She wears
 * the Pro crown for a signed-in Pro account; signed out, nothing is fetched
 * and she's plain. Decorative: the link around her carries the name.
 */
export function BrandMark({ size = 36, crowned, className = "" }: { size?: number; crowned?: boolean; className?: string }) {
  const isPro = useSubscriptionStatus().data?.isPro ?? false;
  return <MoxieLogo size={size} crowned={crowned ?? isPro} className={`shrink-0 ${className}`} />;
}
