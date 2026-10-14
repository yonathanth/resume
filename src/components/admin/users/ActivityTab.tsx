"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { AiEventRow, AuditEntry, UserDetail } from "@/lib/admin-api";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/admin-format";
import { Badge, Card, DataTable, Mono, SourceTag, StatusBadge, type Column } from "@/components/admin/ui";

const aiColumns: Column<AiEventRow>[] = [
  {
    key: "time",
    header: "Time",
    className: "whitespace-nowrap",
    cell: (e) => <span title={formatDateTime(e.createdAt)}>{formatRelative(e.createdAt)}</span>,
  },
  {
    key: "op",
    header: "Operation",
    cell: (e) => (
      <div className="min-w-[120px]">
        <div className="font-medium">{e.operation.replace(/_/g, " ")}</div>
        <div className="text-[11px] text-neutral-500">{e.model}</div>
      </div>
    ),
  },
  { key: "flow", header: "Flow", cell: (e) => (e.flowType ? <Badge>{e.flowType}</Badge> : <span className="text-neutral-400">—</span>) },
  { key: "status", header: "Status", cell: (e) => <StatusBadge status={e.status} /> },
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
  {
    key: "error",
    header: "Error",
    cell: (e) =>
      e.errorCode || e.errorMessage ? (
        <span className="block min-w-[160px] text-xs text-rose-700 break-words">
          {e.errorCode && <span className="font-mono">{e.errorCode}</span>}
          {e.errorCode && e.errorMessage && ": "}
          {e.errorMessage}
        </span>
      ) : (
        <span className="text-neutral-400">—</span>
      ),
  },
];

const auditColumns: Column<AuditEntry>[] = [
  {
    key: "time",
    header: "Time",
    className: "whitespace-nowrap",
    cell: (a) => (
      <span title={formatDateTime(a.createdAt)}>
        {formatDateTime(a.createdAt)}
        <span className="block text-xs text-neutral-500">{formatRelative(a.createdAt)}</span>
      </span>
    ),
  },
  { key: "actor", header: "Actor", cell: (a) => <span className="text-xs">{a.actorEmail ?? (a.actorId ? <Mono>{a.actorId}</Mono> : "system")}</span> },
  { key: "action", header: "Action", cell: (a) => <Badge>{a.action}</Badge> },
  { key: "summary", header: "Summary", cell: (a) => <span className="block min-w-[200px] text-xs break-words">{a.summary ?? <span className="text-neutral-400">—</span>}</span> },
];

export function ActivityTab({ detail }: { detail: UserDetail }) {
  const totals = [...detail.ai.totals].sort((a, b) => b.count - a.count);
  const calls = totals.reduce((s, t) => s + t.count, 0);
  const tokens = totals.reduce((s, t) => s + t.tokens, 0);

  return (
    <div className="space-y-5">
      <Card title="AI usage" description="Every AI call this user made since usage tracking started." actions={<SourceTag source="tracked" />}>
        {calls === 0 ? (
          <p className="text-sm text-neutral-500">No AI calls tracked for this user.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                <span className="text-neutral-500">Calls</span> <strong className="tabular-nums">{formatNumber(calls)}</strong>
              </span>
              <span>
                <span className="text-neutral-500">Tokens</span> <strong className="tabular-nums">{formatNumber(tokens)}</strong>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {totals.map((t) => (
                <div key={t.status} className="rounded-lg border border-neutral-200 px-3 py-2">
                  <StatusBadge status={t.status} />
                  <div className="mt-1 text-lg font-bold tabular-nums text-neutral-950">{formatNumber(t.count)}</div>
                  <div className="text-[11px] text-neutral-500">{formatNumber(t.tokens)} tokens</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card title="Recent AI events" description="The last 20 calls." padded={false} actions={<SourceTag source="tracked" />}>
        <DataTable columns={aiColumns} rows={detail.ai.recent} rowKey={(e) => e.id} emptyTitle="No AI events" />
      </Card>

      <Card
        title="Admin actions on this user"
        description="The last 30 audit-log entries that target this account."
        padded={false}
        actions={
          <Link href="/admin/audit" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-strong hover:underline">
            Full audit log
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        <DataTable columns={auditColumns} rows={detail.audit} rowKey={(a) => a.id} emptyTitle="No admin actions yet" />
      </Card>
    </div>
  );
}
