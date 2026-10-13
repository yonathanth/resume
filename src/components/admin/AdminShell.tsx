"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  CreditCard,
  KeyRound,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Shield,
  Users,
  X,
  ArrowUpRight,
} from "lucide-react";
import { ApiError, clearAccessToken, getAccessToken, logout, refreshAccessToken } from "@/lib/api";
import { getAdminMe, type AdminMe, type Permission } from "@/lib/admin-api";

// Client-side shell for /admin. This only decides what to *render*: every
// admin API call is authorized by the backend on its own (role from the
// database, per-permission checks), so editing localStorage or the URL
// gets a 401/403 from the API, not data.

const AdminContext = createContext<AdminMe | null>(null);

export function useAdmin(): AdminMe {
  const me = useContext(AdminContext);
  if (!me) throw new Error("useAdmin must be used inside the admin shell");
  return me;
}

export function useCan(permission: Permission): boolean {
  return useAdmin().permissions.includes(permission);
}

const NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/billing", label: "Subscriptions & Payments", icon: CreditCard },
  { href: "/admin/plans", label: "Plans & Entitlements", icon: KeyRound },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/ai", label: "AI Usage", icon: Bot },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/settings", label: "Platform Settings", icon: Settings },
];

const ACCENT_TILE =
  "bg-gradient-to-b from-accent-mid to-accent border border-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]";

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-lg border p-1.5 pr-3 text-sm transition-colors ${
              active
                ? "bg-white border-neutral-200 text-neutral-950 font-semibold"
                : "border-transparent text-neutral-600 font-medium hover:bg-white hover:border-neutral-200 hover:text-neutral-950"
            }`}
          >
            <span className={`w-8 h-8 rounded-md shrink-0 flex items-center justify-center ${active ? ACCENT_TILE : "text-neutral-500 group-hover:text-neutral-800"}`}>
              <Icon className="w-[17px] h-[17px]" />
            </span>
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${ACCENT_TILE}`}>
        <Shield className="w-4 h-4" />
      </span>
      <div className="leading-tight">
        <div className="text-[15px] font-bold tracking-tight text-neutral-950">FitCV Admin</div>
        <div className="text-[11px] text-neutral-500">Management console</div>
      </div>
    </div>
  );
}

function FullScreenSpinner() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#fbfbfb]">
      <div className="h-6 w-6 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getAccessToken() ?? (await refreshAccessToken());
      if (cancelled) return;
      if (!token) {
        router.replace("/admin/login");
        return;
      }
      setHasSession(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const me = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getAdminMe,
    enabled: hasSession === true,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (me.error instanceof ApiError && (me.error.status === 401 || me.error.status === 403)) {
      router.replace(`/admin/login?error=${me.error.status === 403 ? "forbidden" : "session"}`);
    }
  }, [me.error, router]);

  const signOut = async () => {
    try {
      await logout();
    } catch {
      // Clear locally regardless.
    }
    clearAccessToken();
    queryClient.clear();
    router.replace("/admin/login");
  };

  if (!hasSession || me.isLoading) return <FullScreenSpinner />;
  if (me.error || !me.data) {
    const denied = me.error instanceof ApiError && (me.error.status === 401 || me.error.status === 403);
    if (denied) return <FullScreenSpinner />;
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-[#fbfbfb] text-sm text-neutral-600">
        <p>Couldn&apos;t reach the admin API.</p>
        <button type="button" onClick={() => me.refetch()} className="px-3 py-2 rounded-lg border border-neutral-300 bg-white font-semibold cursor-pointer">
          Try again
        </button>
      </div>
    );
  }

  const admin = me.data;

  return (
    <AdminContext.Provider value={admin}>
      <div className="h-screen w-full overflow-hidden bg-[#fbfbfb] text-neutral-900 flex font-sans antialiased">
        <aside className="hidden lg:flex w-72 shrink-0 h-full flex-col bg-neutral-50 border-r border-neutral-200">
          <div className="h-16 shrink-0 border-b border-neutral-200 flex items-center px-4">
            <Brand />
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <NavLinks pathname={pathname} />
          </div>
          <div className="shrink-0 p-3 border-t border-neutral-200 space-y-1">
            <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-white hover:text-neutral-950">
              <ArrowUpRight className="w-4 h-4" />
              Open the app
            </Link>
            <div className="rounded-lg border border-neutral-200 bg-white p-2.5">
              <div className="text-xs font-semibold text-neutral-950 truncate">{admin.email}</div>
              <div className="text-[11px] text-neutral-500">{admin.role}</div>
            </div>
          </div>
        </aside>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-neutral-950/50" onClick={() => setMobileOpen(false)}>
            <div className="h-full w-72 max-w-[85vw] bg-neutral-50 border-r border-neutral-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="h-16 border-b border-neutral-200 flex items-center justify-between px-4">
                <Brand />
                <button type="button" onClick={() => setMobileOpen(false)} className="p-1.5 rounded-md text-neutral-500 hover:bg-white cursor-pointer" aria-label="Close menu">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0 h-full flex flex-col">
          <header className="h-16 shrink-0 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg border border-neutral-300 text-neutral-700 cursor-pointer"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="lg:hidden">
                <Brand />
              </span>
              <span className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
                <Activity className="w-3.5 h-3.5" />
                Every action here is recorded in the audit log
              </span>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </header>
          <main className="flex-1 min-h-0 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">{children}</div>
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
