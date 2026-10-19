"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpRight, Info, Lock, Plus, RefreshCw, Terminal, Trash2 } from "lucide-react";
import { getHealth, getSettings, updateSetting, type Health, type SettingKey, type SettingsResponse, type SettingsValues } from "@/lib/admin-api";
import { changePassword } from "@/lib/api";
import { errorText, formatDateTime, formatNumber } from "@/lib/admin-format";
import { useAdmin, useCan } from "@/components/admin/AdminShell";
import { useToast } from "@/components/Toaster";
import {
  ActionDialog,
  Badge,
  Button,
  Card,
  ErrorState,
  INPUT,
  KeyValue,
  LABEL,
  LoadingState,
  Mono,
  Note,
  PageHeader,
  SourceTag,
  Toggle,
  type BadgeTone,
} from "@/components/admin/ui";

// Platform-wide controls, AI price estimates, notification limits, a
// read-only health view and the signed-in admin's own account. Settings are a
// fixed set of validated keys on the backend; nothing here can read secrets
// or run commands.

type Platform = SettingsValues["platform"];
type PricingModel = SettingsValues["aiPricing"]["models"][number];

const SETTINGS_KEY = ["admin", "settings"] as const;
const BANNER_MAX = 300;
const PRICING_MAX_ROWS = 50;
const PRICE_MAX = 1000;
const MODEL_NAME_MAX = 120;
const EMAIL_CAP_MIN = 1;
const EMAIL_CAP_MAX = 50000;
const PASSWORD_MIN = 12;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Saves one key and writes the server's validated value into the settings cache. */
function useSaveSetting() {
  const qc = useQueryClient();
  return async <K extends SettingKey>(key: K, value: SettingsValues[K], reason?: string) => {
    const res = await updateSetting(key, value, reason || undefined);
    qc.setQueryData<SettingsResponse>(SETTINGS_KEY, (old) => (old ? { ...old, values: { ...old.values, [key]: res.value } } : old));
    await qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    return res;
  };
}

function LastUpdated({ meta }: { meta: SettingsResponse["meta"][SettingKey] }) {
  if (!meta) return <span className="text-[11px] text-neutral-500">Using the default — never changed</span>;
  return (
    <span className="text-[11px] text-neutral-500">
      Last changed {formatDateTime(meta.updatedAt)}
      {meta.updatedBy && ` by ${meta.updatedBy}`}
    </span>
  );
}

function ReadOnlyNote() {
  return (
    <Note tone="warn">
      <Lock className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
      Your admin role doesn&apos;t include settings:write, so these controls are read-only.
    </Note>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs font-medium text-rose-600">{children}</p>;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  warn,
}: {
  label: string;
  description: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          {label}
          {warn && <Badge tone="warn">Active</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}

function BannerPreview({ message, tone }: { message: string; tone: "info" | "warning" }) {
  const warning = tone === "warning";
  const Icon = warning ? AlertTriangle : Info;
  return (
    <div
      className={`flex items-start gap-2 px-4 py-2.5 text-sm border rounded-lg ${
        warning ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-accent-soft border-accent-border text-neutral-800"
      }`}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${warning ? "text-amber-600" : "text-accent-strong"}`} />
      <p className="leading-snug break-words min-w-0">{message.trim() || <span className="opacity-60">Your banner message</span>}</p>
    </div>
  );
}

// ------------------------------------------------------------------ page

export default function AdminSettingsPage() {
  const canWrite = useCan("settings:write");
  const settings = useQuery({ queryKey: SETTINGS_KEY, queryFn: getSettings });

  return (
    <>
      <PageHeader
        title="Platform Settings"
        description="Platform-wide controls, AI cost estimates, notification limits, system health and your own admin account. Every change is recorded in the audit log."
      />
      <div className="space-y-6">
        {settings.isLoading ? (
          <Card>
            <LoadingState label="Loading settings…" />
          </Card>
        ) : settings.error || !settings.data ? (
          <Card>
            <ErrorState error={settings.error} onRetry={() => settings.refetch()} />
          </Card>
        ) : (
          <>
            <PlatformCard data={settings.data} canWrite={canWrite} />
            <AiPricingCard data={settings.data} canWrite={canWrite} />
            <NotificationLimitsCard data={settings.data} canWrite={canWrite} />
            <LifecycleEmailsCard data={settings.data} canWrite={canWrite} />
          </>
        )}
        <HealthCard />
        <AdminAccountCard />
      </div>
    </>
  );
}

// ------------------------------------------------------------------ 1. platform controls

function describePlatformChanges(before: Platform, after: Platform): string[] {
  const changes: string[] = [];
  if (before.registrationEnabled !== after.registrationEnabled)
    changes.push(after.registrationEnabled ? "Open registration (new sign-ups allowed)" : "Close registration (new sign-ups refused)");
  if (before.aiGenerationPaused !== after.aiGenerationPaused)
    changes.push(after.aiGenerationPaused ? "Pause AI generation (every AI endpoint answers 503)" : "Resume AI generation");
  if (before.banner.enabled !== after.banner.enabled) changes.push(after.banner.enabled ? "Show the maintenance banner" : "Hide the maintenance banner");
  if (before.banner.message.trim() !== after.banner.message.trim()) changes.push(`Banner message → “${after.banner.message.trim() || "(empty)"}”`);
  if (before.banner.tone !== after.banner.tone) changes.push(`Banner tone → ${after.banner.tone}`);
  return changes;
}

function PlatformCard({ data, canWrite }: { data: SettingsResponse; canWrite: boolean }) {
  const toast = useToast();
  const save = useSaveSetting();
  const server = data.values.platform;
  const [draft, setDraft] = useState<Platform | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const value = draft ?? server;
  const normalized: Platform = { ...value, banner: { ...value.banner, message: value.banner.message.trim() } };
  const changes = describePlatformChanges(server, normalized);
  const dirty = draft !== null && changes.length > 0;

  const messageErr = value.banner.message.trim().length > BANNER_MAX ? `Keep the message under ${BANNER_MAX} characters.` : null;
  const emptyBanner = value.banner.enabled && !value.banner.message.trim();

  const update = (patch: (p: Platform) => Platform) => setDraft(patch(value));
  const updateBanner = (patch: Partial<Platform["banner"]>) => update((p) => ({ ...p, banner: { ...p.banner, ...patch } }));

  return (
    <Card
      title="Platform controls"
      description="Switches that affect every user immediately (within about 30 seconds on every server)."
      actions={<LastUpdated meta={data.meta.platform} />}
    >
      <div className="space-y-5">
        {!canWrite && <ReadOnlyNote />}
        <ToggleRow
          label="Registration open"
          description="When off, new email sign-ups and first-time Google sign-ins are refused. Existing users can still sign in."
          checked={value.registrationEnabled}
          onChange={(v) => update((p) => ({ ...p, registrationEnabled: v }))}
          disabled={!canWrite}
          warn={!value.registrationEnabled}
        />
        <ToggleRow
          label="Pause AI generation"
          description="When on, every AI endpoint answers 503 (temporarily unavailable) and nothing is charged against anyone's free uses or limits."
          checked={value.aiGenerationPaused}
          onChange={(v) => update((p) => ({ ...p, aiGenerationPaused: v }))}
          disabled={!canWrite}
          warn={value.aiGenerationPaused}
        />

        <div className="border-t border-neutral-200 pt-5 space-y-3">
          <ToggleRow
            label="Maintenance banner"
            description="A one-line message at the top of every signed-in user's dashboard."
            checked={value.banner.enabled}
            onChange={(v) => updateBanner({ enabled: v })}
            disabled={!canWrite}
          />
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_10rem] gap-3">
            <div>
              <div className="flex items-center justify-between">
                <label className={LABEL} htmlFor="banner-message">
                  Message
                </label>
                <span className={`text-[11px] tabular-nums ${value.banner.message.length > BANNER_MAX ? "text-rose-600" : "text-neutral-400"}`}>
                  {value.banner.message.length}/{BANNER_MAX}
                </span>
              </div>
              <textarea
                id="banner-message"
                rows={2}
                maxLength={BANNER_MAX}
                value={value.banner.message}
                onChange={(e) => updateBanner({ message: e.target.value })}
                disabled={!canWrite}
                className={INPUT}
                placeholder="e.g. Scheduled maintenance Saturday 02:00–03:00 UTC. Saving may be briefly unavailable."
              />
              {messageErr && <FieldError>{messageErr}</FieldError>}
            </div>
            <div>
              <label className={LABEL} htmlFor="banner-tone">
                Tone
              </label>
              <select
                id="banner-tone"
                value={value.banner.tone}
                onChange={(e) => updateBanner({ tone: e.target.value as Platform["banner"]["tone"] })}
                disabled={!canWrite}
                className={INPUT}
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
              </select>
            </div>
          </div>
          <div>
            <span className={LABEL}>Preview {!value.banner.enabled && <span className="font-normal text-neutral-500">(hidden while the banner is off)</span>}</span>
            <div className={value.banner.enabled ? "" : "opacity-50"}>
              <BannerPreview message={value.banner.message} tone={value.banner.tone} />
            </div>
          </div>
          {emptyBanner && <Note tone="warn">An enabled banner with an empty message isn&apos;t shown to anyone. Add a message.</Note>}
        </div>

        {canWrite && (
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-4">
            <Button
              variant="primary"
              disabled={!dirty || Boolean(messageErr)}
              onClick={() => {
                setReason("");
                setConfirmOpen(true);
              }}
            >
              Review changes
            </Button>
            <Button variant="ghost" disabled={draft === null} onClick={() => setDraft(null)}>
              Discard
            </Button>
            {dirty && <span className="text-xs text-amber-700">{changes.length} unsaved change{changes.length === 1 ? "" : "s"}</span>}
          </div>
        )}
      </div>

      <ActionDialog
        open={confirmOpen}
        title="Apply platform changes?"
        confirmLabel="Apply changes"
        danger={normalized.aiGenerationPaused && !server.aiGenerationPaused}
        description="These take effect for every user right away."
        onConfirm={async () => {
          await save("platform", normalized, reason.trim());
          setDraft(null);
          toast.success("Platform controls saved");
        }}
        onClose={() => setConfirmOpen(false)}
      >
        <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-800">
          {changes.map((c) => (
            <li key={c} className="break-words">
              {c}
            </li>
          ))}
        </ul>
        <div>
          <label className={LABEL} htmlFor="platform-reason">
            Reason (optional, kept in the audit log)
          </label>
          <textarea id="platform-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className={INPUT} placeholder="Why are you changing this?" />
        </div>
      </ActionDialog>
    </Card>
  );
}

// ------------------------------------------------------------------ 2. AI pricing

interface PriceRow {
  key: string;
  model: string;
  input: string;
  output: string;
}

const toRows = (models: PricingModel[]): PriceRow[] =>
  models.map((m, i) => ({ key: `srv-${i}`, model: m.model, input: String(m.inputPerMillionUsd), output: String(m.outputPerMillionUsd) }));

function priceError(v: string): string | null {
  if (v.trim() === "") return "Required";
  const n = Number(v);
  if (!Number.isFinite(n)) return "Not a number";
  if (n < 0 || n > PRICE_MAX) return `0–${PRICE_MAX}`;
  return null;
}

function AiPricingCard({ data, canWrite }: { data: SettingsResponse; canWrite: boolean }) {
  const toast = useToast();
  const save = useSaveSetting();
  const server = data.values.aiPricing.models;
  const [draft, setDraft] = useState<PriceRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = draft ?? toRows(server);

  const names = rows.map((r) => r.model.trim().toLowerCase());
  const rowErrors = rows.map((r, i) => {
    const name = r.model.trim();
    return {
      model: !name
        ? "Required"
        : name.length > MODEL_NAME_MAX
          ? `Max ${MODEL_NAME_MAX} characters`
          : names.indexOf(name.toLowerCase()) !== i
            ? "Duplicate model"
            : null,
      input: priceError(r.input),
      output: priceError(r.output),
    };
  });
  const invalid = rowErrors.some((e) => e.model || e.input || e.output) || rows.length > PRICING_MAX_ROWS;
  const models: PricingModel[] = rows.map((r) => ({ model: r.model.trim(), inputPerMillionUsd: Number(r.input), outputPerMillionUsd: Number(r.output) }));
  const dirty = draft !== null && !same(models, server);

  const setRow = (key: string, patch: Partial<PriceRow>) => setDraft(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await save("aiPricing", { models });
      setDraft(null);
      toast.success("AI cost estimates saved");
    } catch (err) {
      setError(errorText(err, "Couldn't save the prices."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="AI cost estimates"
      description="Per-model prices in US dollars per million tokens."
      actions={
        <>
          <SourceTag source="estimate" />
          <LastUpdated meta={data.meta.aiPricing} />
        </>
      }
    >
      <div className="space-y-4">
        {!canWrite && <ReadOnlyNote />}
        <Note>
          Copy these from your AI provider&apos;s pricing page. They&apos;re only used to show <span className="font-semibold">estimated</span> costs in AI Usage — never
          your provider&apos;s actual bill. Models without a price here show no estimate.
        </Note>

        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">No prices yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-sm min-w-[34rem]">
              <thead>
                <tr className="text-left text-xs font-semibold text-neutral-500">
                  <th className="pb-2 pr-2">Model</th>
                  <th className="pb-2 pr-2 w-40">Input $ / 1M tokens</th>
                  <th className="pb-2 pr-2 w-40">Output $ / 1M tokens</th>
                  <th className="pb-2 w-10" aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key} className="align-top">
                    <td className="pb-2 pr-2">
                      <input
                        value={r.model}
                        onChange={(e) => setRow(r.key, { model: e.target.value })}
                        maxLength={MODEL_NAME_MAX}
                        disabled={!canWrite}
                        className={INPUT}
                        placeholder="e.g. gpt-4o-mini"
                        aria-label={`Model name, row ${i + 1}`}
                      />
                      {draft && rowErrors[i].model && <FieldError>{rowErrors[i].model}</FieldError>}
                    </td>
                    <td className="pb-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        max={PRICE_MAX}
                        step="any"
                        inputMode="decimal"
                        value={r.input}
                        onChange={(e) => setRow(r.key, { input: e.target.value })}
                        disabled={!canWrite}
                        className={INPUT}
                        aria-label={`Input price, row ${i + 1}`}
                      />
                      {draft && rowErrors[i].input && <FieldError>{rowErrors[i].input}</FieldError>}
                    </td>
                    <td className="pb-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        max={PRICE_MAX}
                        step="any"
                        inputMode="decimal"
                        value={r.output}
                        onChange={(e) => setRow(r.key, { output: e.target.value })}
                        disabled={!canWrite}
                        className={INPUT}
                        aria-label={`Output price, row ${i + 1}`}
                      />
                      {draft && rowErrors[i].output && <FieldError>{rowErrors[i].output}</FieldError>}
                    </td>
                    <td className="pb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!canWrite}
                        onClick={() => setDraft(rows.filter((x) => x.key !== r.key))}
                        aria-label={`Remove ${r.model || `row ${i + 1}`}`}
                        className="mt-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={rows.length >= PRICING_MAX_ROWS}
              onClick={() => setDraft([...rows, { key: `new-${rows.length}-${Math.random().toString(36).slice(2)}`, model: "", input: "", output: "" }])}
            >
              <Plus className="w-3.5 h-3.5" />
              Add model
            </Button>
            <span className="text-[11px] text-neutral-500">
              {rows.length}/{PRICING_MAX_ROWS} models
            </span>
            <span className="flex-1" />
            <Button variant="ghost" disabled={draft === null || saving} onClick={() => setDraft(null)}>
              Discard
            </Button>
            <Button variant="primary" disabled={!dirty || invalid} loading={saving} onClick={onSave}>
              Save prices
            </Button>
          </div>
        )}
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ 3. notification limits

function NotificationLimitsCard({ data, canWrite }: { data: SettingsResponse; canWrite: boolean }) {
  const toast = useToast();
  const save = useSaveSetting();
  const server = data.values.notifications.maxEmailRecipients;
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = draft ?? String(server);
  const n = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(n) && n >= EMAIL_CAP_MIN && n <= EMAIL_CAP_MAX;
  const dirty = draft !== null && valid && n !== server;

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await save("notifications", { maxEmailRecipients: n });
      setDraft(null);
      toast.success("Notification limits saved");
    } catch (err) {
      setError(errorText(err, "Couldn't save the limit."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Notification limits" description="Safety caps for announcements." actions={<LastUpdated meta={data.meta.notifications} />}>
      <div className="space-y-4">
        {!canWrite && <ReadOnlyNote />}
        <div className="max-w-xs">
          <label className={LABEL} htmlFor="max-email">
            Max email recipients per announcement
          </label>
          <input
            id="max-email"
            type="number"
            min={EMAIL_CAP_MIN}
            max={EMAIL_CAP_MAX}
            step={1}
            value={value}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!canWrite}
            className={INPUT}
          />
          {!valid ? (
            <FieldError>
              Enter a whole number from {formatNumber(EMAIL_CAP_MIN)} to {formatNumber(EMAIL_CAP_MAX)}.
            </FieldError>
          ) : (
            <p className="mt-1 text-[11px] text-neutral-500">Default {formatNumber(data.defaults.notifications.maxEmailRecipients)}.</p>
          )}
        </div>
        <Note>
          Caps how many emails a single announcement sends, to stay within your email provider&apos;s sending limits. Recipients beyond the cap still get the in-app
          notification (and push, if selected); their email is counted as skipped.
        </Note>
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={!dirty} loading={saving} onClick={onSave}>
              Save limit
            </Button>
            <Button variant="ghost" disabled={draft === null || saving} onClick={() => setDraft(null)}>
              Discard
            </Button>
          </div>
        )}
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ 3b. lifecycle emails

function LifecycleEmailsCard({ data, canWrite }: { data: SettingsResponse; canWrite: boolean }) {
  const toast = useToast();
  const save = useSaveSetting();
  const enabled = data.values.lifecycleEmails.enabled;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onToggle = async (next: boolean) => {
    setSaving(true);
    setError(null);
    try {
      await save("lifecycleEmails", { enabled: next });
      toast.success(next ? "Lifecycle emails are on" : "Lifecycle emails are off");
    } catch (err) {
      setError(errorText(err, "Couldn't save."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Lifecycle emails" description="Automatic emails for new accounts." actions={<LastUpdated meta={data.meta.lifecycleEmails} />}>
      <div className="space-y-4">
        {!canWrite && <ReadOnlyNote />}
        <ToggleRow
          label="Send lifecycle emails"
          description={
            <>
              A <span className="font-semibold">welcome</span> once onboarding is done, a <span className="font-semibold">nudge</span> a day after sign-up if
              they haven&apos;t made a CV, and a <span className="font-semibold">reminder</span> if they made one but never downloaded it. Each at most once
              per account.
            </>
          }
          checked={enabled}
          onChange={onToggle}
          disabled={!canWrite || saving}
        />
        <Note>
          Only verified accounts that haven&apos;t unsubscribed from product emails get them, and only accounts created after this feature shipped (older ones
          were skipped). Sent and failed counts are on the Insights page; each email is also in the email log.
        </Note>
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ 4. system health

function HealthItem({ label, tone, status, children }: { label: string; tone: BadgeTone; status: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-neutral-500">{label}</span>
        <Badge tone={tone}>{status}</Badge>
      </div>
      {children && <div className="mt-1.5 text-xs text-neutral-700 space-y-0.5 break-words">{children}</div>}
    </div>
  );
}

function FailureItem({ label, count, href, linkLabel }: { label: string; count: number; href: string; linkLabel: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 px-4 py-3">
      <div className="text-xs font-semibold text-neutral-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${count > 0 ? "text-rose-700" : "text-emerald-700"}`}>{formatNumber(count)}</div>
      <Link href={href} className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-950">
        {linkLabel}
        <ArrowUpRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function HealthBody({ h }: { h: Health }) {
  const emailTone: BadgeTone = !h.email.configured || !h.email.provider ? "bad" : h.email.delivers ? "good" : "warn";
  const emailStatus = !h.email.configured || !h.email.provider ? "Not configured" : h.email.delivers ? "Delivering" : "Logged only";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <HealthItem label="Database" tone={h.database.ok ? "good" : "bad"} status={h.database.ok ? "OK" : "Error"}>
          {h.database.ok ? <p>Query latency {formatNumber(h.database.latencyMs)} ms</p> : <p className="text-rose-700">{h.database.error ?? "Unreachable"}</p>}
        </HealthItem>
        <HealthItem label="Email" tone={emailTone} status={emailStatus}>
          <p>Provider: {h.email.provider ?? "none"}</p>
          {h.email.fromDomain && <p>From domain: {h.email.fromDomain}</p>}
          {h.email.provider && !h.email.delivers && <p className="text-amber-700">Console provider — emails are logged on the server, not delivered.</p>}
        </HealthItem>
        <HealthItem label="Browser push" tone={h.push.configured ? "good" : "warn"} status={h.push.configured ? "Configured" : "Not configured"}>
          {!h.push.configured && <p>VAPID keys aren&apos;t set. In-app notifications still work.</p>}
        </HealthItem>
        <HealthItem label="AI provider" tone={h.ai.keyConfigured ? "good" : "bad"} status={h.ai.keyConfigured ? "Configured" : "No key"}>
          <p>Provider: {h.ai.provider}</p>
          <p>
            Model: <Mono>{h.ai.model}</Mono>
          </p>
        </HealthItem>
        <HealthItem label="Polar" tone={h.polar.reachable ? "good" : "bad"} status={h.polar.reachable ? "Reachable" : "Unreachable"}>
          <p>
            Environment:{" "}
            <Badge tone={h.polar.environment === "production" ? "dark" : "warn"}>{h.polar.environment}</Badge>
          </p>
          {h.polar.organization && <p>Organization: {h.polar.organization}</p>}
          {h.polar.latencyMs !== null && <p>API latency {formatNumber(h.polar.latencyMs)} ms</p>}
        </HealthItem>
        <HealthItem label="Chapa" tone={h.chapa.configured ? "good" : "warn"} status={h.chapa.configured ? "Configured" : "Not configured"}>
          <p>API version: {h.chapa.apiVersion}</p>
        </HealthItem>
        <HealthItem
          label="Google sign-in"
          tone={h.google.signInConfigured && h.google.redirectConfigured ? "good" : h.google.signInConfigured ? "warn" : "neutral"}
          status={h.google.signInConfigured ? (h.google.redirectConfigured ? "Configured" : "Partial") : "Not configured"}
        >
          {h.google.signInConfigured && !h.google.redirectConfigured && <p>Client ID set, but the redirect flow is missing its client secret.</p>}
        </HealthItem>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-neutral-700 mb-2">Failures in the last 24 hours</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FailureItem label="Failed webhooks" count={h.last24h.failedWebhooks} href="/admin/billing" linkLabel="Subscriptions & Payments" />
          <FailureItem label="Failed emails" count={h.last24h.failedEmails} href="/admin/notifications" linkLabel="Notifications → Email log" />
          <FailureItem label="AI provider errors" count={h.last24h.aiErrors} href="/admin/ai" linkLabel="AI Usage" />
        </div>
      </div>

      <p className="text-[11px] text-neutral-500">
        Checked {formatDateTime(h.checkedAt)} · environment <span className="font-semibold">{h.environment}</span>
      </p>
    </div>
  );
}

function HealthCard() {
  const health = useQuery({ queryKey: ["admin", "health"], queryFn: getHealth, staleTime: 30_000 });
  return (
    <Card
      title="System health"
      description="Whether each integration is configured and reachable, checked live by the backend."
      actions={
        <Button size="sm" onClick={() => health.refetch()} loading={health.isFetching} disabled={health.isFetching}>
          {!health.isFetching && <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </Button>
      }
    >
      <div className="space-y-4">
        {health.isLoading ? (
          <LoadingState label="Checking…" />
        ) : health.error || !health.data ? (
          <ErrorState error={health.error} onRetry={() => health.refetch()} />
        ) : (
          <HealthBody h={health.data} />
        )}
        <Note>
          <Terminal className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
          This view only reports status. Secrets and API keys are never shown, and the dashboard can&apos;t change server configuration or run commands — that happens
          on the server.
        </Note>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ 5. admin account

function AdminAccountCard() {
  const admin = useAdmin();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const nextErr = next.length < PASSWORD_MIN ? `Use at least ${PASSWORD_MIN} characters.` : next === current ? "Choose a password different from the current one." : null;
  const confirmErr = confirm !== next ? "The passwords don't match." : null;
  const currentErr = !current ? "Enter your current password." : null;
  const valid = !nextErr && !confirmErr && !currentErr;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setPending(true);
    setError(null);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setTouched(false);
      toast.success("Password changed", { description: "Your other sessions were signed out." });
    } catch (err) {
      setError(errorText(err, "Couldn't change the password."));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card title="Your admin account">
      <div className="space-y-5">
        <KeyValue
          items={[
            ["Email", admin.email],
            ["Name", admin.fullName ?? "—"],
            ["Role", <Badge key="r" tone="dark">{admin.role}</Badge>],
            ["Last login", formatDateTime(admin.lastLoginAt)],
          ]}
        />

        <div className="border-t border-neutral-200 pt-5">
          <h3 className="text-sm font-bold text-neutral-950 mb-1">Change password</h3>
          {admin.hasPassword ? (
            <form onSubmit={submit} className="space-y-3 max-w-md" noValidate>
              <p className="text-xs text-neutral-500">Changing your password signs out all of your other sessions (this browser stays signed in).</p>
              <div>
                <label className={LABEL} htmlFor="pw-current">
                  Current password
                </label>
                <input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={INPUT} />
                {touched && currentErr && <FieldError>{currentErr}</FieldError>}
              </div>
              <div>
                <label className={LABEL} htmlFor="pw-new">
                  New password
                </label>
                <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={INPUT} />
                {(touched || next.length > 0) && nextErr ? (
                  <FieldError>{nextErr}</FieldError>
                ) : (
                  <p className="mt-1 text-[11px] text-neutral-500">At least {PASSWORD_MIN} characters. A long passphrase is best.</p>
                )}
              </div>
              <div>
                <label className={LABEL} htmlFor="pw-confirm">
                  Confirm new password
                </label>
                <input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={INPUT} />
                {(touched || confirm.length > 0) && confirmErr && <FieldError>{confirmErr}</FieldError>}
              </div>
              {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
              <Button type="submit" variant="primary" loading={pending}>
                Change password
              </Button>
            </form>
          ) : (
            <Note tone="warn">
              This account has no password (it signs in with Google). To set one, run{" "}
              <code className="font-mono text-[11px] bg-white/70 px-1 rounded">npm run admin:create -- --reset-password</code> on the server.
            </Note>
          )}
        </div>

        <Note tone="info">
          <Terminal className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
          There is no admin sign-up. Admins are created, promoted and demoted only with the server script:{" "}
          <code className="font-mono text-[11px]">npm run admin:create</code>, <code className="font-mono text-[11px]">--promote</code>,{" "}
          <code className="font-mono text-[11px]">--demote</code> and <code className="font-mono text-[11px]">--list</code>.
        </Note>
      </div>
    </Card>
  );
}
