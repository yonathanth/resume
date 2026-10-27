"use client";

import { useState } from "react";
import { Check, Minus, Plus, RotateCcw } from "lucide-react";
import {
  resetUserUsage,
  revokeEntitlement,
  updateEntitlement,
  type Entitlement,
  type ExemptionKey,
  type FeatureKey,
  type FlowKey,
  type UserDetail,
} from "@/lib/admin-api";
import { dateInputToIso, errorText, formatDate, formatDateTime, formatRelative } from "@/lib/admin-format";
import { ActionDialog, Badge, Button, Card, DataTable, INPUT, KeyValue, LABEL, Modal, Note, SourceTag, type Column } from "@/components/admin/ui";
import { useCan } from "@/components/admin/AdminShell";
import { useToast } from "@/components/Toaster";
import { GrantModal } from "./GrantModal";
import {
  EXEMPTION_LABELS,
  FEATURE_LABELS,
  FLOW_LABELS,
  FLOWS,
  GrantStateBadge,
  KIND_LABELS,
  ProBadge,
  describeGrant,
  featureLabel,
  grantState,
  useUserAction,
} from "./shared";

function YesNo({ on, onLabel = "On", offLabel = "Off" }: { on: boolean; onLabel?: string; offLabel?: string }) {
  return on ? (
    <Badge tone="good">
      <Check className="w-3 h-3" />
      {onLabel}
    </Badge>
  ) : (
    <Badge>
      <Minus className="w-3 h-3" />
      {offLabel}
    </Badge>
  );
}

function grantDetails(g: Entitlement): string {
  switch (g.kind) {
    case "FEATURE":
      return `Feature: ${g.feature ?? "—"}`;
    case "EXEMPTION":
      return `Exemption: ${g.feature ?? "—"}`;
    case "LIMIT_ADJUSTMENT":
      return `Flow: ${g.flow ?? "—"} · ${(g.amount ?? 0) > 0 ? "+" : ""}${g.amount ?? 0}`;
    default:
      return g.kind === "PLUS_ACCESS" ? "Plus" : g.kind === "LIFETIME_PLUS" ? "Plus, for life" : "Full Pro";
  }
}

// ------------------------------------------------------------------ extend

type ExtendMode = "days" | "date" | "none";

function ExtendModal({ grant, userId, onClose }: { grant: Entitlement; userId: string; onClose: () => void }) {
  const run = useUserAction(userId);
  const toast = useToast();
  const hasEnd = Boolean(grant.expiresAt);
  const expired = grantState(grant) === "expired";
  const [mode, setMode] = useState<ExtendMode>(hasEnd ? "days" : "date");
  const [days, setDays] = useState("30");
  const [date, setDate] = useState("");
  const [note, setNote] = useState(grant.note ?? "");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daysNum = Number(days);
  const daysOk = mode !== "days" || (Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= 3650);
  const dateIso = mode === "date" ? dateInputToIso(date, true) : undefined;
  const dateOk = mode !== "date" || Boolean(dateIso);
  const reasonOk = reason.trim().length >= 3;
  const noteChanged = note.trim() !== (grant.note ?? "");

  const submit = async () => {
    setPending(true);
    setError(null);
    const input: Parameters<typeof updateEntitlement>[1] = {
      reason: reason.trim(),
      ...(mode === "days" ? { extendDays: daysNum } : mode === "date" ? { expiresAt: dateIso } : { expiresAt: null }),
      ...(noteChanged ? { note: note.trim() } : {}),
    };
    try {
      await run(() => updateEntitlement(grant.id, input), {
        success: (g) =>
          toast.success("Grant updated", { description: `${describeGrant(g)} ${g.expiresAt ? `now ends ${formatDateTime(g.expiresAt)}` : "now has no end date"}.` }),
        error: "Couldn't update the grant",
      });
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPending(false);
    }
  };

  const modes: { value: ExtendMode; label: string; disabled?: boolean }[] = [
    { value: "days", label: "Add days", disabled: !hasEnd },
    { value: "date", label: "New end date" },
    { value: "none", label: "Remove end date", disabled: !hasEnd },
  ];

  return (
    <Modal open title={`Extend: ${describeGrant(grant)}`} onClose={pending ? () => {} : onClose}>
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">
          Currently {grant.expiresAt ? (expired ? `ended ${formatDateTime(grant.expiresAt)}` : `ends ${formatDateTime(grant.expiresAt)}`) : "has no end date"}.
          {expired && " Adding days to an expired grant restarts it from now."}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {modes.map((m) => (
            <Button
              key={m.value}
              size="sm"
              variant={mode === m.value ? "primary" : "secondary"}
              disabled={m.disabled}
              onClick={() => setMode(m.value)}
              aria-pressed={mode === m.value}
              title={m.disabled ? "This grant has no end date" : undefined}
            >
              {m.label}
            </Button>
          ))}
        </div>
        {mode === "days" && (
          <div className="max-w-xs">
            <label className={LABEL} htmlFor="extend-days">
              Days to add
            </label>
            <input id="extend-days" type="number" min={1} max={3650} step={1} value={days} onChange={(e) => setDays(e.target.value)} className={INPUT} />
            {!daysOk && <p className="mt-1 text-xs text-rose-600">A whole number from 1 to 3650.</p>}
          </div>
        )}
        {mode === "date" && (
          <div className="max-w-xs">
            <label className={LABEL} htmlFor="extend-date">
              Ends at the end of
            </label>
            <input id="extend-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
            <p className="mt-1 text-xs text-neutral-500">Must be in the future. To end a grant now, revoke it instead.</p>
          </div>
        )}
        {mode === "none" && <Note tone="warn">The grant will stay active until someone revokes it.</Note>}
        <div>
          <label className={LABEL} htmlFor="extend-note">
            Internal note (optional)
          </label>
          <textarea id="extend-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} className={INPUT} />
        </div>
        <div>
          <label className={LABEL} htmlFor="extend-reason">
            Reason (required, kept in the audit log)
          </label>
          <textarea id="extend-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} className={INPUT} placeholder="Why are you changing this?" />
        </div>
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" loading={pending} disabled={!daysOk || !dateOk || !reasonOk} onClick={submit}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ tab

export function AccessTab({ detail }: { detail: UserDetail }) {
  const { access, account } = detail;
  const userId = account.id;
  const canGrant = useCan("entitlements:write");
  const run = useUserAction(userId);
  const [grantOpen, setGrantOpen] = useState(false);
  const [extending, setExtending] = useState<Entitlement | null>(null);
  const [revoking, setRevoking] = useState<Entitlement | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetFlows, setResetFlows] = useState<FlowKey[]>([]);

  // A grant that gives a plan (Pro, Plus or Plus Lifetime).
  const PLAN_GRANTS = ["PRO_ACCESS", "PLUS_ACCESS", "LIFETIME_PLUS"];
  const activeProGrant = detail.entitlements.some((g) => PLAN_GRANTS.includes(g.kind) && access.activeGrantIds.includes(g.id));
  const tier = access.tier ?? (access.isPro ? "pro" : "free");
  const period = access.plan?.period ?? null;
  // What this plan's limit is before any grant, to show next to the effective limit.
  const planDefault = (f: FlowKey): number | null => {
    const d = access.planDefaults;
    if (!d?.free) return null;
    if (tier === "free") return d.free.generations;
    if (tier === "plus") return d.plus[period ?? "monthly"][f];
    return d.proFairUse[period && period !== "lifetime" ? period : "monthly"][f];
  };
  const anyUsed = FLOWS.some((f) => access.limits[f].used > 0);

  const openReset = () => {
    setResetFlows(FLOWS.filter((f) => access.limits[f].used > 0));
    setResetOpen(true);
  };

  const columns: Column<Entitlement>[] = [
    {
      key: "grant",
      header: "Grant",
      cell: (g) => (
        <div className="min-w-[150px]">
          <div className="font-semibold text-neutral-950">{describeGrant(g)}</div>
          <div className="text-[11px] text-neutral-500">{KIND_LABELS[g.kind]}</div>
        </div>
      ),
    },
    {
      key: "details",
      header: "Details",
      cell: (g) => (
        <div className="min-w-[140px] text-xs text-neutral-600">
          <div className="font-mono">{grantDetails(g)}</div>
          {g.revokedAt && (
            <div className="mt-0.5 text-rose-700">
              Revoked {formatDate(g.revokedAt)}
              {g.revokeReason ? `: ${g.revokeReason}` : ""}
            </div>
          )}
        </div>
      ),
    },
    { key: "reason", header: "Reason", cell: (g) => <span className="block min-w-[160px] text-xs">{g.reason}</span> },
    {
      key: "note",
      header: "Note",
      cell: (g) => (g.note ? <span className="block min-w-[120px] text-xs text-neutral-600">{g.note}</span> : <span className="text-neutral-400">—</span>),
    },
    {
      key: "by",
      header: "Created by",
      cell: (g) => (
        <div className="text-xs whitespace-nowrap">
          <div>{g.createdByEmail ?? <span className="text-neutral-400">unknown</span>}</div>
          <div className="text-neutral-500" title={formatDateTime(g.createdAt)}>
            {formatRelative(g.createdAt)}
          </div>
        </div>
      ),
    },
    { key: "starts", header: "Starts", className: "whitespace-nowrap text-xs", cell: (g) => <span title={formatDateTime(g.startsAt)}>{formatDate(g.startsAt)}</span> },
    {
      key: "expires",
      header: "Expires",
      className: "whitespace-nowrap text-xs",
      cell: (g) =>
        g.expiresAt ? (
          <span title={formatDateTime(g.expiresAt)}>
            {formatRelative(g.expiresAt)}
            <span className="block text-neutral-500">{formatDate(g.expiresAt)}</span>
          </span>
        ) : (
          <span className="text-neutral-500">No end date</span>
        ),
    },
    { key: "state", header: "State", cell: (g) => <GrantStateBadge state={grantState(g)} /> },
    ...(canGrant
      ? [
          {
            key: "actions",
            header: "",
            className: "text-right",
            cell: (g: Entitlement) =>
              g.revokedAt ? null : (
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" onClick={() => setExtending(g)}>
                    Extend
                  </Button>
                  <Button size="sm" variant="danger-outline" onClick={() => setRevoking(g)}>
                    Revoke
                  </Button>
                </div>
              ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      <Card
        title="Effective access right now"
        description="Computed the same way every backend gate computes it: billing, active grants and the platform feature rules."
        actions={<SourceTag source="database" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KeyValue
            items={[
              [
                "Plan",
                <span key="plan" className="flex flex-wrap items-center gap-1.5">
                  <ProBadge isPro={access.isPro} tier={access.tier} proSource={access.proSource} lifetime={access.plan?.source === "lifetime"} />
                  {period && <span className="text-xs text-neutral-500">{period === "quarterly" ? "3 months" : period}</span>}
                  {access.plan?.legacy && <span className="text-xs text-neutral-500">(old single-plan price)</span>}
                  {access.billingPro && activeProGrant && <span className="text-xs text-neutral-500">(also has an active plan grant)</span>}
                </span>,
              ],
              ["Paid subscription", <YesNo key="b" on={access.billingPro} onLabel="Active" offLabel="None" />],
              [
                "Plan grant ends",
                activeProGrant ? (
                  access.proGrantExpiresAt ? (
                    <span>
                      {formatDateTime(access.proGrantExpiresAt)} <span className="text-neutral-500">({formatRelative(access.proGrantExpiresAt)})</span>
                    </span>
                  ) : (
                    "No end date"
                  )
                ) : (
                  <span className="text-neutral-400">No active plan grant</span>
                ),
              ],
              ["Beta program", <YesNo key="beta" on={access.beta} onLabel="Member" offLabel="No" />],
              [
                "Features",
                <span key="f" className="flex flex-wrap gap-1">
                  {(Object.keys(access.features) as FeatureKey[]).map((f) => (
                    <Badge key={f} tone={access.features[f] ? "good" : "neutral"} title={access.features[f] ? "Available to this user" : "Not available"}>
                      {access.features[f] ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {FEATURE_LABELS[f] ?? f}
                    </Badge>
                  ))}
                </span>,
              ],
              [
                "Exemptions",
                <span key="x" className="flex flex-wrap gap-1">
                  {(Object.keys(access.exemptions) as ExemptionKey[]).map((x) => (
                    <Badge key={x} tone={access.exemptions[x] ? "good" : "neutral"}>
                      {access.exemptions[x] ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {EXEMPTION_LABELS[x] ?? featureLabel(x)}
                    </Badge>
                  ))}
                </span>,
              ],
            ]}
          />

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-semibold text-neutral-700">
                {tier === "free" ? "Free CVs (shared by every flow)" : `Usage this period${access.plan?.periodEndsAt ? `, resets ${formatDateTime(access.plan.periodEndsAt)}` : ""}`}
              </h3>
              {canGrant && (
                <Button size="sm" onClick={openReset} disabled={!anyUsed} title={anyUsed ? undefined : "Nothing has been used yet"}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset usage counters
                </Button>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-xs text-neutral-500">
                    <th className="px-3 py-2 text-left font-semibold">Flow</th>
                    <th className="px-3 py-2 text-right font-semibold">Used</th>
                    <th className="px-3 py-2 text-right font-semibold">Limit</th>
                    <th className="px-3 py-2 text-right font-semibold">Plan default</th>
                    <th className="px-3 py-2 text-right font-semibold">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {FLOWS.map((f) => {
                    const l = access.limits[f];
                    const def = planDefault(f);
                    const adjusted = l.limit !== null && def !== null && l.limit !== def;
                    return (
                      <tr key={f} className="border-b border-neutral-100 last:border-0">
                        <td className="px-3 py-2 font-medium">{FLOW_LABELS[f]}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.used}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {l.limit === null ? (
                            <Badge tone="good" title="Unlimited-generations exemption">
                              Unmetered
                            </Badge>
                          ) : (
                            <span
                              className={adjusted ? "font-semibold text-accent-strong" : ""}
                              title={l.hidden ? "Pro's fair-use cap: enforced, never shown to the user" : adjusted ? "Adjusted by an active grant" : undefined}
                            >
                              {l.limit}
                              {l.hidden && <span className="ml-1 text-[10px] font-semibold text-neutral-400">fair use</span>}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-neutral-500">{def ?? "-"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.remaining === null ? "-" : l.remaining}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              {tier === "free"
                ? "Free users share one pool of free CVs across every flow: plan default + active free-CV grants (never below 0). After that they pay per CV at download."
                : tier === "plus"
                  ? "Plus limits per billing period (Lifetime: per month), from the Plans settings. Past them the user can pay per CV or upgrade."
                  : "Pro is shown to the user as unlimited; these fair-use caps are enforced but never shown."}{" "}
              The “Unlimited generations” exemption makes every flow unmetered.
            </p>
          </div>
        </div>
      </Card>

      <Card
        title="Manual grants"
        description="GoMoxie-side access given by an admin. Grants are never payments and never touch the subscription — billing lives in the Billing tab."
        padded={false}
        actions={
          canGrant && (
            <Button size="sm" variant="primary" onClick={() => setGrantOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              Grant access
            </Button>
          )
        }
      >
        <DataTable
          columns={columns}
          rows={detail.entitlements}
          rowKey={(g) => g.id}
          emptyTitle="No grants"
          emptyDescription="This user's access comes only from billing and the plan defaults."
        />
      </Card>

      {grantOpen && <GrantModal userId={userId} userEmail={account.email} onClose={() => setGrantOpen(false)} />}
      {extending && <ExtendModal grant={extending} userId={userId} onClose={() => setExtending(null)} />}

      <ActionDialog
        open={revoking !== null}
        title="Revoke grant"
        danger
        description={
          revoking && (
            <>
              Ends <strong>{describeGrant(revoking)}</strong> for {account.email} now. Their access falls back to what billing and any other active grants allow.
              A revoked grant can&apos;t be changed again — create a new one instead.
            </>
          )
        }
        confirmLabel="Revoke grant"
        requireReason
        onClose={() => setRevoking(null)}
        onConfirm={(reason) =>
          revoking
            ? run(() => revokeEntitlement(revoking.id, reason), { success: `Revoked: ${describeGrant(revoking)}`, error: "Couldn't revoke the grant" })
            : Promise.resolve()
        }
      />

      <ActionDialog
        open={resetOpen}
        title="Reset usage counters"
        description={
          <>
            Sets the free-use counters for the selected flows back to 0, so {account.email} gets the full free allowance again. CVs they already made are not
            touched.
          </>
        }
        confirmLabel="Reset counters"
        requireReason
        onClose={() => setResetOpen(false)}
        onConfirm={(reason) => {
          if (resetFlows.length === 0) return Promise.reject(new Error("Pick at least one flow to reset."));
          return run(() => resetUserUsage(userId, resetFlows, reason), {
            success: `Reset ${resetFlows.map((f) => FLOW_LABELS[f].toLowerCase()).join(", ")} counters`,
            error: "Couldn't reset the usage counters",
          });
        }}
      >
        <div>
          <span className={LABEL}>Flows</span>
          <div className="flex flex-wrap gap-3">
            {FLOWS.map((f) => (
              <label key={f} className="inline-flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-neutral-900"
                  checked={resetFlows.includes(f)}
                  onChange={(e) => setResetFlows((cur) => (e.target.checked ? [...cur, f] : cur.filter((x) => x !== f)))}
                />
                {FLOW_LABELS[f]} <span className="text-xs text-neutral-500">({access.limits[f].used} used)</span>
              </label>
            ))}
          </div>
        </div>
      </ActionDialog>
    </div>
  );
}
