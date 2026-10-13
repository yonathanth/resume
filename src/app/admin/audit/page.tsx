"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { listAudit, type AuditEntry } from "@/lib/admin-api";
import {
  Badge,
  Button,
  Card,
  DataTable,
  INPUT,
  KeyValue,
  LABEL,
  Modal,
  Mono,
  Note,
  PageHeader,
  Pagination,
  SourceTag,
  type Column,
} from "@/components/admin/ui";
import { dateInputToIso, errorText, formatDateTime, formatRelative } from "@/lib/admin-format";

// The admin audit log: every admin action (and failed admin sign-in) the
// backend recorded. Read-only. "action" filters by prefix, so "user." matches
// every user action and "user.suspend" just that one.

const PAGE_SIZE = 50;

function useDebounced<T>(value: T, ms = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function isFailure(action: string) {
  return action.endsWith("_failed") || action.endsWith(".failed");
}

function ActionBadge({ action }: { action: string }) {
  return (
    <Badge tone={isFailure(action) ? "bad" : "neutral"}>
      <span className="font-mono">{action}</span>
    </Badge>
  );
}

function Actor({ entry }: { entry: AuditEntry }) {
  if (entry.actorEmail) return <span className="break-all">{entry.actorEmail}</span>;
  return <span className="text-neutral-500 italic">system/CLI</span>;
}

function Target({ entry, stop = false }: { entry: AuditEntry; stop?: boolean }) {
  if (!entry.targetId) return <span className="text-neutral-400">{entry.targetType ?? "—"}</span>;
  if (entry.targetType === "user") {
    return (
      <Link
        href={`/admin/users/${entry.targetId}`}
        onClick={stop ? (e) => e.stopPropagation() : undefined}
        className="text-xs font-medium text-neutral-800 hover:text-accent-strong hover:underline"
      >
        user <span className="font-mono break-all">{entry.targetId}</span>
      </Link>
    );
  }
  return (
    <span className="text-xs">
      {entry.targetType && <span className="text-neutral-500">{entry.targetType} </span>}
      <Mono>{entry.targetId}</Mono>
    </span>
  );
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function JsonBlock({ value, className = "" }: { value: unknown; className?: string }) {
  return (
    <pre className={`max-h-80 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs leading-relaxed text-neutral-800 whitespace-pre ${className}`}>
      {prettyJson(value)}
    </pre>
  );
}

function EntryDetail({ entry }: { entry: AuditEntry }) {
  const meta = entry.metadata;
  const hasDiff = meta !== null && typeof meta === "object" && ("before" in meta || "after" in meta);
  return (
    <div className="space-y-5">
      <KeyValue
        items={[
          [
            "Time",
            <>
              {formatDateTime(entry.createdAt)} <span className="text-neutral-500">({formatRelative(entry.createdAt)})</span>
            </>,
          ],
          [
            "Actor",
            <>
              <Actor entry={entry} />
              {entry.actorId && (
                <span className="block">
                  <Mono>{entry.actorId}</Mono>
                </span>
              )}
            </>,
          ],
          ["Action", <ActionBadge key="a" action={entry.action} />],
          ["Target", <Target key="t" entry={entry} />],
          ["Summary", entry.summary ?? <span className="text-neutral-400">—</span>],
          ["IP address", entry.ip ? <Mono>{entry.ip}</Mono> : <span className="text-neutral-400">—</span>],
          ["User agent", entry.userAgent ? <span className="text-xs text-neutral-700 break-all">{entry.userAgent}</span> : <span className="text-neutral-400">—</span>],
          ["Entry id", <Mono key="id">{entry.id}</Mono>],
        ]}
      />

      {hasDiff && meta && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Change</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <div className="mb-1 text-xs font-semibold text-neutral-600">Before</div>
              {"before" in meta ? <JsonBlock value={meta.before} className="border-rose-200 bg-rose-50/50" /> : <p className="text-xs text-neutral-400">Not recorded</p>}
            </div>
            <div className="min-w-0">
              <div className="mb-1 text-xs font-semibold text-neutral-600">After</div>
              {"after" in meta ? <JsonBlock value={meta.after} className="border-emerald-200 bg-emerald-50/50" /> : <p className="text-xs text-neutral-400">Not recorded</p>}
            </div>
          </div>
        </div>
      )}

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Metadata</h4>
        {meta === null || (typeof meta === "object" && Object.keys(meta).length === 0) ? (
          <p className="text-sm text-neutral-500">No metadata recorded.</p>
        ) : (
          <JsonBlock value={meta} />
        )}
      </div>
    </div>
  );
}

export default function AdminAuditPage() {
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [targetId, setTargetId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const debouncedAction = useDebounced(action.trim());
  const debouncedActor = useDebounced(actor.trim());
  const debouncedTarget = useDebounced(targetId.trim());

  const badRange = Boolean(from && to && from > to);
  const filters = {
    action: debouncedAction || undefined,
    actor: debouncedActor || undefined,
    targetId: debouncedTarget || undefined,
    from: badRange ? undefined : dateInputToIso(from),
    to: badRange ? undefined : dateInputToIso(to, true),
  };
  const filterKey = JSON.stringify(filters);

  // Page is remembered per filter combination, so changing a filter goes back to page 1.
  const [pageState, setPageState] = useState<{ key: string; page: number }>({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ key: filterKey, page: p });

  const params = { ...filters, page, pageSize: PAGE_SIZE };
  const query = useQuery({
    queryKey: ["admin", "audit", params],
    queryFn: () => listAudit(params),
    placeholderData: (prev) => prev,
  });
  const data = query.data;

  const actions = data?.actions ?? [];
  const groups = [...new Set(actions.filter((a) => a.includes(".")).map((a) => `${a.split(".")[0]}.`))].sort();
  const selectValue = actions.includes(action) || groups.includes(action) ? action : action ? "__custom" : "";

  const filtered = Boolean(action || actor || targetId || from || to);
  const clear = () => {
    setAction("");
    setActor("");
    setTargetId("");
    setFrom("");
    setTo("");
  };

  const columns: Column<AuditEntry>[] = [
    {
      key: "time",
      header: "Time",
      className: "whitespace-nowrap",
      cell: (e) => (
        <span className="text-neutral-700">
          {formatDateTime(e.createdAt)}
          <span className="block text-[11px] text-neutral-400">{formatRelative(e.createdAt)}</span>
        </span>
      ),
    },
    { key: "actor", header: "Actor", cell: (e) => <Actor entry={e} /> },
    { key: "action", header: "Action", cell: (e) => <ActionBadge action={e.action} /> },
    { key: "target", header: "Target", cell: (e) => <Target entry={e} stop /> },
    {
      key: "summary",
      header: "Summary",
      className: "min-w-[16rem]",
      cell: (e) => (e.summary ? <span className="text-neutral-700 break-words">{e.summary}</span> : <span className="text-neutral-400">—</span>),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Every admin action and failed admin sign-in recorded by the backend, newest first. Click an entry for the full record."
        actions={
          <Button onClick={() => query.refetch()} loading={query.isFetching}>
            {!query.isFetching && <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
        }
      />

      <Card padded={false}>
        <div className="px-5 py-4 border-b border-neutral-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label htmlFor="audit-action-select" className={LABEL}>
                Action
              </label>
              <select
                id="audit-action-select"
                value={selectValue}
                onChange={(e) => {
                  if (e.target.value !== "__custom") setAction(e.target.value);
                }}
                className={INPUT}
              >
                <option value="">All actions</option>
                {selectValue === "__custom" && <option value="__custom">Custom: {action}</option>}
                {groups.length > 0 && (
                  <optgroup label="Groups (prefix)">
                    {groups.map((g) => (
                      <option key={g} value={g}>
                        {g}* (all)
                      </option>
                    ))}
                  </optgroup>
                )}
                {actions.length > 0 && (
                  <optgroup label="Actions">
                    {actions.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="audit-action-prefix" className={LABEL}>
                Action starts with
              </label>
              <input
                id="audit-action-prefix"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="e.g. user. or billing."
                className={`${INPUT} font-mono`}
                autoComplete="off"
                maxLength={80}
              />
            </div>
            <div>
              <label htmlFor="audit-actor" className={LABEL}>
                Actor email contains
              </label>
              <input id="audit-actor" value={actor} onChange={(e) => setActor(e.target.value)} placeholder="admin@…" className={INPUT} autoComplete="off" maxLength={200} />
            </div>
            <div>
              <label htmlFor="audit-target" className={LABEL}>
                Target id
              </label>
              <input
                id="audit-target"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="Exact id (e.g. a user id)"
                className={`${INPUT} font-mono`}
                autoComplete="off"
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="audit-from" className={LABEL}>
                From
              </label>
              <input id="audit-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label htmlFor="audit-to" className={LABEL}>
                To
              </label>
              <input id="audit-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={INPUT} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <SourceTag source="database" />
              <span>Dates use your local time zone.</span>
            </div>
            {filtered && (
              <Button size="sm" variant="ghost" onClick={clear}>
                Clear filters
              </Button>
            )}
          </div>
          {badRange && <Note tone="warn">&ldquo;From&rdquo; is after &ldquo;To&rdquo;, so the date filter is ignored until that&apos;s fixed.</Note>}
        </div>

        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(e) => e.id}
          isLoading={query.isFetching}
          error={query.error && !data ? query.error : undefined}
          onRetry={() => query.refetch()}
          onRowClick={setSelected}
          emptyTitle={filtered ? "No entries match these filters" : "No admin actions recorded yet"}
          emptyDescription={filtered ? "Try a broader action prefix or date range." : undefined}
        />
        {query.error && data && (
          <div className="px-5 py-3 border-t border-neutral-200">
            <Note tone="warn">Couldn&apos;t refresh: {errorText(query.error)}. Showing the last loaded entries.</Note>
          </div>
        )}
        {data && data.total > 0 && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onChange={setPage} />}
      </Card>

      <Modal open={selected !== null} title={selected ? `Audit entry · ${selected.action}` : "Audit entry"} onClose={() => setSelected(null)} wide>
        {selected && <EntryDetail entry={selected} />}
      </Modal>
    </div>
  );
}
