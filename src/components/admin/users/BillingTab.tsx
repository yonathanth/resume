"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import {
  cancelUserSubscription,
  getBillingSummary,
  listPolarOrders,
  resumeUserSubscription,
  reverifyChapaPayment,
  syncUserBilling,
  type ChapaPaymentRow,
  type PolarOrder,
  type UserDetail,
} from "@/lib/admin-api";
import { errorText, formatDateTime, formatMinorMoney, formatMoney, formatRelative, SHOW_CHAPA } from "@/lib/admin-format";
import { ActionDialog, Badge, Button, Card, DataTable, KeyValue, Mono, Note, SourceTag, StatusBadge, type Column } from "@/components/admin/ui";
import { useCan } from "@/components/admin/AdminShell";
import { useToast } from "@/components/Toaster";
import { useInvalidateUser, useUserAction } from "./shared";

type SyncResult = Awaited<ReturnType<typeof syncUserBilling>>;

function ExternalA({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-strong hover:underline">
      {children}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

function SyncSummary({ result }: { result: SyncResult }) {
  const changed = result.chapa.filter((c) => c.before !== c.after);
  return (
    <Note tone={result.polarError || result.chapa.some((c) => c.error) ? "warn" : "info"}>
      <div className="space-y-1">
        <div>
          <strong>Polar:</strong>{" "}
          {result.polarError
            ? `sync failed — ${result.polarError}`
            : !result.polar
              ? "no Polar subscription to sync."
              : !result.polar.found
                ? "Polar has no subscription for this user."
                : `status ${result.polar.status ?? "unknown"}${result.polar.currentPeriodEnd ? `, period ends ${formatDateTime(result.polar.currentPeriodEnd)}` : ""}${
                    result.polar.cancelAtPeriodEnd ? ", cancelling at period end" : ""
                  }.`}
        </div>
        <div>
          <strong>Chapa:</strong>{" "}
          {result.chapa.length === 0
            ? "no pending payments to re-verify."
            : `${result.chapa.length} pending payment(s) re-verified, ${changed.length} changed.`}
          {result.chapa.map((c) => (
            <div key={c.id} className="font-mono text-[11px]">
              {c.id.slice(0, 8)}… {c.before} → {c.after}
              {c.error ? ` (${c.error})` : ""}
            </div>
          ))}
        </div>
      </div>
    </Note>
  );
}

export function BillingTab({ detail }: { detail: UserDetail }) {
  const { subscription: sub, account } = detail;
  const userId = account.id;
  const canRead = useCan("billing:read");
  const canWrite = useCan("billing:write");
  const toast = useToast();
  const run = useUserAction(userId);
  const invalidate = useInvalidateUser(userId);
  const [dialog, setDialog] = useState<"cancel" | "resume" | null>(null);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);

  const summary = useQuery({
    queryKey: ["admin", "billing", "summary"],
    queryFn: getBillingSummary,
    enabled: canRead,
    staleTime: 5 * 60_000,
  });
  const polar = summary.data?.polar;

  const orders = useQuery({
    queryKey: ["admin", "polar-orders", { userId }],
    queryFn: () => listPolarOrders({ userId, pageSize: 50 }),
    enabled: canRead,
    retry: false,
  });

  const sync = useMutation({
    mutationFn: () => syncUserBilling(userId),
    onSuccess: async (result) => {
      setLastSync(result);
      const chapaErrors = result.chapa.filter((c) => c.error).length;
      if (result.polarError || chapaErrors) {
        toast.error("Billing sync finished with problems", {
          description: [result.polarError && `Polar: ${result.polarError}`, chapaErrors && `${chapaErrors} Chapa payment(s) couldn't be verified`].filter(Boolean).join(" · "),
        });
      } else {
        toast.success("Billing synced from providers");
      }
      await invalidate();
      await orders.refetch();
    },
    onError: (err) => toast.error("Couldn't sync billing", { description: errorText(err) }),
  });

  const reverify = useMutation({
    mutationFn: (paymentId: string) => reverifyChapaPayment(paymentId),
    onSuccess: async (r) => {
      if (r.changed) toast.success(`Chapa says: ${r.status}`, { description: "The payment status was updated." });
      else toast.info(`Still ${r.status}`, { description: "Chapa reported no change." });
      await invalidate();
    },
    onError: (err) => toast.error("Chapa re-verification failed", { description: errorText(err) }),
  });

  const subscriptionLink = sub.polarSubscriptionId && polar ? (polar.subscriptionBase ? `${polar.subscriptionBase}/${sub.polarSubscriptionId}` : polar.dashboard) : null;
  const customerLink = sub.polarCustomerId && polar ? (polar.customerBase ? `${polar.customerBase}/${sub.polarCustomerId}` : polar.dashboard) : null;
  const hasSubscription = Boolean(sub.provider || sub.status);

  const paymentColumns: Column<ChapaPaymentRow>[] = [
    {
      key: "time",
      header: "Time",
      className: "whitespace-nowrap",
      cell: (p) => (
        <span title={formatDateTime(p.createdAt)}>
          {formatDateTime(p.createdAt)}
          <span className="block text-xs text-neutral-500">{formatRelative(p.createdAt)}</span>
        </span>
      ),
    },
    { key: "amount", header: "Amount", className: "whitespace-nowrap tabular-nums", cell: (p) => formatMoney(p.amount, p.currency) },
    { key: "product", header: "Product", cell: (p) => <span className="text-xs">{p.productType.replace(/_/g, " ").toLowerCase()}</span> },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
    {
      key: "refs",
      header: "References",
      cell: (p) => (
        <div className="min-w-[180px] space-y-0.5">
          <div>
            <span className="text-[11px] text-neutral-500">Merchant </span>
            <Mono>{p.merchantReference}</Mono>
          </div>
          <div>
            <span className="text-[11px] text-neutral-500">Chapa </span>
            <Mono>{p.providerReference ?? "—"}</Mono>
          </div>
        </div>
      ),
    },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: "",
            className: "text-right",
            cell: (p: ChapaPaymentRow) =>
              p.status === "PENDING" ? (
                <Button size="sm" loading={reverify.isPending && reverify.variables === p.id} disabled={reverify.isPending} onClick={() => reverify.mutate(p.id)}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Re-verify with Chapa
                </Button>
              ) : null,
          },
        ]
      : []),
  ];

  const orderColumns: Column<PolarOrder>[] = [
    { key: "time", header: "Date", className: "whitespace-nowrap", cell: (o) => formatDateTime(o.createdAt) },
    {
      key: "product",
      header: "Product",
      cell: (o) => (
        <div className="min-w-[140px]">
          <div>{o.productName ?? "—"}</div>
          <div className="text-[11px] text-neutral-500">{o.billingReason.replace(/_/g, " ")}</div>
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
    { key: "total", header: "Total", className: "whitespace-nowrap tabular-nums text-right", cell: (o) => formatMinorMoney(o.totalAmount, o.currency) },
    {
      key: "refunded",
      header: "Refunded",
      className: "whitespace-nowrap tabular-nums text-right",
      cell: (o) => (o.refundedAmount ? <span className="text-rose-700">{formatMinorMoney(o.refundedAmount, o.currency)}</span> : <span className="text-neutral-400">—</span>),
    },
    { key: "invoice", header: "Invoice", cell: (o) => (o.invoiceNumber ? <Mono>{o.invoiceNumber}</Mono> : <span className="text-neutral-400">—</span>) },
    {
      key: "link",
      header: "",
      className: "text-right",
      cell: (o) => (polar?.orderBase ? <ExternalA href={`${polar.orderBase}/${o.id}`}>Open in Polar</ExternalA> : <Mono>{o.id}</Mono>),
    },
  ];

  return (
    <div className="space-y-5">
      <Note tone="info">
        Billing is managed by the payment processors: <strong>Polar</strong> (subscriptions, orders, refunds, disputes) and <strong>Chapa</strong> (one-off
        payments). Nothing here marks a payment as paid or edits a subscription by hand — the only actions are provider-backed (sync, cancel/resume in Polar,
        re-verify with Chapa). Complimentary access is a separate, manual grant under <em>Access &amp; entitlements</em>.
      </Note>

      <Card
        title="Subscription"
        description="GoMoxie's mirror of the processor's subscription, updated by webhooks or by syncing."
        actions={
          <>
            <SourceTag source="synced" />
            {canWrite && (
              <Button size="sm" loading={sync.isPending} onClick={() => sync.mutate()}>
                <RefreshCw className="w-3.5 h-3.5" />
                Sync from providers
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          {hasSubscription ? (
            <KeyValue
              items={[
                ["Provider", sub.provider ? <Badge tone="info">{sub.provider}</Badge> : <span className="text-neutral-400">—</span>],
                ["Status", <StatusBadge key="s" status={sub.status} />],
                [
                  "Current period ends",
                  sub.currentPeriodEnd ? (
                    <span>
                      {formatDateTime(sub.currentPeriodEnd)} <span className="text-neutral-500">({formatRelative(sub.currentPeriodEnd)})</span>
                    </span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  ),
                ],
                ["Cancel at period end", sub.cancelAtPeriodEnd ? <Badge tone="warn">Yes — won&apos;t renew</Badge> : "No"],
                ["Renews automatically (Polar)", sub.renewingPolar ? <Badge tone="good">Yes</Badge> : "No"],
                [
                  "Polar customer",
                  sub.polarCustomerId ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <Mono>{sub.polarCustomerId}</Mono>
                      {customerLink && <ExternalA href={customerLink}>Open in Polar</ExternalA>}
                    </span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  ),
                ],
                [
                  "Polar subscription",
                  sub.polarSubscriptionId ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <Mono>{sub.polarSubscriptionId}</Mono>
                      {subscriptionLink && <ExternalA href={subscriptionLink}>Open in Polar</ExternalA>}
                    </span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  ),
                ],
                ["Polar product", sub.polarProductId ? <Mono>{sub.polarProductId}</Mono> : <span className="text-neutral-400">—</span>],
              ]}
            />
          ) : (
            <p className="text-sm text-neutral-500">This user has never had a subscription.</p>
          )}

          {canWrite && sub.polarSubscriptionId && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {sub.cancelAtPeriodEnd ? (
                <Button size="sm" onClick={() => setDialog("resume")}>
                  Resume subscription
                </Button>
              ) : (
                <Button size="sm" variant="danger-outline" onClick={() => setDialog("cancel")}>
                  Cancel at period end
                </Button>
              )}
              <span className="text-xs text-neutral-500">Calls Polar&apos;s API. No refund is issued.</span>
            </div>
          )}

          {lastSync && <SyncSummary result={lastSync} />}
        </div>
      </Card>

      {SHOW_CHAPA && (
        <Card
          title="Chapa payments"
          description="Stored in GoMoxie's database. Only Chapa's own answer can move a payment to SUCCESS."
          padded={false}
          actions={<SourceTag source="database" />}
        >
          <DataTable columns={paymentColumns} rows={detail.payments} rowKey={(p) => p.id} emptyTitle="No Chapa payments" />
        </Card>
      )}

      {canRead && (
        <Card
          title="Polar orders"
          description="Read live from Polar's API. Amounts are as Polar reports them."
          padded={false}
          actions={
            <>
              <SourceTag source={orders.error ? "unavailable" : "polar"} />
              <Button size="sm" variant="ghost" loading={orders.isFetching} onClick={() => orders.refetch()} aria-label="Reload Polar orders">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </>
          }
        >
          <DataTable
            columns={orderColumns}
            rows={orders.data?.items}
            rowKey={(o) => o.id}
            isLoading={orders.isLoading}
            error={orders.error}
            onRetry={() => orders.refetch()}
            emptyTitle="No Polar orders"
            emptyDescription="Polar has no orders linked to this user."
          />
          {orders.data && orders.data.total > orders.data.items.length && (
            <p className="px-4 py-2 border-t border-neutral-200 text-xs text-neutral-500">
              Showing the {orders.data.items.length} most recent of {orders.data.total} orders.
            </p>
          )}
          <div className="px-4 py-3 border-t border-neutral-200">
            <Note>
              Refunds and disputes are handled in the Polar dashboard, not here.{" "}
              {polar && <ExternalA href={polar.dashboard}>Open the Polar dashboard</ExternalA>}
            </Note>
          </div>
        </Card>
      )}

      <ActionDialog
        open={dialog === "cancel"}
        title="Cancel at period end"
        danger
        description={
          <>
            This calls Polar&apos;s API to stop the subscription from renewing. No refund is issued, and {account.email} keeps their plan until the current period ends
            {sub.currentPeriodEnd ? ` (${formatDateTime(sub.currentPeriodEnd)})` : ""}. You can resume it before then.
          </>
        }
        confirmLabel="Cancel at period end"
        requireReason
        onClose={() => setDialog(null)}
        onConfirm={(reason) =>
          run(() => cancelUserSubscription(userId, reason), {
            success: (r) => toast.success("Subscription will cancel at period end", { description: `Access continues until ${formatDateTime(r.currentPeriodEnd)}.` }),
            error: "Polar couldn't cancel the subscription",
          })
        }
      />

      <ActionDialog
        open={dialog === "resume"}
        title="Resume subscription"
        description={
          <>
            This calls Polar&apos;s API to undo the scheduled cancellation, so the subscription renews at the end of the current period
            {sub.currentPeriodEnd ? ` (${formatDateTime(sub.currentPeriodEnd)})` : ""} and {account.email} is billed as usual. Nothing is charged now.
          </>
        }
        confirmLabel="Resume subscription"
        requireReason
        onClose={() => setDialog(null)}
        onConfirm={(reason) =>
          run(() => resumeUserSubscription(userId, reason), {
            success: (r) => toast.success("Subscription resumed", { description: `It renews on ${formatDateTime(r.currentPeriodEnd)}.` }),
            error: "Polar couldn't resume the subscription",
          })
        }
      />
    </div>
  );
}
