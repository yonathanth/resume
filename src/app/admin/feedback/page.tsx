"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { listFeedback, type FeedbackEntry, type FeedbackKind } from "@/lib/admin-api";
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
  StatCard,
  type Column,
} from "@/components/admin/ui";
import { dateInputToIso, errorText, formatDateTime, formatNumber, formatRelative } from "@/lib/admin-format";

// Every rating, thumbs answer and comment people left, newest first: the CV
// rating (after a first CV / a download), thumbs on AI drafts, and why people
// deleted their account. Filter, open one for the details, or export the
// filtered list as CSV. ?user=<id> shows one person's (linked from their page).

const PAGE_SIZE = 50;
const EXPORT_MAX = 5000;

const KIND_LABELS: Record<FeedbackKind, string> = {
  cv_rating: "CV rating",
  ai_draft: "AI draft",
  account_deletion: "Account deleted",
};

const REASON_LABELS: Record<string, string> = {
  wrong_details: "Wrong details",
  too_generic: "Too generic",
  missing_experience: "Left things out",
  bad_wording: "Wording sounds off",
  too_long: "Too long",
  other: "Something else",
  got_the_job: "Got the job",
  not_useful: "Wasn't useful",
  too_expensive: "Too expensive",
  poor_results: "CVs weren't good enough",
  privacy: "Privacy concerns",
  other_service: "Using something else",
};

const FLOW_LABELS: Record<string, string> = { create: "Create", tailor: "Tailor", improve: "Improve" };
const TRIGGER_LABELS: Record<string, string> = { editor_exit: "after leaving the editor", download: "after a download" };

function useDebounced<T>(value: T, ms = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`} />
      ))}
    </span>
  );
}

function RatingCell({ entry }: { entry: FeedbackEntry }) {
  if (entry.kind === "cv_rating" && entry.rating !== null) return <Stars rating={entry.rating} />;
  if (entry.kind === "ai_draft") {
    return entry.rating === 1 ? (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <ThumbsUp className="h-3.5 w-3.5" /> Up
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
        <ThumbsDown className="h-3.5 w-3.5" /> Down
      </span>
    );
  }
  return <span className="text-neutral-400">—</span>;
}

function From({ entry, stop = false }: { entry: FeedbackEntry; stop?: boolean }) {
  if (entry.user) {
    return (
      <Link
        href={`/admin/users/${entry.user.id}`}
        onClick={stop ? (e) => e.stopPropagation() : undefined}
        className="text-sm font-medium text-neutral-800 hover:text-accent-strong hover:underline break-all"
      >
        {entry.user.email}
      </Link>
    );
  }
  return <span className="text-xs italic text-neutral-500">{entry.kind === "account_deletion" ? "Deleted account (anonymous)" : "Account deleted since"}</span>;
}

/** What the row was about: the flow, the moment it was asked, or the deleted account's facts. */
function contextLine(entry: FeedbackEntry): string | null {
  const ctx = entry.context ?? {};
  if (entry.kind === "ai_draft" && entry.flowType) return `${FLOW_LABELS[entry.flowType] ?? entry.flowType} flow`;
  if (entry.kind === "cv_rating" && typeof ctx.trigger === "string") return `Asked ${TRIGGER_LABELS[ctx.trigger] ?? ctx.trigger}`;
  if (entry.kind === "account_deletion") {
    const parts = [
      typeof ctx.accountAgeDays === "number" && `${ctx.accountAgeDays} day${ctx.accountAgeDays === 1 ? "" : "s"} old`,
      typeof ctx.cvCount === "number" && `${ctx.cvCount} CV${ctx.cvCount === 1 ? "" : "s"}`,
      ctx.wasPaying === true && "was paying",
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  }
  return null;
}

function ratingText(entry: FeedbackEntry): string {
  if (entry.kind === "cv_rating") return entry.rating !== null ? `${entry.rating}/5` : "";
  if (entry.kind === "ai_draft") return entry.rating === 1 ? "up" : "down";
  return "";
}

function toCsv(rows: FeedbackEntry[]): string {
  const cell = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = ["date", "type", "rating", "reason", "comment", "context", "user_email", "user_id", "cv_document_id"];
  const lines = rows.map((r) =>
    [
      r.createdAt,
      KIND_LABELS[r.kind],
      ratingText(r),
      r.reason ? REASON_LABELS[r.reason] ?? r.reason : "",
      r.comment ?? "",
      contextLine(r) ?? "",
      r.user?.email ?? "",
      r.user?.id ?? "",
      r.cvDocumentId ?? "",
    ]
      .map(cell)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

function EntryDetail({ entry }: { entry: FeedbackEntry }) {
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
          ["Type", <Badge key="k">{KIND_LABELS[entry.kind]}</Badge>],
          ["Rating", <RatingCell key="r" entry={entry} />],
          ["Reason", entry.reason ? REASON_LABELS[entry.reason] ?? entry.reason : <span className="text-neutral-400">—</span>],
          ["Context", contextLine(entry) ?? <span className="text-neutral-400">—</span>],
          ["From", <From key="f" entry={entry} />],
          ["CV", entry.cvDocumentId ? <Mono>{entry.cvDocumentId}</Mono> : <span className="text-neutral-400">—</span>],
        ]}
      />
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Comment</h4>
        {entry.comment ? (
          <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm leading-relaxed text-neutral-800 whitespace-pre-line break-words">{entry.comment}</p>
        ) : (
          <p className="text-sm text-neutral-500">No comment.</p>
        )}
      </div>
    </div>
  );
}

function FeedbackPage() {
  const router = useRouter();
  const userId = useSearchParams().get("user") ?? undefined;
  const [kind, setKind] = useState<FeedbackKind | "">("");
  const [rating, setRating] = useState("");
  const [withComment, setWithComment] = useState(false);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<FeedbackEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const debouncedSearch = useDebounced(search.trim());
  const badRange = Boolean(from && to && from > to);
  const filters = {
    kind: kind || undefined,
    rating: rating === "" ? undefined : Number(rating),
    withComment: withComment || undefined,
    q: debouncedSearch || undefined,
    userId,
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
    queryKey: ["admin", "feedback", params],
    queryFn: () => listFeedback(params),
    placeholderData: (prev) => prev,
  });
  const data = query.data;
  const summary = data?.summary;

  const filtered = Boolean(kind || rating || withComment || search || from || to || userId);
  const clear = () => {
    setKind("");
    setRating("");
    setWithComment(false);
    setSearch("");
    setFrom("");
    setTo("");
    if (userId) router.replace("/admin/feedback");
  };

  // Every matching row (up to EXPORT_MAX), fetched page by page, as a CSV download.
  const exportCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const rows: FeedbackEntry[] = [];
      for (let p = 1; rows.length < EXPORT_MAX; p++) {
        const res = await listFeedback({ ...filters, page: p, pageSize: 100 });
        rows.push(...res.items);
        if (p >= res.pageCount) break;
      }
      const blob = new Blob([toCsv(rows.slice(0, EXPORT_MAX))], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gomoxie-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(errorText(err, "Couldn't export."));
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<FeedbackEntry>[] = [
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
    {
      key: "type",
      header: "Type",
      cell: (e) => (
        <span>
          <Badge tone={e.kind === "account_deletion" ? "warn" : "neutral"}>{KIND_LABELS[e.kind]}</Badge>
          {contextLine(e) && <span className="mt-1 block text-[11px] text-neutral-500">{contextLine(e)}</span>}
        </span>
      ),
    },
    { key: "rating", header: "Rating", className: "whitespace-nowrap", cell: (e) => <RatingCell entry={e} /> },
    {
      key: "comment",
      header: "Reason & comment",
      className: "min-w-[18rem] max-w-[34rem]",
      cell: (e) => (
        <span className="block">
          {e.reason && <span className="block text-xs font-semibold text-neutral-700">{REASON_LABELS[e.reason] ?? e.reason}</span>}
          {e.comment ? (
            <span className="block text-sm text-neutral-800 whitespace-pre-line break-words line-clamp-4">{e.comment}</span>
          ) : (
            !e.reason && <span className="text-neutral-400">—</span>
          )}
        </span>
      ),
    },
    { key: "from", header: "From", cell: (e) => <From entry={e} stop /> },
  ];

  return (
    <div>
      <PageHeader
        title="Feedback"
        description="Every rating, thumbs answer and comment people left, newest first. Click a row for the full entry."
        actions={
          <>
            <Button onClick={exportCsv} loading={exporting} disabled={!data || data.total === 0}>
              {!exporting && <Download className="w-3.5 h-3.5" />}
              Export CSV
            </Button>
            <Button onClick={() => query.refetch()} loading={query.isFetching}>
              {!query.isFetching && <RefreshCw className="w-3.5 h-3.5" />}
              Refresh
            </Button>
          </>
        }
      />

      {summary && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="CV ratings"
            value={summary.averageRating !== null ? `${summary.averageRating.toFixed(2)} / 5` : "—"}
            hint={`${formatNumber(summary.cvRatings)} rating${summary.cvRatings === 1 ? "" : "s"}`}
            source="database"
          />
          <StatCard
            label="AI drafts liked"
            value={summary.aiDrafts ? `${Math.round((summary.thumbsUp / summary.aiDrafts) * 100)}%` : "—"}
            hint={`${formatNumber(summary.thumbsUp)} up · ${formatNumber(summary.aiDrafts - summary.thumbsUp)} down`}
            tone={summary.aiDrafts && summary.thumbsUp / summary.aiDrafts < 0.6 ? "warn" : "neutral"}
            source="database"
          />
          <StatCard label="Deletion reasons" value={formatNumber(summary.deletions)} hint="Accounts deleted with a reason or comment" source="database" />
        </div>
      )}

      {exportError && (
        <div className="mb-4">
          <Note tone="warn">{exportError}</Note>
        </div>
      )}

      <Card padded={false}>
        <div className="px-5 py-4 border-b border-neutral-200 space-y-3">
          {userId && (
            <Note tone="info">
              Showing one person&apos;s feedback.{" "}
              <Link href={`/admin/users/${userId}`} className="font-semibold underline">
                Open their account
              </Link>
            </Note>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label htmlFor="fb-kind" className={LABEL}>
                Type
              </label>
              <select
                id="fb-kind"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as FeedbackKind | "");
                  setRating("");
                }}
                className={INPUT}
              >
                <option value="">All feedback</option>
                <option value="cv_rating">CV ratings</option>
                <option value="ai_draft">AI draft thumbs</option>
                <option value="account_deletion">Account deletions</option>
              </select>
            </div>
            <div>
              <label htmlFor="fb-rating" className={LABEL}>
                Rating
              </label>
              <select
                id="fb-rating"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                disabled={kind !== "cv_rating" && kind !== "ai_draft"}
                className={INPUT}
              >
                <option value="">{kind === "cv_rating" || kind === "ai_draft" ? "Any rating" : "Pick a type first"}</option>
                {kind === "cv_rating" &&
                  [5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} star{n === 1 ? "" : "s"}
                    </option>
                  ))}
                {kind === "ai_draft" && (
                  <>
                    <option value="1">Thumbs up</option>
                    <option value="-1">Thumbs down</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="fb-search" className={LABEL}>
                Search
              </label>
              <input
                id="fb-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Words in a comment, or an email"
                className={INPUT}
                autoComplete="off"
                maxLength={200}
              />
            </div>
            <div>
              <label htmlFor="fb-from" className={LABEL}>
                From
              </label>
              <input id="fb-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label htmlFor="fb-to" className={LABEL}>
                To
              </label>
              <input id="fb-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={INPUT} />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm font-medium text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={withComment} onChange={(e) => setWithComment(e.target.checked)} className="h-4 w-4 accent-neutral-900" />
              Only entries with a comment
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <SourceTag source="database" />
              <span>Dates use your local time zone. The numbers above follow every filter except type and rating.</span>
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
          emptyTitle={filtered ? "No feedback matches these filters" : "No feedback yet"}
          emptyDescription={filtered ? "Try a broader search or date range." : "Ratings and comments show up here as people use the app."}
        />
        {query.error && data && (
          <div className="px-5 py-3 border-t border-neutral-200">
            <Note tone="warn">Couldn&apos;t refresh: {errorText(query.error)}. Showing the last loaded entries.</Note>
          </div>
        )}
        {data && data.total > 0 && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onChange={setPage} />}
      </Card>

      <Modal open={selected !== null} title={selected ? KIND_LABELS[selected.kind] : "Feedback"} onClose={() => setSelected(null)}>
        {selected && <EntryDetail entry={selected} />}
      </Modal>
    </div>
  );
}

export default function AdminFeedbackPage() {
  // The ?user= filter comes from the URL.
  return (
    <Suspense fallback={null}>
      <FeedbackPage />
    </Suspense>
  );
}
