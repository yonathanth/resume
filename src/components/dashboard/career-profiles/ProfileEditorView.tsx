"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Crown, FilePlus, FileText, History, Loader2, RotateCcw, Trash2, User } from "lucide-react";
import { ApiError, ApiCareerProfileDetail, ApiProfileChange, ProfileContentDTO } from "@/lib/api";
import { useDeleteProfile, useProfile, useRevertProfileChange, useUpdateProfile } from "@/hooks/use-profiles";
import { useSubscriptionStatus } from "@/hooks/use-subscription";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { ProUpgradeModal } from "@/components/dashboard/ProUpgradeModal";
import { ProfessionInput } from "@/components/dashboard/ProfessionInput";
import { ICON_TONES } from "@/components/dashboard/create-flow/OptionCard";
import { DashboardMoxie } from "@/components/dashboard/DashboardMoxie";
import { ChipListEditor, INPUT_CLASS, LABEL_CLASS, ProfileSectionEditor } from "./ProfileSectionEditor";
import { ItemRecord, PROFILE_SECTIONS, describeChangeCounts, missingRequired, tempId, toSavePayload } from "./profile-sections";

type Tab = "profile" | "resumes" | "history";

const CHANGE_LABELS: Record<ApiProfileChange["kind"], string> = {
  create: "Profile created",
  manual_edit: "You edited the profile",
  merge_cv: "Details added from a CV",
  wording: "Improved wording saved",
  revert: "Restored an earlier version",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

interface Draft {
  title: string;
  content: ProfileContentDTO;
}

const toDraft = (profile: ApiCareerProfileDetail): Draft => ({ title: profile.title, content: structuredClone(profile.content) });
const draftKey = (draft: Draft) => JSON.stringify({ title: draft.title.trim(), content: toSavePayload(draft.content) });

export function ProfileEditorView({ profileId }: { profileId: string }) {
  const router = useRouter();
  const { handleCreateCvFromProfile } = useDashboard();
  const { data: profile, isLoading, error, refetch } = useProfile(profileId);
  const isPro = useSubscriptionStatus().data?.isPro ?? false;
  const update = useUpdateProfile(profileId);
  const revert = useRevertProfileChange(profileId);
  const remove = useDeleteProfile();

  const [tab, setTab] = useState<Tab>("profile");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadedVersion, setLoadedVersion] = useState<number | null>(null);
  const [showExtra, setShowExtra] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  // Remounts the form after a save/discard/reload so inputs that keep their
  // own text while typing (comma lists) pick up the new values.
  const [formKey, setFormKey] = useState(0);

  const savedKey = useMemo(() => (profile ? draftKey(toDraft(profile)) : ""), [profile]);
  const isDirty = Boolean(draft && profile && draftKey(draft) !== savedKey);
  const readOnly = !isPro;

  // Take the server's copy on first load and whenever a newer version
  // arrives — but never overwrite unsaved edits because of a background
  // refetch. (State adjusted during render, not in an effect.)
  if (profile && (draft === null || (profile.version !== loadedVersion && !isDirty))) {
    setDraft(toDraft(profile));
    setLoadedVersion(profile.version);
  }

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  if (isLoading || (!draft && !error)) {
    return (
      <div className="flex items-center justify-center py-32 text-neutral-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }
  if (error || !profile || !draft) {
    return (
      <div className="max-w-md mx-auto py-24 text-center">
        <p className="text-sm font-semibold text-neutral-900">This profile couldn&apos;t be loaded.</p>
        <p className="mt-1 text-xs text-neutral-500">{error instanceof ApiError ? error.message : "It may have been deleted."}</p>
        <Link href="/dashboard/career-profiles" className="mt-4 inline-block text-sm font-semibold text-accent-strong">
          Back to profiles
        </Link>
      </div>
    );
  }

  const setContent = (patch: Partial<ProfileContentDTO>) => setDraft((d) => (d ? { ...d, content: { ...d.content, ...patch } } : d));

  const handleSave = async () => {
    setSaveError(null);
    if (!draft.title.trim()) {
      setSaveError("Give the profile a role.");
      return;
    }
    const missing = missingRequired(draft.content);
    if (missing.length) {
      setSaveError(`Fill in the required fields first: ${missing.slice(0, 3).join("; ")}${missing.length > 3 ? "…" : ""}`);
      return;
    }
    try {
      const saved = await update.mutateAsync({
        version: profile.version,
        ...(draft.title.trim() !== profile.title ? { title: draft.title.trim() } : {}),
        content: toSavePayload(draft.content),
      });
      setDraft(toDraft(saved));
      setLoadedVersion(saved.version);
      setFormKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.code === "PRO_REQUIRED") return setPaywallOpen(true);
      if (err instanceof ApiError && err.code === "PROFILE_VERSION_CONFLICT") return setConflict(true);
      setSaveError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    }
  };

  const reloadLatest = async () => {
    setConflict(false);
    setSaveError(null);
    const { data } = await refetch();
    if (data) {
      setDraft(toDraft(data));
      setLoadedVersion(data.version);
      setFormKey((k) => k + 1);
    }
  };

  const handleRevert = async (change: ApiProfileChange) => {
    setSaveError(null);
    try {
      const restored = await revert.mutateAsync({ changeId: change.id, version: profile.version });
      setDraft(toDraft(restored));
      setLoadedVersion(restored.version);
      setFormKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.code === "PRO_REQUIRED") return setPaywallOpen(true);
      if (err instanceof ApiError && err.code === "PROFILE_VERSION_CONFLICT") return setConflict(true);
      setSaveError(err instanceof ApiError ? err.message : "Could not undo that change.");
    }
  };

  const skillNames = draft.content.skills.map((s) => s.name);
  const extraSections = PROFILE_SECTIONS.filter((s) => s.extra);
  const visibleSections = PROFILE_SECTIONS.filter(
    (s) => !s.extra || showExtra || ((draft.content[s.key] as ItemRecord[] | undefined)?.length ?? 0) > 0
  );
  const hiddenExtraCount = extraSections.filter((s) => !visibleSections.includes(s)).length;

  return (
    <div className="px-6 pt-6 pb-28 sm:px-10 lg:px-16 max-w-5xl mx-auto w-full">
      <Link href="/dashboard/career-profiles" className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-5">
        <ArrowLeft className="w-3.5 h-3.5" /> All profiles
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3.5 min-w-0">
          <span className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-b border ${ICON_TONES.violet}`}>
            <User className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 truncate">{profile.title}</h1>
            <p className="text-xs text-neutral-500">
              {[profile.occupationCategory, profile.seniority && `${profile.seniority} level`, `${profile.documentCount} linked CV${profile.documentCount === 1 ? "" : "s"}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="p-2.5 rounded-lg border border-neutral-300 text-neutral-500 hover:text-red-600 hover:border-red-200 cursor-pointer"
            title="Delete profile"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isDirty}
            title={isDirty ? "Save your changes first" : undefined}
            onClick={() => (isPro ? handleCreateCvFromProfile(profile.id) : setPaywallOpen(true))}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FilePlus className="w-4 h-4 text-accent-light" /> Create a CV
          </button>
        </div>
      </div>

      {readOnly && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">Career profiles are read-only on the free plan. Your data is safe. Upgrade to edit it and build CVs from it.</p>
          <button type="button" onClick={() => setPaywallOpen(true)} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-950 text-white text-xs font-semibold cursor-pointer">
            <Crown className="w-3.5 h-3.5" /> Upgrade
          </button>
        </div>
      )}

      {conflict && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">This profile changed somewhere else (another tab, or a CV was added to it). Load the latest version to continue. Unsaved edits here will be lost.</p>
          <button type="button" onClick={reloadLatest} className="shrink-0 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer">
            Load latest
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200 mb-6" role="tablist">
        {([
          ["profile", "Profile", User],
          ["resumes", `CVs (${profile.documents.length})`, FileText],
          ["history", "History", History],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold border-b-2 -mb-px cursor-pointer ${
              tab === key ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div key={formKey} className="space-y-5">
          <section className="rounded-lg border border-neutral-300 bg-white p-5">
            <h3 className="text-sm font-bold text-neutral-950 mb-3">Role</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS}>
                  Role this profile is for <span className="text-accent">*</span>
                </label>
                {readOnly ? (
                  <input className={INPUT_CLASS} value={draft.title} disabled />
                ) : (
                  <ProfessionInput value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="e.g. Backend Developer" />
                )}
              </div>
              <div>
                <label className={LABEL_CLASS}>CV headline</label>
                <input
                  className={INPUT_CLASS}
                  disabled={readOnly}
                  value={draft.content.headline ?? ""}
                  onChange={(e) => setContent({ headline: e.target.value })}
                  placeholder="e.g. Senior Backend Engineer"
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Location</label>
                <input
                  className={INPUT_CLASS}
                  disabled={readOnly}
                  value={draft.content.location ?? ""}
                  onChange={(e) => setContent({ location: e.target.value })}
                  placeholder="e.g. Addis Ababa, Ethiopia"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLASS}>Professional summary</label>
                <textarea
                  rows={4}
                  className={`${INPUT_CLASS} resize-y`}
                  disabled={readOnly}
                  value={draft.content.summary ?? ""}
                  onChange={(e) => setContent({ summary: e.target.value })}
                  placeholder="Two or three sentences about you in this role. Each CV adapts it."
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              Name, email and phone come from your account settings and are shared by all your profiles.
            </p>
          </section>

          <section className="rounded-lg border border-neutral-300 bg-white p-5">
            <h3 className="text-sm font-bold text-neutral-950">
              Skills {skillNames.length > 0 && <span className="ml-1 text-xs font-semibold text-neutral-400">{skillNames.length}</span>}
            </h3>
            <p className="mt-0.5 mb-3 text-xs text-neutral-500">Every skill you have for this role. Each CV picks the ones that fit.</p>
            <ChipListEditor
              values={skillNames}
              readOnly={readOnly}
              placeholder="Add skills, comma separated"
              onChange={(names) =>
                setContent({
                  skills: names.map((name) => draft.content.skills.find((s) => s.name === name) ?? { id: tempId(), name }),
                })
              }
            />
          </section>

          {visibleSections.map((def) => (
            <ProfileSectionEditor
              key={def.key}
              def={def}
              readOnly={readOnly}
              items={(draft.content[def.key] ?? []) as ItemRecord[]}
              onChange={(items) => setContent({ [def.key]: items } as Partial<ProfileContentDTO>)}
            />
          ))}

          <section className="rounded-lg border border-neutral-300 bg-white p-5">
            <h3 className="text-sm font-bold text-neutral-950 mb-3">Interests</h3>
            <ChipListEditor
              values={draft.content.interests}
              readOnly={readOnly}
              placeholder="Add interests, comma separated"
              onChange={(interests) => setContent({ interests })}
            />
          </section>

          {!readOnly && hiddenExtraCount > 0 && (
            <button
              type="button"
              onClick={() => setShowExtra(true)}
              className="w-full py-3 rounded-lg border border-dashed border-neutral-300 text-sm font-semibold text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 cursor-pointer"
            >
              Show {hiddenExtraCount} more sections (awards, volunteering, publications…)
            </button>
          )}
        </div>
      )}

      {tab === "resumes" && (
        <div className="rounded-lg border border-neutral-300 bg-white">
          {profile.documents.length === 0 ? (
            <div className="py-10 text-center">
              <DashboardMoxie animation="emptyFolder" size={100} className="mx-auto mb-1" />
              <p className="text-sm font-semibold text-neutral-800">No CVs linked yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {profile.documents.map((doc) => (
                <li key={doc.id}>
                  <Link href={`/dashboard/editor/${doc.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-neutral-50">
                    <FileText className="w-4 h-4 shrink-0 text-neutral-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-neutral-900">{doc.title || "Untitled CV"}</span>
                      <span className="block text-xs text-neutral-500">Edited {formatDate(doc.updatedAt)}</span>
                    </span>
                    {doc.tailored && (
                      <span className="px-2 py-0.5 rounded-full border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-700">Tailored to a job</span>
                    )}
                    {doc.profileVersion !== null && doc.profileVersion < profile.version && (
                      <span className="px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-800" title="The profile changed after this CV was made">
                        Profile updated since
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="rounded-lg border border-neutral-300 bg-white">
          <ul className="divide-y divide-neutral-200">
            {profile.changes.map((change, index) => {
              const counts = describeChangeCounts(change.summary);
              return (
                <li key={change.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-neutral-900">{CHANGE_LABELS[change.kind]}</span>
                    <span className="block text-xs text-neutral-500">
                      {[formatDate(change.createdAt), counts].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {change.kind !== "create" && !readOnly && (
                    <button
                      type="button"
                      disabled={revert.isPending || isDirty}
                      title={isDirty ? "Save or discard your changes first" : "Put the profile back to how it was before this change"}
                      onClick={() => handleRevert(change)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:border-neutral-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> {index === 0 ? "Undo" : "Restore before this"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Save bar */}
      {!readOnly && (isDirty || saveError) && tab === "profile" && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur px-6 py-3">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className={`text-sm ${saveError ? "text-red-600 font-medium" : "text-neutral-600"}`}>{saveError ?? "You have unsaved changes."}</p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                disabled={update.isPending}
                onClick={() => {
                  setDraft(toDraft(profile));
                  setSaveError(null);
                  setFormKey((k) => k + 1);
                }}
                className="px-4 py-2 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-700 hover:border-neutral-400 cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={update.isPending || !isDirty}
                onClick={handleSave}
                className="px-5 py-2 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 cursor-pointer disabled:opacity-60"
              >
                {update.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete this profile?"
        description={`"${profile.title}" and its history will be deleted. The ${profile.documentCount} CV${profile.documentCount === 1 ? "" : "s"} made from it are kept.`}
        confirmLabel="Delete"
        processingLabel="Deleting..."
        isProcessing={remove.isPending}
        error={deleteError}
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setDeleteError(null);
          try {
            await remove.mutateAsync(profile.id);
            router.push("/dashboard/career-profiles");
          } catch (err) {
            setDeleteError(err instanceof ApiError ? err.message : "Could not delete this profile.");
          }
        }}
      />
      <ProUpgradeModal isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} reason="Editing career profiles is part of FitCV Pro." />
    </div>
  );
}
