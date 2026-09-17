"use client";

import React from "react";
import Link from "next/link";
import {
  FileText,
  LayoutDashboard,
  UserCheck,
  FolderKanban,
  Settings,
  HelpCircle,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";

export type DashboardTab =
  | "builder"
  | "career-profiles"
  | "past-projects"
  | "templates"
  | "settings"
  | "help";

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function DashboardSidebar({
  activeTab,
  isExpanded,
  onToggleExpanded,
}: DashboardSidebarProps) {
  const topNavItems: {
    id: DashboardTab;
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "builder",
      label: "The Builder",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "career-profiles",
      label: "Career Profiles",
      href: "/dashboard/career-profiles",
      icon: UserCheck,
    },
    {
      id: "past-projects",
      label: "Past Projects",
      href: "/dashboard/past-projects",
      icon: FolderKanban,
    },
    {
      id: "templates",
      label: "Templates",
      href: "/dashboard/templates",
      icon: LayoutTemplate,
    },
  ];

  const bottomNavItems: {
    id: DashboardTab | "upgrade";
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    isExternalAction?: boolean;
  }[] = [
    {
      id: "upgrade",
      label: "Upgrade",
      icon: Sparkles,
      href: "/pricing",
      isExternalAction: true,
    },
    {
      id: "settings",
      label: "Account Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
    {
      id: "help",
      label: "Help",
      href: "/dashboard/help",
      icon: HelpCircle,
    },
  ];

  return (
    <aside
      className={`h-full max-h-screen bg-white border-r border-neutral-200/90 flex flex-col justify-between transition-all duration-300 z-30 shrink-0 select-none ${
        isExpanded ? "w-64" : "w-[72px]"
      }`}
    >
      {/* Top Header / Brand Logo & Primary Navigation */}
      <div className="flex flex-col">
        <div
          className={`h-16 border-b border-neutral-100 flex items-center px-4 ${
            isExpanded ? "justify-between" : "justify-center"
          }`}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 group overflow-hidden"
            title="Resumate Home"
          >
            <div className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center text-white shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            {isExpanded && (
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold tracking-tight text-neutral-950">
                  Resumate
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-950 text-white leading-none">
                  PRO
                </span>
              </div>
            )}
          </Link>

          {/* Expand / Collapse Button */}
          {isExpanded && (
            <button
              type="button"
              onClick={onToggleExpanded}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed expand trigger right below logo */}
        {!isExpanded && (
          <div className="flex justify-center py-2 border-b border-neutral-100">
            <button
              type="button"
              onClick={onToggleExpanded}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Expand sidebar"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Primary Navigation List */}
        <nav className="p-3 space-y-1">
          {topNavItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                title={!isExpanded ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-neutral-950 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
                } ${!isExpanded ? "justify-center px-0" : ""}`}
              >
                <Icon
                  className={`w-4.5 h-4.5 shrink-0 ${
                    isActive ? "text-white" : "text-neutral-500"
                  }`}
                />
                {isExpanded && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Spacer to push account & help settings down to bottom */}
      <div className="flex-1" />

      {/* Bottom Area: Account & Help Navigation + User Profile Card */}
      <div className="border-t border-neutral-100/90">
        {/* Low Navigation: Account Settings & Help */}
        <div className="p-3 space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = !item.isExternalAction && activeTab === item.id;
            const Icon = item.icon;

            if (item.isExternalAction) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  title={!isExpanded ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 ${
                    !isExpanded ? "justify-center px-0" : ""
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0 text-amber-500" />
                  {isExpanded && (
                    <span className="truncate font-medium">{item.label}</span>
                  )}
                </Link>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                title={!isExpanded ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-neutral-950 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
                } ${!isExpanded ? "justify-center px-0" : ""}`}
              >
                <Icon
                  className={`w-4.5 h-4.5 shrink-0 ${
                    isActive ? "text-white" : "text-neutral-500"
                  }`}
                />
                {isExpanded && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Account Info (Static & unboxed: not clickable, no enclosing card border) */}
        <div className="p-3 pt-2">
          {isExpanded ? (
            <div className="flex items-center gap-2.5 px-2 py-1.5 select-none">
              <div className="w-8 h-8 rounded-xl bg-neutral-950 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                AR
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-neutral-950 truncate leading-tight">
                  Alex Rivera
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  alex.rivera@example.com
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1 select-none">
              <div
                className="w-8 h-8 rounded-xl bg-neutral-950 text-white flex items-center justify-center text-xs font-bold shadow-2xs"
                title="Alex Rivera"
              >
                AR
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
