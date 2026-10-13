"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, RefreshCw, X } from "lucide-react";
import { errorText } from "@/lib/admin-format";

// The admin dashboard's building blocks. Same visual language as the user
// dashboard (neutral borders, white cards, the accent used sparingly) —
// dense and practical rather than decorative.

export const INPUT =
  "w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition disabled:bg-neutral-50 disabled:text-neutral-500";
export const LABEL = "block text-xs font-semibold text-neutral-700 mb-1.5";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
const BUTTON_VARIANTS = {
  primary: "bg-neutral-950 text-white hover:bg-neutral-800 border border-neutral-950",
  secondary: "border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700 border border-rose-600",
  "danger-outline": "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  ghost: "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100",
  accent: "bg-accent text-white border border-accent hover:bg-accent-strong hover:border-accent-strong",
} as const;
const BUTTON_SIZES = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2" } as const;

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-neutral-950">{title}</h1>
        {description && <p className="mt-1 text-sm text-neutral-500 max-w-3xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className = "",
  padded = true,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`rounded-lg border border-neutral-300 bg-white ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-neutral-200">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold text-neutral-950">{title}</h2>}
            {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

const SOURCE_STYLES = {
  database: { label: "Live · database", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  polar: { label: "Live · Polar API", className: "bg-sky-50 text-sky-700 border-sky-200" },
  tracked: { label: "Tracked since launch", className: "bg-amber-50 text-amber-700 border-amber-200" },
  estimate: { label: "Estimate", className: "bg-violet-50 text-violet-700 border-violet-200" },
  synced: { label: "As last synced", className: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  unavailable: { label: "Unavailable", className: "bg-neutral-100 text-neutral-500 border-neutral-200" },
} as const;
export type DataSource = keyof typeof SOURCE_STYLES;

/** Says where a number comes from, so live data, history and estimates aren't confused. */
export function SourceTag({ source, title }: { source: DataSource; title?: string }) {
  const s = SOURCE_STYLES[source];
  return (
    <span title={title} className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${s.className}`}>
      {s.label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  source,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  source?: DataSource;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass = { neutral: "text-neutral-950", good: "text-emerald-700", warn: "text-amber-700", bad: "text-rose-700" }[tone];
  return (
    <div className="rounded-lg border border-neutral-300 bg-white px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-neutral-500">{label}</span>
        {source && <SourceTag source={source} />}
      </div>
      <div className={`mt-1.5 text-2xl font-bold tracking-tight tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-neutral-500">{hint}</div>}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
  good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warn: "bg-amber-50 text-amber-800 border-amber-200",
  bad: "bg-rose-50 text-rose-700 border-rose-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  accent: "bg-accent-soft text-accent-strong border-accent-border",
  dark: "bg-neutral-900 text-white border-neutral-900",
} as const;
export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = "neutral", children, title }: { tone?: BadgeTone; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-semibold whitespace-nowrap ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, BadgeTone> = {
  ACTIVE: "good",
  SUSPENDED: "bad",
  active: "good",
  trialing: "info",
  past_due: "warn",
  canceled: "neutral",
  revoked: "bad",
  unpaid: "bad",
  incomplete: "warn",
  incomplete_expired: "neutral",
  paused: "neutral",
  SUCCESS: "good",
  PENDING: "warn",
  FAILED: "bad",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
  paid: "good",
  pending: "warn",
  refunded: "neutral",
  partially_refunded: "warn",
  void: "neutral",
  draft: "neutral",
  processed: "good",
  failed: "bad",
  unmatched: "warn",
  ignored: "neutral",
  received: "info",
  sent: "good",
  skipped: "neutral",
  sending: "info",
  done: "good",
  success: "good",
  provider_rate_limited: "warn",
  timeout: "warn",
  provider_error: "bad",
  invalid_output: "bad",
  limit_reached: "neutral",
  app_rate_limited: "neutral",
  needs_response: "bad",
  under_review: "warn",
  won: "good",
  lost: "bad",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge>none</Badge>;
  return <Badge tone={STATUS_TONES[status] ?? "neutral"}>{status.replace(/_/g, " ")}</Badge>;
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-500">
      <Loader2 className="w-4 h-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <span className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
        <AlertTriangle className="w-4 h-4" />
      </span>
      <p className="text-sm text-neutral-700 max-w-md">{errorText(error, "Couldn't load this data.")}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-500 flex items-center justify-center">
        <Inbox className="w-4 h-4" />
      </span>
      <p className="text-sm font-semibold text-neutral-800">{title}</p>
      {description && <p className="text-xs text-neutral-500 max-w-sm">{description}</p>}
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

/** A scrollable table with built-in loading, error and empty states. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  error,
  onRetry,
  onRowClick,
  emptyTitle = "Nothing here yet",
  emptyDescription,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (isLoading && !rows) return <LoadingState />;
  if (!rows || rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50/60">
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-2.5 text-left text-xs font-semibold text-neutral-500 whitespace-nowrap ${c.className ?? ""}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={isLoading ? "opacity-60" : ""}>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-neutral-100 last:border-0 ${onRowClick ? "cursor-pointer hover:bg-neutral-50" : ""}`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-2.5 align-top text-neutral-800 ${c.className ?? ""}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  onChange,
}: {
  page: number;
  pageCount: number;
  total?: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-neutral-200 text-xs text-neutral-500">
      <span>
        Page {page} of {Math.max(1, pageCount)}
        {total !== undefined && ` · ${total.toLocaleString()} total`}
      </span>
      <div className="flex items-center gap-1.5">
        <Button size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: { id: T; label: string; count?: number }[]; active: T; onChange: (id: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-neutral-200 mb-5 -mx-1 px-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`px-3 py-2 -mb-px border-b-2 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            active === t.id ? "border-accent text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 text-xs font-medium text-neutral-400">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-accent" : "bg-neutral-300"
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

export function KeyValue({ items }: { items: [React.ReactNode, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
      {items.map(([k, v], i) => (
        <React.Fragment key={i}>
          <dt className="text-neutral-500">{k}</dt>
          <dd className="text-neutral-900 min-w-0 break-words">{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export function Modal({ open, title, onClose, children, wide = false }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-neutral-200 shadow-2xl`}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-neutral-200">
          <h3 className="text-sm font-bold text-neutral-950">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * Confirmation for consequential actions. Optionally requires a written
 * reason (stored in the audit log) and/or typing a value back (e.g. the
 * user's email before deletion). Stays open with the error if the action fails.
 */
export function ActionDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  requireReason = false,
  reasonLabel = "Reason (kept in the audit log)",
  confirmText,
  children,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  /** When set, the confirm button stays disabled until this exact text is typed. */
  confirmText?: string;
  children?: React.ReactNode;
  onConfirm: (reason: string) => Promise<unknown>;
  onClose: () => void;
}) {
  // Mounted only while open, so every opening starts with a fresh form.
  if (!open) return null;
  return (
    <ActionDialogBody
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      danger={danger}
      requireReason={requireReason}
      reasonLabel={reasonLabel}
      confirmText={confirmText}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      {children}
    </ActionDialogBody>
  );
}

function ActionDialogBody({
  title,
  description,
  confirmLabel,
  danger,
  requireReason,
  reasonLabel,
  confirmText,
  children,
  onConfirm,
  onClose,
}: {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  danger: boolean;
  requireReason: boolean;
  reasonLabel: string;
  confirmText?: string;
  children?: React.ReactNode;
  onConfirm: (reason: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonOk = !requireReason || reason.trim().length >= 3;
  const typedOk = !confirmText || typed.trim().toLowerCase() === confirmText.toLowerCase();

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open title={title} onClose={pending ? () => {} : onClose}>
      <div className="space-y-4">
        <div className="flex gap-3">
          {danger && (
            <span className="w-9 h-9 rounded-lg shrink-0 bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </span>
          )}
          <div className="text-sm text-neutral-600 leading-relaxed">{description}</div>
        </div>
        {children}
        {requireReason && (
          <div>
            <label className={LABEL}>{reasonLabel}</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} className={INPUT} placeholder="Why are you doing this?" />
          </div>
        )}
        {confirmText && (
          <div>
            <label className={LABEL}>
              Type <span className="font-mono text-neutral-900">{confirmText}</span> to confirm
            </label>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} className={INPUT} autoComplete="off" />
          </div>
        )}
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={pending} disabled={!reasonOk || !typedOk} onClick={submit}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Small "ⓘ" style note for explaining what a control does. */
export function Note({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warn" | "info" }) {
  const cls = {
    neutral: "bg-neutral-50 border-neutral-200 text-neutral-600",
    warn: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-sky-50 border-sky-200 text-sky-800",
  }[tone];
  return <div className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${cls}`}>{children}</div>;
}

/** A copyable id in monospace. */
export function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs text-neutral-600 break-all">{children}</span>;
}
