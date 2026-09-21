"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Settings,
  User,
  Shield,
  CreditCard,
  Bell,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  LogOut,
  Loader2,
} from "lucide-react";
import {
  useSubscriptionStatus,
  useStartProCheckout,
  useCancelSubscription,
  useResumeSubscription,
} from "@/hooks/use-subscription";
import { useMe, useUpdateProfile, useLogout } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { CancelPlanModal } from "@/components/dashboard/CancelPlanModal";

function formatPeriodEnd(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function SettingsView() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx">("pdf");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const { data: subscription, isLoading: isSubscriptionLoading } = useSubscriptionStatus();
  const checkout = useStartProCheckout();
  const cancelSubscription = useCancelSubscription();
  const resumeSubscription = useResumeSubscription();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const logoutMutation = useLogout();

  // Seed the editable fields from the real profile once it loads — never
  // hardcode a placeholder name/email.
  useEffect(() => {
    if (me) {
      setFullName(me.fullName ?? "");
      setEmail(me.email);
    }
  }, [me]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    try {
      await updateProfile.mutateAsync({ fullName: fullName.trim(), email: email.trim() });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "Could not save your changes. Please try again.");
    }
  };

  const handleConfirmCancel = async () => {
    setCancelError(null);
    try {
      await cancelSubscription.mutateAsync();
      setShowCancelModal(false);
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Could not cancel your subscription. Please try again.");
    }
  };

  const handleConfirmResume = async () => {
    setCancelError(null);
    try {
      await resumeSubscription.mutateAsync();
      setShowCancelModal(false);
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Could not resume your subscription. Please try again.");
    }
  };

  return (
    <div className="px-8 py-10 sm:px-14 sm:py-14 lg:px-20 lg:py-16 max-w-5xl mx-auto w-full">
      {/* Top Header */}
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950">
          Account Settings
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Manage your personal details, subscription tier, and export defaults.
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile Card */}
        <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-2xs p-6 sm:p-8">
          <div className="flex items-center gap-3 pb-5 border-b border-neutral-100 mb-6">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-950">
                Personal Information
              </h2>
              <p className="text-xs text-neutral-500">
                Update your name and email address
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              {profileError ? (
                <span className="text-xs font-semibold text-rose-600">{profileError}</span>
              ) : (
                savedSuccess && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Changes saved successfully</span>
                  </span>
                )
              )}
              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="ml-auto px-6 py-2.5 rounded-xl bg-neutral-950 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {updateProfile.isPending ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>

        {/* Subscription Plan Card */}
        <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-2xs p-6 sm:p-8">
          <div className="flex items-center gap-3 pb-5 border-b border-neutral-100 mb-6">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-950">
                Subscription &amp; Billing
              </h2>
              <p className="text-xs text-neutral-500">
                Manage your active plan and payment methods
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {isSubscriptionLoading ? (
              <div className="text-xs text-neutral-500">Loading subscription status...</div>
            ) : subscription?.isPro && subscription.subscriptionProvider === "CHAPA" ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-neutral-950">FitCV Pro Plan</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-950 text-white">
                    Active
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                    via Chapa
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  80 ETB / month. Active until {formatPeriodEnd(subscription.currentPeriodEnd)} — Chapa
                  doesn&apos;t auto-renew, so you&apos;ll need to pay again (via Chapa or Polar) after that to
                  keep Pro access.
                </p>
              </div>
            ) : subscription?.isPro ? (
              <>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-neutral-950">FitCV Pro Plan</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-950 text-white">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    $5 per month.{" "}
                    {subscription.cancelAtPeriodEnd
                      ? `Cancels on ${formatPeriodEnd(subscription.currentPeriodEnd)} — you'll keep Pro access until then.`
                      : subscription.currentPeriodEnd
                        ? `Next renewal: ${formatPeriodEnd(subscription.currentPeriodEnd)}.`
                        : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/pricing"
                    className="px-4 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    Manage Plan
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      subscription.cancelAtPeriodEnd
                        ? "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100"
                        : "border-red-200 bg-white text-red-600 hover:bg-red-50"
                    }`}
                  >
                    {subscription.cancelAtPeriodEnd ? "Undo Cancellation" : "Cancel Plan"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-neutral-950">
                      {subscription?.isExpired ? "Plan Expired" : "Free Plan"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    {subscription?.isExpired
                      ? "Your FitCV Pro plan has expired and your free generations are already used up."
                      : subscription
                        ? `${subscription.freeGenerationsUsed} of 3 free CV generations used.`
                        : "3 free CV generations."}{" "}
                    {subscription?.isExpired
                      ? "Renew below to get unlimited AI tailoring back."
                      : "Upgrade to FitCV Pro for unlimited AI tailoring."}
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => checkout.mutate("polar")}
                    disabled={checkout.isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {checkout.isPending && checkout.variables === "polar" && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>
                      {checkout.isPending && checkout.variables === "polar"
                        ? "Redirecting..."
                        : subscription?.isExpired
                          ? "Renew with Polar — $5/mo"
                          : "Pay with Polar — $5/mo"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => checkout.mutate("chapa")}
                    disabled={checkout.isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-200 bg-white text-neutral-800 text-xs font-semibold hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {checkout.isPending && checkout.variables === "chapa" && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>
                      {checkout.isPending && checkout.variables === "chapa"
                        ? "Redirecting..."
                        : subscription?.isExpired
                          ? "Renew with Chapa — 80 ETB/mo"
                          : "Pay with Chapa (local) — 80 ETB/mo"}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Export & Formatting Defaults */}
        <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-2xs p-6 sm:p-8">
          <div className="flex items-center gap-3 pb-5 border-b border-neutral-100 mb-6">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-950">
                Export &amp; Parser Defaults
              </h2>
              <p className="text-xs text-neutral-500">
                Configure default download formats and ATS standard rules
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 cursor-pointer hover:bg-neutral-50/70 transition-colors">
              <div>
                <div className="text-xs font-bold text-neutral-900">
                  Standard ATS Machine-Readable PDF
                </div>
                <div className="text-[11px] text-neutral-500">
                  Recommended. 100% compliant with Greenhouse, Lever, and Workday parsers.
                </div>
              </div>
              <input
                type="radio"
                name="exportFormat"
                checked={exportFormat === "pdf"}
                onChange={() => setExportFormat("pdf")}
                className="w-4 h-4 text-neutral-950 focus:ring-neutral-950"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 cursor-pointer hover:bg-neutral-50/70 transition-colors">
              <div>
                <div className="text-xs font-bold text-neutral-900">
                  Editable Microsoft Word (.docx)
                </div>
                <div className="text-[11px] text-neutral-500">
                  For headhunters or recruiters who request editable Word attachments.
                </div>
              </div>
              <input
                type="radio"
                name="exportFormat"
                checked={exportFormat === "docx"}
                onChange={() => setExportFormat("docx")}
                className="w-4 h-4 text-neutral-950 focus:ring-neutral-950"
              />
            </label>
          </div>
        </div>

        {/* Session & Sign Out Card */}
        <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-2xs p-6 sm:p-8">
          <div className="flex items-center gap-3 pb-5 border-b border-neutral-100 mb-6">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-950">
                Account Session
              </h2>
              <p className="text-xs text-neutral-500">
                Log out of your Resumate session on this device
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-50/80 border border-neutral-200/80">
            <div>
              <div className="text-xs font-bold text-neutral-900">
                Logged in as {me?.fullName || me?.email || "..."}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {me?.email ?? ""} • {subscription?.isPro ? "Active Pro workspace" : "Free workspace"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-semibold text-xs transition-colors shadow-2xs cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {logoutMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>{logoutMutation.isPending ? "Logging out..." : "Log out of Resumate"}</span>
            </button>
          </div>
        </div>
      </div>

      <CancelPlanModal
        isOpen={showCancelModal}
        isCancelScheduled={subscription?.cancelAtPeriodEnd ?? false}
        periodEndLabel={formatPeriodEnd(subscription?.currentPeriodEnd ?? null) || "the end of your billing period"}
        isProcessing={cancelSubscription.isPending || resumeSubscription.isPending}
        error={cancelError}
        onConfirmCancel={handleConfirmCancel}
        onConfirmResume={handleConfirmResume}
        onClose={() => {
          setShowCancelModal(false);
          setCancelError(null);
        }}
      />
    </div>
  );
}
