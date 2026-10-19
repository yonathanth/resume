"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Compass, Crown, HelpCircle, Loader2, LogOut, Settings } from "lucide-react";
import { useLogout } from "@/hooks/use-auth";
import { BrandMark } from "@/components/BrandMark";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { MenuToggleIcon } from "@/components/MenuToggleIcon";

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

// The phone drawer's links: the same look as the landing page's phone menu.
const drawerLink = "block py-1.5 text-[17px] font-medium tracking-tight text-neutral-950";
const drawerHeading = "mb-1 text-[13px] font-medium text-neutral-500";

/**
 * Every dashboard page's header: its title on the left, the account menu on
 * the right — a dropdown on desktop; on small screens (no sidebar) a drawer
 * from the side with the workspace pages too.
 */
export function DashboardTopBar({ title, onStartTour, mobileNavItems, activeHref, isPro }: DashboardTopBarProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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
        {/* On small screens the sidebar is hidden, so the logo stands in for its brand mark. */}
        <Link href="/dashboard" aria-label="Dashboard home" className="md:hidden shrink-0">
          <BrandMark size={34} crowned={isPro} />
        </Link>
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
          <MenuToggleIcon open={open} />
        </button>

        {/* Small screens: a drawer from the side, with the workspace pages (the sidebar is hidden). */}
        {open && (
          <div className="md:hidden fixed inset-0 z-50">
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="menu-in absolute inset-0 bg-neutral-950/30" />
            <nav
              aria-label="Menu"
              className="drawer-in absolute inset-y-0 right-0 flex w-[min(84vw,320px)] flex-col bg-[#f5f5f4] shadow-2xl"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200/70 px-5">
                <BrandMark size={32} crowned={isPro} />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="p-2 -mr-2 rounded-lg text-neutral-700 hover:text-neutral-950 cursor-pointer"
                >
                  <MenuToggleIcon open />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pt-5">
                <div className="menu-item-in mb-6" style={{ animationDelay: "60ms" }}>
                  <div className={drawerHeading}>Workspace</div>
                  {mobileNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={activeHref === item.href ? "page" : undefined}
                      className={`${drawerLink} flex items-center gap-2`}
                    >
                      {item.label}
                      {activeHref === item.href && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                    </Link>
                  ))}
                </div>

                <div className="menu-item-in mb-6" style={{ animationDelay: "120ms" }}>
                  <div className={drawerHeading}>Account</div>
                  {!isPro && (
                    <Link href="/dashboard/upgrade" onClick={() => setOpen(false)} className={`${drawerLink} flex items-center gap-2 !text-accent-strong`}>
                      <Crown className="h-4 w-4" /> Upgrade to Pro
                    </Link>
                  )}
                  <Link href="/dashboard/settings" onClick={() => setOpen(false)} className={drawerLink}>
                    Settings
                  </Link>
                  <Link href="/dashboard/help" onClick={() => setOpen(false)} className={drawerLink}>
                    Help
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onStartTour();
                    }}
                    className={`${drawerLink} w-full text-left cursor-pointer`}
                  >
                    Quick tour
                  </button>
                </div>
              </div>

              <div className="menu-item-in shrink-0 border-t border-neutral-200/70 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4" style={{ animationDelay: "180ms" }}>
                <button
                  type="button"
                  disabled={logout.isPending}
                  onClick={() => logout.mutate()}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white py-3 text-[15px] font-semibold text-neutral-800 transition-colors hover:border-red-200 hover:text-red-700 disabled:opacity-60 cursor-pointer"
                >
                  {logout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Log out
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Desktop: the account dropdown. */}
        {open && (
          <div role="menu" className="hidden md:block absolute right-0 mt-2 w-60 rounded-lg border border-neutral-300 bg-white shadow-xl p-1.5 z-50">

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
