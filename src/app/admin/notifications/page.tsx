"use client";

import React, { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, CheckCircle2, ExternalLink, Info, Mail, Search, Send, Smartphone, X, XCircle } from "lucide-react";
import {
  countAudience,
  createAdminNotification,
  getAdminNotification,
  getChannelStatus,
  getSettings,
  listAdminNotifications,
  listEmailLogs,
  listUsers,
  sendTestEmail,
  type Audience,
  type Channel,
  type EmailLogRow,
  type NotificationRow,
} from "@/lib/admin-api";
import { errorText, formatDateTime, formatNumber } from "@/lib/admin-format";
import { useAdmin, useCan } from "@/components/admin/AdminShell";
import { useToast } from "@/components/Toaster";
import {
  ActionDialog,
  Badge,
  Button,
  Card,
  DataTable,
  ErrorState,
  INPUT,
  KeyValue,
  LABEL,
  LoadingState,
  Modal,
  Mono,
  Note,
  PageHeader,
  Pagination,
  SourceTag,
  StatusBadge,
  Tabs,
  type Column,
} from "@/components/admin/ui";

// Admin announcements and direct messages. In-app, email and push are three
// separate channels with separate results — an in-app notification is never
// a push, and email only reaches verified addresses.

// ------------------------------------------------------------------ helpers

type TabId = "compose" | "history" | "emails";
type AudienceType = Audience["type"];
type EmailCategory = "product" | "service";

const TITLE_MAX = 120;
const BODY_MAX = 2000;
const LINK_MAX = 500;
const MAX_PICKED_USERS = 500;

const AUDIENCE_OPTIONS: { type: AudienceType; label: string; hint: string }[] = [
  { type: "all", label: "All users", hint: "Every active account." },
  { type: "free", label: "Free users", hint: "No Pro access right now — neither paid nor complimentary." },
  { type: "pro", label: "Pro users (paid or complimentary)", hint: "An active paid subscription or an active Pro grant." },
  { type: "paid", label: "Paid subscribers", hint: "An active paid subscription (complimentary Pro not included)." },
  { type: "verified", label: "Verified users", hint: "Accounts whose email address is verified." },
  { type: "beta", label: "Beta program", hint: "Users with an active beta-program grant." },
  { type: "new", label: "New users", hint: "Accounts registered in the last N days." },
  { type: "users", label: "Specific users", hint: `Pick up to ${MAX_PICKED_USERS} accounts by email or name.` },
];

const CHANNEL_LABELS: Record<Channel, string> = { in_app: "In-app", email: "Email", push: "Push" };
const CHANNEL_ORDER: Channel[] = ["in_app", "email", "push"];

const EMAIL_KINDS = ["verification", "email_change", "password_reset", "announcement", "subscription", "test"] as const;
const EMAIL_STATUSES: EmailLogRow["status"][] = ["sent", "failed", "skipped"];

function audienceLabel(audience: Audience | null | undefined): string {
  if (!audience) return "—";
  switch (audience.type) {
    case "new":
      return `New users (last ${audience.days} day${audience.days === 1 ? "" : "s"})`;
    case "users": {
      const n = audience.userIds?.length ?? 0;
      return `${n} specific user${n === 1 ? "" : "s"}`;
    }
    default:
      return AUDIENCE_OPTIONS.find((o) => o.type === audience.type)?.label ?? String(audience.type);
  }
}

/** Same rule as the backend's actionUrlSchema: an app path or an https:// link. */
function actionUrlError(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (v.length > LINK_MAX) return `Keep the link under ${LINK_MAX} characters.`;
  if ((v.startsWith("/") && !v.startsWith("//")) || /^https:\/\/[^\s]+$/i.test(v)) return null;
  return "Use a path starting with / (like /dashboard/upgrade) or an https:// link.";
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function ChannelBadges({ channels }: { channels: Channel[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {CHANNEL_ORDER.filter((c) => channels.includes(c)).map((c) => (
        <Badge key={c} tone={c === "in_app" ? "accent" : c === "email" ? "info" : "neutral"}>
          {CHANNEL_LABELS[c]}
        </Badge>
      ))}
    </div>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  const n = value.length;
  return <span className={`text-[11px] tabular-nums ${n > max ? "text-rose-600 font-semibold" : n > max * 0.9 ? "text-amber-700" : "text-neutral-400"}`}>{n}/{max}</span>;
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs font-medium text-rose-600">{children}</p>;
}

// ------------------------------------------------------------------ page

export default function AdminNotificationsPage() {
  const canSend = useCan("notifications:send");
  const [tab, setTab] = useState<TabId>("compose");

  if (!canSend) {
    return (
      <>
        <PageHeader title="Notifications" description="Announcements and direct messages to users, plus the email delivery log." />
        <Card>
          <Note tone="warn">Your admin role doesn&apos;t include the notifications:send permission, so you can&apos;t view or send notifications.</Note>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Send in-app notifications, emails and browser push to users, and check what was delivered. Each channel is separate and reports its own results."
      />
      <Tabs<TabId>
        tabs={[
          { id: "compose", label: "Compose" },
          { id: "history", label: "History" },
          { id: "emails", label: "Email log" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {/* Compose stays mounted so a draft survives switching tabs. */}
      <div className={tab === "compose" ? "" : "hidden"}>
        <ComposeTab onSent={() => setTab("history")} />
      </div>
      {tab === "history" && <HistoryTab />}
      {tab === "emails" && <EmailLogTab />}
    </>
  );
}

// ------------------------------------------------------------------ compose

interface PickedUser {
  id: string;
  email: string;
  fullName: string | null;
}

function ChannelStatusStrip() {
  const status = useQuery({ queryKey: ["admin", "notifications", "channels"], queryFn: getChannelStatus, staleTime: 30_000 });
  if (status.isLoading) return <LoadingState label="Checking channels…" />;
  if (status.error || !status.data) return <ErrorState error={status.error} onRetry={() => status.refetch()} />;
  const { email, push } = status.data;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="rounded-lg border border-neutral-300 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
            <Bell className="w-3.5 h-3.5" /> In-app
          </span>
          <Badge tone="good">
            <CheckCircle2 className="w-3 h-3" /> Available
          </Badge>
        </div>
        <p className="mt-1.5 text-xs text-neutral-600">Appears in the bell menu of the user&apos;s dashboard. Always available.</p>
      </div>
      <div className="rounded-lg border border-neutral-300 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
            <Mail className="w-3.5 h-3.5" /> Email
          </span>
          {!email.provider ? (
            <Badge tone="bad">Not configured</Badge>
          ) : email.delivers ? (
            <Badge tone="good">Delivers</Badge>
          ) : (
            <Badge tone="warn">Logged only</Badge>
          )}
        </div>
        <p className="mt-1.5 text-xs text-neutral-600">
          {email.provider ? (
            <>
              Provider <span className="font-semibold text-neutral-800">{email.provider}</span>
              {email.fromDomain && (
                <>
                  {" "}
                  · from <span className="font-semibold text-neutral-800">{email.fromDomain}</span>
                </>
              )}
              {!email.delivers && " · the console provider only logs emails on the server; nothing is delivered."}
            </>
          ) : (
            "No email provider is configured on the backend."
          )}
        </p>
      </div>
      <div className="rounded-lg border border-neutral-300 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
            <Smartphone className="w-3.5 h-3.5" /> Browser push
          </span>
          {push.available ? <Badge tone="good">Configured</Badge> : <Badge tone="warn">Not configured</Badge>}
        </div>
        <p className="mt-1.5 text-xs text-neutral-600">
          {push.available
            ? `${formatNumber(push.subscribedUsers)} user${push.subscribedUsers === 1 ? " has" : "s have"} opted in on at least one browser.`
            : "VAPID keys aren't set on the backend, so push can't be sent."}
        </p>
      </div>
    </div>
  );
}

function UserPicker({ picked, onChange, disabled }: { picked: PickedUser[]; onChange: (next: PickedUser[]) => void; disabled?: boolean }) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim(), 300);
  const search = useQuery({
    queryKey: ["admin", "users", "picker", dq],
    queryFn: () => listUsers({ q: dq, pageSize: 8 }),
    enabled: dq.length >= 2,
    staleTime: 30_000,
  });
  const full = picked.length >= MAX_PICKED_USERS;
  const pickedIds = new Set(picked.map((p) => p.id));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email or name (2+ characters)"
          className={`${INPUT} pl-9`}
          disabled={disabled || full}
          aria-label="Search users"
        />
      </div>
      {q.trim().length >= 2 && (
        <div className="rounded-lg border border-neutral-200 bg-white max-h-64 overflow-y-auto">
          {search.isLoading || dq !== q.trim() ? (
            <p className="px-3 py-3 text-xs text-neutral-500">Searching…</p>
          ) : search.error ? (
            <p className="px-3 py-3 text-xs text-rose-600">{errorText(search.error, "Couldn't search users.")}</p>
          ) : !search.data?.items.length ? (
            <p className="px-3 py-3 text-xs text-neutral-500">No users match “{dq}”.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {search.data.items.map((u) => {
                const added = pickedIds.has(u.id);
                return (
                  <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-neutral-900 truncate">{u.email}</div>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {u.fullName && <span className="text-xs text-neutral-500 truncate mr-1">{u.fullName}</span>}
                        {u.status === "SUSPENDED" && (
                          <Badge tone="bad" title="Suspended accounts never receive notifications">
                            Suspended · excluded
                          </Badge>
                        )}
                        {!u.emailVerified && <Badge tone="warn" title="Unverified addresses don't get email">Unverified</Badge>}
                        {u.isPro && <Badge tone="accent">Pro</Badge>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={disabled || added || full}
                      onClick={() => onChange([...picked, { id: u.id, email: u.email, fullName: u.fullName }])}
                    >
                      {added ? "Added" : "Add"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {picked.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs text-neutral-500">
              {picked.length} selected{full && ` (maximum ${MAX_PICKED_USERS})`}
            </span>
            <button type="button" className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 cursor-pointer" onClick={() => onChange([])} disabled={disabled}>
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {picked.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1 max-w-full rounded-full border border-neutral-300 bg-neutral-50 pl-2.5 pr-1 py-0.5 text-xs text-neutral-800">
                <span className="truncate" title={p.fullName ?? p.email}>
                  {p.email}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(picked.filter((x) => x.id !== p.id))}
                  className="p-0.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200 cursor-pointer"
                  aria-label={`Remove ${p.email}`}
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelOption({
  checked,
  disabled,
  onChange,
  label,
  icon: Icon,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
        disabled ? "border-neutral-200 bg-neutral-50 cursor-not-allowed" : checked ? "border-accent bg-accent-soft/40 cursor-pointer" : "border-neutral-300 bg-white cursor-pointer"
      }`}
    >
      <input type="checkbox" className="mt-0.5 accent-accent" checked={checked && !disabled} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="min-w-0">
        <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${disabled ? "text-neutral-400" : "text-neutral-900"}`}>
          <Icon className="w-4 h-4" />
          {label}
        </span>
        {children && <span className="block mt-0.5 text-xs text-neutral-500 leading-relaxed">{children}</span>}
      </span>
    </label>
  );
}

function NotificationPreview({ title, body, link }: { title: string; body: string; link: string }) {
  const linkOk = link.trim() && !actionUrlError(link);
  return (
    <div className="rounded-lg border border-neutral-300 bg-white shadow-sm max-w-sm">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200">
        <span className="text-sm font-semibold text-neutral-950">Notifications</span>
        <span className="text-[11px] text-neutral-400">In-app preview</span>
      </div>
      <div className="p-1.5">
        <div className="rounded-md bg-neutral-50 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <span className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug font-semibold text-neutral-950 break-words">{title.trim() || <span className="text-neutral-400 font-normal">Your title</span>}</p>
              <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed whitespace-pre-line line-clamp-4 break-words">
                {body.trim() || <span className="text-neutral-400">Your message</span>}
              </p>
              <p className="mt-1 text-[11px] text-neutral-400">just now</p>
              {linkOk && (
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-accent-strong break-all">
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  Opens {link.trim()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="px-3 pb-2.5 text-[11px] text-neutral-400">
        The bell shows up to four lines of the message; clicking the notification opens the link{linkOk ? "" : " (if any)"}.
      </p>
    </div>
  );
}

function TestEmailCard() {
  const admin = useAdmin();
  const qc = useQueryClient();
  const [to, setTo] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ to: string; status: "sent" | "skipped" | "failed"; id?: string | null; error?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trimmed = to.trim();
  const invalid = trimmed.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

  const send = async () => {
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await sendTestEmail(trimmed || undefined);
      setResult(res);
      await qc.invalidateQueries({ queryKey: ["admin", "notifications", "email-logs"] });
    } catch (err) {
      setError(errorText(err, "Couldn't send the test email."));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card title="Send a test email" description="Checks the email provider end to end. Limited to 5 per hour.">
      <div className="space-y-3">
        <div>
          <label className={LABEL} htmlFor="test-email-to">
            Recipient (optional)
          </label>
          <input
            id="test-email-to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={admin.email}
            className={INPUT}
            autoComplete="off"
          />
          {invalid ? <FieldError>Enter a valid email address.</FieldError> : <p className="mt-1 text-[11px] text-neutral-500">Leave empty to send to your admin address.</p>}
        </div>
        <Button onClick={send} loading={pending} disabled={invalid}>
          <Mail className="w-3.5 h-3.5" />
          Send test email
        </Button>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        {result &&
          (result.status === "sent" ? (
            <Note>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sent to {result.to}
              </span>
              {result.id && (
                <>
                  {" "}
                  · provider id <Mono>{result.id}</Mono>
                </>
              )}
            </Note>
          ) : result.status === "skipped" ? (
            <Note tone="warn">
              <span className="font-semibold">Not delivered.</span> The console provider only logged the email to {result.to} on the server. Configure a real provider to deliver email.
            </Note>
          ) : (
            <Note tone="warn">
              <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                <XCircle className="w-3.5 h-3.5" /> Failed to send to {result.to}
              </span>
              {result.error && <span className="block mt-0.5 break-words">{result.error}</span>}
            </Note>
          ))}
      </div>
    </Card>
  );
}

function ComposeTab({ onSent }: { onSent: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const channelStatus = useQuery({ queryKey: ["admin", "notifications", "channels"], queryFn: getChannelStatus, staleTime: 30_000 });
  const settings = useQuery({ queryKey: ["admin", "settings"], queryFn: getSettings, staleTime: 60_000, retry: false });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [audienceType, setAudienceType] = useState<AudienceType>("all");
  const [newDays, setNewDays] = useState("30");
  const [picked, setPicked] = useState<PickedUser[]>([]);
  const [wanted, setWanted] = useState<Record<Channel, boolean>>({ in_app: true, email: false, push: false });
  const [category, setCategory] = useState<EmailCategory>("product");
  const [touched, setTouched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ---- audience
  const daysNum = Number(newDays);
  const daysValid = newDays.trim() !== "" && Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= 365;
  let audience: Audience | null = null;
  if (audienceType === "new") audience = daysValid ? { type: "new", days: daysNum } : null;
  else if (audienceType === "users") audience = picked.length > 0 && picked.length <= MAX_PICKED_USERS ? { type: "users", userIds: picked.map((p) => p.id) } : null;
  else audience = { type: audienceType } as Audience;

  const audienceKey = audience ? JSON.stringify(audience) : null;
  const debouncedKey = useDebounced(audienceKey, 400);
  const count = useQuery({
    queryKey: ["admin", "notifications", "audience", debouncedKey],
    queryFn: () => countAudience(JSON.parse(debouncedKey as string) as Audience),
    enabled: debouncedKey !== null,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
  const countFresh = debouncedKey === audienceKey && audienceKey !== null && !count.isPlaceholderData && Boolean(count.data);
  const counts = countFresh ? count.data : undefined;

  // ---- channels
  const status = channelStatus.data;
  const emailAvailable = Boolean(status?.email.provider);
  const pushAvailable = Boolean(status?.push.available);
  const available: Record<Channel, boolean> = { in_app: true, email: emailAvailable, push: pushAvailable };
  const channels = CHANNEL_ORDER.filter((c) => wanted[c] && available[c]);
  const emailOn = channels.includes("email");
  const pushOn = channels.includes("push");

  const emailable = counts ? (category === "product" ? counts.emailableProduct : counts.emailableService) : undefined;
  const cap = settings.data?.values.notifications.maxEmailRecipients;
  const emailAttempts = emailable !== undefined ? (cap !== undefined ? Math.min(emailable, cap) : emailable) : undefined;
  const overCap = emailable !== undefined && cap !== undefined && emailable > cap;

  // ---- validation (mirrors createNotificationSchema)
  const titleErr = !title.trim() ? "Add a title." : title.trim().length > TITLE_MAX ? `Keep the title under ${TITLE_MAX} characters.` : null;
  const bodyErr = !body.trim() ? "Write a message." : body.trim().length > BODY_MAX ? `Keep the message under ${BODY_MAX} characters.` : null;
  const linkErr = actionUrlError(link);
  const audienceErr =
    audienceType === "new" && !daysValid
      ? "Enter a whole number of days between 1 and 365."
      : audienceType === "users" && picked.length === 0
        ? "Add at least one user."
        : null;
  const channelErr = channels.length === 0 ? "Choose at least one channel." : null;
  const emptyAudience = counts?.total === 0;
  const valid = !titleErr && !bodyErr && !linkErr && !audienceErr && !channelErr && audience !== null;

  const resetForm = () => {
    setTitle("");
    setBody("");
    setLink("");
    setPicked([]);
    setTouched(false);
  };

  const submit = async () => {
    if (!audience) throw new Error("Choose an audience.");
    const row = await createAdminNotification({
      title: title.trim(),
      body: body.trim(),
      actionUrl: link.trim() || null,
      audience,
      channels,
      emailCategory: category,
    });
    await qc.invalidateQueries({ queryKey: ["admin", "notifications"] });
    const background = row.status === "sending";
    toast.success(background ? "Notification created — delivery in progress" : "Notification sent", {
      description: `${formatNumber(row.recipientCount)} recipient${row.recipientCount === 1 ? "" : "s"} via ${channels.map((c) => CHANNEL_LABELS[c]).join(", ")}.${
        background ? " Email/push results will appear in History." : ""
      }`,
      duration: 6000,
    });
    resetForm();
    onSent();
  };

  const audienceHint = AUDIENCE_OPTIONS.find((o) => o.type === audienceType)?.hint;

  return (
    <div className="space-y-5">
      <ChannelStatusStrip />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-5 items-start">
        <Card title="Compose" description="Recipients are resolved when you send. Suspended accounts are always excluded.">
          <div className="space-y-5">
            {/* Content */}
            <div>
              <div className="flex items-center justify-between">
                <label className={LABEL} htmlFor="n-title">
                  Title
                </label>
                <CharCount value={title} max={TITLE_MAX} />
              </div>
              <input id="n-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TITLE_MAX} className={INPUT} placeholder="e.g. New: tailor your CV to any job post" />
              {touched && titleErr && <FieldError>{titleErr}</FieldError>}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className={LABEL} htmlFor="n-body">
                  Message
                </label>
                <CharCount value={body} max={BODY_MAX} />
              </div>
              <textarea id="n-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={BODY_MAX} rows={5} className={INPUT} placeholder="What do you want users to know?" />
              {touched && bodyErr && <FieldError>{bodyErr}</FieldError>}
            </div>
            <div>
              <label className={LABEL} htmlFor="n-link">
                Action link (optional)
              </label>
              <input id="n-link" value={link} onChange={(e) => setLink(e.target.value)} maxLength={LINK_MAX} className={INPUT} placeholder="/dashboard/upgrade or https://…" autoComplete="off" />
              {linkErr ? (
                <FieldError>{linkErr}</FieldError>
              ) : (
                <p className="mt-1 text-[11px] text-neutral-500">An app path like /dashboard/upgrade, or an https:// link. Emails include it as a button.</p>
              )}
            </div>

            {/* Audience */}
            <div className="border-t border-neutral-200 pt-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_10rem] gap-3">
                <div>
                  <label className={LABEL} htmlFor="n-audience">
                    Audience
                  </label>
                  <select id="n-audience" value={audienceType} onChange={(e) => setAudienceType(e.target.value as AudienceType)} className={INPUT}>
                    {AUDIENCE_OPTIONS.map((o) => (
                      <option key={o.type} value={o.type}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {audienceType === "new" && (
                  <div>
                    <label className={LABEL} htmlFor="n-days">
                      Registered in last
                    </label>
                    <div className="flex items-center gap-2">
                      <input id="n-days" type="number" min={1} max={365} step={1} value={newDays} onChange={(e) => setNewDays(e.target.value)} className={INPUT} />
                      <span className="text-sm text-neutral-500">days</span>
                    </div>
                  </div>
                )}
              </div>
              {audienceHint && <p className="text-xs text-neutral-500">{audienceHint} Suspended accounts are always excluded.</p>}
              {audienceType === "users" && <UserPicker picked={picked} onChange={setPicked} />}
              {audienceErr && (touched || audienceType === "new") && <FieldError>{audienceErr}</FieldError>}
            </div>

            {/* Channels */}
            <div className="border-t border-neutral-200 pt-5 space-y-2.5">
              <span className={LABEL}>Channels</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <ChannelOption checked={wanted.in_app} onChange={(v) => setWanted((w) => ({ ...w, in_app: v }))} label="In-app" icon={Bell}>
                  Shows in the dashboard bell. Delivered immediately.
                </ChannelOption>
                <ChannelOption
                  checked={wanted.email}
                  disabled={!emailAvailable}
                  onChange={(v) => setWanted((w) => ({ ...w, email: v }))}
                  label="Email"
                  icon={Mail}
                >
                  {channelStatus.isLoading
                    ? "Checking the email provider…"
                    : !emailAvailable
                      ? "No email provider is configured on the backend."
                      : "Verified addresses only. Sent in the background."}
                </ChannelOption>
                <ChannelOption checked={wanted.push} disabled={!pushAvailable} onChange={(v) => setWanted((w) => ({ ...w, push: v }))} label="Push" icon={Smartphone}>
                  {channelStatus.isLoading
                    ? "Checking push configuration…"
                    : !pushAvailable
                      ? "Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT on the backend; in-app notifications still work."
                      : `Only browsers that opted in (${formatNumber(status?.push.subscribedUsers)} users in total).`}
                </ChannelOption>
              </div>
              {emailOn && status && !status.email.delivers && (
                <Note tone="warn">
                  <AlertTriangle className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                  The email provider is <span className="font-semibold">{status.email.provider}</span>: emails are only logged on the server, not delivered to anyone.
                </Note>
              )}
              {touched && channelErr && <FieldError>{channelErr}</FieldError>}

              {wanted.email && emailAvailable && (
                <fieldset className="rounded-lg border border-neutral-200 p-3 space-y-2">
                  <legend className="px-1 text-xs font-semibold text-neutral-700">Email category</legend>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="radio" name="email-category" className="mt-1" checked={category === "product"} onChange={() => setCategory("product")} />
                    <span className="text-sm">
                      <span className="font-semibold text-neutral-900">Product announcement</span>
                      <span className="block text-xs text-neutral-500">Skips users who unsubscribed from announcements; every email includes an unsubscribe link.</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="radio" name="email-category" className="mt-1" checked={category === "service"} onChange={() => setCategory("service")} />
                    <span className="text-sm">
                      <span className="font-semibold text-neutral-900">Service notice</span>
                      <span className="block text-xs text-neutral-500">
                        Maintenance, account or billing information. Sent even to users who unsubscribed from announcements — use only when it&apos;s genuinely necessary.
                      </span>
                    </span>
                  </label>
                </fieldset>
              )}
            </div>

            {/* Reach + send */}
            <div className="border-t border-neutral-200 pt-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-neutral-500">Recipients</span>
                    <SourceTag source="database" />
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums text-neutral-950">
                    {!audience ? "—" : counts ? formatNumber(counts.total) : count.error ? "?" : <span className="text-neutral-400">…</span>}
                  </div>
                  <p className="text-[11px] text-neutral-500">{audienceLabel(audience)} · active accounts only</p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <span className="text-xs font-semibold text-neutral-500">Will receive email</span>
                  <div className={`mt-1 text-2xl font-bold tabular-nums ${emailOn ? "text-neutral-950" : "text-neutral-400"}`}>
                    {!emailOn ? "—" : emailAttempts !== undefined ? formatNumber(emailAttempts) : count.error ? "?" : "…"}
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    {!emailOn
                      ? "Email channel not selected."
                      : category === "product"
                        ? "Verified addresses that haven't unsubscribed."
                        : "All verified addresses (service notice)."}
                  </p>
                </div>
              </div>
              {count.error && <p className="text-xs text-rose-600">{errorText(count.error, "Couldn't count the audience.")}</p>}
              {emailOn && overCap && cap !== undefined && (
                <Note tone="warn">
                  {formatNumber(emailable)} addresses qualify, but one announcement emails at most {formatNumber(cap)} (Platform Settings → Notification limits). The rest are counted as skipped.
                </Note>
              )}
              {emptyAudience && <Note tone="warn">Nobody matches this audience right now.</Note>}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  disabled={emptyAudience}
                  onClick={() => {
                    setTouched(true);
                    if (valid) setConfirmOpen(true);
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                  Review & send
                </Button>
                <span className="text-xs text-neutral-500">You&apos;ll confirm the audience and channels before anything is sent.</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Preview" description="How the in-app notification looks in the user's bell menu.">
            <NotificationPreview title={title} body={body} link={link} />
          </Card>
          <TestEmailCard />
        </div>
      </div>

      <ActionDialog
        open={confirmOpen}
        title="Send this notification?"
        confirmLabel="Send now"
        description={
          <>
            <span className="font-semibold text-neutral-900">“{title.trim()}”</span> will go to the audience below. This can&apos;t be unsent.
          </>
        }
        onConfirm={submit}
        onClose={() => setConfirmOpen(false)}
      >
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-3">
          <KeyValue
            items={[
              ["Audience", audienceLabel(audience)],
              ["Recipients", counts ? `${formatNumber(counts.total)} active account${counts.total === 1 ? "" : "s"}` : "Not counted yet"],
              ["Channels", <ChannelBadges key="c" channels={channels} />],
              ...(channels.includes("in_app")
                ? ([["In-app", "Created immediately for every recipient."]] as [React.ReactNode, React.ReactNode][])
                : []),
              ...(emailOn
                ? ([
                    [
                      "Email",
                      <>
                        ~{emailAttempts !== undefined ? formatNumber(emailAttempts) : "?"} address{emailAttempts === 1 ? "" : "es"} ·{" "}
                        {category === "product" ? "product announcement (respects unsubscribe)" : "service notice (ignores announcement opt-out)"}
                        {status && !status.email.delivers && <span className="block text-amber-700 text-xs mt-0.5">Console provider — logged on the server, not delivered.</span>}
                      </>,
                    ],
                  ] as [React.ReactNode, React.ReactNode][])
                : []),
              ...(pushOn ? ([["Push", "Every opted-in browser of these recipients."]] as [React.ReactNode, React.ReactNode][]) : []),
            ]}
          />
        </div>
        {(emailOn || pushOn) && (
          <Note tone="info">
            <Info className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            Email and push are sent in the background (emails at about two per second). Progress and failures appear in History.
          </Note>
        )}
      </ActionDialog>
    </div>
  );
}

// ------------------------------------------------------------------ history

function DeliveryCounts({ row }: { row: NotificationRow }) {
  return (
    <span className="text-xs tabular-nums whitespace-nowrap">
      <span className="text-emerald-700">{formatNumber(row.emailSent)} sent</span>
      <span className="text-neutral-300"> · </span>
      <span className={row.emailFailed ? "text-rose-700 font-semibold" : "text-neutral-500"}>{formatNumber(row.emailFailed)} failed</span>
      <span className="text-neutral-300"> · </span>
      <span className="text-neutral-500">{formatNumber(row.emailSkipped)} skipped</span>
    </span>
  );
}

function HistoryTab() {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const history = useQuery({
    queryKey: ["admin", "notifications", "history", page],
    queryFn: () => listAdminNotifications({ page, pageSize: 20 }),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => (query.state.data?.items.some((r) => r.status === "sending") ? 5000 : false),
  });

  const columns: Column<NotificationRow>[] = [
    { key: "at", header: "Sent", cell: (r) => <span className="whitespace-nowrap text-xs text-neutral-600">{formatDateTime(r.createdAt)}</span> },
    {
      key: "title",
      header: "Title",
      cell: (r) => (
        <div className="min-w-[10rem] max-w-xs">
          <div className="font-medium text-neutral-900 truncate" title={r.title}>
            {r.title}
          </div>
          {r.createdByEmail && <div className="text-[11px] text-neutral-500 truncate">by {r.createdByEmail}</div>}
        </div>
      ),
    },
    { key: "audience", header: "Audience", cell: (r) => <span className="text-xs whitespace-nowrap">{audienceLabel(r.audience)}</span> },
    { key: "channels", header: "Channels", cell: (r) => <ChannelBadges channels={r.channels} /> },
    { key: "recipients", header: "Recipients", className: "text-right", cell: (r) => <span className="tabular-nums">{formatNumber(r.recipientCount)}</span> },
    {
      key: "read",
      header: "Read",
      className: "text-right",
      cell: (r) => (r.channels.includes("in_app") ? <span className="tabular-nums">{formatNumber(r.readCount ?? 0)}</span> : <span className="text-neutral-400">—</span>),
    },
    { key: "email", header: "Email", cell: (r) => (r.channels.includes("email") ? <DeliveryCounts row={r} /> : <span className="text-neutral-400">—</span>) },
    {
      key: "push",
      header: "Push",
      cell: (r) =>
        r.channels.includes("push") ? (
          <span className="text-xs tabular-nums whitespace-nowrap">
            <span className="text-emerald-700">{formatNumber(r.pushSent)} sent</span>
            <span className="text-neutral-300"> · </span>
            <span className={r.pushFailed ? "text-rose-700 font-semibold" : "text-neutral-500"}>{formatNumber(r.pushFailed)} failed</span>
          </span>
        ) : (
          <span className="text-neutral-400">—</span>
        ),
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <Card
        padded={false}
        title="Sent notifications"
        description="Newest first. Rows still sending refresh every 5 seconds. Click a row for details."
        actions={<SourceTag source="database" />}
      >
        <DataTable
          columns={columns}
          rows={history.data?.items}
          rowKey={(r) => r.id}
          isLoading={history.isFetching && history.isPlaceholderData}
          error={history.error}
          onRetry={() => history.refetch()}
          onRowClick={(r) => setOpenId(r.id)}
          emptyTitle="No notifications sent yet"
          emptyDescription="Notifications you send from Compose appear here with their delivery results."
        />
        {history.data && history.data.total > 0 && (
          <Pagination page={history.data.page} pageCount={history.data.pageCount} total={history.data.total} onChange={setPage} />
        )}
      </Card>
      <Note>
        <span className="font-semibold">Email skipped</span> counts recipients who weren&apos;t emailed: unverified addresses, users who unsubscribed (product announcements), anyone beyond the per-announcement email cap, and emails the console provider only logged.
      </Note>
      <NotificationDetailModal id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

function MiniStat({ label, value, tone = "neutral" }: { label: string; value: React.ReactNode; tone?: "neutral" | "good" | "bad" }) {
  const cls = { neutral: "text-neutral-950", good: "text-emerald-700", bad: "text-rose-700" }[tone];
  return (
    <div className="rounded-lg border border-neutral-200 px-3 py-2">
      <div className="text-[11px] font-semibold text-neutral-500">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function NotificationDetailModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detail = useQuery({
    queryKey: ["admin", "notifications", "detail", id],
    queryFn: () => getAdminNotification(id as string),
    enabled: id !== null,
    refetchInterval: (query) => (query.state.data?.status === "sending" ? 5000 : false),
  });
  const n = detail.data;

  return (
    <Modal open={id !== null} title="Notification details" onClose={onClose} wide>
      {detail.isLoading ? (
        <LoadingState />
      ) : detail.error || !n ? (
        <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge status={n.status} />
              <ChannelBadges channels={n.channels} />
              {n.channels.includes("email") && <Badge>{n.emailCategory === "service" ? "Service notice" : "Product announcement"}</Badge>}
            </div>
            <h4 className="text-base font-bold text-neutral-950 break-words">{n.title}</h4>
            <p className="mt-1.5 text-sm text-neutral-700 whitespace-pre-line break-words">{n.body}</p>
          </div>

          <KeyValue
            items={[
              [
                "Link",
                n.actionUrl ? (
                  <span key="l" className="break-all">
                    {n.actionUrl}
                  </span>
                ) : (
                  "None"
                ),
              ],
              ["Audience", audienceLabel(n.audience)],
              ["Created by", n.createdByEmail ?? "—"],
              ["Created", formatDateTime(n.createdAt)],
              ["Completed", n.completedAt ? formatDateTime(n.completedAt) : n.status === "sending" ? "Still sending…" : "—"],
            ]}
          />

          <div>
            <h5 className="text-xs font-semibold text-neutral-700 mb-2">Results</h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MiniStat label="Recipients" value={formatNumber(n.recipientCount)} />
              {n.channels.includes("in_app") && (
                <>
                  <MiniStat label="In-app delivered" value={formatNumber(n.stats.inApp)} />
                  <MiniStat label="Read" value={formatNumber(n.stats.read)} />
                  <MiniStat label="Dismissed" value={formatNumber(n.stats.dismissed)} />
                </>
              )}
              {n.channels.includes("email") && (
                <>
                  <MiniStat label="Email sent" value={formatNumber(n.emailSent)} tone="good" />
                  <MiniStat label="Email failed" value={formatNumber(n.emailFailed)} tone={n.emailFailed ? "bad" : "neutral"} />
                  <MiniStat label="Email skipped" value={formatNumber(n.emailSkipped)} />
                </>
              )}
              {n.channels.includes("push") && (
                <>
                  <MiniStat label="Push sent" value={formatNumber(n.pushSent)} tone="good" />
                  <MiniStat label="Push failed" value={formatNumber(n.pushFailed)} tone={n.pushFailed ? "bad" : "neutral"} />
                </>
              )}
            </div>
            {n.channels.includes("push") && (
              <p className="mt-2 text-[11px] text-neutral-500">Push counts are per browser subscription, not per user.</p>
            )}
          </div>

          {n.channels.includes("email") && (
            <div>
              <h5 className="text-xs font-semibold text-neutral-700 mb-2">Failed emails {n.emailFailures.length >= 50 && "(latest 50)"}</h5>
              {n.emailFailures.length === 0 ? (
                <p className="text-xs text-neutral-500">No failed emails{n.status === "sending" ? " so far" : ""}.</p>
              ) : (
                <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 max-h-60 overflow-y-auto">
                  {n.emailFailures.map((f) => (
                    <li key={f.id} className="px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-neutral-900 truncate">{f.toEmail}</span>
                        <span className="text-[11px] text-neutral-400 whitespace-nowrap">{formatDateTime(f.createdAt)}</span>
                      </div>
                      <p className="text-xs text-rose-700 break-words">{f.error ?? "Unknown error"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ email log

function EmailLogTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<EmailLogRow["status"] | "">("");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim(), 350);

  const logs = useQuery({
    queryKey: ["admin", "notifications", "email-logs", { page, status, kind, q: dq }],
    queryFn: () => listEmailLogs({ page, pageSize: 25, status: status || undefined, kind: kind || undefined, q: dq || undefined }),
    placeholderData: keepPreviousData,
  });

  const columns: Column<EmailLogRow>[] = [
    { key: "at", header: "Time", cell: (r) => <span className="whitespace-nowrap text-xs text-neutral-600">{formatDateTime(r.createdAt)}</span> },
    { key: "to", header: "To", cell: (r) => <span className="text-sm break-all">{r.toEmail}</span> },
    { key: "kind", header: "Kind", cell: (r) => <Badge>{r.kind.replace(/_/g, " ")}</Badge> },
    {
      key: "subject",
      header: "Subject",
      cell: (r) => (
        <span className="block max-w-xs truncate" title={r.subject}>
          {r.subject}
        </span>
      ),
    },
    { key: "provider", header: "Provider", cell: (r) => <span className="text-xs text-neutral-600">{r.provider}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "error",
      header: "Error",
      cell: (r) =>
        r.error ? (
          <span className={`block max-w-[16rem] truncate text-xs ${r.status === "failed" ? "text-rose-700" : "text-neutral-500"}`} title={r.error}>
            {r.error}
          </span>
        ) : (
          <span className="text-neutral-400">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card padded={false} title="Email log" description="Every email the backend tried to send, newest first." actions={<SourceTag source="database" />}>
        <div className="flex flex-col sm:flex-row gap-2 px-4 py-3 border-b border-neutral-200">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search recipient address"
              className={`${INPUT} pl-9`}
              aria-label="Search recipient"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as EmailLogRow["status"] | "");
              setPage(1);
            }}
            className={`${INPUT} sm:w-40`}
            aria-label="Status"
          >
            <option value="">All statuses</option>
            {EMAIL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(1);
            }}
            className={`${INPUT} sm:w-48`}
            aria-label="Kind"
          >
            <option value="">All kinds</option>
            {EMAIL_KINDS.map((k) => (
              <option key={k} value={k}>
                {k.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <DataTable
          columns={columns}
          rows={logs.data?.items}
          rowKey={(r) => r.id}
          isLoading={logs.isFetching && logs.isPlaceholderData}
          error={logs.error}
          onRetry={() => logs.refetch()}
          emptyTitle="No emails match"
          emptyDescription={status || kind || dq ? "Try clearing the filters." : "Emails appear here once the backend sends any."}
        />
        {logs.data && logs.data.total > 0 && <Pagination page={logs.data.page} pageCount={logs.data.pageCount} total={logs.data.total} onChange={setPage} />}
      </Card>
      <Note>
        <span className="font-semibold">Skipped</span> means the email was not delivered: the console provider wrote it to the server output instead of sending it. Recipients an
        announcement deliberately didn&apos;t email (unverified, unsubscribed, over the cap) aren&apos;t logged here — they&apos;re counted as skipped on the notification in History.
      </Note>
    </div>
  );
}
