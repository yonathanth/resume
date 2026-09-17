"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfileSkills, useProfileSummary } from "@/hooks/use-profiles";
import {
  UserCheck,
  Plus,
  Edit3,
  CheckCircle2,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Sparkles,
  Layers,
  ChevronRight,
  ArrowRight,
  X,
  FileText,
  Target,
} from "lucide-react";
import {
  CareerProfile,
  SAMPLE_CAREER_PROFILES,
  defaultSampleCv,
} from "./create-flow/types";
import { createProfile, ApiError } from "@/lib/api";

interface CareerProfilesViewProps {
  profiles?: CareerProfile[];
  onCreateCvFromProfile?: (profile: CareerProfile) => void;
  onSaveTrajectory?: (profile: CareerProfile) => void;
}

export function CareerProfilesView({
  profiles = SAMPLE_CAREER_PROFILES,
  onCreateCvFromProfile,
  onSaveTrajectory,
}: CareerProfilesViewProps) {
  const router = useRouter();
  const { data: profileSkills } = useProfileSkills();
  const [trajectoryList, setTrajectoryList] = useState<CareerProfile[]>(profiles);
  const [selectedTrajectoryId, setSelectedTrajectoryId] = useState<string>(
    profiles[0]?.id || "profile-cloud-architect"
  );
  const [previewProfile, setPreviewProfile] = useState<CareerProfile | null>(null);
  const { data: previewSummary, isLoading: isSummaryLoading } = useProfileSummary(
    previewProfile?.id ?? null
  );
  const [isNewTrajectoryModalOpen, setIsNewTrajectoryModalOpen] = useState(false);

  // New Trajectory form states
  const [newRole, setNewRole] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newCompanies, setNewCompanies] = useState("");
  const [newHighlight, setNewHighlight] = useState("");
  const [newSkills, setNewSkills] = useState("");
  const [isCreatingTrajectory, setIsCreatingTrajectory] = useState(false);
  const [createTrajectoryError, setCreateTrajectoryError] = useState<string | null>(null);

  // Sync with prop if it updates
  React.useEffect(() => {
    if (profiles && profiles.length > 0) {
      setTrajectoryList(profiles);
    }
  }, [profiles]);

  const handleCreateTrajectory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole.trim()) return;

    setCreateTrajectoryError(null);
    setIsCreatingTrajectory(true);

    const companyArray = newCompanies
      ? newCompanies.split(",").map((c) => c.trim()).filter(Boolean)
      : [];
    const skillsArray = newSkills
      ? newSkills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      const profile = await createProfile(newRole.trim());
      const created: CareerProfile = {
        id: profile.id,
        roleTitle: newRole.trim(),
        domain: newDomain.trim(),
        readinessScore: 0,
        targetCompanies: companyArray,
        skills: skillsArray,
        highlight: newHighlight.trim(),
        cvData: {
          ...defaultSampleCv,
          id: "cv-new",
          title: `${newRole.trim()} – Master Trajectory`,
          targetRole: newRole.trim(),
          skills: skillsArray,
          atsScore: 0,
          personalInfo: { ...defaultSampleCv.personalInfo, fullName: "", email: "", phone: "" },
        },
      };

      setTrajectoryList((prev) => [created, ...prev]);
      onSaveTrajectory?.(created);

      // Reset and close
      setNewRole("");
      setNewDomain("");
      setNewCompanies("");
      setNewHighlight("");
      setNewSkills("");
      setIsNewTrajectoryModalOpen(false);
    } catch (err) {
      setCreateTrajectoryError(err instanceof ApiError ? err.message : "Could not save this trajectory. Please try again.");
    } finally {
      setIsCreatingTrajectory(false);
    }
  };

  return (
    <div className="px-8 py-10 sm:px-14 sm:py-14 lg:px-20 lg:py-16 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950">
              Career Profiles
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
              {trajectoryList.length} Active Trajectories
            </span>
          </div>
          <p className="text-sm text-neutral-500">
            Manage your verified career trajectories, credentials, and launch tailored resumes.
          </p>
        </div>

        {/* Create New Trajectory Button */}
        <button
          type="button"
          onClick={() => setIsNewTrajectoryModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-950 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Trajectory</span>
        </button>
      </div>

      {/* Trajectories Section */}
      <div className="mb-10">
        <h3 className="text-base font-bold text-neutral-950 mb-4 flex items-center gap-2">
          <span>Active Role Trajectories</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
            {trajectoryList.length}
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trajectoryList.map((traj) => {
            const isSelected = selectedTrajectoryId === traj.id;
            return (
              <div
                key={traj.id}
                onClick={() => {
                  setSelectedTrajectoryId(traj.id);
                  setPreviewProfile(traj);
                }}
                className={`rounded-3xl p-6 border transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? "bg-white border-neutral-950 shadow-md ring-1 ring-neutral-950"
                    : "bg-white border-neutral-200/90 hover:border-neutral-400/80 shadow-2xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-semibold text-neutral-500">
                      {traj.domain}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {traj.readinessScore}% Match
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-neutral-950 mb-1.5 group-hover:text-neutral-700 transition-colors">
                    {traj.roleTitle}
                  </h4>

                  <p className="text-xs text-neutral-600 leading-relaxed mb-4 line-clamp-2">
                    {traj.highlight}
                  </p>

                  {/* Target Companies Chips */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {traj.targetCompanies.slice(0, 3).map((comp, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-neutral-100 text-[10px] font-medium text-neutral-700"
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3.5 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-medium text-[11px]">
                    {traj.skills.length} Core Skills
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewProfile(traj);
                    }}
                    className="text-neutral-950 font-bold flex items-center gap-1 text-[11px] hover:text-neutral-600 cursor-pointer"
                  >
                    <span>View Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skills Inventory Grid */}
      <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-2xs p-6 sm:p-8">
        <div className="mb-6 pb-4 border-b border-neutral-100">
          <h3 className="text-base font-bold text-neutral-950">
            Master Skills Inventory
          </h3>
          <p className="text-xs text-neutral-500">
            Skills aggregated from every resume across your career profiles
          </p>
        </div>

        {profileSkills && profileSkills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {profileSkills.map((skill, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg bg-neutral-100 text-xs font-medium text-neutral-800"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400">
            No skills yet — generate a CV under one of your career profiles to populate this.
          </p>
        )}
      </div>

      {/* ================= PROFILE PREVIEW MODAL ================= */}
      {previewProfile && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-[32px] border border-neutral-200/90 shadow-2xl p-7 sm:p-9 relative my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setPreviewProfile(null)}
              className="absolute top-6 right-6 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Avatar / Badge */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-neutral-950">
                    {previewProfile.roleTitle}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {isSummaryLoading ? "Analyzing..." : `${previewSummary?.readinessScore ?? 0}% Match`}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  {isSummaryLoading ? "Analyzing your resumes..." : previewSummary?.domain || "No domain identified yet"}
                </p>
              </div>
            </div>

            {/* Trajectory Details Body */}
            <div className="space-y-4 mb-8">
              {/* Highlight Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Key Career Highlight
                </div>
                <p className="text-xs text-neutral-800 leading-relaxed italic">
                  {isSummaryLoading
                    ? "Analyzing your resumes for a standout achievement..."
                    : previewSummary?.highlight
                      ? `“${previewSummary.highlight}”`
                      : "No highlight identified yet — generate a CV under this profile first."}
                </p>
              </div>

              {/* Target Companies */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Target Companies
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {isSummaryLoading ? (
                    <span className="text-xs text-neutral-400">Analyzing...</span>
                  ) : previewSummary?.targetCompanies.length ? (
                    previewSummary.targetCompanies.map((c, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-xl bg-white border border-neutral-200 text-xs font-medium text-neutral-800 shadow-2xs"
                      >
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-400">None identified yet</span>
                  )}
                </div>
              </div>

              {/* Core Skills */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Verified Skills ({previewSummary?.skills.length ?? 0})
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {isSummaryLoading ? (
                    <span className="text-xs text-neutral-400">Analyzing your resumes for skills...</span>
                  ) : previewSummary?.skills.length ? (
                    previewSummary.skills.map((s, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-neutral-100 text-xs font-medium text-neutral-700"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-400">None identified yet</span>
                  )}
                </div>
              </div>
            </div>

            {/* ACTION BUTTON: CREATE A RESUME FROM THIS PROFILE */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  const prof = previewProfile;
                  setPreviewProfile(null);
                  onCreateCvFromProfile?.(prof);
                }}
                className="w-full py-3.5 rounded-2xl bg-neutral-950 text-white font-bold text-sm hover:bg-neutral-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Create a Resume from this Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => router.push(`/dashboard/career-profiles/${previewProfile.id}`)}
                className="w-full py-2.5 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-800 hover:bg-neutral-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>View Resumes for this Profile</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setPreviewProfile(null)}
                className="w-full py-2.5 rounded-2xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= NEW TRAJECTORY CREATION MODAL ================= */}
      {isNewTrajectoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-[32px] border border-neutral-200/90 shadow-2xl p-7 sm:p-9 relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsNewTrajectoryModalOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-6">
              <div className="w-10 h-10 rounded-2xl bg-neutral-950 text-white flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-neutral-950">
                New Career Trajectory
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Define a tailored career focus with target roles and skills.
              </p>
            </div>

            <form onSubmit={handleCreateTrajectory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Target Role Title *
                </label>
                <input
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Staff AI Research Scientist"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Domain / Department
                </label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="e.g. AI Systems & Foundation Models"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Target Companies (comma separated)
                </label>
                <input
                  type="text"
                  value={newCompanies}
                  onChange={(e) => setNewCompanies(e.target.value)}
                  placeholder="e.g. Anthropic, OpenAI, DeepMind"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Key Career Highlight / Metric
                </label>
                <textarea
                  rows={2}
                  value={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.value)}
                  placeholder="e.g. Led distributed training cluster scaling across 2,048 H100 GPUs with 99.4% uptime"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-950 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Core Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  placeholder="e.g. PyTorch, CUDA, Ray, Distributed Training"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-neutral-950"
                />
              </div>

              {createTrajectoryError && (
                <p className="text-[11px] text-red-600 font-medium text-center">{createTrajectoryError}</p>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewTrajectoryModalOpen(false)}
                  className="w-1/3 py-3 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTrajectory}
                  className="w-2/3 py-3 rounded-xl bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCreatingTrajectory ? "Saving..." : "Save Trajectory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
