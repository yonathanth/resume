"use client";

import React, { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CalendarPlus, Check, Infinity as InfinityIcon, RotateCcw, Save, XCircle } from "lucide-react";
import {
  getSettings,
  getSettingsImpact,
  listEntitlements,
  revokeEntitlement,
  updateEntitlement,
  updateSetting,
  type Entitlement,
  type EntitlementKind,
  type FeatureAccessLevel,
  type FeatureKey,
  type FlowKey,
  type SettingsResponse,
  type SettingsValues,
} from "@/lib/admin-api";
import {
  ActionDialog,
  Badge,
  Button,
  Card,
  DataTable,
  ErrorState,
  INPUT,
  LABEL,
  LoadingState,
  Modal,
  Note,
  PageHeader,
  Pagination,
  SourceTag,
  type Column,
} from "@/components/admin/ui";
import { useCan } from "@/components/admin/AdminShell";
import { useToast } from "@/components/Toaster";
import { dateInputToIso, errorText, formatDate, formatDateTime, formatNumber, formatRelative } from "@/lib/admin-format";

// Plans & Entitlements: the free-plan limits, what Pro includes, the per-
// feature access rules, and the manual grants admins have made. Access is
// decided in one place on the backend (access.service.ts); this page edits
// its inputs, it doesn't decide access itself.

const PAGE_SIZE = 25;
const FLOWS: FlowKey[] = ["create", "tailor", "improve"];

const LEVELS: { value: FeatureAccessLevel; label: string; explain: string }[] = [
  { value: "all", label: "All", explain: "Everyone" },
  { value: "pro", label: "Pro", explain: "Pro & users granted this feature" },
  { value: "beta", label: "Beta", explain: "Beta program & users granted this feature" },
  { value: "off", label: "Off", explain: "Nobody — kill switch" },
];
const LEVEL_BY_VALUE = Object.fromEntries(LEVELS.map((l) => [l.value, l])) as Record<FeatureAccessLevel, (typeof LEVELS)[number]>;

const KIND_LABELS: Record<EntitlementKind, string> = {
  PRO_ACCESS: "Pro access",
  FEATURE: "Feature",
  LIMIT_ADJUSTMENT: "Limit adjustment",
  EXEMPTION: "Exemption",
};

type Impact = Awaited<ReturnType<typeof getSettingsImpact>>;

function useImpact() {
  return useQuery({ queryKey: ["admin", "settings", "impact"], queryFn: getSettingsImpact, staleTime: 30_000 });
}

function LastChanged({ meta }: { meta: SettingsResponse["meta"][keyof SettingsResponse["meta"]] }) {
  if (!meta) return <span>Never changed — using the built-in defaults.</span>;
  return (
    <span>
      Last changed {formatDateTime(meta.updatedAt)}
      {meta.updatedBy ? ` by ${meta.updatedBy}` : ""}
    </span>
  );
}

function ChangeList({ changes }: { changes: { label: string; from: React.ReactNode; to: React.ReactNode; tone?: "bad" }[] }) {
  return (
    <ul className="rounded-lg border border-neutral-200 divide-y divide-neutral-100 text-sm">
      {changes.map((c) => (
        <li key={c.label} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <span className="font-medium text-neutral-800">{c.label}</span>
          <span className="flex items-center gap-1.5 tabular-nums">
            <span className="text-neutral-500 line-through">{c.from}</span>
            <span className="text-neutral-400">→</span>
            <span className={`font-semibold ${c.tone === "bad" ? "text-rose-700" : "text-neutral-950"}`}>{c.to}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function ImpactBox({ impact, children }: { impact: ReturnType<typeof useImpact>; children: (data: Impact) => React.ReactNode }) {
  if (impact.error) return <Note tone="warn">Couldn&apos;t load how many users this affects: {errorText(impact.error)}</Note>;
  if (!impact.data) return <Note>Counting affected users…</Note>;
  return <Note tone="info">{children(impact.data)}</Note>;
}

function OptionalReason({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className={LABEL}>Reason (optional, kept in the audit log)</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} maxLength={500} className={INPUT} placeholder="Why are you changing this?" />
    </label>
  );
}

// ---------------------------------------------------------------- free plan limits

type LimitField = FlowKey | "perMinute" | "perDay";
type LimitsForm = Record<LimitField, string>;

const LIMIT_RANGES: Record<LimitField, { min: number; max: number }> = {
  create: { min: 0, max: 1000 },
  tailor: { min: 0, max: 1000 },
  improve: { min: 0, max: 1000 },
  perMinute: { min: 1, max: 1000 },
  perDay: { min: 1, max: 100000 },
};

const LIMIT_LABELS: Record<LimitField, string> = {
  create: "Free Create uses",
  tailor: "Free Tailor uses",
  improve: "Free Improve uses",
  perMinute: "AI requests per minute",
  perDay: "AI requests per day",
};

function limitsToForm(l: SettingsValues["limits"]): LimitsForm {
  return {
    create: String(l.freeUsesPerFlow.create),
    tailor: String(l.freeUsesPerFlow.tailor),
    improve: String(l.freeUsesPerFlow.improve),
    perMinute: String(l.aiRequestsPerMinute),
    perDay: String(l.aiRequestsPerDay),
  };
}

function limitValue(l: SettingsValues["limits"], f: LimitField): number {
  if (f === "perMinute") return l.aiRequestsPerMinute;
  if (f === "perDay") return l.aiRequestsPerDay;
  return l.freeUsesPerFlow[f];
}

function validateLimit(field: LimitField, raw: string): string | null {
  const { min, max } = LIMIT_RANGES[field];
  if (raw.trim() === "") return "Required";
  const n = Number(raw);
  if (!Number.isInteger(n)) return "Whole number";
  if (n < min || n > max) return `${min}–${formatNumber(max)}`;
  return null;
}

function LimitsCard({ settings }: { settings: SettingsResponse }) {
  const canWrite = useCan("settings:write");
  const toast = useToast();
  const queryClient = useQueryClient();
  const impact = useImpact();
  const current = settings.values.limits;
  const defaults = settings.defaults.limits;
  const [draft, setDraft] = useState<LimitsForm | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");

  const form = draft ?? limitsToForm(current);
  const fields = Object.keys(LIMIT_RANGES) as LimitField[];
  const errors = Object.fromEntries(fields.map((f) => [f, validateLimit(f, form[f])])) as Record<LimitField, string | null>;
  const hasErrors = fields.some((f) => errors[f]);
  const changed = fields.filter((f) => !errors[f] && Number(form[f]) !== limitValue(current, f));

  const setField = (f: LimitField, v: string) => setDraft({ ...form, [f]: v });

  const next: SettingsValues["limits"] = {
    freeUsesPerFlow: { create: Number(form.create), tailor: Number(form.tailor), improve: Number(form.improve) },
    aiRequestsPerMinute: Number(form.perMinute),
    aiRequestsPerDay: Number(form.perDay),
  };

  const save = async () => {
    const result = await updateSetting("limits", next, reason || undefined);
    queryClient.setQueryData<SettingsResponse>(["admin", "settings"], (old) => (old ? { ...old, values: { ...old.values, limits: result.value } } : old));
    setDraft(null);
    toast.success("Free plan limits saved");
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin", "settings"] }), queryClient.invalidateQueries({ queryKey: ["admin", "ai"] })]);
  };

  const freeUseChanged = changed.some((f) => f === "create" || f === "tailor" || f === "improve");
  const rateChanged = changed.some((f) => f === "perMinute" || f === "perDay");
  const lowered = changed.filter((f) => Number(form[f]) < limitValue(current, f));

  const renderInput = (f: LimitField) => (
    <label key={f} className="block">
      <span className={LABEL}>{LIMIT_LABELS[f]}</span>
      <input
        type="number"
        inputMode="numeric"
        min={LIMIT_RANGES[f].min}
        max={LIMIT_RANGES[f].max}
        step={1}
        value={form[f]}
        disabled={!canWrite}
        onChange={(e) => setField(f, e.target.value)}
        className={`${INPUT} ${errors[f] ? "border-rose-400 focus:border-rose-500" : ""}`}
      />
      <span className="mt-1 flex justify-between gap-2 text-[11px]">
        <span className="text-neutral-500">
          Default {formatNumber(limitValue(defaults, f))} · range {LIMIT_RANGES[f].min}–{formatNumber(LIMIT_RANGES[f].max)}
        </span>
        {errors[f] && <span className="font-semibold text-rose-600">{errors[f]}</span>}
      </span>
    </label>
  );

  return (
    <Card
      title="Free plan limits"
      description={<LastChanged meta={settings.meta.limits} />}
      actions={
        canWrite ? (
          <>
            {draft && (
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                <RotateCcw className="w-3.5 h-3.5" />
                Discard
              </Button>
            )}
            <Button
              size="sm"
              variant="primary"
              disabled={hasErrors || changed.length === 0}
              onClick={() => {
                setReason("");
                setConfirming(true);
              }}
            >
              <Save className="w-3.5 h-3.5" />
              Save changes
            </Button>
          </>
        ) : (
          <Badge>Read only</Badge>
        )
      }
    >
      <div className="space-y-5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1">Free uses per flow</h3>
          <p className="text-xs text-neutral-500 mb-3">
            How many times a user without Pro can run each AI flow. 0 turns the free tier off for that flow. Per-user limit adjustments (grants) add to or
            subtract from this. Pro users are unmetered.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{FLOWS.map(renderInput)}</div>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1">AI rate limits</h3>
          <p className="text-xs text-neutral-500 mb-3">
            Per-user caps on AI calls that protect the provider budget. They apply to everyone, Pro included, except users with an AI rate-limit exemption.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{(["perMinute", "perDay"] as LimitField[]).map(renderInput)}</div>
        </div>
      </div>

      <ActionDialog
        open={confirming}
        title="Save free plan limits"
        confirmLabel="Save limits"
        description="These limits take effect for the next request each user makes (other server instances pick them up within about 30 seconds)."
        onConfirm={save}
        onClose={() => setConfirming(false)}
      >
        <ChangeList changes={changed.map((f) => ({ label: LIMIT_LABELS[f], from: formatNumber(limitValue(current, f)), to: formatNumber(Number(form[f])) }))} />
        <ImpactBox impact={impact}>
          {(d) => (
            <span className="space-y-1 block">
              {freeUseChanged && (
                <span className="block">
                  Free-use changes affect the <b>{formatNumber(d.free)}</b> users without Pro. The <b>{formatNumber(d.pro)}</b> Pro users are unmetered and
                  unaffected.
                </span>
              )}
              {rateChanged && (
                <span className="block">
                  Rate-limit changes apply to all <b>{formatNumber(d.total)}</b> users, Pro included (except those with an AI rate-limit exemption).
                </span>
              )}
            </span>
          )}
        </ImpactBox>
        {lowered.some((f) => f === "create" || f === "tailor" || f === "improve") && (
          <Note tone="warn">Lowering free uses doesn&apos;t reset anyone&apos;s usage: users who already used more than the new limit simply have none left.</Note>
        )}
        <OptionalReason value={reason} onChange={setReason} />
      </ActionDialog>
    </Card>
  );
}

// ---------------------------------------------------------------- Pro plan

function ProPlanCard({ settings }: { settings: SettingsResponse }) {
  const keys = Object.keys(settings.features) as FeatureKey[];
  const proFeatures = keys.filter((k) => settings.values.features[k] === "pro");
  const allFeatures = keys.filter((k) => settings.values.features[k] === "all");
  const offFeatures = keys.filter((k) => settings.values.features[k] === "off");
  return (
    <Card title="Pro plan" description="What Pro includes today, from the current feature rules." actions={<SourceTag source="database" />}>
      <div className="space-y-4 text-sm">
        <ul className="space-y-2">
          <li className="flex gap-2">
            <InfinityIcon className="w-4 h-4 mt-0.5 shrink-0 text-accent-strong" />
            <span>
              <b>Unmetered Create, Tailor and Improve flows</b> — no free-use limit (AI rate limits still apply).
            </span>
          </li>
          {proFeatures.map((k) => (
            <li key={k} className="flex gap-2">
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              <span>
                <b>{settings.features[k].label}</b> <span className="text-neutral-500">— {settings.features[k].description}</span>
              </span>
            </li>
          ))}
        </ul>
        {proFeatures.length === 0 && <Note>No feature is currently set to &ldquo;Pro&rdquo;, so Pro adds only unmetered flows.</Note>}
        {allFeatures.length > 0 && (
          <p className="text-xs text-neutral-500">
            Available to everyone (not a Pro benefit right now): {allFeatures.map((k) => settings.features[k].label).join(", ")}.
          </p>
        )}
        {offFeatures.length > 0 && (
          <p className="text-xs font-semibold text-rose-700">
            Switched off for everyone, Pro included: {offFeatures.map((k) => settings.features[k].label).join(", ")}.
          </p>
        )}
        <Note>
          <b>Price</b> isn&apos;t set here. The Polar price is managed on the product in the Polar dashboard; the Chapa price comes from the backend&apos;s server
          configuration. Pro comes from an active paid Polar/Chapa period, or from an admin&apos;s Pro grant.
        </Note>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- feature rules

function FeaturesCard({ settings }: { settings: SettingsResponse }) {
  const canWrite = useCan("settings:write");
  const toast = useToast();
  const queryClient = useQueryClient();
  const impact = useImpact();
  const current = settings.values.features;
  const keys = Object.keys(settings.features) as FeatureKey[];
  const [draft, setDraft] = useState<Record<FeatureKey, FeatureAccessLevel> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");

  const form = draft ?? current;
  const changed = keys.filter((k) => form[k] !== current[k]);
  const turningOff = changed.filter((k) => form[k] === "off");

  const save = async () => {
    const result = await updateSetting("features", form, reason || undefined);
    queryClient.setQueryData<SettingsResponse>(["admin", "settings"], (old) => (old ? { ...old, values: { ...old.values, features: result.value } } : old));
    setDraft(null);
    toast.success("Feature rules saved");
    await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
  };

  const impactLine = (k: FeatureKey, d: Impact) => {
    const label = settings.features[k].label;
    switch (form[k]) {
      case "all":
        return `${label}: open to all ${formatNumber(d.total)} users.`;
      case "pro":
        return `${label}: limited to the ${formatNumber(d.pro)} Pro users and users granted it; the ${formatNumber(d.free)} free users lose it unless granted.`;
      case "beta":
        return `${label}: limited to beta-program users and users granted it — Pro alone no longer opens it.`;
      case "off":
        return `${label}: off for all ${formatNumber(d.total)} users, Pro and admins included.`;
    }
  };

  return (
    <Card
      title="Feature rules"
      description={<LastChanged meta={settings.meta.features} />}
      actions={
        canWrite ? (
          <>
            {draft && (
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                <RotateCcw className="w-3.5 h-3.5" />
                Discard
              </Button>
            )}
            <Button
              size="sm"
              variant={turningOff.length ? "danger" : "primary"}
              disabled={changed.length === 0}
              onClick={() => {
                setReason("");
                setConfirming(true);
              }}
            >
              <Save className="w-3.5 h-3.5" />
              Save changes
            </Button>
          </>
        ) : (
          <Badge>Read only</Badge>
        )
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          {LEVELS.map((l) => (
            <div key={l.value} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
              <span className="font-bold text-neutral-900">{l.label}</span> <span className="text-neutral-600">— {l.explain}</span>
            </div>
          ))}
        </div>
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
          {keys.map((k) => {
            const info = settings.features[k];
            const level = form[k];
            const isChanged = level !== current[k];
            return (
              <li key={k} className="p-4 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-950">{info.label}</span>
                      {isChanged && <Badge tone="warn">unsaved</Badge>}
                      {settings.defaults.features[k] === level && <Badge>default</Badge>}
                    </div>
                    <p className="text-xs text-neutral-600 max-w-2xl">{info.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {info.endpoints.map((ep) => (
                        <code key={ep} className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600">
                          {ep}
                        </code>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 space-y-1">
                    <div role="radiogroup" aria-label={`${info.label} access`} className="inline-flex rounded-lg border border-neutral-300 bg-white p-0.5">
                      {LEVELS.map((l) => {
                        const active = level === l.value;
                        const activeCls = l.value === "off" ? "bg-rose-600 text-white" : "bg-neutral-950 text-white";
                        return (
                          <button
                            key={l.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={!canWrite}
                            title={l.explain}
                            onClick={() => setDraft({ ...form, [k]: l.value })}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${
                              active ? activeCls : "text-neutral-600 hover:bg-neutral-100 disabled:hover:bg-transparent"
                            }`}
                          >
                            {l.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className={`text-xs ${level === "off" ? "font-semibold text-rose-700" : "text-neutral-500"}`}>{LEVEL_BY_VALUE[level].explain}</p>
                    <p className="text-[11px] text-neutral-400">Default: {LEVEL_BY_VALUE[settings.defaults.features[k]].label}</p>
                  </div>
                </div>
                {isChanged && level === "off" && (
                  <Note tone="warn">
                    <b>Kill switch:</b> switching {info.label} off blocks it for every user — Pro, granted and admins included. Existing data stays, but the
                    endpoints above refuse requests until it&apos;s switched back on.
                  </Note>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <ActionDialog
        open={confirming}
        title="Save feature rules"
        confirmLabel={turningOff.length ? "Switch off and save" : "Save rules"}
        danger={turningOff.length > 0}
        confirmText={turningOff.length ? "turn off" : undefined}
        description={
          turningOff.length ? (
            <span>
              <b className="text-rose-700">You are switching off {turningOff.map((k) => settings.features[k].label).join(", ")} for everyone.</b> Nobody — including
              paying Pro users, users granted the feature, and admins — will be able to use it until it&apos;s switched back on.
            </span>
          ) : (
            "The new rules apply to each user's next request (other server instances pick them up within about 30 seconds)."
          )
        }
        onConfirm={save}
        onClose={() => setConfirming(false)}
      >
        <ChangeList
          changes={changed.map((k) => ({
            label: settings.features[k].label,
            from: LEVEL_BY_VALUE[current[k]].label,
            to: LEVEL_BY_VALUE[form[k]].label,
            tone: form[k] === "off" ? "bad" : undefined,
          }))}
        />
        <ImpactBox impact={impact}>
          {(d) => (
            <span className="block space-y-1">
              {changed.map((k) => (
                <span key={k} className="block">
                  {impactLine(k, d)}
                </span>
              ))}
            </span>
          )}
        </ImpactBox>
        <OptionalReason value={reason} onChange={setReason} />
      </ActionDialog>
    </Card>
  );
}

// ---------------------------------------------------------------- manual grants

function grantState(e: Entitlement): { label: string; tone: "good" | "bad" | "neutral" | "info" } {
  if (e.revokedAt) return { label: "revoked", tone: "bad" };
  if (e.active) return { label: "active", tone: "good" };
  if (e.expiresAt) return { label: "expired", tone: "neutral" };
  return { label: "not started", tone: "info" };
}

function ExtendModal({ grant, onClose }: { grant: Entitlement | null; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const hasEnd = Boolean(grant?.expiresAt);
  const [mode, setMode] = useState<"days" | "date">(hasEnd ? "days" : "date");
  const [days, setDays] = useState("30");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!grant) return null;

  const daysNum = Number(days);
  const daysOk = Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= 3650;
  const dateIso = dateInputToIso(date, true);
  const valueOk = mode === "days" ? daysOk : Boolean(dateIso);
  const reasonOk = reason.trim().length >= 3;

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const updated = await updateEntitlement(grant.id, {
        reason: reason.trim(),
        ...(mode === "days" ? { extendDays: daysNum } : { expiresAt: dateIso }),
      });
      toast.success("Grant updated", { description: updated.expiresAt ? `Now ends ${formatDateTime(updated.expiresAt)}.` : "It now has no end date." });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin", "entitlements"] }), queryClient.invalidateQueries({ queryKey: ["admin", "users"] })]);
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPending(false);
    }
  };

  const expiredNow = !grant.active && Boolean(grant.expiresAt);

  return (
    <Modal open title="Change grant end date" onClose={pending ? () => {} : onClose}>
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
          <div className="font-semibold text-neutral-900">{grant.label ?? KIND_LABELS[grant.kind]}</div>
          <div className="text-xs text-neutral-500">
            {grant.user?.email ?? grant.userId} · currently {grant.expiresAt ? `ends ${formatDateTime(grant.expiresAt)}` : "no end date"}
          </div>
        </div>
        <div className="flex rounded-lg border border-neutral-300 p-0.5 w-fit">
          {(
            [
              ["days", "Extend by days"],
              ["date", "Set a new end date"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              disabled={m === "days" && !hasEnd}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                mode === m ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === "days" ? (
          <label className="block">
            <span className={LABEL}>Days to add (1–3650)</span>
            <input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} className={INPUT} />
            <span className="mt-1 block text-xs text-neutral-500">
              {expiredNow ? "This grant has expired, so the days count from now (it restarts)." : "Added to the current end date."}
            </span>
          </label>
        ) : (
          <label className="block">
            <span className={LABEL}>New end date (end of that day)</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
            <span className="mt-1 block text-xs text-neutral-500">
              Must be in the future. Can also shorten the grant; to end it now, revoke it instead.
              {!hasEnd && " This grant has no end date, so this sets one."}
            </span>
          </label>
        )}
        <label className="block">
          <span className={LABEL}>Reason (kept in the audit log)</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} className={INPUT} placeholder="Why are you changing this?" />
        </label>
        <Note>Only the grant changes. No payment or subscription is created or touched.</Note>
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" loading={pending} disabled={!valueOk || !reasonOk} onClick={submit}>
            Save end date
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function GrantsCard() {
  const canWrite = useCan("entitlements:write");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [state, setState] = useState<"active" | "expired" | "revoked" | "all">("active");
  const [kind, setKind] = useState<"" | EntitlementKind>("");
  const [page, setPage] = useState(1);
  const [extendTarget, setExtendTarget] = useState<Entitlement | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Entitlement | null>(null);

  const query = useQuery({
    queryKey: ["admin", "entitlements", { state, kind, page }],
    queryFn: () => listEntitlements({ state, kind: kind || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const revoke = async (grant: Entitlement, reason: string) => {
    await revokeEntitlement(grant.id, reason);
    toast.success("Grant revoked", { description: `${grant.label ?? KIND_LABELS[grant.kind]} for ${grant.user?.email ?? "the user"} ended now.` });
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin", "entitlements"] }), queryClient.invalidateQueries({ queryKey: ["admin", "users"] })]);
  };

  const columns: Column<Entitlement>[] = [
    {
      key: "user",
      header: "User",
      cell: (e) => (
        <div className="min-w-0">
          <Link href={`/admin/users/${e.userId}`} className="font-medium text-neutral-950 hover:text-accent-strong hover:underline break-all">
            {e.user?.email ?? e.userId}
          </Link>
          {e.user?.fullName && <div className="text-xs text-neutral-500">{e.user.fullName}</div>}
        </div>
      ),
    },
    {
      key: "grant",
      header: "Grant",
      cell: (e) => (
        <div className="space-y-1">
          <div className="font-medium whitespace-nowrap">{e.label ?? KIND_LABELS[e.kind]}</div>
          <Badge>{KIND_LABELS[e.kind]}</Badge>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Reason / note",
      cell: (e) => (
        <div className="max-w-[280px] space-y-0.5">
          <div className="text-xs text-neutral-800 break-words">{e.reason}</div>
          {e.note && <div className="text-xs text-neutral-500 break-words">Note: {e.note}</div>}
          {e.revokedAt && e.revokeReason && <div className="text-xs text-rose-700 break-words">Revoked: {e.revokeReason}</div>}
        </div>
      ),
    },
    {
      key: "created",
      header: "Created by",
      cell: (e) => (
        <div className="text-xs">
          <div className="break-all">{e.createdByEmail ?? "—"}</div>
          <div className="text-neutral-500 whitespace-nowrap" title={formatDateTime(e.createdAt)}>
            {formatDate(e.createdAt)}
          </div>
        </div>
      ),
    },
    {
      key: "expires",
      header: "Expires",
      cell: (e) =>
        e.expiresAt ? (
          <div className="whitespace-nowrap" title={formatDateTime(e.expiresAt)}>
            <div>{formatRelative(e.expiresAt)}</div>
            <div className="text-xs text-neutral-500">{formatDate(e.expiresAt)}</div>
          </div>
        ) : (
          <span className="text-neutral-500">No end date</span>
        ),
    },
    {
      key: "state",
      header: "State",
      cell: (e) => {
        const s = grantState(e);
        return <Badge tone={s.tone}>{s.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (e) =>
        canWrite && !e.revokedAt ? (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" onClick={() => setExtendTarget(e)}>
              <CalendarPlus className="w-3.5 h-3.5" />
              Extend
            </Button>
            <Button size="sm" variant="danger-outline" onClick={() => setRevokeTarget(e)}>
              <XCircle className="w-3.5 h-3.5" />
              Revoke
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <Card
      title="Manual grants"
      description="Access an admin gave a specific user. Grants never create payments; expired grants stop applying automatically."
      actions={
        <>
          <SourceTag source="database" />
          <Link href="/admin/users" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-strong hover:underline">
            New grant from a user&apos;s page
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </>
      }
      padded={false}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 sm:px-5 py-3.5 border-b border-neutral-200 items-end">
        <label className="block">
          <span className={LABEL}>State</span>
          <select
            className={INPUT}
            value={state}
            onChange={(e) => {
              setState(e.target.value as typeof state);
              setPage(1);
            }}
          >
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
            <option value="all">All</option>
          </select>
        </label>
        <label className="block">
          <span className={LABEL}>Kind</span>
          <select
            className={INPUT}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as typeof kind);
              setPage(1);
            }}
          >
            <option value="">Any kind</option>
            {(Object.keys(KIND_LABELS) as EntitlementKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-neutral-500 sm:pb-2">
          To create a grant, open the user from{" "}
          <Link href="/admin/users" className="font-semibold text-accent-strong hover:underline">
            Users
          </Link>
          .
        </p>
      </div>
      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(e) => e.id}
        isLoading={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No grants match"
        emptyDescription="Grants are created from a user's page."
      />
      {query.data && query.data.total > 0 && <Pagination page={page} pageCount={query.data.pageCount} total={query.data.total} onChange={setPage} />}

      {extendTarget && <ExtendModal key={extendTarget.id} grant={extendTarget} onClose={() => setExtendTarget(null)} />}

      <ActionDialog
        open={revokeTarget !== null}
        title="Revoke grant"
        confirmLabel="Revoke grant"
        danger
        requireReason
        description={
          revokeTarget && (
            <span>
              Ends <b>{revokeTarget.label ?? KIND_LABELS[revokeTarget.kind]}</b> for <b>{revokeTarget.user?.email ?? revokeTarget.userId}</b> now. Their access falls
              back to what billing and their other active grants allow. No payment or subscription is touched, and a revoked grant can&apos;t be reopened —
              create a new one instead.
            </span>
          )
        }
        onConfirm={(reason) => (revokeTarget ? revoke(revokeTarget, reason) : Promise.resolve())}
        onClose={() => setRevokeTarget(null)}
      />
    </Card>
  );
}

// ---------------------------------------------------------------- promotions

function PromotionsCard() {
  return (
    <Card title="Promotions & trials">
      <div className="space-y-3 text-sm text-neutral-700">
        <p>
          A temporary promotion is a <b>time-boxed grant</b> on a user&apos;s page: Pro access, or a single feature, with an end date. It stops applying on its own
          when it ends, and the user falls back to what billing says. Extra free uses can be given the same way with a limit adjustment.
        </p>
        <p>There is no automatic trial on the Pro plan today — new users start on the free plan with the free uses above.</p>
        <Link href="/admin/users" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-strong hover:underline">
          Find a user to grant a promotion
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- page

export default function PlansPage() {
  const settings = useQuery({ queryKey: ["admin", "settings"], queryFn: getSettings });

  return (
    <div className="space-y-5">
      <PageHeader title="Plans & Entitlements" description="Free plan limits, what Pro includes, feature access rules and manual grants." />

      <Note tone="info">
        <ul className="list-disc pl-4 space-y-0.5">
          <li>
            <b>Free plan</b> — a limited number of free uses per flow (Create, Tailor, Improve), plus every feature whose rule is &ldquo;All&rdquo;.
          </li>
          <li>
            <b>Pro</b> — paid via Polar or Chapa, or granted by an admin — makes those flows unmetered and opens the Pro features.
          </li>
          <li>Manual grants never create payments or touch the subscription; they&apos;re recorded separately with an owner and a reason.</li>
          <li>Grants with an end date stop applying automatically when they expire — no job needs to run.</li>
          <li>
            A feature switched <b>off</b> is off for everyone — Pro users, granted users and admins included.
          </li>
        </ul>
      </Note>

      {settings.error ? (
        <Card>
          <ErrorState error={settings.error} onRetry={() => settings.refetch()} />
        </Card>
      ) : !settings.data ? (
        <Card>
          <LoadingState label="Loading plan settings…" />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-5 items-start">
            <LimitsCard settings={settings.data} />
            <ProPlanCard settings={settings.data} />
          </div>
          <FeaturesCard settings={settings.data} />
        </>
      )}

      <GrantsCard />
      <PromotionsCard />
    </div>
  );
}
