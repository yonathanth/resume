"use client";

import React, { useState } from "react";
import {
  DashboardSidebar,
  DashboardTab,
} from "@/components/dashboard/DashboardSidebar";
import { BuilderView } from "@/components/dashboard/BuilderView";
import { CareerProfilesView } from "@/components/dashboard/CareerProfilesView";
import { PastProjectsView } from "@/components/dashboard/PastProjectsView";
import { TemplatesView } from "@/components/dashboard/TemplatesView";
import { SettingsView } from "@/components/dashboard/SettingsView";
import { HelpView } from "@/components/dashboard/HelpView";
import { CvEditorWorkspace } from "@/components/dashboard/create-flow/CvEditorWorkspace";
import {
  ResumeDraft,
  INITIAL_DRAFTS,
  CareerProfile,
  SAMPLE_CAREER_PROFILES,
  CvData,
  defaultSampleCv,
  TemplateId,
} from "@/components/dashboard/create-flow/types";
import { Menu, X, FileText, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("builder");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showFloatingUpgrade, setShowFloatingUpgrade] = useState<boolean>(true);

  // Shared application state
  const [drafts, setDrafts] = useState<ResumeDraft[]>(INITIAL_DRAFTS);
  const [savedProfiles, setSavedProfiles] = useState<CareerProfile[]>(
    SAMPLE_CAREER_PROFILES
  );
  const [activeEditingCv, setActiveEditingCv] = useState<CvData | null>(null);

  // Modal triggers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStartWithTemplateOpen, setIsStartWithTemplateOpen] = useState(false);
  const [preselectedCareerProfile, setPreselectedCareerProfile] =
    useState<CareerProfile | null>(null);
  const [preselectedTemplate, setPreselectedTemplate] = useState<
    TemplateId | undefined
  >(undefined);

  // Open draft in CvEditorWorkspace
  const handleOpenDraftInEditor = (draft: ResumeDraft) => {
    const draftCv: CvData = {
      ...defaultSampleCv,
      id: draft.id,
      title: draft.title,
      targetRole: draft.targetRole,
      atsScore: draft.atsScore,
      skills:
        draft.matchedKeywords.length > 0
          ? draft.matchedKeywords
          : defaultSampleCv.skills,
    };
    setActiveEditingCv(draftCv);
    setActiveTab("builder");
  };

  // Duplicate draft and immediately open the copied one in editor!
  const handleDuplicateDraft = (draft: ResumeDraft) => {
    const duplicated: ResumeDraft = {
      ...draft,
      id: `draft-${Date.now()}`,
      title: `${draft.title} (Copy)`,
      lastEdited: "Just now",
    };
    setDrafts((prev) => [duplicated, ...prev]);
    handleOpenDraftInEditor(duplicated);
  };

  const handleDeleteDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  // When clicking "Use this template" on the Templates page or card
  const handleUseTemplate = (templateId: TemplateId) => {
    setPreselectedTemplate(templateId);
    setPreselectedCareerProfile(null);
    setIsStartWithTemplateOpen(true);
    setActiveTab("builder");
  };

  // When clicking "Create a Resume from this Profile" on Career Profiles page
  const handleCreateCvFromProfile = (profile: CareerProfile) => {
    setPreselectedCareerProfile(profile);
    setPreselectedTemplate(undefined);
    setIsCreateModalOpen(true);
    setActiveTab("builder");
  };

  // Save changes from editor workspace
  const handleSaveEditorCv = (savedCv: CvData) => {
    const newDraft: ResumeDraft = {
      id:
        savedCv.id && savedCv.id !== "cv-new"
          ? savedCv.id
          : `draft-${Date.now()}`,
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

    setDrafts((prev) => {
      const existingIdx = prev.findIndex((d) => d.id === newDraft.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newDraft;
        return copy;
      }
      return [newDraft, ...prev];
    });
    setActiveEditingCv(null);
  };

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
          onSelectTab={(tab) => setActiveTab(tab)}
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
                {[
                  { id: "builder", label: "The Builder" },
                  { id: "career-profiles", label: "Career Profiles" },
                  { id: "past-projects", label: "Past Projects" },
                  { id: "templates", label: "Templates" },
                  { id: "upgrade", label: "Upgrade", href: "/pricing" },
                  { id: "settings", label: "Account Settings" },
                  { id: "help", label: "Help" },
                ].map((item) => {
                  if (item.href) {
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-neutral-900 hover:bg-neutral-100 transition-all"
                      >
                        <span>{item.label}</span>
                        <Sparkles className="w-4 h-4 text-amber-500" />
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id as DashboardTab);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === item.id
                          ? "bg-neutral-950 text-white"
                          : "text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("settings");
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 text-neutral-950 font-bold hover:opacity-80 transition-opacity cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-neutral-950 text-white flex items-center justify-center text-xs">
                  AR
                </div>
                <span>Alex Rivera</span>
              </button>
              <span className="text-[11px] font-semibold text-neutral-400">
                Pro Plan
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area (Independent scroll while sidebar remains fixed) */}
      <main className="flex-1 min-w-0 h-full pt-16 md:pt-0 overflow-y-auto">
        {activeTab === "builder" && (
          <BuilderView
            drafts={drafts}
            setDrafts={setDrafts}
            savedProfiles={savedProfiles}
            setSavedProfiles={setSavedProfiles}
            activeEditingCv={activeEditingCv}
            setActiveEditingCv={setActiveEditingCv}
            isCreateModalOpenExternal={isCreateModalOpen}
            onCloseCreateModalExternal={() => setIsCreateModalOpen(false)}
            isStartWithTemplateModalOpenExternal={isStartWithTemplateOpen}
            onCloseStartWithTemplateModalExternal={() =>
              setIsStartWithTemplateOpen(false)
            }
            preselectedCareerProfile={preselectedCareerProfile}
            preselectedTemplate={preselectedTemplate}
            onNavigateToPastProjects={() => setActiveTab("past-projects")}
            onNavigateToTemplates={() => setActiveTab("templates")}
          />
        )}

        {activeTab === "career-profiles" && (
          <CareerProfilesView
            profiles={savedProfiles}
            onCreateCvFromProfile={handleCreateCvFromProfile}
            onSaveTrajectory={(t) => setSavedProfiles((prev) => [t, ...prev])}
          />
        )}

        {activeTab === "past-projects" && (
          <PastProjectsView
            drafts={drafts}
            onOpenDraft={handleOpenDraftInEditor}
            onDuplicateDraft={handleDuplicateDraft}
            onDeleteDraft={handleDeleteDraft}
            onNewResume={() => {
              setPreselectedCareerProfile(null);
              setPreselectedTemplate(undefined);
              setIsCreateModalOpen(true);
              setActiveTab("builder");
            }}
            onUseTemplate={handleUseTemplate}
          />
        )}

        {activeTab === "templates" && (
          <TemplatesView onUseTemplate={handleUseTemplate} />
        )}

        {activeTab === "settings" && <SettingsView />}

        {activeTab === "help" && <HelpView />}
      </main>
    </div>
  );
}
