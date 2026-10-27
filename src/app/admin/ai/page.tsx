"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PauseCircle, RefreshCw, X } from "lucide-react";
import { getAiUsage, listAiEvents, type AiEventRow, type AiUsage } from "@/lib/admin-api";
import {
  Badge,
  Button,
  Card,
  DataTable,
  ErrorState,
  INPUT,
  LABEL,
  LoadingState,
  Mono,
  Note,
  PageHeader,
  Pagination,
  SourceTag,
  StatCard,
  StatusBadge,
  type BadgeTone,
  type Column,
} from "@/components/admin/ui";
import { errorText, formatDate, formatDateTime, formatNumber, formatRelative, formatUsd } from "@/lib/admin-format";

// AI usage from the backend's AiUsageEvent table. Everything here is
// "tracked": only calls made since tracking shipped are recorded. Cost is an
// estimate from prices entered in Platform Settings, never the provider bill.

const PERIODS = [7, 30, 90] as const;
const DAY_MS = 24 * 60 * 60 * 1000;
const EVENTS_PAGE_SIZE = 25;

const OPERATIONS = ["cv_generation", "polish_summary", "role_match", "jd_analysis", "cv_review", "cv_polish"] as const;

type StatusKind = "ok" | "user" | "provider" | "app" | "platform";

const STATUS_INFO: { status: string; kind: StatusKind; meaning: string }[] = [
  { status: "success", kind: "ok", meaning: "The call completed and returned usable output." },
  { status: "limit_reached", kind: "user", meaning: "Refused before calling the provider: the user's free CV or plan limit is used up." },
  { status: "app_rate_limited", kind: "user", meaning: "Refused before calling the provider: the user went over GoMoxie's per-minute or per-day AI request limit." },
  { status: "paused", kind: "platform", meaning: "Refused because AI generation is paused in Platform Settings." },
  { status: "provider_rate_limited", kind: "provider", meaning: "The AI provider rejected the call for rate limits or quota on our API key." },
  { status: "timeout", kind: "provider", meaning: "The AI provider didn't answer in time." },
  { status: "provider_error", kind: "provider", meaning: "The AI provider returned an error or couldn't be reached." },
  { status: "invalid_output", kind: "app", meaning: "The provider answered, but the output couldn't be parsed or failed validation." },
];

const KIND_LABEL: Record<StatusKind, { label: string; tone: BadgeTone }> = {
  ok: { label: "OK", tone: "good" },
  user: { label: "User limit", tone: "neutral" },
  platform: { label: "Platform setting", tone: "neutral" },
  provider: { label: "Provider quota / issue", tone: "warn" },
  app: { label: "App / output error", tone: "bad" },
};

const FAILURE_STATUSES = ["provider_rate_limited", "timeout", "provider_error", "invalid_output"];

function PeriodPicker({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <div role="group" aria-label="Period" className="inline-flex rounded-lg border border-neutral-300 bg-white p-0.5">
      {PERIODS.map((d) => (
        <button
          key={d}
          type="button"
          aria-pressed={value === d}
          title={`Last ${d} days`}
          onClick={() => onChange(d)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
            value === d ? "bg-neutral-950 text-white" : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100"
          }`}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

function formatLatency(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

function dayLabel(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

type DayRow = AiUsage["byDay"][number];

/** The API only returns days that had events; fill the gaps with zeros. */
function denseDays(rows: DayRow[], days: number, endMs: number): DayRow[] {
  const byKey = new Map(rows.map((r) => [r.day, r]));
  const out: DayRow[] = [];
  for (let t = endMs - days * DAY_MS; t <= endMs; t += DAY_MS) {
    const key = new Date(t).toISOString().slice(0, 10);
    if (out.length && out[out.length - 1].day === key) continue;
    out.push(byKey.get(key) ?? { day: key, success: 0, failed: 0, refused: 0, tokens: 0 });
  }
  // Keep any day the API returned that fell outside the computed window.
  for (const r of rows) if (!out.some((o) => o.day === r.day)) out.push(r);
  return out.sort((a, b) => a.day.localeCompare(b.day));
}

const SERIES: { key: "success" | "failed" | "refused"; label: string; className: string }[] = [
  { key: "success", label: "success", className: "bg-emerald-500" },
  { key: "failed", label: "failed", className: "bg-rose-500" },
  { key: "refused", label: "refused (limits / paused)", className: "bg-neutral-400" },
];

function RequestsChart({ data }: { data: DayRow[] }) {
  const totals = data.map((d) => d.success + d.failed + d.refused);
  const max = Math.max(1, ...totals);
  const sum = totals.reduce((s, n) => s + n, 0);
  return (
    <div>
      <div
        role="img"
        aria-label={`${formatNumber(sum)} AI requests between ${dayLabel(data[0].day)} and ${dayLabel(data[data.length - 1].day)}, peak ${formatNumber(max)} in a day`}
        className="flex items-end gap-px h-44 border-b border-neutral-200"
      >
        {data.map((d, i) => {
          const total = totals[i];
          const title = `${dayLabel(d.day)}: ${formatNumber(d.success)} success, ${formatNumber(d.failed)} failed, ${formatNumber(d.refused)} refused · ${formatNumber(d.tokens)} tokens`;
          return (
            <div key={d.day} title={title} className="group flex-1 min-w-0 h-full flex flex-col justify-end">
              {total === 0 ? (
                <div className="h-0.5 rounded-sm bg-neutral-200" />
              ) : (
                <div className="flex flex-col-reverse rounded-t-sm overflow-hidden group-hover:opacity-80" style={{ height: `${(total / max) * 100}%`, minHeight: 3 }}>
                  {SERIES.map((s) => (d[s.key] > 0 ? <div key={s.key} className={s.className} style={{ flex: `${d[s.key]} 1 0` }} /> : null))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between gap-2 text-[11px] text-neutral-500 tabular-nums">
        <span>{dayLabel(data[0].day)}</span>
        <span>Peak {formatNumber(max)}/day</span>
        <span>{dayLabel(data[data.length - 1].day)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${s.className}`} aria-hidden />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function UserCell({ userId, email }: { userId: string | null; email: string | null | undefined }) {
  if (!userId) return <span className="text-neutral-400">—</span>;
  return (
    <Link href={`/admin/users/${userId}`} className="font-medium text-neutral-900 hover:text-accent-strong hover:underline break-all">
      {email ?? <Mono>{userId}</Mono>}
    </Link>
  );
}

function CurrentConfig({ data }: { data: AiUsage }) {
  const { current } = data;
  return (
    <Card title="Current configuration" description="What new AI requests use right now" actions={<Link href="/admin/settings" className="text-xs font-semibold text-neutral-600 hover:text-neutral-950">Platform Settings →</Link>}>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div>
          <dt className="text-xs font-semibold text-neutral-500">Provider / model</dt>
          <dd className="mt-0.5 font-medium">
            {current.provider} <Mono>{current.model}</Mono>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-neutral-500">Requests per user</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            {formatNumber(current.limits.aiRequestsPerMinute)}/min · {formatNumber(current.limits.aiRequestsPerDay)}/day
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function CostCard({ data }: { data: AiUsage }) {
  const { totals, models } = data;
  if (models.length === 0) {
    return <StatCard label="Estimated cost" value="—" hint="No successful calls in this period" source="estimate" />;
  }
  if (totals.estimatedCostUsd === null) {
    return (
      <StatCard
        label="Estimated cost"
        value="—"
        source="estimate"
        hint={
          <>
            Prices aren&apos;t configured.{" "}
            <Link href="/admin/settings" className="font-semibold text-neutral-800 underline">
              Set them in Platform Settings
            </Link>
          </>
        }
      />
    );
  }
  return (
    <StatCard
      label="Estimated cost"
      value={formatUsd(totals.estimatedCostUsd)}
      source="estimate"
      hint={totals.modelsWithoutPrice.length > 0 ? `Excludes ${totals.modelsWithoutPrice.join(", ")} (no price set)` : "From Platform Settings prices"}
    />
  );
}

function OperationTable({ rows }: { rows: AiUsage["byOperation"] }) {
  if (rows.length === 0) return <p className="px-5 py-4 text-sm text-neutral-500">No AI requests in this period.</p>;
  const ops = [...new Set([...OPERATIONS.filter((o) => rows.some((r) => r.operation === o)), ...rows.map((r) => r.operation)])];
  const order = STATUS_INFO.map((s) => s.status);
  const statuses = [...new Set(rows.map((r) => r.status))].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });
  const count = (op: string, status: string) => rows.find((r) => r.operation === op && r.status === status)?.count ?? 0;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50/60 text-xs text-neutral-500">
            <th className="px-4 py-2.5 text-left font-semibold">Operation</th>
            {statuses.map((s) => (
              <th key={s} className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">
                {s.replace(/_/g, " ")}
              </th>
            ))}
            <th className="px-4 py-2.5 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {ops.map((op) => {
            const total = statuses.reduce((s, st) => s + count(op, st), 0);
            return (
              <tr key={op} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2.5">
                  <Mono>{op}</Mono>
                </td>
                {statuses.map((st) => {
                  const n = count(op, st);
                  const bad = FAILURE_STATUSES.includes(st) && n > 0;
                  return (
                    <td key={st} className={`px-4 py-2.5 text-right ${n === 0 ? "text-neutral-300" : bad ? "text-rose-700 font-semibold" : ""}`}>
                      {formatNumber(n)}
                    </td>
                  );
                })}
                <td className="px-4 py-2.5 text-right font-semibold">{formatNumber(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusLegend() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <tbody>
          {STATUS_INFO.map((s) => (
            <tr key={s.status} className="border-b border-neutral-100 last:border-0 align-top">
              <td className="py-1.5 pr-3 whitespace-nowrap">
                <StatusBadge status={s.status} />
              </td>
              <td className="py-1.5 pr-3 whitespace-nowrap">
                <Badge tone={KIND_LABEL[s.kind].tone}>{KIND_LABEL[s.kind].label}</Badge>
              </td>
              <td className="py-1.5 text-neutral-600">{s.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventsSection({
  userFilter,
  onClearUser,
  sectionRef,
}: {
  userFilter: { id: string; email: string | null } | null;
  onClearUser: () => void;
  sectionRef: React.Ref<HTMLDivElement>;
}) {
  const [status, setStatus] = useState("");
  const [operation, setOperation] = useState("");
  // The page is remembered per user filter, so picking a different user
  // (from the tables above) starts back at page 1.
  const [pageState, setPageState] = useState<{ user: string | undefined; page: number }>({ user: userFilter?.id, page: 1 });
  const page = pageState.user === userFilter?.id ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ user: userFilter?.id, page: p });

  const params = {
    page,
    pageSize: EVENTS_PAGE_SIZE,
    status: status || undefined,
    operation: operation || undefined,
    userId: userFilter?.id,
  };
  const events = useQuery({
    queryKey: ["admin", "ai", "events", params],
    queryFn: () => listAiEvents(params),
    placeholderData: (prev) => prev,
  });

  const columns: Column<AiEventRow>[] = [
    {
      key: "time",
      header: "Time",
      className: "whitespace-nowrap",
      cell: (e) => (
        <span title={formatDateTime(e.createdAt)} className="text-neutral-600">
          {formatDateTime(e.createdAt)}
          <span className="block text-[11px] text-neutral-400">{formatRelative(e.createdAt)}</span>
        </span>
      ),
    },
    { key: "user", header: "User", cell: (e) => <UserCell userId={e.userId} email={e.userEmail} /> },
    {
      key: "op",
      header: "Operation / flow",
      cell: (e) => (
        <span className="whitespace-nowrap">
          <Mono>{e.operation}</Mono>
          {e.flowType && <span className="block text-[11px] text-neutral-500">{e.flowType}</span>}
        </span>
      ),
    },
    { key: "status", header: "Status", cell: (e) => <StatusBadge status={e.status} /> },
    {
      key: "model",
      header: "Model",
      cell: (e) => (
        <span className="whitespace-nowrap text-xs text-neutral-600">
          {e.provider} <Mono>{e.model}</Mono>
        </span>
      ),
    },
    {
      key: "tokens",
      header: "Tokens",
      className: "text-right tabular-nums whitespace-nowrap",
      cell: (e) =>
        e.totalTokens === null ? (
          <span className="text-neutral-400">—</span>
        ) : (
          <span title={`${formatNumber(e.promptTokens)} prompt · ${formatNumber(e.completionTokens)} completion`}>{formatNumber(e.totalTokens)}</span>
        ),
    },
    { key: "latency", header: "Latency", className: "text-right tabular-nums whitespace-nowrap", cell: (e) => formatLatency(e.latencyMs) },
    {
      key: "error",
      header: "Error",
      className: "min-w-[16rem]",
      cell: (e) =>
        e.errorCode || e.errorMessage ? (
          <span className="text-xs">
            {e.errorCode && <Mono>{e.errorCode}</Mono>}
            {e.errorMessage && <span className="block text-rose-700 break-words">{e.errorMessage}</span>}
          </span>
        ) : (
          <span className="text-neutral-400">—</span>
        ),
    },
  ];

  const filtered = Boolean(status || operation || userFilter);

  return (
    <div ref={sectionRef} className="scroll-mt-4">
      <Card
        title={
          <span className="inline-flex items-center gap-2">
            Investigate events <SourceTag source="tracked" />
          </span>
        }
        description="Every recorded AI request, newest first (not limited to the selected period)"
        actions={
          <Button size="sm" onClick={() => events.refetch()} loading={events.isFetching}>
            {!events.isFetching && <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
        }
        padded={false}
      >
        <div className="px-5 py-4 border-b border-neutral-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label htmlFor="ai-status" className={LABEL}>
                Status
              </label>
              <select
                id="ai-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className={INPUT}
              >
                <option value="">All statuses</option>
                {STATUS_INFO.map((s) => (
                  <option key={s.status} value={s.status}>
                    {s.status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ai-operation" className={LABEL}>
                Operation
              </label>
              <select
                id="ai-operation"
                value={operation}
                onChange={(e) => {
                  setOperation(e.target.value);
                  setPage(1);
                }}
                className={INPUT}
              >
                <option value="">All operations</option>
                {OPERATIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-end gap-2">
              {userFilter && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-neutral-50 px-2.5 py-1.5 text-xs">
                  User: <span className="font-semibold break-all">{userFilter.email ?? userFilter.id}</span>
                  <button type="button" onClick={onClearUser} className="p-0.5 rounded text-neutral-500 hover:text-neutral-950 cursor-pointer" aria-label="Clear user filter">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
              {filtered && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setStatus("");
                    setOperation("");
                    setPage(1);
                    onClearUser();
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-neutral-600 hover:text-neutral-950">What do the statuses mean?</summary>
            <div className="mt-2">
              <StatusLegend />
            </div>
          </details>
        </div>
        <DataTable
          columns={columns}
          rows={events.data?.items}
          rowKey={(e) => e.id}
          isLoading={events.isFetching}
          error={events.error && !events.data ? events.error : undefined}
          onRetry={() => events.refetch()}
          emptyTitle={filtered ? "No events match these filters" : "No AI calls recorded yet"}
          emptyDescription={filtered ? "Try a different status or operation." : "Events appear here as soon as users make AI requests."}
        />
        {events.error && events.data && (
          <div className="px-5 py-3 border-t border-neutral-200">
            <Note tone="warn">Couldn&apos;t refresh: {errorText(events.error)}</Note>
          </div>
        )}
        {events.data && events.data.total > 0 && (
          <Pagination page={events.data.page} pageCount={events.data.pageCount} total={events.data.total} onChange={setPage} />
        )}
      </Card>
    </div>
  );
}

function UsageBody({ data, endMs }: { data: AiUsage; endMs: number }) {
  const { totals } = data;
  const failureHint = FAILURE_STATUSES.filter((s) => (data.byStatus[s] ?? 0) > 0)
    .map((s) => `${formatNumber(data.byStatus[s])} ${s.replace(/_/g, " ")}`)
    .join(" · ");
  const chartDays = denseDays(data.byDay, data.days, endMs);

  const modelColumns: Column<AiUsage["models"][number]>[] = [
    { key: "provider", header: "Provider", cell: (m) => m.provider },
    { key: "model", header: "Model", cell: (m) => <Mono>{m.model}</Mono> },
    { key: "calls", header: "Calls", className: "text-right tabular-nums", cell: (m) => formatNumber(m.calls) },
    { key: "prompt", header: "Prompt tokens", className: "text-right tabular-nums", cell: (m) => formatNumber(m.promptTokens) },
    { key: "completion", header: "Completion tokens", className: "text-right tabular-nums", cell: (m) => formatNumber(m.completionTokens) },
    { key: "total", header: "Total tokens", className: "text-right tabular-nums", cell: (m) => formatNumber(m.totalTokens) },
    { key: "latency", header: "Avg latency", className: "text-right tabular-nums", cell: (m) => formatLatency(m.avgLatencyMs) },
    {
      key: "cost",
      header: (
        <span className="inline-flex items-center gap-1.5">
          Est. cost <SourceTag source="estimate" />
        </span>
      ),
      className: "text-right tabular-nums",
      cell: (m) =>
        m.estimatedCostUsd === null ? (
          <Link href="/admin/settings" className="text-xs text-neutral-500 underline hover:text-neutral-900">
            no price set
          </Link>
        ) : (
          formatUsd(m.estimatedCostUsd)
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total calls" value={formatNumber(totals.calls)} hint="Sent to the provider (successes + failures)" source="tracked" />
        <StatCard label="Successes" value={formatNumber(totals.success)} tone="good" source="tracked" />
        <StatCard
          label="Failures"
          value={formatNumber(totals.failed)}
          tone={totals.failed > 0 ? "bad" : "neutral"}
          hint={failureHint || "Provider errors, timeouts, rate limits, invalid output"}
          source="tracked"
        />
        <StatCard label="Free limit reached" value={formatNumber(totals.limitReached)} hint="Refused: free CV or plan limit used up" source="tracked" />
        <StatCard label="App rate limited" value={formatNumber(totals.appRateLimited)} hint="Refused: per-minute/day request cap" source="tracked" />
        <StatCard label="Refused while paused" value={formatNumber(totals.paused)} hint="AI generation paused in settings" source="tracked" />
        <StatCard label="Tokens" value={formatNumber(totals.tokens)} hint="As reported by the provider, successful calls" source="tracked" />
        <CostCard data={data} />
      </div>
      <Note>
        Estimated cost uses the per-model prices entered in Platform Settings applied to the token counts above. It is not the provider&apos;s bill — check the
        provider&apos;s console for actual charges.
      </Note>

      <Card
        title={
          <span className="inline-flex items-center gap-2">
            Requests by day <SourceTag source="tracked" />
          </span>
        }
        description={`Last ${data.days} days (UTC days). Refused = free limit reached, app rate limited or paused.`}
      >
        <RequestsChart data={chartDays} />
      </Card>

      <Card title="Models" description="Successful calls only" padded={false}>
        <DataTable columns={modelColumns} rows={data.models} rowKey={(m) => `${m.provider}:${m.model}`} emptyTitle="No successful calls in this period" />
      </Card>

      <Card title="By operation and status" description="All recorded requests, including refusals" padded={false}>
        <OperationTable rows={data.byOperation} />
      </Card>
    </div>
  );
}

export default function AdminAiPage() {
  const [days, setDays] = useState<number>(30);
  const [userFilter, setUserFilter] = useState<{ id: string; email: string | null } | null>(null);
  const eventsRef = useRef<HTMLDivElement>(null);
  const query = useQuery({
    queryKey: ["admin", "ai", "usage", days],
    queryFn: () => getAiUsage(days),
    placeholderData: (prev) => prev,
  });
  const data = query.data;

  const investigate = (userId: string | null, email: string | null) => {
    if (!userId) return;
    setUserFilter({ id: userId, email });
    eventsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const topColumns: Column<AiUsage["topUsers"][number]>[] = [
    { key: "user", header: "User", cell: (u) => <UserCell userId={u.userId} email={u.email} /> },
    { key: "calls", header: "Successful calls", className: "text-right tabular-nums", cell: (u) => formatNumber(u.calls) },
    { key: "tokens", header: "Tokens", className: "text-right tabular-nums", cell: (u) => formatNumber(u.tokens) },
    {
      key: "events",
      header: <span className="sr-only">Events</span>,
      className: "text-right",
      cell: (u) =>
        u.userId ? (
          <Button size="sm" variant="ghost" onClick={() => investigate(u.userId, u.email)}>
            Events
          </Button>
        ) : null,
    },
  ];
  const hitterColumns: Column<AiUsage["limitHitters"][number]>[] = [
    { key: "user", header: "User", cell: (u) => <UserCell userId={u.userId} email={u.email} /> },
    { key: "count", header: "Times refused", className: "text-right tabular-nums", cell: (u) => formatNumber(u.count) },
    {
      key: "events",
      header: <span className="sr-only">Events</span>,
      className: "text-right",
      cell: (u) =>
        u.userId ? (
          <Button size="sm" variant="ghost" onClick={() => investigate(u.userId, u.email)}>
            Events
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="AI Usage"
        description="Requests to the AI provider as recorded by the backend: successes, failures and refusals, tokens and estimated cost."
        actions={
          <>
            <PeriodPicker value={days} onChange={setDays} />
            <Button onClick={() => query.refetch()} loading={query.isFetching}>
              {!query.isFetching && <RefreshCw className="w-3.5 h-3.5" />}
              Refresh
            </Button>
          </>
        }
      />

      {query.error && data && (
        <div className="mb-4">
          <Note tone="warn">Couldn&apos;t refresh: {errorText(query.error)}. Showing the last loaded data.</Note>
        </div>
      )}

      {data ? (
        <div className="space-y-6">
          {data.current.paused && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <PauseCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">AI generation is paused.</p>
                <p className="text-amber-800">
                  New AI requests are refused (recorded as &ldquo;paused&rdquo;) until it&apos;s turned back on in{" "}
                  <Link href="/admin/settings" className="font-semibold underline">
                    Platform Settings
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}

          <Note tone="info">
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <SourceTag source="tracked" />
              {data.trackingSince ? (
                <span>
                  Tracking started {formatDateTime(data.trackingSince)} ({formatRelative(data.trackingSince)}). Earlier AI activity isn&apos;t recorded, so periods
                  reaching before {formatDate(data.trackingSince)} undercount.
                </span>
              ) : (
                <span>No AI calls recorded yet. Numbers appear once users make AI requests.</span>
              )}
            </span>
          </Note>

          <CurrentConfig data={data} />

          <div className={query.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <UsageBody data={data} endMs={query.dataUpdatedAt} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Top users by calls" description={`Successful calls, last ${data.days} days`} padded={false}>
              <DataTable columns={topColumns} rows={data.topUsers} rowKey={(u) => u.userId ?? "none"} emptyTitle="No successful calls in this period" />
            </Card>
            <Card title="Users who most often hit limits" description="Free limit reached + app rate limited" padded={false}>
              <DataTable columns={hitterColumns} rows={data.limitHitters} rowKey={(u) => u.userId ?? "none"} emptyTitle="No one hit a limit in this period" />
            </Card>
          </div>
        </div>
      ) : query.error ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </Card>
      ) : (
        <LoadingState label="Loading AI usage…" />
      )}

      <div className="mt-6">
        <EventsSection userFilter={userFilter} onClearUser={() => setUserFilter(null)} sectionRef={eventsRef} />
      </div>
    </div>
  );
}
