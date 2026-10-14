"use client";

import React, { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, RefreshCw, Search, ShieldCheck } from "lucide-react";
import {
  getBillingSummary,
  listChapaPayments,
  listPolarDisputes,
  listPolarOrders,
  listPolarRefunds,
  listSubscriptions,
  listWebhookEvents,
  reverifyChapaPayment,
  retryWebhookEvent,
  type BillingSummary,
  type ChapaPaymentRow,
  type PolarDispute,
  type PolarLinks,
  type PolarOrder,
  type PolarRefund,
  type SubscriptionRow,
  type WebhookEventRow,
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
  Mono,
  Note,
  PageHeader,
  Pagination,
  SourceTag,
  StatCard,
  StatusBadge,
  Tabs,
  type Column,
} from "@/components/admin/ui";
import { useCan } from "@/components/admin/AdminShell";
import { useToast } from "@/components/Toaster";
import { dateInputToIso, errorText, formatDate, formatDateTime, formatMinorMoney, formatMoney, formatNumber, formatRelative } from "@/lib/admin-format";

// Subscriptions & Payments. What lives where:
//   Polar — source of truth for Polar subscriptions, orders, refunds and
//           disputes (orders/refunds/disputes are read live from Polar's API).
//   FitCV — mirrors each user's subscription from Polar webhooks; Chapa
//           payments live in FitCV's own table.
// Nothing on this page marks a payment successful or edits subscription
// status by hand. The only actions ask the provider for the real answer:
// "Re-verify with Chapa" and "Retry sync" (re-fetch from Polar).

const PAGE_SIZE = 25;

type TabId = "subscriptions" | "chapa" | "orders" | "disputes" | "webhooks";

const TABS: { id: TabId; label: string }[] = [
  { id: "subscriptions", label: "Subscriptions" },
  { id: "chapa", label: "Chapa payments" },
  { id: "orders", label: "Polar orders" },
  { id: "disputes", label: "Refunds & disputes" },
  { id: "webhooks", label: "Webhooks" },
];

const SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "canceled", "revoked", "unpaid", "incomplete", "incomplete_expired", "paused"];
const CHAPA_STATUSES: ChapaPaymentRow["status"][] = ["PENDING", "SUCCESS", "FAILED", "CANCELLED", "EXPIRED"];
const ORDER_STATUSES: PolarOrder["status"][] = ["paid", "pending", "refunded", "partially_refunded", "void", "draft"];
const WEBHOOK_STATUSES: { value: string; label: string }[] = [
  { value: "failed", label: "Failed" },
  { value: "unmatched", label: "Unmatched" },
  { value: "processed", label: "Processed" },
  { value: "ignored", label: "Ignored" },
  { value: "received", label: "Received" },
  { value: "legacy", label: "Legacy (before outcome tracking)" },
];

/** The backend prefixes Polar failures with "Polar API error:"; show them consistently. */
function polarError(err: unknown): Error {
  return new Error(`Polar API unavailable: ${errorText(err, "request failed").replace(/^Polar API error:\s*/i, "")}`);
}

function sumValues(record: Record<string, number> | undefined): number {
  return Object.values(record ?? {}).reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------- small pieces

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  );
}

function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-4 sm:px-5 py-3.5 border-b border-neutral-200 items-end">{children}</div>;
}

function SearchBox({ placeholder, onSearch, initial = "" }: { placeholder: string; onSearch: (q: string) => void; initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim());
      }}
    >
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className={INPUT} />
      <Button type="submit" aria-label="Search">
        <Search className="w-3.5 h-3.5" />
      </Button>
    </form>
  );
}

function OutLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-strong hover:underline whitespace-nowrap">
      {children}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

function UserLink({ id, email, name }: { id?: string | null; email?: string | null; name?: string | null }) {
  const label = email ?? id ?? "—";
  return (
    <div className="min-w-0">
      {id ? (
        <Link href={`/admin/users/${id}`} className="font-medium text-neutral-950 hover:text-accent-strong hover:underline break-all">
          {label}
        </Link>
      ) : (
        <span className="text-neutral-700 break-all">{label}</span>
      )}
      {name && <div className="text-xs text-neutral-500">{name}</div>}
    </div>
  );
}

function Breakdown({ entries, emptyLabel = "None" }: { entries: [string, React.ReactNode][]; emptyLabel?: string }) {
  if (entries.length === 0) return <span>{emptyLabel}</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5">
      {entries.map(([k, v]) => (
        <span key={k} className="whitespace-nowrap">
          {k.replace(/_/g, " ")}: <span className="font-semibold text-neutral-700">{v}</span>
        </span>
      ))}
    </span>
  );
}

function CardShell({
  title,
  description,
  source,
  sourceTitle,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  source: "synced" | "database" | "polar";
  sourceTitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card title={title} description={description} actions={<SourceTag source={source} title={sourceTitle} />} padded={false}>
      {children}
    </Card>
  );
}

// ---------------------------------------------------------------- summary

function PolarIntro({ links }: { links: PolarLinks | undefined }) {
  return (
    <Note tone="info">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p>
            Polar is the source of truth for Polar subscriptions, orders, refunds and disputes. FitCV mirrors subscription state from Polar webhooks. Refunds,
            disputes and full billing management happen in the Polar dashboard.
          </p>
          <p>
            Nothing here marks a payment successful or edits a subscription by hand. The only actions ask the provider for the real answer: <b>Re-verify with Chapa</b>{" "}
            on pending Chapa payments, and <b>Retry sync</b> on failed Polar webhooks.
          </p>
          {links && !links.organization && (
            <p className="font-semibold">
              The Polar organization couldn&apos;t be read, so links are limited: the dashboard link goes to Polar&apos;s home and per-order / per-subscription links
              are unavailable.
            </p>
          )}
        </div>
        {links && (
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={links.environment === "production" ? "good" : "warn"}>{links.environment}</Badge>
            <a
              href={links.dashboard}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 whitespace-nowrap"
            >
              Open Polar dashboard
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </Note>
  );
}

function SummaryCards({ summary }: { summary: BillingSummary }) {
  const s = summary.subscriptions;
  const webhookAttention = (summary.webhooks.failed ?? 0) + (summary.webhooks.unmatched ?? 0);
  const webhookEntries = Object.entries(summary.webhooks).sort((a, b) => b[1] - a[1]);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <StatCard label="Active paid subscriptions" value={formatNumber(s.activePaid)} hint="Active status with an unexpired period" source="synced" tone="good" />
      <StatCard
        label="Cancelling at period end"
        value={formatNumber(s.cancellingAtPeriodEnd)}
        hint="Still have access until their period ends"
        source="synced"
        tone={s.cancellingAtPeriodEnd > 0 ? "warn" : "neutral"}
      />
      <StatCard label="Lapsed" value={formatNumber(s.lapsed)} hint="Had a paid subscription, no paid access now" source="synced" />
      <StatCard
        label="Subscriptions by provider"
        value={formatNumber(sumValues(s.byProvider))}
        hint={<Breakdown entries={Object.entries(s.byProvider).map(([k, v]) => [k, formatNumber(v)])} />}
        source="synced"
      />
      <StatCard
        label="Subscription statuses"
        value={formatNumber(sumValues(s.byStatus))}
        hint={<Breakdown entries={Object.entries(s.byStatus).map(([k, v]) => [k, formatNumber(v)])} />}
        source="synced"
      />
      <StatCard
        label="Chapa payments"
        value={formatNumber(sumValues(summary.chapa.byStatus))}
        hint={<Breakdown entries={CHAPA_STATUSES.filter((k) => summary.chapa.byStatus[k]).map((k) => [k, formatNumber(summary.chapa.byStatus[k])])} />}
        source="database"
      />
      <StatCard
        label="Chapa successful revenue"
        value={
          summary.chapa.successfulRevenue.length === 0 ? (
            <span className="text-base text-neutral-500">No successful payments</span>
          ) : (
            <span className="flex flex-col gap-0.5">
              {summary.chapa.successfulRevenue.map((r) => (
                <span key={r.currency} className={summary.chapa.successfulRevenue.length > 1 ? "text-lg" : ""}>
                  {formatMoney(r.amount, r.currency)}
                </span>
              ))}
            </span>
          )
        }
        hint={summary.chapa.successfulRevenue.map((r) => `${formatNumber(r.count)} ${r.currency} payment${r.count === 1 ? "" : "s"}`).join(" · ") || undefined}
        source="database"
      />
      <StatCard
        label="Webhooks needing attention"
        value={formatNumber(webhookAttention)}
        tone={webhookAttention > 0 ? "bad" : "good"}
        hint={
          webhookEntries.length === 0 ? (
            "No webhook events recorded"
          ) : (
            <span className="flex flex-wrap gap-1 mt-1">
              {webhookEntries.map(([k, v]) => (
                <Badge key={k} tone={k === "failed" ? "bad" : k === "unmatched" ? "warn" : "neutral"}>
                  {k}: {formatNumber(v)}
                </Badge>
              ))}
            </span>
          )
        }
        source="database"
      />
    </div>
  );
}

// ---------------------------------------------------------------- subscriptions

function SubscriptionsTab({ links }: { links: PolarLinks | undefined }) {
  const [view, setView] = useState<"all" | "active" | "cancelling" | "lapsed">("all");
  const [provider, setProvider] = useState<"" | "POLAR" | "CHAPA">("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["admin", "billing", "subscriptions", { view, provider, status, q, page }],
    queryFn: () => listSubscriptions({ view, provider: provider || undefined, status: status || undefined, q: q || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const columns: Column<SubscriptionRow>[] = [
    { key: "user", header: "User", cell: (r) => <UserLink id={r.id} email={r.email} name={r.fullName} /> },
    { key: "provider", header: "Provider", cell: (r) => (r.subscriptionProvider ? <Badge>{r.subscriptionProvider}</Badge> : "—") },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.subscriptionStatus} /> },
    {
      key: "paid",
      header: "Paid access",
      cell: (r) => (r.hasPaidAccess ? <Badge tone="good">Yes</Badge> : <Badge>No</Badge>),
    },
    {
      key: "period",
      header: "Period end",
      cell: (r) => (
        <div className="space-y-1">
          <div className="whitespace-nowrap">{formatDate(r.subscriptionCurrentPeriodEnd)}</div>
          {r.subscriptionCurrentPeriodEnd && <div className="text-xs text-neutral-500">{formatRelative(r.subscriptionCurrentPeriodEnd)}</div>}
          {r.subscriptionCancelAtPeriodEnd && <Badge tone="warn">cancels at period end</Badge>}
        </div>
      ),
    },
    {
      key: "polar",
      header: "Polar ids",
      cell: (r) =>
        r.polarSubscriptionId || r.polarCustomerId ? (
          <div className="space-y-1 max-w-[260px]">
            {r.polarSubscriptionId && (
              <div>
                <span className="text-[11px] text-neutral-400">sub </span>
                {links?.subscriptionBase ? (
                  <a href={`${links.subscriptionBase}/${r.polarSubscriptionId}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    <Mono>{r.polarSubscriptionId}</Mono>
                  </a>
                ) : (
                  <Mono>{r.polarSubscriptionId}</Mono>
                )}
              </div>
            )}
            {r.polarCustomerId && (
              <div>
                <span className="text-[11px] text-neutral-400">cus </span>
                {links?.customerBase ? (
                  <a href={`${links.customerBase}/${r.polarCustomerId}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    <Mono>{r.polarCustomerId}</Mono>
                  </a>
                ) : (
                  <Mono>{r.polarCustomerId}</Mono>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="text-neutral-400">—</span>
        ),
    },
  ];

  return (
    <CardShell
      title="Subscriptions"
      description="FitCV's mirror of each user's subscription, as last synced from Polar webhooks (or Chapa payments). Polar holds the authoritative record."
      source="synced"
      sourceTitle="Local mirror of the provider's subscription state"
    >
      <FilterBar>
        <Field label="View">
          <select
            className={INPUT}
            value={view}
            onChange={(e) => {
              setView(e.target.value as typeof view);
              setPage(1);
            }}
          >
            <option value="all">All with a subscription</option>
            <option value="active">Active (paid, unexpired)</option>
            <option value="cancelling">Cancelling at period end</option>
            <option value="lapsed">Lapsed (lost paid access)</option>
          </select>
        </Field>
        <Field label="Provider">
          <select
            className={INPUT}
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value as typeof provider);
              setPage(1);
            }}
          >
            <option value="">Any provider</option>
            <option value="POLAR">Polar</option>
            <option value="CHAPA">Chapa</option>
          </select>
        </Field>
        <Field label="Status">
          <select
            className={INPUT}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Any status</option>
            {SUBSCRIPTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Search">
          <SearchBox
            placeholder="Email or Polar subscription / customer id"
            onSearch={(v) => {
              setQ(v);
              setPage(1);
            }}
          />
        </Field>
      </FilterBar>
      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(r) => r.id}
        isLoading={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No subscriptions match"
        emptyDescription="Only users who have (or had) a subscription appear here."
      />
      {query.data && query.data.total > 0 && <Pagination page={page} pageCount={query.data.pageCount} total={query.data.total} onChange={setPage} />}
    </CardShell>
  );
}

// ---------------------------------------------------------------- Chapa

function ChapaTab() {
  const canWrite = useCan("billing:write");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"" | ChapaPaymentRow["status"]>("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [verifyTarget, setVerifyTarget] = useState<ChapaPaymentRow | null>(null);

  const query = useQuery({
    queryKey: ["admin", "billing", "payments", { status, q, from, to, page }],
    queryFn: () =>
      listChapaPayments({
        status: status || undefined,
        q: q || undefined,
        from: dateInputToIso(from),
        to: dateInputToIso(to, true),
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const reverify = async (payment: ChapaPaymentRow) => {
    const result = await reverifyChapaPayment(payment.id);
    if (result.changed) {
      const msg = `Chapa reports ${result.status}`;
      if (result.status === "SUCCESS") toast.success(msg, { description: "The payment is confirmed and the 30-day Pro period was granted." });
      else toast.info(msg, { description: `The payment moved from ${payment.status} to ${result.status}.` });
    } else {
      toast.info(`No change — still ${result.status}`, { description: "Chapa hasn't confirmed this payment. Nothing was granted." });
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "billing"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
      payment.userId ? queryClient.invalidateQueries({ queryKey: ["admin", "users"] }) : Promise.resolve(),
    ]);
  };

  const columns: Column<ChapaPaymentRow>[] = [
    {
      key: "time",
      header: "Time",
      cell: (r) => (
        <div className="whitespace-nowrap">
          <div>{formatDateTime(r.createdAt)}</div>
          <div className="text-xs text-neutral-500">{formatRelative(r.createdAt)}</div>
        </div>
      ),
    },
    { key: "user", header: "User", cell: (r) => <UserLink id={r.userId} email={r.userEmail} /> },
    { key: "amount", header: "Amount", cell: (r) => <span className="tabular-nums whitespace-nowrap font-medium">{formatMoney(r.amount, r.currency)}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "product", header: "Product", cell: (r) => <span className="text-xs">{r.productType.replace(/_/g, " ")}</span> },
    {
      key: "refs",
      header: "References",
      cell: (r) => (
        <div className="space-y-0.5 max-w-[260px]">
          <div>
            <span className="text-[11px] text-neutral-400">id </span>
            <Mono>{r.id}</Mono>
          </div>
          <div>
            <span className="text-[11px] text-neutral-400">merchant </span>
            <Mono>{r.merchantReference}</Mono>
          </div>
          {r.providerReference && (
            <div>
              <span className="text-[11px] text-neutral-400">chapa </span>
              <Mono>{r.providerReference}</Mono>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) =>
        r.status === "PENDING" && canWrite ? (
          <Button size="sm" onClick={() => setVerifyTarget(r)}>
            <ShieldCheck className="w-3.5 h-3.5" />
            Re-verify with Chapa
          </Button>
        ) : null,
    },
  ];

  return (
    <CardShell
      title="Chapa payments"
      description="Payments recorded in FitCV's own payment table. A payment only becomes SUCCESS when Chapa confirms it."
      source="database"
    >
      <FilterBar>
        <Field label="Status">
          <select
            className={INPUT}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setPage(1);
            }}
          >
            <option value="">Any status</option>
            {CHAPA_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <input
            type="date"
            className={INPUT}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            className={INPUT}
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Search">
          <SearchBox
            placeholder="Email, payment id, merchant / Chapa ref"
            onSearch={(v) => {
              setQ(v);
              setPage(1);
            }}
          />
        </Field>
      </FilterBar>
      <div className="px-4 sm:px-5 py-3 border-b border-neutral-200">
        <Note>
          <b>Re-verify with Chapa</b> asks Chapa for the payment&apos;s real status. Only Chapa&apos;s answer changes it here — there is no way to mark a payment
          successful by hand.
        </Note>
      </div>
      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(r) => r.id}
        isLoading={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No Chapa payments match"
      />
      {query.data && query.data.total > 0 && <Pagination page={page} pageCount={query.data.pageCount} total={query.data.total} onChange={setPage} />}

      <ActionDialog
        open={verifyTarget !== null}
        title="Re-verify with Chapa"
        confirmLabel="Ask Chapa"
        description={
          verifyTarget && (
            <div className="space-y-2">
              <p>
                FitCV will ask Chapa for the real status of this {formatMoney(verifyTarget.amount, verifyTarget.currency)} payment
                {verifyTarget.userEmail ? ` by ${verifyTarget.userEmail}` : ""}.
              </p>
              <p>
                Only if Chapa confirms the payment succeeded does it become <b>SUCCESS</b> and grant the 30-day Pro period. If Chapa reports it failed, cancelled
                or still pending, FitCV records that answer and grants nothing. Nothing changes on Chapa&apos;s side.
              </p>
              <p className="text-xs text-neutral-500">
                Merchant reference: <Mono>{verifyTarget.merchantReference}</Mono>
              </p>
            </div>
          )
        }
        onConfirm={() => (verifyTarget ? reverify(verifyTarget) : Promise.resolve())}
        onClose={() => setVerifyTarget(null)}
      />
    </CardShell>
  );
}

// ---------------------------------------------------------------- Polar orders

function OrdersTab({ links }: { links: PolarLinks | undefined }) {
  const [status, setStatus] = useState<"" | PolarOrder["status"]>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["admin", "billing", "polar", "orders", { status, from, to, page }],
    queryFn: () => listPolarOrders({ status: status || undefined, from: dateInputToIso(from), to: dateInputToIso(to, true), page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const columns: Column<PolarOrder>[] = [
    { key: "time", header: "Time", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.createdAt)}</span> },
    {
      key: "customer",
      header: "Customer",
      cell: (r) => (
        <div className="min-w-0 space-y-0.5">
          <div className="break-all">{r.customerEmail ?? <Mono>{r.customerId}</Mono>}</div>
          {r.externalCustomerId && (
            <Link href={`/admin/users/${r.externalCustomerId}`} className="text-xs font-semibold text-accent-strong hover:underline">
              FitCV user →
            </Link>
          )}
        </div>
      ),
    },
    { key: "product", header: "Product", cell: (r) => r.productName ?? <span className="text-neutral-400">—</span> },
    { key: "reason", header: "Billing reason", cell: (r) => <span className="text-xs whitespace-nowrap">{r.billingReason.replace(/_/g, " ")}</span> },
    {
      key: "total",
      header: "Total",
      className: "text-right",
      cell: (r) => <span className="tabular-nums whitespace-nowrap font-medium">{formatMinorMoney(r.totalAmount, r.currency)}</span>,
    },
    {
      key: "refunded",
      header: "Refunded",
      className: "text-right",
      cell: (r) =>
        r.refundedAmount > 0 ? (
          <span className="tabular-nums whitespace-nowrap text-rose-700">{formatMinorMoney(r.refundedAmount, r.currency)}</span>
        ) : (
          <span className="text-neutral-400">—</span>
        ),
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "invoice", header: "Invoice #", cell: (r) => (r.invoiceNumber ? <Mono>{r.invoiceNumber}</Mono> : <span className="text-neutral-400">—</span>) },
    {
      key: "open",
      header: "",
      cell: (r) => (links?.orderBase ? <OutLink href={`${links.orderBase}/${r.id}`}>Open in Polar</OutLink> : <Mono>{r.id}</Mono>),
    },
  ];

  return (
    <CardShell title="Polar orders" description="Read live from Polar's API. Amounts are as Polar reports them." source="polar">
      <FilterBar>
        <Field label="Status">
          <select
            className={INPUT}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setPage(1);
            }}
          >
            <option value="">Any status</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <input
            type="date"
            className={INPUT}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            className={INPUT}
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </Field>
      </FilterBar>
      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(r) => r.id}
        isLoading={query.isFetching}
        error={query.error ? polarError(query.error) : null}
        onRetry={() => query.refetch()}
        emptyTitle="No Polar orders match"
      />
      {query.data && query.data.total > 0 && <Pagination page={page} pageCount={query.data.maxPage} total={query.data.total} onChange={setPage} />}
    </CardShell>
  );
}

// ---------------------------------------------------------------- refunds & disputes

function RefundsCard({ links }: { links: PolarLinks | undefined }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin", "billing", "polar", "refunds", { page }],
    queryFn: () => listPolarRefunds({ page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    retry: 1,
  });
  const columns: Column<PolarRefund>[] = [
    { key: "time", header: "Time", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.createdAt)}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "amount", header: "Amount", className: "text-right", cell: (r) => <span className="tabular-nums whitespace-nowrap">{formatMinorMoney(r.amount, r.currency)}</span> },
    { key: "reason", header: "Reason", cell: (r) => <span className="text-xs">{r.reason.replace(/_/g, " ")}</span> },
    {
      key: "order",
      header: "Order",
      cell: (r) => (links?.orderBase ? <OutLink href={`${links.orderBase}/${r.orderId}`}>Open order</OutLink> : <Mono>{r.orderId}</Mono>),
    },
  ];
  const pageCount = query.data ? Math.max(1, Math.ceil(query.data.total / PAGE_SIZE)) : 1;
  return (
    <CardShell title="Refunds" description="Read live from Polar's API. Refunds are issued in the Polar dashboard." source="polar">
      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(r) => r.id}
        isLoading={query.isFetching}
        error={query.error ? polarError(query.error) : null}
        onRetry={() => query.refetch()}
        emptyTitle="No refunds"
      />
      {query.data && query.data.total > 0 && <Pagination page={page} pageCount={pageCount} total={query.data.total} onChange={setPage} />}
    </CardShell>
  );
}

function DisputesCard({ links }: { links: PolarLinks | undefined }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin", "billing", "polar", "disputes", { page }],
    queryFn: () => listPolarDisputes({ page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    retry: 1,
  });
  const columns: Column<PolarDispute>[] = [
    { key: "time", header: "Opened", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.createdAt)}</span> },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <div className="space-y-1">
          <StatusBadge status={r.status} />
          {r.resolved && <div className="text-[11px] text-neutral-500">resolved</div>}
        </div>
      ),
    },
    { key: "amount", header: "Amount", className: "text-right", cell: (r) => <span className="tabular-nums whitespace-nowrap">{formatMinorMoney(r.amount, r.currency)}</span> },
    { key: "reason", header: "Reason", cell: (r) => (r.reason ? <span className="text-xs">{r.reason.replace(/_/g, " ")}</span> : <span className="text-neutral-400">—</span>) },
    {
      key: "due",
      header: "Evidence due by",
      cell: (r) =>
        r.evidenceDueBy ? (
          <div className={r.status === "needs_response" ? "font-semibold text-rose-700" : ""}>
            <div className="whitespace-nowrap">{formatDateTime(r.evidenceDueBy)}</div>
            <div className="text-xs">{formatRelative(r.evidenceDueBy)}</div>
          </div>
        ) : (
          <span className="text-neutral-400">—</span>
        ),
    },
    { key: "customer", header: "Customer", cell: (r) => <span className="break-all">{r.customerEmail ?? "—"}</span> },
    {
      key: "order",
      header: "Order",
      cell: (r) => (links?.orderBase ? <OutLink href={`${links.orderBase}/${r.orderId}`}>Open order</OutLink> : <Mono>{r.orderId}</Mono>),
    },
  ];
  const needsResponse = query.data?.items.filter((d) => d.status === "needs_response").length ?? 0;
  const pageCount = query.data ? Math.max(1, Math.ceil(query.data.total / PAGE_SIZE)) : 1;
  return (
    <CardShell title="Disputes" description="Chargebacks, read live from Polar's API. Respond with evidence in the Polar dashboard." source="polar">
      {needsResponse > 0 && (
        <div className="px-4 sm:px-5 py-3 border-b border-neutral-200">
          <Note tone="warn">
            <b>
              {needsResponse} dispute{needsResponse === 1 ? "" : "s"} on this page need{needsResponse === 1 ? "s" : ""} a response.
            </b>{" "}
            Submit evidence in the Polar dashboard before the due date, or the dispute is lost by default.
          </Note>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(r) => r.id}
        isLoading={query.isFetching}
        error={query.error ? polarError(query.error) : null}
        onRetry={() => query.refetch()}
        emptyTitle="No disputes"
      />
      {query.data && query.data.total > 0 && <Pagination page={page} pageCount={pageCount} total={query.data.total} onChange={setPage} />}
    </CardShell>
  );
}

function DisputesTab({ links }: { links: PolarLinks | undefined }) {
  return (
    <div className="space-y-4">
      <Note>
        Refunds and disputes are handled in the Polar dashboard — FitCV can&apos;t issue refunds or answer disputes. When Polar revokes a subscription after a
        refund or lost dispute, the webhook updates the user&apos;s access here.
        {links && (
          <>
            {" "}
            <a href={links.dashboard} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-strong hover:underline">
              Open Polar dashboard
            </a>
          </>
        )}
      </Note>
      <RefundsCard links={links} />
      <DisputesCard links={links} />
    </div>
  );
}

// ---------------------------------------------------------------- webhooks

function describePolarResult(polar: unknown): string | undefined {
  if (!polar || typeof polar !== "object") return undefined;
  const p = polar as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof p.status === "string") parts.push(`Polar status: ${p.status.replace(/_/g, " ")}`);
  if (typeof p.currentPeriodEnd === "string") parts.push(`period ends ${formatDate(p.currentPeriodEnd)}`);
  return parts.length ? parts.join(" · ") : undefined;
}

function WebhooksTab() {
  const canWrite = useCan("billing:write");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [retryTarget, setRetryTarget] = useState<WebhookEventRow | null>(null);

  const query = useQuery({
    queryKey: ["admin", "billing", "webhooks", { status, page }],
    queryFn: () => listWebhookEvents({ status: status || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const retry = async (event: WebhookEventRow) => {
    const result = await retryWebhookEvent(event.id);
    const detail = describePolarResult(result.polar);
    if (result.status === "processed") {
      toast.success("Re-synced: processed", { description: detail ? `Applied to the matching FitCV user. ${detail}` : "Applied to the matching FitCV user." });
    } else {
      toast.info(`Re-synced: ${result.status}`, {
        description: `Polar returned the subscription, but no FitCV user matches it yet.${detail ? ` ${detail}` : ""}`,
      });
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "billing"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
    ]);
  };

  const columns: Column<WebhookEventRow>[] = [
    {
      key: "received",
      header: "Received",
      cell: (r) => (
        <div className="whitespace-nowrap">
          <div>{formatDateTime(r.createdAt)}</div>
          <div className="text-xs text-neutral-500">{r.provider}</div>
        </div>
      ),
    },
    { key: "type", header: "Event type", cell: (r) => (r.eventType ? <Mono>{r.eventType}</Mono> : <span className="text-neutral-400">—</span>) },
    {
      key: "resource",
      header: "Resource id",
      cell: (r) => (r.resourceId ? <span className="block max-w-[220px]"><Mono>{r.resourceId}</Mono></span> : <span className="text-neutral-400">—</span>),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) =>
        r.status ? (
          <StatusBadge status={r.status} />
        ) : (
          <Badge title="Recorded before outcome tracking existed">legacy</Badge>
        ),
    },
    {
      key: "error",
      header: "Error",
      cell: (r) => (r.error ? <span className="block max-w-[280px] text-xs text-rose-700 break-words">{r.error}</span> : <span className="text-neutral-400">—</span>),
    },
    { key: "processed", header: "Processed at", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.processedAt)}</span> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) =>
        canWrite && r.provider === "POLAR" && r.resourceId && (r.status === "failed" || r.status === "unmatched") ? (
          <Button size="sm" onClick={() => setRetryTarget(r)}>
            <RefreshCw className="w-3.5 h-3.5" />
            Retry sync
          </Button>
        ) : null,
    },
  ];

  return (
    <CardShell title="Webhook log" description="Every incoming provider webhook and what FitCV did with it." source="database">
      <FilterBar>
        <Field label="Outcome">
          <select
            className={INPUT}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Any outcome</option>
            {WEBHOOK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-1 lg:col-span-3">
          <Note>
            <b>Retry sync</b> re-fetches the subscription from Polar&apos;s API and applies its current state to the matching FitCV user. The original payload
            isn&apos;t replayed. <b>Unmatched</b> means no FitCV user could be linked to the Polar customer.
          </Note>
        </div>
      </FilterBar>
      <DataTable
        columns={columns}
        rows={query.data?.items}
        rowKey={(r) => r.id}
        isLoading={query.isFetching}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No webhook events match"
      />
      {query.data && query.data.total > 0 && <Pagination page={page} pageCount={query.data.pageCount} total={query.data.total} onChange={setPage} />}

      <ActionDialog
        open={retryTarget !== null}
        title="Retry sync from Polar"
        confirmLabel="Re-fetch from Polar"
        description={
          retryTarget && (
            <div className="space-y-2">
              <p>Re-fetches this subscription from Polar&apos;s API and applies its current state. The original payload isn&apos;t replayed.</p>
              <p>
                Nothing changes in Polar. In FitCV, the matching user&apos;s subscription mirror (status, period end, cancel-at-period-end) is updated to what
                Polar reports now, and this event is marked processed — or stays unmatched if no FitCV user matches.
              </p>
              <p className="text-xs text-neutral-500">
                Subscription: <Mono>{retryTarget.resourceId}</Mono>
              </p>
            </div>
          )
        }
        onConfirm={() => (retryTarget ? retry(retryTarget) : Promise.resolve())}
        onClose={() => setRetryTarget(null)}
      />
    </CardShell>
  );
}

// ---------------------------------------------------------------- page

export default function BillingPage() {
  const [tab, setTab] = useState<TabId>("subscriptions");
  const summary = useQuery({ queryKey: ["admin", "billing", "summary"], queryFn: getBillingSummary });
  const links = summary.data?.polar;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Subscriptions & Payments"
        description="Subscription mirror, Chapa payments, live Polar orders, refunds and disputes, and the webhook log."
        actions={
          <Button size="sm" onClick={() => summary.refetch()} loading={summary.isFetching}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh summary
          </Button>
        }
      />

      <PolarIntro links={links} />

      {summary.error ? (
        <Card>
          <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
        </Card>
      ) : summary.data ? (
        <SummaryCards summary={summary.data} />
      ) : (
        <Card>
          <LoadingState label="Loading billing summary…" />
        </Card>
      )}

      <div>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        {tab === "subscriptions" && <SubscriptionsTab links={links} />}
        {tab === "chapa" && <ChapaTab />}
        {tab === "orders" && <OrdersTab links={links} />}
        {tab === "disputes" && <DisputesTab links={links} />}
        {tab === "webhooks" && <WebhooksTab />}
      </div>
    </div>
  );
}
