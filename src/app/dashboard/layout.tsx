"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardSidebar, DashboardTab } from "@/components/dashboard/DashboardSidebar";
import { DashboardProvider, useDashboard } from "@/components/dashboard/DashboardContext";
import { CvEditorWorkspace } from "@/components/dashboard/create-flow/CvEditorWorkspace";
import { Menu, X, FileText, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

const MOBILE_NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/dashboard", label: "The Builder" },
  { href: "/dashboard/career-profiles", label: "Career Profiles" },
  { href: "/dashboard/past-projects", label: "Past Projects" },
  { href: "/dashboard/templates", label: "Templates" },
  { href: "/pricing", label: "Upgrade" },
  { href: "/dashboard/settings", label: "Account Settings" },
  { href: "/dashboard/help", label: "Help" },
];

function EditorOverlay() {
  const { activeEditingCv, setActiveEditingCv, setDrafts } = useDashboard();
  if (!activeEditingCv) return null;

  return (
    <CvEditorWorkspace
      initialData={activeEditingCv}
      onBack={() => setActiveEditingCv(null)}
      onSave={(savedCv) => {
        setDrafts((prev) => {
          const id = savedCv.id && savedCv.id !== "cv-new" ? savedCv.id : `draft-${Date.now()}`;
          const newDraft = {
            id,
            title: savedCv.title,
            targetRole: savedCv.targetRole,
            targetCompany: "General Application",
            atsScore: savedCv.atsScore,
            lastEdited: "Just now",
            templateName:
              savedCv.templateStyle === "tech"
                ? "Silicon Valley Tech Lead"
                : savedCv.templateStyle === "executive"
                  ? "Executive Ivy"
                  : "Modern Minimalist",
            accentColor: "bg-neutral-950",
            matchedKeywords: savedCv.skills.slice(0, 5),
          };
          const existingIdx = prev.findIndex((d) => d.id === id);
          if (existingIdx >= 0) {
            const copy = [...prev];
            copy[existingIdx] = newDraft;
            return copy;
          }
          return [newDraft, ...prev];
        });
        setActiveEditingCv(null);
      }}
    />
  );
}

function DashboardChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeEditingCv } = useDashboard();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFloatingUpgrade, setShowFloatingUpgrade] = useState(true);

  const activeTab: DashboardTab = pathname.startsWith("/dashboard/career-profiles")
    ? "career-profiles"
    : pathname.startsWith("/dashboard/past-projects")
      ? "past-projects"
      : pathname.startsWith("/dashboard/templates")
        ? "templates"
        : pathname.startsWith("/dashboard/settings")
          ? "settings"
          : pathname.startsWith("/dashboard/help")
            ? "help"
            : "builder";

  // While editing a CV, the editor takes over the full viewport — same as
  // before, just hoisted here so it works no matter which page triggered it.
  if (activeEditingCv) {
    return <EditorOverlay />;
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-[#fbfbfb] text-neutral-900 flex font-sans antialiased relative">
      {/* Floating Upgrade Prompt (Top Center, Eye-Catching & Subtle) */}
      {showFloatingUpgrade && (
        <div className="fixed top-3.5 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-auto">
          <div className="flex items-center gap-2.5 pl-3.5 pr-2 py-1.5 rounded-full bg-neutral-950/90 text-white backdrop-blur-md border border-neutral-800 shadow-xl ring-1 ring-white/10 hover:border-neutral-700 transition-all group">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
              <span className="text-neutral-200 text-xs font-medium">
                Unlock Unlimited AI Tailoring &amp; Exports
              </span>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[11px] transition-all shadow-xs"
            >
              <span>Upgrade</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <button
              type="button"
              onClick={() => setShowFloatingUpgrade(false)}
              className="p-1 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer ml-0.5"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Collapsible & Expandable, Fixed in Viewport) */}
      <div className="hidden md:block shrink-0 h-full z-30">
        <DashboardSidebar
          activeTab={activeTab}
          isExpanded={isSidebarExpanded}
          onToggleExpanded={() => setIsSidebarExpanded(!isSidebarExpanded)}
        />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 inset-x-0 h-16 bg-white/90 backdrop-blur-md border-b border-neutral-200/90 z-40 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neutral-950 flex items-center justify-center text-white">
            <FileText className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-neutral-950">Resumate</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-xs flex justify-end">
          <div className="w-4/5 max-w-xs h-full bg-white shadow-2xl flex flex-col justify-between p-6 animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-6">
                <span className="font-bold text-sm text-neutral-950">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-neutral-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                {MOBILE_NAV_ITEMS.map((item) => {
                  const isUpgrade = item.href === "/pricing";
                  const isActive = !isUpgrade && pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-neutral-950 text-white"
                          : "text-neutral-900 hover:bg-neutral-100"
                      }`}
                    >
                      <span>{item.label}</span>
                      {isUpgrade && <Sparkles className="w-4 h-4 text-amber-500" />}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
              <Link
                href="/dashboard/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-neutral-950 font-bold hover:opacity-80 transition-opacity cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-neutral-950 text-white flex items-center justify-center text-xs">
                  AR
                </div>
                <span>Alex Rivera</span>
              </Link>
              <span className="text-[11px] font-semibold text-neutral-400">Pro Plan</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area (Independent scroll while sidebar remains fixed) */}
      <main className="flex-1 min-w-0 h-full pt-16 md:pt-0 overflow-y-auto">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </DashboardProvider>
  );
}
