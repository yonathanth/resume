"use client";

import React, { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { ApiError, ApiUser } from "@/lib/api";
import { useUpdateProfile } from "@/hooks/use-auth";
import { FlowModal, StepEyebrow } from "./create-flow/FlowUI";
import { ProfessionInput } from "./ProfessionInput";

const STEPS = ["name", "phone", "profession"] as const;
type Step = (typeof STEPS)[number];

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition";
const LABEL_CLASS = "block text-sm font-semibold text-neutral-900 mb-1.5";
const PHONE_PATTERN = /^[+\d\s().-]*$/;

/** Google sign-ups arrive with a full name only — split it as a starting point. */
function initialNames(me: ApiUser): { first: string; last: string } {
  if (me.firstName || me.lastName) return { first: me.firstName ?? "", last: me.lastName ?? "" };
  const parts = (me.fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

/**
 * First-run questions for a new account: name, phone and profession. Saved to
 * the account (editable later in Account settings) and used by the AI as the
 * default contact details on every CV, so it doesn't have to ask each time.
 * `onFinished` is called with their first name when they complete it (not
 * when they skip it) — the dashboard welcomes them with it.
 */
export function OnboardingModal({ me, onFinished }: { me: ApiUser; onFinished?: (firstName: string) => void }) {
  const updateProfile = useUpdateProfile();
  const names = initialNames(me);
  const [step, setStep] = useState<Step>("name");
  const [firstName, setFirstName] = useState(names.first);
  const [lastName, setLastName] = useState(names.last);
  const [phone, setPhone] = useState(me.phone ?? "");
  const [profession, setProfession] = useState(me.occupationTitle ?? "");
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const phoneInvalid = !PHONE_PATTERN.test(phone);

  const canContinue =
    step === "name"
      ? firstName.trim().length > 0 && lastName.trim().length > 0
      : step === "phone"
        ? !phoneInvalid
        : profession.trim().length > 0;

  const submit = async (skipAll = false) => {
    setError(null);
    try {
      await updateProfile.mutateAsync(
        skipAll
          ? { completeOnboarding: true }
          : {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone: phone.trim(),
              occupationTitle: profession.trim(),
              completeOnboarding: true,
            }
      );
      // The saved user no longer needs onboarding, so the dashboard stops rendering this.
      if (!skipAll) onFinished?.(firstName.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your details. Please try again.");
    }
  };

  const next = () => {
    if (!canContinue) return;
    if (step === "profession") submit();
    else setStep(STEPS[stepIndex + 1]);
  };

  return (
    <FlowModal stepKey={step}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === stepIndex ? "w-8 bg-accent" : i < stepIndex ? "w-4 bg-accent-border" : "w-4 bg-neutral-200"
              }`}
            />
          ))}
        </div>

        {step === "name" && (
          <>
            <StepEyebrow>Welcome to Resumate</StepEyebrow>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-950">Let&apos;s start with your name</h2>
            <p className="mt-1.5 text-sm text-neutral-500">
              We&apos;ll put it on your resumes, so you won&apos;t have to type it each time.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="onb-first" className={LABEL_CLASS}>
                  First name
                </label>
                <input
                  id="onb-first"
                  autoFocus
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="onb-last" className={LABEL_CLASS}>
                  Last name
                </label>
                <input
                  id="onb-last"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </>
        )}

        {step === "phone" && (
          <>
            <StepEyebrow>Step 2 of 3</StepEyebrow>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-950">How can employers reach you?</h2>
            <p className="mt-1.5 text-sm text-neutral-500">
              Your email is already set to <span className="font-medium text-neutral-800">{me.email}</span>. Add a phone
              number if you&apos;d like it on your resumes.
            </p>
            <div className="mt-6">
              <label htmlFor="onb-phone" className={LABEL_CLASS}>
                Phone number <span className="font-normal text-neutral-400">· optional</span>
              </label>
              <input
                id="onb-phone"
                type="tel"
                autoFocus
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251 91 234 5678"
                className={INPUT_CLASS}
              />
              {phoneInvalid && <p className="mt-1.5 text-xs text-red-600">Use digits, spaces and + ( ) - only.</p>}
            </div>
          </>
        )}

        {step === "profession" && (
          <>
            <StepEyebrow>Last step</StepEyebrow>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-950">What&apos;s your profession?</h2>
            <p className="mt-1.5 text-sm text-neutral-500">
              Pick one from the list, or type your own if it isn&apos;t there. It becomes the headline on new resumes.
            </p>
            {/* Room below the field so the suggestion list isn't clipped. */}
            <div className="mt-6 min-h-[18rem]">
              <label htmlFor="onb-profession" className={LABEL_CLASS}>
                Profession
              </label>
              <ProfessionInput id="onb-profession" autoFocus value={profession} onChange={setProfession} />
            </div>
          </>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-8 flex items-center gap-3">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={() => setStep(STEPS[stepIndex - 1])}
              className="px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-semibold text-neutral-700 hover:border-neutral-400 transition-colors cursor-pointer"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={!canContinue || updateProfile.isPending}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateProfile.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {step === "profession" ? (updateProfile.isPending ? "Saving..." : "Finish") : step === "phone" && !phone.trim() ? "Skip" : "Continue"}
            {!updateProfile.isPending && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        <button
          type="button"
          onClick={() => submit(true)}
          disabled={updateProfile.isPending}
          className="mt-4 w-full text-center text-xs font-medium text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          Skip setup, I&apos;ll add these later in Account settings
        </button>
      </form>
    </FlowModal>
  );
}
