"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, RefreshCw } from "lucide-react";
import { getOverview, type FlowKey, type Overview } from "@/lib/admin-api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Mono,
  Note,
  PageHeader,
  PeriodPicker,
  periodLabel,
  SourceTag,
  StatCard,
  StatusBadge,
} from "@/components/admin/ui";
import { errorText, formatDate, formatDateTime, formatMinorMoney, formatMoney, formatNumber, formatRelative } from "@/lib/admin-format";

// Overview: one request to /admin/overview. Every block is labelled with its
// source (database / Polar API / tracked) and nothing is filled in when a
// source has no data.

const FLOWS: { key: FlowKey; label: string }[] = [
  { key: "create", label: "Create" },
  { key: "tailor", label: "Tailor" },
  { key: "improve", label: "Improve" },
];

/** "2026-10-13" (UTC day bucket) → "Oct 13". */
function dayLabel(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

/** A plain bar per day. Zero days keep a thin baseline so gaps stay visible. */
function DayBars({ data, unit }: { data: { day: string; count: number }[]; unit: string }) {
  if (data.length === 0) return <EmptyState title="No days in this period" />;
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div>
      <div
        role="img"
        aria-label={`${formatNumber(total)} ${unit} between ${dayLabel(data[0].day)} and ${dayLabel(data[data.length - 1].day)}, peak ${formatNumber(max)} in a day`}
        className="flex items-end gap-px h-40 border-b border-neutral-200"
      >
        {data.map((d) => (
          <div key={d.day} title={`${dayLabel(d.day)}: ${formatNumber(d.count)} ${unit}`} className="group flex-1 min-w-0 h-full flex flex-col justify-end">
            {d.count === 0 ? (
              <div className="h-0.5 rounded-sm bg-neutral-200" />
            ) : (
              <div className="rounded-t-sm bg-accent group-hover:bg-accent-strong" style={{ height: `${(d.count / max) * 100}%`, minHeight: 3 }} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between gap-2 text-[11px] text-neutral-500 tabular-nums">
        <span>{dayLabel(data[0].day)}</span>
        <span>Peak {formatNumber(max)}/day</span>
        <span>{dayLabel(data[data.length - 1].day)}</span>
      </div>
    </div>
  );
}

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-950">
      {children}
      <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  );
}

function UserLink({ id, children }: { id: string | null | undefined; children: React.ReactNode }) {
  if (!id) return <>{children}</>;
  return (
    <Link href={`/admin/users/${id}`} className="font-medium text-neutral-900 hover:text-accent-strong hover:underline break-all">
      {children}
    </Link>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-neutral-100">{children}</ul>;
}

function Row({ main, sub, side }: { main: React.ReactNode; sub?: React.ReactNode; side?: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-3 px-5 py-2.5">
      <div className="min-w-0 text-sm">
        <div className="min-w-0 break-words">{main}</div>
        {sub && <div className="mt-0.5 text-xs text-neutral-500 break-words">{sub}</div>}
      </div>
      {side && <div className="shrink-0 text-right text-xs text-neutral-500">{side}</div>}
    </li>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-4 text-sm text-neutral-500">{children}</p>;
}

function Section({ title, action, children }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function RevenueCard({ data }: { data: Overview }) {
  const { chapa, polar } = data.revenue;
  const statuses = Object.entries(chapa.byStatus).sort((a, b) => b[1] - a[1]);
  const polarRows = polar.available ? Object.entries(polar.byCurrency) : [];
  return (
    <Card title="Revenue" description={`Last ${data.days} days`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-neutral-950">Chapa</h3>
            <SourceTag source="database" />
          </div>
          <Section title="Successful payments">
            {chapa.successful.length === 0 ? (
              <p className="text-sm text-neutral-500">No successful Chapa payments in this period.</p>
            ) : (
              <ul className="space-y-1.5">
                {chapa.successful.map((c) => (
                  <li key={c.currency} className="flex items-baseline justify-between gap-3">
                    <span className="text-lg font-bold tabular-nums text-neutral-950">{formatMoney(c.amount, c.currency)}</span>
                    <span className="text-xs text-neutral-500">
                      {formatNumber(c.count)} payment{c.count === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="All payments by status">
            {statuses.length === 0 ? (
              <p className="text-sm text-neutral-500">No Chapa payments started in this period.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {statuses.map(([status, count]) => (
                  <span key={status} className="inline-flex items-center gap-1.5">
                    <StatusBadge status={status} />
                    <span className="text-sm font-semibold tabular-nums">{formatNumber(count)}</span>
                  </span>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-neutral-950">Polar</h3>
            <SourceTag source={polar.available ? "polar" : "unavailable"} />
          </div>
          {!polar.available ? (
            <Note tone="warn">
              <span className="font-semibold">Polar revenue unavailable:</span> {polar.error}
            </Note>
          ) : (
            <>
              {polar.truncated && (
                <Note tone="warn">Polar returned more orders than were fetched. These totals cover only the first pages and are lower than the real figure.</Note>
              )}
              {polarRows.length === 0 ? (
                <p className="text-sm text-neutral-500">No paid Polar orders in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                        <th className="py-1.5 pr-3 font-semibold">Currency</th>
                        <th className="py-1.5 pr-3 font-semibold text-right">Gross</th>
                        <th className="py-1.5 pr-3 font-semibold text-right">Net</th>
                        <th className="py-1.5 pr-3 font-semibold text-right">Refunded</th>
                        <th className="py-1.5 font-semibold text-right">Orders</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {polarRows.map(([currency, t]) => (
                        <tr key={currency} className="border-b border-neutral-100 last:border-0">
                          <td className="py-1.5 pr-3 font-semibold uppercase">{currency}</td>
                          <td className="py-1.5 pr-3 text-right">{formatMinorMoney(t.gross, currency)}</td>
                          <td className="py-1.5 pr-3 text-right">{formatMinorMoney(t.net, currency)}</td>
                          <td className="py-1.5 pr-3 text-right">{formatMinorMoney(t.refunded, currency)}</td>
                          <td className="py-1.5 text-right">{formatNumber(t.orders)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function AiSummaryCard({ data }: { data: Overview }) {
  const ai = data.ai;
  const items: [string, number, "neutral" | "good" | "bad" | "warn"][] = [
    ["Successful calls", ai.success, "good"],
    ["Failed calls", ai.failed, ai.failed > 0 ? "bad" : "neutral"],
    ["Free limit reached", ai.limitReached, "neutral"],
    ["App rate limited", ai.appRateLimited, "neutral"],
    ["Tokens", ai.tokens, "neutral"],
  ];
  const tone = { neutral: "text-neutral-950", good: "text-emerald-700", warn: "text-amber-700", bad: "text-rose-700" };
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          AI usage <SourceTag source="tracked" />
        </span>
      }
      description={ai.trackingSince ? `Last ${data.days} days · tracked since ${formatDate(ai.trackingSince)}` : "No AI calls recorded yet"}
      actions={<CardLink href="/admin/ai">AI usage</CardLink>}
    >
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {items.map(([label, value, t]) => (
          <div key={label}>
            <dt className="text-xs font-semibold text-neutral-500">{label}</dt>
            <dd className={`mt-0.5 text-lg font-bold tabular-nums ${tone[t]}`}>{formatNumber(value)}</dd>
          </div>
        ))}
      </dl>
      {ai.trackingSince && (
        <p className="mt-4 text-xs text-neutral-500">AI calls before {formatDateTime(ai.trackingSince)} weren&apos;t recorded and aren&apos;t counted.</p>
      )}
    </Card>
  );
}

function FreeTierCard({ data }: { data: Overview }) {
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          Free tier usage <SourceTag source="database" />
        </span>
      }
      description="All time, from users' free-use counters"
      padded={false}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/60 text-left text-xs text-neutral-500">
              <th className="px-5 py-2 font-semibold">Flow</th>
              <th className="px-5 py-2 font-semibold text-right">Free uses spent</th>
              <th className="px-5 py-2 font-semibold text-right">Users who used it</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {FLOWS.map((f) => (
              <tr key={f.key} className="border-b border-neutral-100 last:border-0">
                <td className="px-5 py-2 font-medium">{f.label}</td>
                <td className="px-5 py-2 text-right">{formatNumber(data.content.freeUsesSpent[f.key])}</td>
                <td className="px-5 py-2 text-right">{formatNumber(data.content.usersWhoUsedFree[f.key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SubscriptionStatusCard({ data }: { data: Overview }) {
  const entries = Object.entries(data.plans.subscriptionStatus).sort((a, b) => b[1] - a[1]);
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          Subscription status <SourceTag source="database" />
        </span>
      }
      description="Current status on user records"
      actions={<CardLink href="/admin/billing">Billing</CardLink>}
      padded={false}
    >
      {entries.length === 0 ? (
        <Quiet>No subscriptions on record.</Quiet>
      ) : (
        <List>
          {entries.map(([status, count]) => (
            <Row key={status} main={<StatusBadge status={status} />} side={<span className="text-sm font-semibold tabular-nums text-neutral-900">{formatNumber(count)}</span>} />
          ))}
        </List>
      )}
    </Card>
  );
}

function RecentActivity({ data }: { data: Overview }) {
  const r = data.recent;
  const issueCount = r.webhookFailures.length + r.emailFailures.length + r.aiFailures.length;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Recent registrations" actions={<CardLink href="/admin/users">All users</CardLink>} padded={false}>
        {r.registrations.length === 0 ? (
          <Quiet>No users yet.</Quiet>
        ) : (
          <List>
            {r.registrations.map((u) => (
              <Row
                key={u.id}
                main={<UserLink id={u.id}>{u.email}</UserLink>}
                sub={
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {u.fullName && <span>{u.fullName}</span>}
                    {u.verified ? <Badge tone="good">verified</Badge> : <Badge tone="warn">unverified</Badge>}
                    {u.google && <Badge>Google</Badge>}
                  </span>
                }
                side={<span title={formatDateTime(u.createdAt)}>{formatRelative(u.createdAt)}</span>}
              />
            ))}
          </List>
        )}
      </Card>

      <Card
        title={
          <span className="inline-flex items-center gap-2">
            Recent payments <SourceTag source="database" />
          </span>
        }
        description="Chapa payments recorded by GoMoxie"
        actions={<CardLink href="/admin/billing">Billing</CardLink>}
        padded={false}
      >
        {r.payments.length === 0 ? (
          <Quiet>No payments recorded.</Quiet>
        ) : (
          <List>
            {r.payments.map((p) => (
              <Row
                key={p.id}
                main={<UserLink id={p.userId}>{p.userEmail ?? <Mono>{p.userId}</Mono>}</UserLink>}
                sub={
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold tabular-nums text-neutral-800">{formatMoney(p.amount, p.currency)}</span>
                    <StatusBadge status={p.status} />
                    <span>{p.provider}</span>
                  </span>
                }
                side={<span title={formatDateTime(p.createdAt)}>{formatRelative(p.createdAt)}</span>}
              />
            ))}
          </List>
        )}
      </Card>

      <Card
        title={
          <span className="inline-flex items-center gap-2">
            Operational issues {issueCount > 0 && <Badge tone="bad">{issueCount}</Badge>}
          </span>
        }
        description="Most recent failures, newest first"
      >
        <div className="space-y-5">
          <Section title="Webhook failures" action={<CardLink href="/admin/billing">Billing</CardLink>}>
            {r.webhookFailures.length === 0 ? (
              <p className="text-sm text-neutral-500">No failures recorded.</p>
            ) : (
              <ul className="space-y-2">
                {r.webhookFailures.map((w) => (
                  <li key={w.id} className="text-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={w.status} />
                      <span className="font-medium">{w.provider}</span>
                      <Mono>{w.eventType ?? w.eventId}</Mono>
                      <span className="ml-auto text-xs text-neutral-500" title={formatDateTime(w.createdAt)}>
                        {formatRelative(w.createdAt)}
                      </span>
                    </div>
                    {w.error && <p className="mt-0.5 text-xs text-rose-700 break-words">{w.error}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="Email failures" action={<CardLink href="/admin/notifications">Notifications</CardLink>}>
            {r.emailFailures.length === 0 ? (
              <p className="text-sm text-neutral-500">No failures recorded.</p>
            ) : (
              <ul className="space-y-2">
                {r.emailFailures.map((e) => (
                  <li key={e.id} className="text-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {e.userId ? <UserLink id={e.userId}>{e.toEmail}</UserLink> : <span className="break-all">{e.toEmail}</span>}
                      <Badge>{e.kind}</Badge>
                      <span className="ml-auto text-xs text-neutral-500" title={formatDateTime(e.createdAt)}>
                        {formatRelative(e.createdAt)}
                      </span>
                    </div>
                    {e.error && <p className="mt-0.5 text-xs text-rose-700 break-words">{e.error}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="AI failures" action={<CardLink href="/admin/ai">AI usage</CardLink>}>
            {r.aiFailures.length === 0 ? (
              <p className="text-sm text-neutral-500">No failures recorded.</p>
            ) : (
              <ul className="space-y-2">
                {r.aiFailures.map((a) => (
                  <li key={a.id} className="text-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={a.status} />
                      <Mono>{a.operation}</Mono>
                      <span className="text-xs text-neutral-500">{a.model}</span>
                      {a.userId && (
                        <Link href={`/admin/users/${a.userId}`} className="text-xs font-semibold text-neutral-600 hover:text-neutral-950 hover:underline">
                          user
                        </Link>
                      )}
                      <span className="ml-auto text-xs text-neutral-500" title={formatDateTime(a.createdAt)}>
                        {formatRelative(a.createdAt)}
                      </span>
                    </div>
                    {(a.errorCode || a.errorMessage) && (
                      <p className="mt-0.5 text-xs text-rose-700 break-words">{[a.errorCode, a.errorMessage].filter(Boolean).join(": ")}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </Card>

      <Card title="Recent admin actions" actions={<CardLink href="/admin/audit">Audit log</CardLink>} padded={false}>
        {r.audit.length === 0 ? (
          <Quiet>No admin actions recorded yet.</Quiet>
        ) : (
          <List>
            {r.audit.map((a) => (
              <Row
                key={a.id}
                main={
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <Badge tone={a.action.endsWith("_failed") ? "bad" : "neutral"}>
                      <span className="font-mono">{a.action}</span>
                    </Badge>
                    <span className="text-xs text-neutral-500">{a.actorEmail ?? "system/CLI"}</span>
                  </span>
                }
                sub={a.summary ?? undefined}
                side={<span title={formatDateTime(a.createdAt)}>{formatRelative(a.createdAt)}</span>}
              />
            ))}
          </List>
        )}
      </Card>
    </div>
  );
}

function OverviewBody({ data }: { data: Overview }) {
  const { users, plans, content } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Total users" value={formatNumber(users.total)} hint={`+${formatNumber(users.newInPeriod)} new in the last ${data.days} days`} source="database" />
        <StatCard
          label="Verified / Unverified"
          value={
            <>
              {formatNumber(users.verified)}
              <span className="text-neutral-400 font-semibold"> / {formatNumber(users.unverified)}</span>
            </>
          }
          hint={users.total > 0 ? `${Math.round((users.verified / users.total) * 100)}% have verified their email` : "No users yet"}
          source="database"
        />
        <StatCard label="Suspended" value={formatNumber(users.suspended)} tone={users.suspended > 0 ? "bad" : "neutral"} hint="Can't sign in or use the app" source="database" />
        <StatCard
          label="Pro users"
          value={formatNumber(plans.pro)}
          hint={`${formatNumber(plans.paid)} paid · ${formatNumber(plans.complimentary)} complimentary`}
          tone="good"
          source="database"
        />
        <StatCard label="Free users" value={formatNumber(plans.free)} hint="No Pro access right now" source="database" />
        <StatCard
          label="Cancelling at period end"
          value={formatNumber(plans.cancellingAtPeriodEnd)}
          tone={plans.cancellingAtPeriodEnd > 0 ? "warn" : "neutral"}
          hint="Still paid; won't renew"
          source="database"
        />
        <StatCard label="Lapsed" value={formatNumber(plans.lapsed)} hint="Had a plan, no paid access now" source="database" />
        <StatCard
          label={`CVs created (${periodLabel(data.days)})`}
          value={formatNumber(content.cvsInPeriod)}
          hint={`${formatNumber(content.aiCvsInPeriod)} AI-generated · ${formatNumber(content.totalCvs)} all time`}
          source="database"
        />
        <StatCard label="Career profiles" value={formatNumber(content.totalProfiles)} hint="All time" source="database" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          className="lg:col-span-2"
          title={
            <span className="inline-flex items-center gap-2">
              Sign-ups by day <SourceTag source="database" />
            </span>
          }
          description={`${formatNumber(users.newInPeriod)} new users in the last ${data.days} days (UTC days)`}
        >
          <DayBars data={users.signupsByDay} unit="sign-ups" />
        </Card>
        <SubscriptionStatusCard data={data} />
      </div>

      <RevenueCard data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FreeTierCard data={data} />
        <AiSummaryCard data={data} />
      </div>

      <RecentActivity data={data} />
    </div>
  );
}

export default function AdminOverviewPage() {
  const [days, setDays] = useState<number>(30);
  const query = useQuery({
    queryKey: ["admin", "overview", days],
    queryFn: () => getOverview(days),
    placeholderData: (prev) => prev,
  });
  const data = query.data;

  return (
    <div>
      <PageHeader
        title="Overview"
        description={data ? `Generated ${formatDateTime(data.generatedAt)}. User and plan counts are current; period figures cover the last ${data.days} days.` : undefined}
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
        <div className={query.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <OverviewBody data={data} />
        </div>
      ) : query.error ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </Card>
      ) : (
        <LoadingState label="Loading overview…" />
      )}
    </div>
  );
}
