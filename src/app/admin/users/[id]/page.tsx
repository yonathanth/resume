"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getUser } from "@/lib/admin-api";
import { formatDateTime, formatRelative } from "@/lib/admin-format";
import { Badge, Card, EmptyState, ErrorState, LoadingState, Mono, Tabs } from "@/components/admin/ui";
import { UserActions } from "@/components/admin/users/UserActions";
import { OverviewTab } from "@/components/admin/users/OverviewTab";
import { AccessTab } from "@/components/admin/users/AccessTab";
import { BillingTab } from "@/components/admin/users/BillingTab";
import { ActivityTab } from "@/components/admin/users/ActivityTab";
import { ProBadge, displayName } from "@/components/admin/users/shared";

type TabId = "overview" | "access" | "billing" | "activity";

function BackLink() {
  return (
    <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-neutral-950 mb-4">
      <ArrowLeft className="w-4 h-4" />
      All users
    </Link>
  );
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<TabId>("overview");

  const user = useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => getUser(id),
    retry: (count, err) => !(err instanceof ApiError && (err.status === 404 || err.status === 400)) && count < 1,
  });

  if (user.isLoading) {
    return (
      <div>
        <BackLink />
        <LoadingState label="Loading user…" />
      </div>
    );
  }

  if (user.error || !user.data) {
    const notFound = user.error instanceof ApiError && (user.error.status === 404 || user.error.status === 400);
    return (
      <div>
        <BackLink />
        <Card>
          {notFound ? (
            <EmptyState title="User not found" description="This account doesn't exist — it may have been deleted, or the link is wrong." />
          ) : (
            <ErrorState error={user.error} onRetry={() => user.refetch()} />
          )}
        </Card>
      </div>
    );
  }

  const detail = user.data;
  const { account, access } = detail;
  const name = displayName(account);
  const activeGrants = detail.entitlements.filter((g) => access.activeGrantIds.includes(g.id)).length;

  return (
    <div>
      <BackLink />

      <div className="mb-6 space-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 break-all">{name}</h1>
            {account.role === "ADMIN" && <Badge tone="dark">Admin</Badge>}
            {account.status === "SUSPENDED" && <Badge tone="bad">Suspended</Badge>}
            {!account.emailVerifiedAt && <Badge tone="warn">Unverified</Badge>}
            {(access.tier ?? (access.isPro ? "pro" : "free")) !== "free" && (
              <ProBadge isPro={access.isPro} tier={access.tier} proSource={access.proSource} lifetime={access.plan?.source === "lifetime"} />
            )}
          </div>
          {name !== account.email && <p className="mt-0.5 text-sm text-neutral-600 break-all">{account.email}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
            <span>
              ID <Mono>{account.id}</Mono>
            </span>
            <span title={formatDateTime(account.createdAt)}>Registered {formatRelative(account.createdAt)}</span>
            <span>{account.lastActiveAt ? `Active ${formatRelative(account.lastActiveAt)}` : "Activity not tracked yet"}</span>
          </div>
        </div>

        <UserActions detail={detail} />

        {account.status === "SUSPENDED" && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <div className="font-semibold">Suspended {account.suspendedAt ? `on ${formatDateTime(account.suspendedAt)}` : ""}</div>
            <div className="mt-0.5">{account.suspensionReason ? `Reason: ${account.suspensionReason}` : "No reason was recorded."}</div>
            <div className="mt-1 text-xs text-rose-700">The user can&apos;t sign in until reactivated. Their data and billing are untouched.</div>
          </div>
        )}
      </div>

      <Tabs<TabId>
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "access", label: "Access & entitlements", count: activeGrants || undefined },
          { id: "billing", label: "Billing", count: detail.payments.length || undefined },
          { id: "activity", label: "Activity" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && <OverviewTab detail={detail} />}
      {tab === "access" && <AccessTab detail={detail} />}
      {tab === "billing" && <BillingTab detail={detail} />}
      {tab === "activity" && <ActivityTab detail={detail} />}
    </div>
  );
}
