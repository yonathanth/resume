"use client";

import Link from "next/link";
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

// Onboarding answers as the user saw them.
const ONBOARDING_LABELS: Record<string, string> = {
  create: "Start from scratch",
  tailor: "Tailor to a job",
  improve: "Improve a CV",
  student: "Student or graduate",
  entry: "Early career",
  mid: "Mid-level",
  senior: "Senior or lead",
  career_change: "Changing careers",
  search: "Search",
  social: "Social media",
  telegram: "Telegram",
  friend: "Friend or colleague",
  school: "School or university",
  ad: "An ad",
  other: "Somewhere else",
};

export function OverviewTab({ detail }: { detail: UserDetail }) {
  const { account, content } = detail;
  const signIn = [account.hasPassword && "Password", account.hasGoogle && "Google"].filter(Boolean) as string[];
  const sources = Object.entries(content.cvBySource).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      <Card
        title="Account"
        actions={
          <span className="flex items-center gap-3">
            <Link href={`/admin/feedback?user=${account.id}`} className="text-xs font-semibold text-neutral-600 hover:text-neutral-950">
              Their feedback →
            </Link>
            <SourceTag source="database" />
          </span>
        }
      >
        <KeyValue
          items={[
            ["Email", account.email],
            ["Full name", account.fullName || <span className="text-neutral-400">—</span>],
            ["First / last name", [account.firstName, account.lastName].filter(Boolean).join(" ") || <span className="text-neutral-400">—</span>],
            ["Phone", account.phone || <span className="text-neutral-400">—</span>],
            [
              "Professions",
              account.professions?.length ? (
                <span>
                  {account.professions[0]}
                  {account.professions.length > 1 && <span className="text-neutral-500"> · also {account.professions.slice(1).join(", ")}</span>}
                </span>
              ) : (
                account.occupationTitle || <span className="text-neutral-400">—</span>
              ),
            ],
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
            ["Came to", account.signupIntent ? ONBOARDING_LABELS[account.signupIntent] ?? account.signupIntent : <span className="text-neutral-400">—</span>],
            ["Career stage", account.careerStage ? ONBOARDING_LABELS[account.careerStage] ?? account.careerStage : <span className="text-neutral-400">—</span>],
            [
              "Heard about us",
              account.acquisitionSource ? (
                <span>
                  {ONBOARDING_LABELS[account.acquisitionSource] ?? account.acquisitionSource}
                  {account.acquisitionDetail && <span className="text-neutral-500"> · {account.acquisitionDetail}</span>}
                </span>
              ) : (
                <span className="text-neutral-400">—</span>
              ),
            ],
            [
              "Signed up",
              <span key="surface">
                {account.signupSurface === "try" ? "Mid-flow on a /try page" : account.signupSurface === "dashboard" ? "Sign-up page, then onboarding" : "—"}
                {account.signupAttribution && Object.keys(account.signupAttribution).length > 0 && (
                  <span className="block text-xs text-neutral-500 break-words">
                    {Object.entries(account.signupAttribution)
                      .filter(([key]) => key !== "firstSeenAt")
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(" · ")}
                  </span>
                )}
              </span>,
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
          <StatCard label="CV imports" value={formatNumber(content.importCount)} source="database" hint="Uploaded CVs parsed into GoMoxie" />
        </div>
      </div>

      <Card title="Recent emails" description="The last 15 emails GoMoxie tried to send to this user." padded={false} actions={<SourceTag source="database" />}>
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
