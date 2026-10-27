"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { RotateCcw, Search } from "lucide-react";
import { listUsers, type UserListItem, type UserListQuery } from "@/lib/admin-api";
import { dateInputToIso, formatDate, formatDateTime, formatNumber, formatRelative } from "@/lib/admin-format";
import { Badge, Button, Card, DataTable, INPUT, LABEL, PageHeader, Pagination, SourceTag, StatusBadge, type Column } from "@/components/admin/ui";
import { PLAN_LABELS, ProBadge } from "@/components/admin/users/shared";

const PAGE_SIZE = 25;

interface Filters {
  status: "" | "ACTIVE" | "SUSPENDED";
  verified: "" | "true" | "false";
  plan: "" | "pro" | "paid" | "grant" | "free";
  role: "" | "USER" | "ADMIN";
  from: string;
  to: string;
  sort: "newest" | "oldest" | "lastActive" | "email";
}

const DEFAULT_FILTERS: Filters = { status: "", verified: "", plan: "", role: "", from: "", to: "", sort: "newest" };

const SELECT = `${INPUT} pr-8`;

export default function AdminUsersPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = useMemo<UserListQuery>(
    () => ({
      q: search || undefined,
      status: filters.status || undefined,
      verified: filters.verified || undefined,
      plan: filters.plan || undefined,
      role: filters.role || undefined,
      from: dateInputToIso(filters.from),
      to: dateInputToIso(filters.to, true),
      sort: filters.sort,
      pageSize: PAGE_SIZE,
    }),
    [search, filters]
  );

  // The page belongs to one set of filters: any filter change starts again at page 1.
  const filterKey = JSON.stringify(query);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ key: filterKey, page: p });

  const users = useQuery({
    queryKey: ["admin", "users", { ...query, page }],
    queryFn: () => listUsers({ ...query, page }),
    placeholderData: keepPreviousData,
  });

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const hasFilters = searchInput !== "" || JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  const reset = () => {
    setSearchInput("");
    setSearch("");
    setFilters(DEFAULT_FILTERS);
  };
  const dateRangeInvalid = filters.from !== "" && filters.to !== "" && filters.from > filters.to;

  const columns: Column<UserListItem>[] = [
    {
      key: "user",
      header: "User",
      cell: (u) => (
        <div className="min-w-[200px]">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/admin/users/${u.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-neutral-950 hover:underline truncate max-w-[260px]"
            >
              {u.fullName || u.email}
            </Link>
            {u.role === "ADMIN" && <Badge tone="dark">Admin</Badge>}
          </div>
          {u.fullName && <div className="text-xs text-neutral-500 truncate max-w-[300px]">{u.email}</div>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={u.status} />
          {!u.emailVerified && <Badge tone="warn">Unverified</Badge>}
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      cell: (u) => (
        <div>
          <ProBadge isPro={u.isPro} tier={u.tier} proSource={u.proSource} />
          {(u.subscriptionProvider || u.subscriptionStatus) && (
            <div className="mt-0.5 text-[11px] text-neutral-500 whitespace-nowrap">
              {[u.subscriptionProvider, u.subscriptionStatus?.replace(/_/g, " ")].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "methods",
      header: "Sign-in",
      cell: (u) =>
        u.signInMethods.length ? (
          <div className="flex flex-wrap gap-1">
            {u.signInMethods.map((m) => (
              <Badge key={m} tone={m === "google" ? "info" : "neutral"}>
                {m === "google" ? "Google" : "Password"}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-neutral-400">—</span>
        ),
    },
    { key: "cvs", header: "CVs", className: "text-right tabular-nums", cell: (u) => formatNumber(u.cvCount) },
    { key: "profiles", header: "Profiles", className: "text-right tabular-nums", cell: (u) => formatNumber(u.profileCount) },
    {
      key: "created",
      header: "Registered",
      className: "whitespace-nowrap",
      cell: (u) => <span title={formatDateTime(u.createdAt)}>{formatDate(u.createdAt)}</span>,
    },
    {
      key: "active",
      header: "Last active",
      className: "whitespace-nowrap",
      cell: (u) =>
        u.lastActiveAt ? (
          <span title={formatDateTime(u.lastActiveAt)}>{formatRelative(u.lastActiveAt)}</span>
        ) : (
          <span className="text-neutral-400" title="Activity isn't tracked for this account yet">
            —
          </span>
        ),
    },
  ];

  const data = users.data;

  return (
    <div>
      <PageHeader
        title="Users"
        description={
          data
            ? `${data.total.toLocaleString()} ${data.total === 1 ? "account matches" : "accounts match"} ${hasFilters ? "these filters" : "— everyone registered"}.`
            : "Every registered account."
        }
        actions={<SourceTag source="database" />}
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="user-search">
              Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="user-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Name, email or user ID"
                className={`${INPUT} pl-9`}
                autoComplete="off"
              />
            </div>
          </div>
          <div>
            <label className={LABEL} htmlFor="user-status">
              Status
            </label>
            <select id="user-status" value={filters.status} onChange={(e) => update("status", e.target.value as Filters["status"])} className={SELECT}>
              <option value="">Any status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="user-verified">
              Email
            </label>
            <select id="user-verified" value={filters.verified} onChange={(e) => update("verified", e.target.value as Filters["verified"])} className={SELECT}>
              <option value="">Verified or not</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="user-plan">
              Plan
            </label>
            <select id="user-plan" value={filters.plan} onChange={(e) => update("plan", e.target.value as Filters["plan"])} className={SELECT}>
              <option value="">Any plan</option>
              {(Object.keys(PLAN_LABELS) as (keyof typeof PLAN_LABELS)[]).map((p) => (
                <option key={p} value={p}>
                  {PLAN_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="user-role">
              Role
            </label>
            <select id="user-role" value={filters.role} onChange={(e) => update("role", e.target.value as Filters["role"])} className={SELECT}>
              <option value="">Any role</option>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="user-from">
              Registered from
            </label>
            <input id="user-from" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => update("from", e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL} htmlFor="user-to">
              Registered to
            </label>
            <input id="user-to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => update("to", e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL} htmlFor="user-sort">
              Sort
            </label>
            <select id="user-sort" value={filters.sort} onChange={(e) => update("sort", e.target.value as Filters["sort"])} className={SELECT}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="lastActive">Recently active</option>
              <option value="email">Email (A–Z)</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={reset} disabled={!hasFilters} className="w-full sm:w-auto">
              <RotateCcw className="w-3.5 h-3.5" />
              Reset filters
            </Button>
          </div>
        </div>
        {dateRangeInvalid && <p className="mt-3 text-xs font-medium text-rose-600">The “from” date is after the “to” date, so nothing can match.</p>}
      </Card>

      <Card padded={false}>
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(u) => u.id}
          isLoading={users.isFetching}
          error={users.error}
          onRetry={() => users.refetch()}
          onRowClick={(u) => router.push(`/admin/users/${u.id}`)}
          emptyTitle={hasFilters ? "No users match these filters" : "No users yet"}
          emptyDescription={hasFilters ? "Try a broader search or reset the filters." : undefined}
        />
        {data && data.total > 0 && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onChange={setPage} />}
      </Card>
    </div>
  );
}
