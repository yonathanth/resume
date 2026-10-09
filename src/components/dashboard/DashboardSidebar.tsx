"use client";

import React, { useRef } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  UserCheck,
  FolderKanban,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  LayoutTemplate,
  ArrowRight,
  Settings,
  HelpCircle,
} from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/use-subscription";
import { useMe } from "@/hooks/use-auth";
import { getAvatarColor, getDisplayName, getInitials } from "@/lib/utils";
import { Moxie, type MoxieHandle } from "@/components/moxie";

export type DashboardTab =
  | "builder"
  | "career-profiles"
  | "past-projects"
  | "templates"
  | "settings"
  | "help"
  | "upgrade";

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

type NavItem = {
  id: DashboardTab;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Shows a "Pro" tag to free users. */
  proOnly?: boolean;
};

const TOP_NAV_ITEMS: NavItem[] = [
  { id: "builder", label: "The Builder", href: "/dashboard", icon: LayoutDashboard },
  { id: "career-profiles", label: "Career Profiles", href: "/dashboard/career-profiles", icon: UserCheck, proOnly: true },
  { id: "past-projects", label: "Past Projects", href: "/dashboard/past-projects", icon: FolderKanban },
  { id: "templates", label: "Templates", href: "/dashboard/templates", icon: LayoutTemplate },
];

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { id: "settings", label: "Account Settings", href: "/dashboard/settings", icon: Settings },
  { id: "help", label: "Help", href: "/dashboard/help", icon: HelpCircle },
];

// The glossy accent tile used for icons across the app (Builder cards, create flow).
const ACCENT_TILE =
  "bg-gradient-to-b from-accent-mid to-accent border border-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]";

function SidebarLink({
  item,
  isActive,
  isExpanded,
  showProTag = false,
}: {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  showProTag?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      data-tour={item.id}
      title={!isExpanded ? item.label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={`group w-full flex items-center gap-3 rounded-lg border text-sm transition-colors cursor-pointer ${
        isExpanded ? "p-1.5 pr-3" : "p-1.5 justify-center"
      } ${
        isActive
          ? "bg-white border-neutral-200 text-neutral-950 font-semibold"
          : "border-transparent text-neutral-600 font-medium hover:bg-white hover:border-neutral-200 hover:text-neutral-950"
      }`}
    >
      <span
        className={`w-8 h-8 rounded-md shrink-0 flex items-center justify-center transition-colors ${
          isActive ? ACCENT_TILE : "border border-transparent text-neutral-500 group-hover:text-neutral-800"
        }`}
      >
        <Icon className="w-[18px] h-[18px]" />
      </span>
      {isExpanded && <span className="truncate">{item.label}</span>}
      {isExpanded && showProTag && (
        <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-neutral-950 text-white">
          Pro
        </span>
      )}
    </Link>
  );
}

// Moxie is the sidebar's brand mark. The sidebar lives in the dashboard
// layout, so she greets once when the dashboard opens (not on every page
// change), then idles; clicking her gets another wave.
function SidebarMoxie({ crowned }: { crowned: boolean }) {
  const moxieRef = useRef<MoxieHandle>(null);
  return (
    <button
      type="button"
      onClick={() => moxieRef.current?.play("wave")}
      title="Moxie"
      aria-label="Moxie — click to say hi"
      className="shrink-0 rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
    >
      <Moxie ref={moxieRef} animation="welcome" decorative size={48} crowned={crowned} />
    </button>
  );
}

export function DashboardSidebar({ activeTab, isExpanded, onToggleExpanded }: DashboardSidebarProps) {
  const { data: subscription } = useSubscriptionStatus();
  const isPro = subscription?.isPro ?? false;
  const { data: me } = useMe();
  const displayName = getDisplayName(me?.fullName, me?.email);
  const initials = getInitials(me?.fullName, me?.email);
  // Avoid showing the email twice when there's no separate full name.
  const secondaryLine = me?.email && me.email !== displayName ? me.email : isPro ? "Pro plan" : "Free plan";

  return (
    <aside
      className={`h-full max-h-screen bg-neutral-50 border-r border-neutral-200 flex flex-col transition-all duration-300 z-30 shrink-0 select-none ${
        isExpanded ? "w-64" : "w-[72px]"
      }`}
    >
      {/* Brand + collapse */}
      <div className={`h-16 shrink-0 border-b border-neutral-200 flex items-center px-4 ${isExpanded ? "justify-between" : "justify-center"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <SidebarMoxie crowned={isPro} />
          {isExpanded && (
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-[15px] font-bold tracking-tight text-neutral-950 truncate">Resumate</span>
              {isPro && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-accent text-white border border-accent leading-none">
                  Pro
                </span>
              )}
            </span>
          )}
        </div>

        {isExpanded && (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="p-1.5 rounded-md border border-transparent text-neutral-400 hover:text-neutral-900 hover:bg-white hover:border-neutral-200 transition-colors cursor-pointer"
            title="Collapse sidebar"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {!isExpanded && (
        <div className="flex justify-center py-2 border-b border-neutral-200">
          <button
            type="button"
            onClick={onToggleExpanded}
            className="p-1.5 rounded-md border border-transparent text-neutral-400 hover:text-neutral-900 hover:bg-white hover:border-neutral-200 transition-colors cursor-pointer"
            title="Expand sidebar"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary navigation */}
      <nav className="p-3 flex-1 min-h-0 overflow-y-auto">
        {isExpanded && (
          <div className="px-2 pb-2 text-xs font-semibold text-neutral-400">Workspace</div>
        )}
        <div className="space-y-1">
          {TOP_NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              isExpanded={isExpanded}
              showProTag={Boolean(item.proOnly) && !isPro}
            />
          ))}
        </div>
      </nav>

      {/* Bottom: upgrade, settings/help, account */}
      <div className="shrink-0 p-3 space-y-3 border-t border-neutral-200">
        {/* Never shown to a real Pro user — subscriptionStatus is the source of truth. */}
        {!isPro &&
          (isExpanded ? (
            <Link
              href="/dashboard/upgrade"
              className="group block rounded-lg border border-accent-border bg-white p-3 hover:border-accent transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-7 h-7 rounded-md shrink-0 flex items-center justify-center ${ACCENT_TILE}`}>
                  <Crown className="w-3.5 h-3.5" />
                </span>
                <span className="text-sm font-semibold text-neutral-950">Upgrade to Pro</span>
              </div>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-strong">
                See plans
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ) : (
            <Link
              href="/dashboard/upgrade"
              title="Upgrade to Pro"
              className="flex justify-center p-1.5 rounded-lg border border-transparent hover:bg-white hover:border-neutral-200 transition-colors"
            >
              <span className={`w-8 h-8 rounded-md flex items-center justify-center ${ACCENT_TILE}`}>
                <Crown className="w-4 h-4" />
              </span>
            </Link>
          ))}

        <div className="space-y-1">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <SidebarLink key={item.id} item={item} isActive={activeTab === item.id} isExpanded={isExpanded} />
          ))}
        </div>

        {/* Account card — opens the Profile section of Account settings */}
        <Link
          href="/dashboard/settings#profile"
          className={`rounded-lg border border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 transition-colors ${isExpanded ? "p-2 flex items-center gap-2.5" : "p-1.5 flex justify-center"}`}
          title={!isExpanded ? `${displayName} · Profile settings` : "Profile settings"}
        >
          <span className={`w-8 h-8 rounded-md shrink-0 ${getAvatarColor(me?.id ?? me?.email)} text-white flex items-center justify-center text-xs font-bold`}>
            {initials}
          </span>
          {isExpanded && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-neutral-950 truncate leading-tight">{displayName}</div>
              <div className="text-xs text-neutral-500 truncate">{secondaryLine}</div>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
