"use client";

import type { EmailLogRow, UserDetail } from "@/lib/admin-api";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/admin-format";
import { Badge, Card, DataTable, KeyValue, SourceTag, StatCard, StatusBadge, type Column } from "@/components/admin/ui";

function dateWithRelative(iso: string | null, empty = "—") {
  if (!iso) return <span className="text-neutral-400">{empty}</span>;
  return (
    <span>
      {formatDateTime(iso)} <span className="text-neutral-500">({formatRelative(iso)})</span>
    </span>
  );
}

const emailColumns: Column<EmailLogRow>[] = [
  { key: "time", header: "Time", className: "whitespace-nowrap", cell: (e) => <span title={formatDateTime(e.createdAt)}>{formatRelative(e.createdAt)}</span> },
  { key: "kind", header: "Kind", cell: (e) => <Badge>{e.kind.replace(/_/g, " ")}</Badge> },
  { key: "subject", header: "Subject", cell: (e) => <span className="block min-w-[180px]">{e.subject}</span> },
  { key: "status", header: "Status", cell: (e) => <StatusBadge status={e.status} /> },
  {
    key: "error",
    header: "Error",
    cell: (e) => (e.error ? <span className="block min-w-[160px] text-xs text-rose-700 break-words">{e.error}</span> : <span className="text-neutral-400">—</span>),
  },
];

export function OverviewTab({ detail }: { detail: UserDetail }) {
  const { account, content } = detail;
  const signIn = [account.hasPassword && "Password", account.hasGoogle && "Google"].filter(Boolean) as string[];
  const sources = Object.entries(content.cvBySource).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      <Card title="Account" actions={<SourceTag source="database" />}>
        <KeyValue
          items={[
            ["Email", account.email],
            ["Full name", account.fullName || <span className="text-neutral-400">—</span>],
            ["First / last name", [account.firstName, account.lastName].filter(Boolean).join(" ") || <span className="text-neutral-400">—</span>],
            ["Phone", account.phone || <span className="text-neutral-400">—</span>],
            ["Occupation", account.occupationTitle || <span className="text-neutral-400">—</span>],
            ["Role", account.role === "ADMIN" ? <Badge tone="dark">Admin</Badge> : "User"],
            ["Status", <StatusBadge key="s" status={account.status} />],
            ["Registered", dateWithRelative(account.createdAt)],
            ["Last sign-in", dateWithRelative(account.lastLoginAt, "never")],
            ["Last active", dateWithRelative(account.lastActiveAt, "not tracked yet")],
            [
              "Onboarding",
              account.onboardingCompletedAt ? (
                <span>Completed {formatDateTime(account.onboardingCompletedAt)}</span>
              ) : (
                <Badge tone="warn">Not completed</Badge>
              ),
            ],
            [
              "Sign-in methods",
              signIn.length ? (
                <span className="flex flex-wrap gap-1">
                  {signIn.map((m) => (
                    <Badge key={m} tone={m === "Google" ? "info" : "neutral"}>
                      {m}
                    </Badge>
                  ))}
                </span>
              ) : (
                <span className="text-neutral-400">None</span>
              ),
            ],
            ["Email verified", account.emailVerifiedAt ? formatDateTime(account.emailVerifiedAt) : <Badge tone="warn">Unverified</Badge>],
            [
              "Announcement emails",
              account.emailAnnouncementsOptOut ? <Badge tone="warn">Opted out</Badge> : <span>Subscribed (service emails are always sent)</span>,
            ],
            ["Active sessions", formatNumber(account.activeSessions)],
            ["Push devices", formatNumber(account.pushDevices)],
            ["Profile updated", formatDateTime(account.updatedAt)],
          ]}
        />
      </Card>

      <div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="CVs"
            value={formatNumber(content.cvCount)}
            source="database"
            hint={sources.length ? sources.map(([s, n]) => `${s.replace(/[_-]/g, " ")}: ${n}`).join(" · ") : "None yet"}
          />
          <StatCard label="Career profiles" value={formatNumber(content.profileCount)} source="database" />
          <StatCard label="CV imports" value={formatNumber(content.importCount)} source="database" hint="Uploaded CVs parsed into FitCV" />
        </div>
      </div>

      <Card title="Recent emails" description="The last 15 emails FitCV tried to send to this user." padded={false} actions={<SourceTag source="database" />}>
        <DataTable
          columns={emailColumns}
          rows={detail.emails}
          rowKey={(e) => e.id}
          emptyTitle="No emails logged"
          emptyDescription="Nothing has been sent to this user since email logging started."
        />
      </Card>
    </div>
  );
}
