"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Infinity as InfinityIcon, User, Shield, CreditCard, AlertTriangle, CheckCircle2, Loader2, LogOut, X, KeyRound, UserCheck, Bell, Mail, ChevronDown, Check, Briefcase } from "lucide-react";
import {
  useSubscriptionStatus,
  usePricing,
  useCancelSubscription,
  useChangePlan,
  useResumeSubscription,
} from "@/hooks/use-subscription";
import {
  useMe,
  useUpdateProfile,
  useLogout,
  useLogoutAll,
  useChangePassword,
  useDeleteAccount,
  ME_QUERY_KEY,
} from "@/hooks/use-auth";
import {
  ApiError,
  ApiUser,
  type DeletionReason,
  ProfileAutoSync,
  cancelEmailChange,
  confirmEmailChange,
  resendEmailChange,
  startEmailChange,
  planTier,
  type CareerStage,
  canUseCareerProfiles,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/api";
import {
  PushPermissionDeniedError,
  currentPushSubscription,
  disablePush,
  enablePush,
  pushSupport,
  type PushSupport,
} from "@/lib/push";
import { CancelPlanModal } from "@/components/dashboard/CancelPlanModal";
import { ChangePlanModal, type PlanChoice } from "@/components/dashboard/ChangePlanModal";
import { CAREER_STAGES } from "@/components/dashboard/OnboardingModal";
import { FALLBACK_PRICING, PERIOD_LABEL, PERIOD_SUFFIX, TIER_LABEL, formatPrice } from "@/lib/plans";
import { ICON_TONES, OptionTone } from "@/components/dashboard/create-flow/OptionCard";
import { ProfessionsInput, addProfession } from "@/components/dashboard/ProfessionsInput";
import { useToast } from "@/components/Toaster";
import { EmailCodeEntry } from "@/components/EmailCodeEntry";

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition disabled:bg-neutral-50 disabled:text-neutral-500";
const LABEL_CLASS = "block text-xs font-semibold text-neutral-700 mb-1.5";
const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-semibold text-neutral-800 hover:border-neutral-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";




const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Sign-in & security", icon: Shield },
  { id: "plan", label: "Plan & usage", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "career-profiles", label: "Career profiles", icon: Briefcase },
  { id: "danger", label: "Delete account", icon: AlertTriangle },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

// The open tab lives in the URL hash (#security, #plan…), so links from
// elsewhere — like Help's "Plan & billing" — land on the right tab, and
// back/forward move between tabs.
function useActiveSection(): SectionId {
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash.slice(1),
    () => ""
  );
  return SECTIONS.some((s) => s.id === hash) ? (hash as SectionId) : "profile";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function Section({
  id,
  icon: Icon,
  tone,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: OptionTone;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-lg border border-neutral-300 bg-white animate-in fade-in duration-150">
      <div className="flex items-center gap-3 px-6 sm:px-7 py-5 border-b border-neutral-200">
        <span className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-b border ${ICON_TONES[tone]}`}>
          <Icon className="w-4 h-4" />
        </span>
        <div>
          <h2 id={`${id}-title`} className="text-base font-bold text-neutral-950 tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-neutral-500">{description}</p>
        </div>
      </div>
      <div className="p-6 sm:p-7">{children}</div>
    </section>
  );
}

/** A form's error, inline next to its buttons; successes are announced with a toast. */
function StatusMessage({ error }: { error: string | null }) {
  return error ? <p className="text-sm font-medium text-red-600">{error}</p> : null;
}

/* ---------------- Profile ---------------- */

const PHONE_PATTERN = /^[+\d\s().-]*$/;

/** Accounts from before first/last names existed only have fullName — split it as a starting point. */
function seedNames(me: ApiUser): { first: string; last: string } {
  if (me.firstName || me.lastName) return { first: me.firstName ?? "", last: me.lastName ?? "" };
  const parts = (me.fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

// Keyed on the user so the form re-seeds from the saved profile whenever it changes.
function ProfileForm({ me }: { me: ApiUser }) {
  const updateProfile = useUpdateProfile();
  const seeded = seedNames(me);
  const saved = {
    firstName: seeded.first,
    lastName: seeded.last,
    phone: me.phone ?? "",
  };
  const savedProfessions = me.professions?.length ? me.professions : me.occupationTitle ? [me.occupationTitle] : [];
  const [form, setForm] = useState(saved);
  const [professions, setProfessions] = useState<string[]>(savedProfessions);
  // Typed but not added yet: saved along with the list.
  const [professionDraft, setProfessionDraft] = useState("");
  const allProfessions = addProfession(professions, professionDraft);
  const professionsChanged = allProfessions.join("|") !== savedProfessions.join("|");
  // Asked during onboarding; shapes how new CVs are written.
  const [careerStage, setCareerStage] = useState<CareerStage | null>(me.careerStage ?? null);
  const careerStageChanged = careerStage !== (me.careerStage ?? null);
  const [error, setError] = useState<string | null>(null);
  const [changingEmail, setChangingEmail] = useState(false);
  const toast = useToast();

  const set = (key: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const changed = (key: keyof typeof form) => form[key].trim() !== saved[key];
  const isDirty = (Object.keys(form) as (keyof typeof form)[]).some(changed) || professionsChanged || careerStageChanged;
  const phoneInvalid = !PHONE_PATTERN.test(form.phone);
  const isValid = form.firstName.trim() !== "" && form.lastName.trim() !== "" && !phoneInvalid;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Names are sent together so the server keeps fullName in sync.
      const namesChanged = changed("firstName") || changed("lastName");
      await updateProfile.mutateAsync({
        ...(namesChanged ? { firstName: form.firstName.trim(), lastName: form.lastName.trim() } : {}),
        ...(changed("phone") ? { phone: form.phone.trim() } : {}),
        ...(professionsChanged ? { professions: allProfessions } : {}),
        ...(careerStageChanged ? { careerStage } : {}),
      });
      toast.success("Changes saved");
    } catch (err) {
      setError(errorMessage(err, "Could not save your changes. Please try again."));
    }
  };

  return (
    <>
    <form onSubmit={handleSave} className="space-y-5">
      <p className="text-xs text-neutral-500 -mt-1">
        New resumes start with these details, and the AI won&apos;t ask for them again. You can still change them on
        any single resume in the editor.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className={LABEL_CLASS}>
            First name
          </label>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            value={form.firstName}
            onChange={(e) => set("firstName")(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="lastName" className={LABEL_CLASS}>
            Last name
          </label>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            value={form.lastName}
            onChange={(e) => set("lastName")(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="email" className={LABEL_CLASS}>
            Email
          </label>
          {/* Changed only by proving the new address (a code), in its own dialog. */}
          <div className="flex gap-2">
            <input id="email" type="email" value={me.email} readOnly disabled className={INPUT_CLASS} />
            <button type="button" onClick={() => setChangingEmail(true)} className={`${SECONDARY_BUTTON} shrink-0`}>
              Change
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="phone" className={LABEL_CLASS}>
            Phone <span className="font-normal text-neutral-400">· optional</span>
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => set("phone")(e.target.value)}
            placeholder="+251 91 234 5678"
            className={INPUT_CLASS}
          />
          {phoneInvalid && <p className="mt-1.5 text-xs text-red-600">Use digits, spaces and + ( ) - only.</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="profession" className={LABEL_CLASS}>
            Professions <span className="font-normal text-neutral-400">· the starred one is your main one</span>
          </label>
          <ProfessionsInput
            id="profession"
            value={professions}
            onChange={setProfessions}
            draft={professionDraft}
            onDraftChange={setProfessionDraft}
          />
        </div>
        <div className="sm:col-span-2">
          <span className={LABEL_CLASS}>Career stage</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Career stage">
            {CAREER_STAGES.map(({ value, label }) => {
              const selected = careerStage === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setCareerStage(selected ? null : value)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    selected ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
        <StatusMessage error={error} />
        <div className="flex gap-2 sm:ml-auto">
          {isDirty && (
            <button
              type="button"
              onClick={() => {
                setForm(saved);
                setProfessions(savedProfessions);
                setProfessionDraft("");
                setCareerStage(me.careerStage ?? null);
                setError(null);
              }}
              className={SECONDARY_BUTTON}
            >
              Discard
            </button>
          )}
          <button type="submit" disabled={!isDirty || !isValid || updateProfile.isPending} className={PRIMARY_BUTTON}>
            {updateProfile.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {updateProfile.isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </form>
    {/* Beside the form, not in it: the dialog has a form of its own. */}
    {changingEmail && <ChangeEmailModal me={me} onClose={() => setChangingEmail(false)} />}
    </>
  );
}

/**
 * Changing the sign-in email: the new address (and the password, when the
 * account has one), then the 6-digit code sent to that address. The account
 * only moves once the code is right; the old address gets a notice.
 */
function ChangeEmailModal({ me, onClose }: { me: ApiUser; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set once the code is on its way: the form gives way to the code boxes.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const canSend = newEmail.trim().includes("@") && (!me.hasPassword || password.length > 0);

  const close = () => {
    // Leaving mid-way drops the pending change, so a stray code can't be used later.
    if (pendingEmail) void cancelEmailChange().catch(() => undefined);
    onClose();
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const { pendingEmail } = await startEmailChange({
        newEmail: newEmail.trim(),
        ...(me.hasPassword ? { password } : {}),
      });
      setPendingEmail(pendingEmail);
    } catch (err) {
      setError(errorMessage(err, "Couldn't send the code. Please try again."));
    } finally {
      setSending(false);
    }
  };

  const onChanged = (user: ApiUser) => {
    queryClient.setQueryData(ME_QUERY_KEY, user);
    toast.success("Email changed", { description: `You'll sign in with ${user.email} from now on.` });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-email-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={close}
          className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {pendingEmail ? (
          <div className="p-7">
            <EmailCodeEntry<ApiUser>
              email={pendingEmail}
              theme="light"
              titleId="change-email-title"
              verify={confirmEmailChange}
              resend={resendEmailChange}
              onVerified={onChanged}
              onChangeEmail={() => {
                setPendingEmail(null);
                setError(null);
              }}
            />
          </div>
        ) : (
          <form onSubmit={send}>
            <div className="p-7">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center bg-neutral-50 border border-neutral-200 text-neutral-700 mb-4">
                <Mail className="w-5 h-5" />
              </span>
              <h3 id="change-email-title" className="text-lg font-bold text-neutral-950 tracking-tight">
                Change your email
              </h3>
              <p className="mt-1.5 text-sm text-neutral-500 leading-relaxed">
                We&apos;ll send a code to the new address. Your email changes once you enter it; until then you keep
                signing in with <span className="font-semibold text-neutral-800 [overflow-wrap:anywhere]">{me.email}</span>.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="newEmail" className={LABEL_CLASS}>
                    New email
                  </label>
                  <input
                    id="newEmail"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                {me.hasPassword && (
                  <div>
                    <label htmlFor="changeEmailPassword" className={LABEL_CLASS}>
                      Your password
                    </label>
                    <input
                      id="changeEmailPassword"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                )}
              </div>

              {error && <p className="mt-4 text-xs font-medium text-red-600">{error}</p>}
            </div>

            <div className="px-7 py-4 border-t border-neutral-200 bg-neutral-50/80 flex gap-2.5">
              <button type="button" onClick={close} className={`${SECONDARY_BUTTON} flex-1`}>
                Cancel
              </button>
              <button type="submit" disabled={!canSend || sending} className={`${PRIMARY_BUTTON} flex-1`}>
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                {sending ? "Sending..." : "Send code"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------------- Security ---------------- */

function PasswordForm({ me }: { me: ApiUser }) {
  const changePassword = useChangePassword();
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const hasPassword = me.hasPassword;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < 8;
  const canSubmit =
    (!hasPassword || currentPassword.length > 0) && newPassword.length >= 8 && newPassword === confirmPassword;

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await changePassword.mutateAsync({
        ...(hasPassword ? { currentPassword } : {}),
        newPassword,
      });
      reset();
      setIsOpen(false);
      toast.success(hasPassword ? "Password changed" : "Password set", {
        description: hasPassword ? "Other devices were signed out." : "You can now sign in with it.",
      });
    } catch (err) {
      setError(errorMessage(err, "Could not update your password. Please try again."));
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-950">Password</div>
          <p className="text-xs text-neutral-500 mt-0.5">
            {hasPassword
              ? "Changing it signs you out on every other device."
              : "You sign in with Google. Set a password to also sign in with your email."}
          </p>
        </div>
        {!isOpen && (
          <button type="button" onClick={() => setIsOpen(true)} className={`${SECONDARY_BUTTON} shrink-0`}>
            <KeyRound className="w-4 h-4" />
            {hasPassword ? "Change password" : "Set a password"}
          </button>
        )}
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-5 p-5 rounded-lg border border-neutral-200 bg-neutral-50 space-y-4">
          {hasPassword && (
            <div>
              <label htmlFor="currentPassword" className={LABEL_CLASS}>
                Current password
              </label>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="newPassword" className={LABEL_CLASS}>
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                autoFocus={!hasPassword}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={INPUT_CLASS}
              />
              <p className={`mt-1.5 text-xs ${tooShort ? "text-red-600" : "text-neutral-500"}`}>At least 8 characters.</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className={LABEL_CLASS}>
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={INPUT_CLASS}
              />
              {mismatch && <p className="mt-1.5 text-xs text-red-600">Passwords don&apos;t match.</p>}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
            <StatusMessage error={error} />
            <div className="flex gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setIsOpen(false);
                }}
                className={SECONDARY_BUTTON}
              >
                Cancel
              </button>
              <button type="submit" disabled={!canSubmit || changePassword.isPending} className={PRIMARY_BUTTON}>
                {changePassword.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {hasPassword ? "Update password" : "Set password"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function SecuritySection({ me }: { me: ApiUser }) {
  const logout = useLogout();
  const logoutAll = useLogoutAll();

  const methods = [
    { label: "Email & password", active: me.hasPassword },
    { label: "Google", active: me.hasGoogle },
  ];

  return (
    <div className="divide-y divide-neutral-200">
      <div className="pb-6">
        <div className="text-sm font-semibold text-neutral-950">Sign-in methods</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {methods.map((m) => (
            <span
              key={m.label}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${
                m.active ? "border-neutral-300 bg-white text-neutral-800" : "border-dashed border-neutral-300 text-neutral-400"
              }`}
            >
              {m.active && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              {m.label}
              {!m.active && <span className="text-[10px]">· not set up</span>}
            </span>
          ))}
        </div>
        {me.createdAt && <p className="mt-3 text-xs text-neutral-500">Member since {formatDate(me.createdAt)}</p>}
      </div>

      <div className="py-6">
        <PasswordForm me={me} />
      </div>

      <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-950">Sessions</div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Lost a device or signed in somewhere public? Sign out everywhere at once.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending || logoutAll.isPending}
            className={SECONDARY_BUTTON}
          >
            {logout.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Sign out
          </button>
          <button
            type="button"
            onClick={() => logoutAll.mutate()}
            disabled={logout.isPending || logoutAll.isPending}
            className={SECONDARY_BUTTON}
          >
            {logoutAll.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign out everywhere
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Plan ---------------- */

const FLOW_USAGE: { flow: "create" | "tailor" | "improve"; label: string }[] = [
  { flow: "tailor", label: "Tailorings" },
  { flow: "improve", label: "Enhancements" },
  { flow: "create", label: "New CVs" },
];

function PlanSection() {
  const { data: subscription, isLoading } = useSubscriptionStatus();
  const { data: pricingData } = usePricing();
  const pricing = pricingData ?? FALLBACK_PRICING;
  const cancelSubscription = useCancelSubscription();
  const resumeSubscription = useResumeSubscription();
  const changePlan = useChangePlan();
  const toast = useToast();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  if (isLoading || !subscription) {
    return <div className="h-24 rounded-lg bg-neutral-100 animate-pulse" />;
  }

  const tier = planTier(subscription);
  const paid = tier !== "free";
  const source = subscription.planSource;
  // Only a Polar subscription can be changed or cancelled here; a gift, the
  // lifetime deal or an old one-off period just runs its course.
  const manageable = source === "subscription" && subscription.subscriptionProvider === "POLAR";
  const period = subscription.plan && subscription.plan !== "lifetime" ? subscription.plan : null;
  const planName = tier === "pro" ? "Pro" : tier === "plus" ? "Plus" : "Free";
  const periodLabel = subscription.plan === "lifetime" ? "Lifetime" : period ? PERIOD_LABEL[period] : null;
  const price = tier !== "free" && period ? pricing.plans[tier][period].price : null;

  const handleConfirmCancel = async () => {
    setCancelError(null);
    try {
      await cancelSubscription.mutateAsync();
      setShowCancelModal(false);
    } catch (err) {
      setCancelError(errorMessage(err, "Could not cancel your subscription. Please try again."));
    }
  };

  const handleConfirmChange = async (choice: PlanChoice) => {
    setChangeError(null);
    try {
      await changePlan.mutateAsync(choice);
      setShowChangeModal(false);
      toast.success(`You're now on ${TIER_LABEL[choice.tier]} · ${PERIOD_LABEL[choice.period]}`);
    } catch (err) {
      setChangeError(errorMessage(err, "Could not change your plan. Please try again."));
    }
  };

  const handleConfirmResume = async () => {
    setCancelError(null);
    try {
      await resumeSubscription.mutateAsync();
      setShowCancelModal(false);
    } catch (err) {
      setCancelError(errorMessage(err, "Could not resume your subscription. Please try again."));
    }
  };

  const description = !paid
    ? subscription.isExpired
      ? "Your plan has ended. Your CVs and profiles are still here."
      : `Your first AI CV is free. After that, pay per CV when you download (${formatPrice(pricing.payPerCv.cv_new.price)} new, ${formatPrice(pricing.payPerCv.cv_edit.price)} tailored or improved), or pick a plan.`
    : source === "grant"
      ? `${planName} from the GoMoxie team${subscription.proGrantExpiresAt ? ` until ${formatDate(subscription.proGrantExpiresAt)}` : ""}. You aren't being charged for it.`
      : source === "lifetime"
        ? `Plus for life. Your limits reset every month${subscription.periodEndsAt ? `, next on ${formatDate(subscription.periodEndsAt)}` : ""}.`
        : !manageable
          ? `Active until ${formatDate(subscription.currentPeriodEnd)}. This plan doesn't renew on its own.`
          : `${price ? `${formatPrice(price)} ${period ? PERIOD_SUFFIX[period] : ""}. ` : ""}${
              subscription.cancelAtPeriodEnd
                ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}. You keep ${planName} until then.`
                : subscription.currentPeriodEnd
                  ? `Renews on ${formatDate(subscription.currentPeriodEnd)}.`
                  : ""
            }`;

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-neutral-950 tracking-tight">
              {paid ? `${planName}${periodLabel ? ` · ${periodLabel}` : ""}` : subscription.isExpired ? "Free (plan ended)" : "Free"}
            </span>
            {paid && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent text-white">
                {source === "grant" ? "Complimentary" : subscription.cancelAtPeriodEnd ? "Cancels soon" : "Active"}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-neutral-500 max-w-xl">{description}</p>

          {/* What's left this period (Plus), or of the free CV. Pro shows nothing: it's unlimited. */}
          {tier === "plus" && subscription.freeUses && (
            <div className="mt-5 max-w-md">
              <div className="text-xs text-neutral-600 mb-1.5">
                Left this period{subscription.periodEndsAt ? ` · resets ${formatDate(subscription.periodEndsAt)}` : ""}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {FLOW_USAGE.map(({ flow, label }) => {
                  const usage = subscription.freeUses?.[flow];
                  return (
                    <span key={flow} className="rounded-md border border-neutral-200 px-2 py-1.5 text-center text-[11px] font-semibold text-neutral-800">
                      {usage?.remaining ?? 0}
                      <span className="text-neutral-400"> / {usage?.limit ?? 0}</span>
                      <span className="block text-[10px] font-normal text-neutral-500">{label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {!paid && subscription.free && (
            <p className="mt-4 text-xs text-neutral-600">
              Free CVs left: <span className="font-semibold">{subscription.free.remaining ?? 0}</span>
              {subscription.unpaidCvs && subscription.unpaidCvs.count > 0 && (
                <> · CVs waiting to be paid for: <span className="font-semibold">{subscription.unpaidCvs.count}</span></>
              )}
            </p>
          )}
          {/* The Plus Lifetime deal, while it's listed (see the backend's price list). */}
          {!paid && (pricing.lifetime.offer.listed ?? pricing.lifetime.offer.available) && (
            <Link
              href="/dashboard/upgrade"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:border-amber-400"
            >
              <InfinityIcon className="h-3.5 w-3.5" />
              Plus Lifetime: {formatPrice(pricing.lifetime.price)} once, limited offer
            </Link>
          )}
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 md:w-60">
          {manageable ? (
            <>
              <button type="button" onClick={() => setShowChangeModal(true)} className={SECONDARY_BUTTON}>
                Change plan
              </button>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className={
                  subscription.cancelAtPeriodEnd
                    ? SECONDARY_BUTTON
                    : "inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-red-200 bg-white text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                }
              >
                {subscription.cancelAtPeriodEnd ? "Keep my plan" : "Cancel plan"}
              </button>
            </>
          ) : (
            tier !== "pro" && (
              <Link
                href="/dashboard/upgrade"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-strong transition-colors cursor-pointer"
              >
                {tier === "plus" ? "Upgrade to Pro" : subscription.isExpired ? "Renew a plan" : "See plans"}
              </Link>
            )
          )}
          <Link href="/pricing" className="text-center text-xs font-semibold text-neutral-500 hover:text-neutral-900 py-1">
            Compare plans
          </Link>
        </div>
      </div>

      {showChangeModal && tier !== "free" && (
        <ChangePlanModal
          isOpen
          current={{ tier, period }}
          isCancelScheduled={subscription.cancelAtPeriodEnd}
          isProcessing={changePlan.isPending}
          error={changeError}
          onConfirm={handleConfirmChange}
          onClose={() => {
            setShowChangeModal(false);
            setChangeError(null);
          }}
        />
      )}

      <CancelPlanModal
        isOpen={showCancelModal}
        isCancelScheduled={subscription.cancelAtPeriodEnd}
        periodEndLabel={formatDate(subscription.currentPeriodEnd) || "the end of your billing period"}
        isProcessing={cancelSubscription.isPending || resumeSubscription.isPending}
        error={cancelError}
        onConfirmCancel={handleConfirmCancel}
        onConfirmResume={handleConfirmResume}
        onClose={() => {
          setShowCancelModal(false);
          setCancelError(null);
        }}
      />
    </>
  );
}

/* ---------------- Delete account ---------------- */

const DELETION_REASONS: { value: DeletionReason; label: string }[] = [
  { value: "got_the_job", label: "I got the job" },
  { value: "not_useful", label: "It wasn't useful" },
  { value: "poor_results", label: "The CVs weren't good enough" },
  { value: "too_expensive", label: "Too expensive" },
  { value: "other_service", label: "I'm using something else" },
  { value: "privacy", label: "Privacy concerns" },
  { value: "other", label: "Something else" },
];

function DeleteAccountModal({ me, onClose }: { me: ApiUser; onClose: () => void }) {
  const deleteAccount = useDeleteAccount();
  const [password, setPassword] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  // Optional, and stored without anything that identifies them.
  const [reason, setReason] = useState<DeletionReason | null>(null);
  const [comment, setComment] = useState("");

  const canDelete = me.hasPassword
    ? password.length > 0
    : confirmEmail.trim().toLowerCase() === me.email.toLowerCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const feedback = { ...(reason ? { reason } : {}), ...(comment.trim() ? { comment: comment.trim() } : {}) };
    deleteAccount.mutate(me.hasPassword ? { password, ...feedback } : { confirmEmail: confirmEmail.trim(), ...feedback });
  };

  const error = deleteAccount.error;
  const isSubscriptionBlock = error instanceof ApiError && error.code === "ACTIVE_SUBSCRIPTION";

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-7">
          <span className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-50 border border-red-200 text-red-600 mb-4">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <h3 className="text-lg font-bold text-neutral-950 tracking-tight">Delete your account?</h3>
          <p className="mt-1.5 text-sm text-neutral-500 leading-relaxed">
            This permanently deletes your resumes, career profiles and payment history. It can&apos;t be undone.
          </p>

          <fieldset className="mt-5">
            <legend className={LABEL_CLASS}>
              Mind telling us why? <span className="font-normal text-neutral-400">· optional</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {DELETION_REASONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={reason === value}
                  onClick={() => setReason(reason === value ? null : value)}
                  className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                    reason === value ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {reason && (
              <>
                <label htmlFor="deleteComment" className="sr-only">
                  Anything you&apos;d like to add?
                </label>
                <textarea
                  id="deleteComment"
                  rows={2}
                  maxLength={1000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Anything you'd like to add? (optional)"
                  className={`${INPUT_CLASS} mt-2.5 resize-none`}
                />
              </>
            )}
            <p className="mt-1.5 text-[11px] text-neutral-400">Kept without your name or email, only to improve GoMoxie.</p>
          </fieldset>

          <div className="mt-5">
            {me.hasPassword ? (
              <>
                <label htmlFor="deletePassword" className={LABEL_CLASS}>
                  Enter your password to confirm
                </label>
                <input
                  id="deletePassword"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={INPUT_CLASS}
                />
              </>
            ) : (
              <>
                <label htmlFor="deleteEmail" className={LABEL_CLASS}>
                  Type <span className="font-bold text-neutral-900">{me.email}</span> to confirm
                </label>
                <input
                  id="deleteEmail"
                  type="email"
                  autoFocus
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  className={INPUT_CLASS}
                />
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
              {errorMessage(error, "Could not delete your account. Please try again.")}
              {isSubscriptionBlock && (
                <a href="#plan" onClick={onClose} className="block mt-1 font-semibold underline">
                  Go to Plan & usage
                </a>
              )}
            </div>
          )}
        </div>

        <div className="px-7 py-4 border-t border-neutral-200 bg-neutral-50/80 flex gap-2.5">
          <button type="button" onClick={onClose} className={`${SECONDARY_BUTTON} flex-1`}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canDelete || deleteAccount.isPending}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteAccount.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {deleteAccount.isPending ? "Deleting..." : "Delete account"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- Career profiles ---------------- */

const AUTO_SYNC_OPTIONS: { value: ProfileAutoSync; label: string; hint: string }[] = [
  { value: "ask", label: "Ask me each time", hint: "After a new CV is ready, we show what it would add and you decide." },
  { value: "always", label: "Update automatically", hint: "No questions: new CVs update the matching profile (or start one for a new role) in the background, and a short notice tells you what changed. Undo any time from the profile's History." },
  { value: "never", label: "Don't update my profiles", hint: "New CVs never change your profiles. You can still update a profile by hand." },
];

function CareerProfilesSection({ me }: { me: ApiUser }) {
  const updateProfile = useUpdateProfile();
  const toast = useToast();
  const isPro = canUseCareerProfiles(useSubscriptionStatus().data);
  const [error, setError] = useState<string | null>(null);

  const choose = async (value: ProfileAutoSync) => {
    if (value === me.profileAutoSync) return;
    setError(null);
    try {
      await updateProfile.mutateAsync({ profileAutoSync: value });
      toast.success("Preference saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your preference.");
    }
  };

  return (
    <div>
      <fieldset disabled={!isPro || updateProfile.isPending}>
        <legend className="text-sm font-semibold text-neutral-900">When you finish a new CV</legend>
        <p className="mt-0.5 mb-4 text-xs text-neutral-500">
          Only facts are added (roles, skills, education…). Nothing is replaced, and anything you edited by hand is left
          alone.
        </p>
        <div className="space-y-2">
          {AUTO_SYNC_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors ${
                me.profileAutoSync === option.value ? "border-neutral-950 bg-neutral-50" : "border-neutral-200 hover:border-neutral-300"
              } ${!isPro ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <input
                type="radio"
                name="profileAutoSync"
                value={option.value}
                checked={me.profileAutoSync === option.value}
                onChange={() => choose(option.value)}
                className="mt-0.5 accent-neutral-900"
              />
              <span>
                <span className="block text-sm font-semibold text-neutral-900">{option.label}</span>
                <span className="block text-xs text-neutral-500 mt-0.5">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {!isPro && (
        <p className="mt-4 text-xs text-neutral-500">
          Career profiles come with Plus and Pro.{" "}
          <Link href="/dashboard/upgrade" className="font-semibold text-accent-strong hover:text-accent">
            Upgrade
          </Link>
        </p>
      )}
      <div className="mt-3">
        <StatusMessage error={error} />
      </div>
    </div>
  );
}

/* ---------------- Notifications ---------------- */

const PUSH_BLOCKED_MESSAGES: Record<Exclude<PushSupport, "supported">, string> = {
  unsupported: "This browser doesn't support push notifications. You'll still see messages in the bell at the top of the dashboard.",
  insecure: "Browser notifications need a secure (https) connection.",
};

function NotificationsSection() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const prefs = useQuery({ queryKey: ["notification-preferences"], queryFn: getNotificationPreferences });
  // Settings only renders in the browser (behind AuthGuard), so these can be
  // read straight away.
  const [support] = useState<PushSupport>(() => pushSupport());
  const [permission, setPermission] = useState<NotificationPermission | null>(() =>
    support === "supported" ? Notification.permission : null
  );
  const [subscribedHere, setSubscribedHere] = useState(false);
  const [busy, setBusy] = useState<"email" | "push" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (support !== "supported") return;
    currentPushSubscription()
      .then((sub) => setSubscribedHere(Boolean(sub)))
      .catch(() => setSubscribedHere(false));
  }, [support]);

  const toggleEmail = async (enabled: boolean) => {
    setBusy("email");
    setError(null);
    try {
      await updateNotificationPreferences({ emailAnnouncements: enabled });
      await queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success(enabled ? "You'll get product announcements by email" : "Unsubscribed from announcement emails");
    } catch (err) {
      setError(errorMessage(err, "Could not save your preference."));
    } finally {
      setBusy(null);
    }
  };

  const togglePush = async () => {
    const publicKey = prefs.data?.push.publicKey;
    setBusy("push");
    setError(null);
    try {
      if (subscribedHere) {
        await disablePush();
        setSubscribedHere(false);
        toast.success("Browser notifications turned off on this device");
      } else {
        if (!publicKey) throw new Error("Browser notifications aren't available right now.");
        await enablePush(publicKey);
        setSubscribedHere(true);
        toast.success("Browser notifications turned on for this device");
      }
      setPermission(Notification.permission);
      await queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    } catch (err) {
      setPermission(typeof Notification !== "undefined" ? Notification.permission : null);
      setError(err instanceof PushPermissionDeniedError || err instanceof Error ? err.message : "Could not change browser notifications.");
    } finally {
      setBusy(null);
    }
  };

  if (prefs.isLoading) return <div className="h-32 rounded-lg bg-neutral-100 animate-pulse" />;
  if (prefs.isError || !prefs.data) return <StatusMessage error="Could not load your notification settings." />;

  const pushAvailable = prefs.data.push.available;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-neutral-900">Product news and tips by email</div>
          <p className="mt-0.5 text-xs text-neutral-500 max-w-md">
            New features, occasional news, and a few tips while you&apos;re getting started. Account, security and billing emails are always sent.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.data.emailAnnouncements}
            disabled={busy !== null}
            onChange={(e) => toggleEmail(e.target.checked)}
            className="w-4 h-4 accent-neutral-900"
          />
          <span className="text-sm font-medium text-neutral-700">{prefs.data.emailAnnouncements ? "On" : "Off"}</span>
        </label>
      </div>

      <div className="flex items-start justify-between gap-4 border-t border-neutral-200 pt-5">
        <div>
          <div className="text-sm font-semibold text-neutral-900">Browser notifications on this device</div>
          <p className="mt-0.5 text-xs text-neutral-500 max-w-md">
            {!pushAvailable
              ? "Not available right now. Messages from the team still appear in the bell at the top of the dashboard."
              : support !== "supported"
                ? PUSH_BLOCKED_MESSAGES[support]
                : permission === "denied"
                  ? "Notifications are blocked for this site. Allow them in your browser's site settings, then try again."
                  : "Get important updates even when GoMoxie isn't open. You can turn this off any time."}
          </p>
          {prefs.data.push.subscribedDevices > 0 && (
            <p className="mt-1 text-xs text-neutral-400">
              On for {prefs.data.push.subscribedDevices} device{prefs.data.push.subscribedDevices === 1 ? "" : "s"}.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={togglePush}
          disabled={busy !== null || !pushAvailable || support !== "supported" || (permission === "denied" && !subscribedHere)}
          className={subscribedHere ? SECONDARY_BUTTON : PRIMARY_BUTTON}
        >
          {busy === "push" && <Loader2 className="w-4 h-4 animate-spin" />}
          {subscribedHere ? "Turn off" : "Turn on"}
        </button>
      </div>

      <StatusMessage error={error} />
    </div>
  );
}

/* ---------------- Section picker (small screens) ---------------- */

// Below lg the tab column doesn't fit, so the sections collapse into one
// dropdown: the button names the open section and the menu always lists
// every section, so none of them is hidden off-screen.
function SectionPicker({ active }: { active: SectionId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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
    <div ref={ref} className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-full flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-neutral-300 cursor-pointer"
      >
        <CurrentIcon className={`w-4 h-4 shrink-0 ${active === "danger" ? "text-red-500" : "text-neutral-500"}`} />
        <span className={`flex-1 text-sm font-semibold ${active === "danger" ? "text-red-600" : "text-neutral-950"}`}>
          {current.label}
        </span>
        <span className="text-xs text-neutral-400">
          {SECTIONS.indexOf(current) + 1} of {SECTIONS.length}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg animate-in fade-in duration-100"
        >
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === active;
            const danger = s.id === "danger";
            return (
              <React.Fragment key={s.id}>
                {danger && <div className="my-1.5 h-px bg-neutral-100" aria-hidden />}
                <a
                  href={`#${s.id}`}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive ? "bg-neutral-100 font-semibold" : "font-medium hover:bg-neutral-50"
                  } ${danger ? "text-red-600" : isActive ? "text-neutral-950" : "text-neutral-700"}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${danger ? "text-red-500" : "text-neutral-400"}`} />
                  <span className="flex-1">{s.label}</span>
                  {isActive && <Check className="w-4 h-4 text-neutral-500" />}
                </a>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Page ---------------- */

export function SettingsView() {
  const { data: me, isLoading } = useMe();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const active = useActiveSection();

  const tabClass = (id: SectionId) =>
    `whitespace-nowrap px-3 py-2 rounded-lg border text-sm transition-colors ${
      active === id
        ? `bg-white border-neutral-300 font-semibold ${id === "danger" ? "text-red-600" : "text-neutral-950"}`
        : `border-transparent font-medium hover:bg-white hover:border-neutral-200 ${
            id === "danger" ? "text-red-500 hover:text-red-600" : "text-neutral-600 hover:text-neutral-950"
          }`
    }`;

  return (
    <div className="px-8 pt-6 pb-10 sm:px-14 sm:pt-8 sm:pb-14 lg:px-20 lg:pt-8 lg:pb-16 max-w-6xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8 lg:gap-12">
        {/* Sections: a dropdown on small screens, a sticky tab column on large ones. */}
        <nav aria-label="Settings sections">
          <SectionPicker active={active} />
          <div className="hidden lg:flex flex-col gap-1 sticky top-8">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                aria-current={active === s.id ? "page" : undefined}
                className={`block ${tabClass(s.id)}`}
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          {active === "profile" && (
            <Section id="profile" icon={User} tone="accent" title="Profile" description="Your details, used as the defaults on every new resume.">
              {me ? (
                <ProfileForm key={[me.id, me.firstName, me.lastName, me.email, me.phone, me.careerStage, ...(me.professions ?? [])].join("|")} me={me} />
              ) : (
                <div className="h-20 rounded-lg bg-neutral-100 animate-pulse" />
              )}
            </Section>
          )}

          {active === "security" && (
            <Section id="security" icon={Shield} tone="sky" title="Sign-in & security" description="Password, sign-in methods and active sessions.">
              {me ? <SecuritySection me={me} /> : <div className="h-32 rounded-lg bg-neutral-100 animate-pulse" />}
            </Section>
          )}

          {active === "plan" && (
            <Section id="plan" icon={CreditCard} tone="violet" title="Plan & usage" description="Your subscription and free generations.">
              <PlanSection />
            </Section>
          )}

          {active === "notifications" && (
            <Section id="notifications" icon={Bell} tone="sky" title="Notifications" description="Announcement emails and browser notifications.">
              <NotificationsSection />
            </Section>
          )}

          {active === "career-profiles" && (
            <Section
              id="career-profiles"
              icon={Briefcase}
              tone="emerald"
              title="Career profiles"
              description="How new CVs keep your role profiles up to date."
            >
              {me ? <CareerProfilesSection me={me} /> : <div className="h-32 rounded-lg bg-neutral-100 animate-pulse" />}
            </Section>
          )}

          {active === "danger" && (
            <section aria-labelledby="danger-title" className="rounded-lg border border-red-200 bg-white animate-in fade-in duration-150">
              <div className="flex items-center gap-3 px-6 sm:px-7 py-5 border-b border-red-100">
                <span className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-red-50 border border-red-200 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <div>
                  <h2 id="danger-title" className="text-base font-bold text-neutral-950 tracking-tight">
                    Delete account
                  </h2>
                  <p className="text-xs text-neutral-500">Permanently remove your account and everything in it.</p>
                </div>
              </div>
              <div className="p-6 sm:p-7">
                <ul className="space-y-1.5 text-sm text-neutral-600 list-disc pl-5">
                  <li>All your resumes and career profiles are deleted.</li>
                  <li>Your payment history is removed.</li>
                  <li>A renewing Pro subscription must be cancelled first.</li>
                  <li>This can&apos;t be undone.</li>
                </ul>
                <button
                  type="button"
                  disabled={isLoading || !me}
                  onClick={() => setShowDeleteModal(true)}
                  className="mt-6 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Delete my account
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      {showDeleteModal && me && <DeleteAccountModal me={me} onClose={() => setShowDeleteModal(false)} />}
    </div>
  );
}
