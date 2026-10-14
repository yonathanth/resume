"use client";

import React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { usePlatformStatus } from "@/hooks/use-notifications";

/** The admin-controlled maintenance/info banner (Platform Settings). */
export function PlatformBanner() {
  const { data } = usePlatformStatus();
  const banner = data?.banner;
  if (!banner) return null;
  const warning = banner.tone === "warning";
  const Icon = warning ? AlertTriangle : Info;
  return (
    <div
      role="status"
      className={`shrink-0 flex items-start gap-2 px-4 sm:px-8 py-2.5 text-sm border-b ${
        warning ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-accent-soft border-accent-border text-neutral-800"
      }`}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${warning ? "text-amber-600" : "text-accent-strong"}`} />
      <p className="leading-snug">{banner.message}</p>
    </div>
  );
}
