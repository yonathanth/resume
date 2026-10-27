"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, FilePlus, Loader2, PenLine, Target, Upload, X } from "lucide-react";
import { ApiError, type AcquisitionSource, type ApiUser, type CareerStage, type SignupIntent, type UpdateMeInput } from "@/lib/api";
import { useUpdateProfile } from "@/hooks/use-auth";
import { firstTouch, track } from "@/lib/analytics";
import { peekQuickIntent, saveQuickIntent } from "@/lib/quick-links";
import { markFillDetailsFromCv } from "@/lib/finished-cv";
import { setPendingUpload } from "@/lib/pending-upload";
import { FlowModal, StepEyebrow } from "./create-flow/FlowUI";
import { ICON_TONES, type OptionTone } from "./create-flow/OptionCard";
import { ProfessionsInput, addProfession } from "./ProfessionsInput";

type Step = "intent" | "about" | "career" | "source";

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition";
const LABEL_CLASS = "block text-sm font-semibold text-neutral-900 mb-1.5";
const CHIP_CLASS =
  "px-3 py-1.5 rounded-full border text-sm font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/20";
const UPLOAD_ACCEPT = ".pdf,.docx,.png,.jpg,.jpeg";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const INTENTS: { value: SignupIntent; title: string; description: string; icon: React.ComponentType<{ className?: string }>; tone: OptionTone }[] = [
  { value: "improve", title: "I have a CV to improve", description: "Upload it and we'll make it stronger.", icon: PenLine, tone: "violet" },
  { value: "tailor", title: "I'm applying to a specific job", description: "Match your CV to the job posting.", icon: Target, tone: "sky" },
  { value: "create", title: "Start from scratch", description: "Answer a few questions, get a finished CV.", icon: FilePlus, tone: "accent" },
];

export const CAREER_STAGES: { value: CareerStage; label: string }[] = [
  { value: "student", label: "Student or graduate" },
  { value: "entry", label: "Early career (0–2 yrs)" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior or lead" },
  { value: "career_change", label: "Changing careers" },
];

const SOURCES: { value: AcquisitionSource; label: string }[] = [
  { value: "search", label: "Google or another search" },
  { value: "social", label: "Social media" },
  { value: "telegram", label: "Telegram" },
  { value: "friend", label: "A friend or colleague" },
  { value: "school", label: "School or university" },
  { value: "ad", label: "An ad" },
  { value: "other", label: "Somewhere else" },
];

/** Google sign-ups arrive with a full name only — split it as a starting point. */
function initialNames(me: ApiUser): { first: string; last: string } {
  if (me.firstName || me.lastName) return { first: me.firstName ?? "", last: me.lastName ?? "" };
  const parts = (me.fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

/**
 * Which questions to ask. Someone who signed up on a /try page already told
 * us what they came to do and made a CV that filled in most of the rest (see
 * completeOnboardingFromCv): they only get what's still missing.
 */
function stepsFor(me: ApiUser): { steps: Step[]; askName: boolean; askProfession: boolean } {
  const fromTry = me.signupSurface === "try";
  const askName = !fromTry || !me.firstName || !me.lastName;
  const askProfession = !fromTry || !me.occupationTitle;
  const steps: Step[] = [];
  if (!me.signupIntent) steps.push("intent");
  if (askName) steps.push("about");
  if (askProfession || !me.careerStage) steps.push("career");
  if (!me.acquisitionSource) steps.push("source");
  return { steps: steps.length ? steps : ["career"], askName, askProfession };
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`${CHIP_CLASS} ${
        selected ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * First-run questions for a new account, in up to four short steps:
 *   1. what they came to do (improve / tailor / create) — the flow that opens when they finish
 *   2. their name; choosing "improve", they can upload their CV instead and
 *      we fill in their details from it
 *   3. their professions (one or more, main first) and (optionally) career stage
 *   4. how they heard about us (optional)
 * The answers go to the account (name and profession are the AI's defaults
 * on every CV) and to the admin's Insights. A phone number isn't asked: the
 * editor points it out when a CV is missing one. `onFinished` gets their
 * first name when they complete it (not when they skip it) — the dashboard
 * welcomes them with it, then opens the flow they picked.
 */
export function OnboardingModal({ me, onFinished }: { me: ApiUser; onFinished?: (firstName: string) => void }) {
  const updateProfile = useUpdateProfile();
  const [{ steps, askName, askProfession }] = useState(() => stepsFor(me));
  const names = initialNames(me);
  const [step, setStep] = useState<Step>(steps[0]);
  const [intent, setIntent] = useState<SignupIntent | null>(me.signupIntent);
  const [firstName, setFirstName] = useState(names.first);
  const [lastName, setLastName] = useState(names.last);
  const [professions, setProfessions] = useState<string[]>(me.professions?.length ? me.professions : me.occupationTitle ? [me.occupationTitle] : []);
  // Typed in the profession box but not added yet: counts as added on Continue.
  const [professionDraft, setProfessionDraft] = useState("");
  const allProfessions = addProfession(professions, professionDraft);
  const [careerStage, setCareerStage] = useState<CareerStage | null>(me.careerStage);
  const [source, setSource] = useState<AcquisitionSource | null>(me.acquisitionSource);
  const [sourceDetail, setSourceDetail] = useState(me.acquisitionDetail ?? "");
  // "I have a CV to improve": the file, handed to the Improve flow when they finish.
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const stepIndex = steps.indexOf(step);
  const isLast = stepIndex === steps.length - 1;

  // Where people drop off, step by step (admin Insights).
  useEffect(() => {
    track("onboarding_step_viewed", { step });
  }, [step]);

  // With their CV uploaded (to improve), name and profession come from it; otherwise they're needed.
  const usingCv = Boolean(cvFile) && intent === "improve";
  const nameValid = usingCv || !askName || (firstName.trim().length > 0 && lastName.trim().length > 0);
  const professionValid = usingCv || !askProfession || allProfessions.length > 0;
  const canContinue =
    step === "intent" ? intent !== null : step === "about" ? nameValid : step === "career" ? professionValid : true;

  const pickFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That file is over 10MB. Try a smaller PDF or Word file.");
      return;
    }
    setCvFile(file);
  };

  const submit = async (skipAll = false) => {
    setError(null);
    const attribution = firstTouch() as Record<string, string> | undefined;
    const answers: UpdateMeInput = skipAll
      ? { completeOnboarding: true, signupSurface: "dashboard", signupAttribution: attribution }
      : {
          ...(askName && firstName.trim() && lastName.trim() ? { firstName: firstName.trim(), lastName: lastName.trim() } : {}),
          ...(askProfession && allProfessions.length ? { professions: allProfessions } : {}),
          ...(intent ? { signupIntent: intent } : {}),
          careerStage,
          acquisitionSource: source,
          acquisitionDetail: source === "other" && sourceDetail.trim() ? sourceDetail.trim() : null,
          signupSurface: "dashboard",
          signupAttribution: attribution,
          completeOnboarding: true,
        };
    try {
      await updateProfile.mutateAsync(answers);
      if (skipAll) {
        track("onboarding_skipped", { step });
        return;
      }
      // The flow they picked opens once the welcome is over (QuickLinkLauncher) —
      // unless a link they came in on already asked for something.
      if (intent && !peekQuickIntent()) saveQuickIntent({ kind: intent });
      if (cvFile && usingCv) {
        setPendingUpload(cvFile);
        markFillDetailsFromCv();
      }
      // The saved user no longer needs onboarding, so the dashboard stops rendering this.
      onFinished?.(firstName.trim() || names.first);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your answers. Please try again.");
    }
  };

  const next = () => {
    if (!canContinue) return;
    if (isLast) submit();
    else setStep(steps[stepIndex + 1]);
  };

  const eyebrow = stepIndex === 0 ? "Welcome to GoMoxie" : isLast ? "Last step" : `Step ${stepIndex + 1} of ${steps.length}`;

  return (
    <FlowModal stepKey={step}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        {/* Progress */}
        {steps.length > 1 && (
          <div className="flex items-center gap-1.5 mb-6" aria-hidden="true">
            {steps.map((s, i) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === stepIndex ? "w-8 bg-accent" : i < stepIndex ? "w-4 bg-accent-border" : "w-4 bg-neutral-200"
                }`}
              />
            ))}
          </div>
        )}

        {step === "intent" && (
          <>
            <StepEyebrow>{eyebrow}</StepEyebrow>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-950">What brings you here?</h2>
            <p className="mt-1.5 text-sm text-neutral-500">We&apos;ll take you straight there when you&apos;re done.</p>
            <div role="radiogroup" aria-label="What brings you here?" className="mt-6 space-y-2.5">
              {INTENTS.map(({ value, title, description, icon: Icon, tone }) => {
                const selected = intent === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setIntent(value)}
                    className={`w-full p-4 rounded-xl border text-left flex items-center gap-4 transition-colors cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 ${
                      selected ? "border-neutral-950 bg-neutral-50 ring-1 ring-neutral-950" : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/60"
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center bg-gradient-to-b border ${ICON_TONES[tone]}`}>
                      <Icon className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-neutral-950">{title}</span>
                      <span className="block text-sm text-neutral-500 mt-0.5 leading-snug">{description}</span>
                    </span>
                    <span
                      className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center ${
                        selected ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300"
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === "about" && (
          <>
            <StepEyebrow>{eyebrow}</StepEyebrow>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-950">Let&apos;s start with your name</h2>
            <p className="mt-1.5 text-sm text-neutral-500">It goes on your CVs, so you won&apos;t have to type it each time.</p>

            {intent === "improve" && (
              <div className="mt-5 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/70 p-4">
                <input
                  ref={fileInput}
                  type="file"
                  accept={UPLOAD_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    pickFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {cvFile ? (
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-emerald-50 border border-emerald-200 text-emerald-700">
                      <Check className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{cvFile.name}</p>
                      <p className="text-xs text-neutral-500">We&apos;ll improve it next, and fill in your details from it.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCvFile(null)}
                      title="Remove file"
                      aria-label="Remove file"
                      className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="w-full flex items-center gap-3 text-left cursor-pointer group"
                  >
                    <span className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-white border border-neutral-200 text-neutral-600 group-hover:border-neutral-400">
                      <Upload className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-neutral-900">Upload your CV instead</span>
                      <span className="block text-xs text-neutral-500">PDF, Word or a photo. We&apos;ll fill in your details from it.</span>
                    </span>
                  </button>
                )}
              </div>
            )}

            <div className={`mt-5 ${usingCv ? "opacity-60" : ""}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="onb-first" className={LABEL_CLASS}>
                    First name {usingCv && <span className="font-normal text-neutral-400">· optional</span>}
                  </label>
                  <input
                    id="onb-first"
                    autoFocus={!usingCv}
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="onb-last" className={LABEL_CLASS}>
                    Last name {usingCv && <span className="font-normal text-neutral-400">· optional</span>}
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
            </div>
          </>
        )}

        {step === "career" && (
          <>
            <StepEyebrow>{eyebrow}</StepEyebrow>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-950">{askProfession ? "What do you do?" : "One more thing"}</h2>
            <p className="mt-1.5 text-sm text-neutral-500">
              {askProfession
                ? "Your main profession becomes the headline on new CVs, and your level helps us pitch them right."
                : "So we can pitch your CVs at the right level."}
            </p>

            {askProfession && (
              <div className={`mt-5 ${usingCv ? "opacity-60" : ""}`}>
                <label htmlFor="onb-profession" className={LABEL_CLASS}>
                  Your profession{" "}
                  <span className="font-normal text-neutral-400">
                    {usingCv ? "· optional, we'll take it from your CV" : "· add more than one if you work in several fields"}
                  </span>
                </label>
                <ProfessionsInput
                  id="onb-profession"
                  autoFocus={!usingCv}
                  value={professions}
                  onChange={setProfessions}
                  draft={professionDraft}
                  onDraftChange={setProfessionDraft}
                />
              </div>
            )}

            {!me.careerStage && (
              <fieldset className="mt-5">
                <legend className={LABEL_CLASS}>
                  Where are you in your career? <span className="font-normal text-neutral-400">· optional</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {CAREER_STAGES.map(({ value, label }) => (
                    <Chip key={value} selected={careerStage === value} onClick={() => setCareerStage(careerStage === value ? null : value)}>
                      {label}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            )}
          </>
        )}

        {step === "source" && (
          <>
            <StepEyebrow>{eyebrow}</StepEyebrow>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-950">How did you hear about us?</h2>
            <p className="mt-1.5 text-sm text-neutral-500">Optional. It helps us reach more people like you.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {SOURCES.map(({ value, label }) => (
                <Chip key={value} selected={source === value} onClick={() => setSource(source === value ? null : value)}>
                  {label}
                </Chip>
              ))}
            </div>
            {source === "other" && (
              <div className="mt-4">
                <label htmlFor="onb-source-detail" className="sr-only">
                  Where did you hear about us?
                </label>
                <input
                  id="onb-source-detail"
                  autoFocus
                  maxLength={120}
                  value={sourceDetail}
                  onChange={(e) => setSourceDetail(e.target.value)}
                  placeholder="Where was it?"
                  className={INPUT_CLASS}
                />
              </div>
            )}
          </>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-8 flex items-center gap-3">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={() => setStep(steps[stepIndex - 1])}
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
            {isLast ? (updateProfile.isPending ? "Saving..." : step === "source" && !source ? "Skip and finish" : "Finish") : "Continue"}
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
