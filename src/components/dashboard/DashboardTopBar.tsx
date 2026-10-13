"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Compass, Crown, HelpCircle, Loader2, LogOut, Menu, Settings } from "lucide-react";
import { useLogout } from "@/hooks/use-auth";
import { Moxie, type MoxieHandle } from "@/components/moxie";
import { NotificationBell } from "@/components/dashboard/NotificationBell";

export interface TopBarNavItem {
  href: string;
  label: string;
}

interface DashboardTopBarProps {
  /** The current page's name — the only place pages show their title. */
  title: string;
  onStartTour: () => void;
  /** The sidebar's links, listed in the menu on small screens where the sidebar is hidden. */
  mobileNavItems: TopBarNavItem[];
  activeHref: string;
  isPro: boolean;
}

const itemClass =
  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 transition-colors cursor-pointer";

/** Every dashboard page's header: its title on the left, the account menu on the right. */
export function DashboardTopBar({ title, onStartTour, mobileNavItems, activeHref, isPro }: DashboardTopBarProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moxieRef = useRef<MoxieHandle>(null);
  const logout = useLogout();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="h-16 shrink-0 bg-white border-b border-neutral-200 px-4 sm:px-8 flex items-center justify-between gap-4 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {/* On small screens the sidebar is hidden, so Moxie stands in for its brand mark. */}
        <button
          type="button"
          onClick={() => moxieRef.current?.play("wave")}
          title="Moxie"
          aria-label="Moxie — click to say hi"
          className="md:hidden shrink-0 rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
        >
          <Moxie ref={moxieRef} animation="welcome" decorative size={40} crowned={isPro} />
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-neutral-950 truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2.5">
      {/* Upgrade — never for Pro users, and not on the upgrade page itself. */}
      {!isPro && activeHref !== "/dashboard/upgrade" && (
        <Link
          href="/dashboard/upgrade"
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:border-accent-strong hover:bg-accent-strong"
        >
          <Crown className="h-4 w-4" />
          Upgrade
        </Link>
      )}

      <NotificationBell />

      <div ref={menuRef} className="relative" data-tour="menu">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Menu"
          title="Menu"
          className="p-2 rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:text-neutral-950 hover:border-neutral-400 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {open && (
          <div role="menu" className="absolute right-0 mt-2 w-60 rounded-lg border border-neutral-300 bg-white shadow-xl p-1.5 z-50">
            {/* Small screens: the workspace pages, since the sidebar is hidden. */}
            <div className="md:hidden pb-1.5 mb-1.5 border-b border-neutral-200">
              {mobileNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`${itemClass} ${activeHref === item.href ? "bg-neutral-100 text-neutral-950 font-semibold" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
              {!isPro && (
                <Link href="/dashboard/upgrade" role="menuitem" onClick={() => setOpen(false)} className={`${itemClass} text-accent-strong`}>
                  <Crown className="w-4 h-4" />
                  Upgrade to Pro
                </Link>
              )}
            </div>

            <Link href="/dashboard/help" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <HelpCircle className="w-4 h-4 text-neutral-500" />
              Help
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onStartTour();
              }}
              className={itemClass}
            >
              <Compass className="w-4 h-4 text-neutral-500" />
              Quick tour
            </button>
            <Link href="/dashboard/settings" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <Settings className="w-4 h-4 text-neutral-500" />
              Settings
            </Link>
            <div className="my-1.5 border-t border-neutral-200" />
            <button
              type="button"
              role="menuitem"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
              className={`${itemClass} hover:!bg-red-50 hover:!text-red-700 disabled:opacity-60`}
            >
              {logout.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4 text-neutral-500" />}
              Log out
            </button>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
