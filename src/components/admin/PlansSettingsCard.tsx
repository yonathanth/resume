"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Save } from "lucide-react";
import { updateSetting, type FlowKey, type PlansSettings, type SettingsResponse } from "@/lib/admin-api";
import { ActionDialog, Badge, Button, Card, INPUT, LABEL, Note, SourceTag } from "@/components/admin/ui";
import { useCan } from "@/components/admin/AdminShell";
import { useToast } from "@/components/Toaster";
import { formatDateTime } from "@/lib/admin-format";

// The plans' numbers (the "plans" setting): free CVs, the pay-per-CV cap,
// Plus limits per billing period, Pro's hidden fair-use caps and the Plus
// Lifetime offer. Prices aren't here — they live on the products in Polar.

const FLOWS: { key: FlowKey; label: string }[] = [
  { key: "tailor", label: "Tailorings" },
  { key: "improve", label: "Enhancements" },
  { key: "create", label: "New CVs" },
];
const PLUS_PERIODS = ["weekly", "monthly", "quarterly", "lifetime"] as const;
const PRO_PERIODS = ["weekly", "monthly", "quarterly"] as const;
const PERIOD_LABEL: Record<(typeof PLUS_PERIODS)[number], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "3 months",
  lifetime: "Lifetime (per month)",
};

const isWhole = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;

function validate(p: PlansSettings): string | null {
  if (!isWhole(p.free.generations, 0, 1000)) return "Free CVs must be a whole number from 0 to 1,000.";
  if (!isWhole(p.free.unpaidCvCap, 0, 100)) return "Unpaid CVs at a time must be a whole number from 0 to 100.";
  for (const period of PLUS_PERIODS)
    for (const { key } of FLOWS) if (!isWhole(p.plus[period][key], 0, 100000)) return `Plus ${PERIOD_LABEL[period]} limits must be whole numbers.`;
  for (const period of PRO_PERIODS)
    for (const { key } of FLOWS) if (!isWhole(p.proFairUse[period][key], 0, 100000)) return `Pro ${PERIOD_LABEL[period]} caps must be whole numbers.`;
  if (p.lifetimeOffer.seatLimit !== null && !isWhole(p.lifetimeOffer.seatLimit, 0, 1000000)) return "Seats must be a whole number.";
  return null;
}

function NumberCell({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled: boolean }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      step={1}
      value={Number.isNaN(value) ? "" : value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
      className={`${INPUT} text-right tabular-nums`}
    />
  );
}

function LimitsTable<P extends string>({
  periods,
  labels,
  values,
  onChange,
  disabled,
}: {
  periods: readonly P[];
  labels: Record<P, string>;
  values: Record<P, Record<FlowKey, number>>;
  onChange: (period: P, flow: FlowKey, n: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-neutral-500">
            <th className="py-1.5 pr-3 font-semibold">Period</th>
            {FLOWS.map((f) => (
              <th key={f.key} className="py-1.5 px-1 font-semibold text-right">
                {f.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period} className="border-t border-neutral-100">
              <td className="py-1.5 pr-3 font-medium text-neutral-800 whitespace-nowrap">{labels[period]}</td>
              {FLOWS.map((f) => (
                <td key={f.key} className="py-1.5 px-1 w-28">
                  <NumberCell value={values[period][f.key]} onChange={(n) => onChange(period, f.key, n)} disabled={disabled} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "2026-12-31T21:00" from an ISO date, for a datetime-local input. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PlansSettingsCard({ settings }: { settings: SettingsResponse }) {
  const canWrite = useCan("settings:write");
  const toast = useToast();
  const queryClient = useQueryClient();
  const current = settings.values.plans;
  const [draft, setDraft] = useState<PlansSettings | null>(null);
  const [confirming, setConfirming] = useState(false);
  const form = draft ?? current;
  const error = validate(form);
  const changed = JSON.stringify(form) !== JSON.stringify(current);
  const disabled = !canWrite;

  const update = (fn: (p: PlansSettings) => void) => {
    const next = structuredClone(form);
    fn(next);
    setDraft(next);
  };

  const save = async (reason: string) => {
    const result = await updateSetting("plans", form, reason || undefined);
    queryClient.setQueryData<SettingsResponse>(["admin", "settings"], (old) => (old ? { ...old, values: { ...old.values, plans: result.value } } : old));
    setDraft(null);
    toast.success("Plans saved");
    await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
  };

  const offer = form.lifetimeOffer;
  const meta = settings.meta.plans;

  return (
    <Card
      title="Plans"
      description={meta ? `Last changed ${formatDateTime(meta.updatedAt)}${meta.updatedBy ? ` by ${meta.updatedBy}` : ""}` : "Never changed — using the built-in defaults."}
      actions={
        canWrite ? (
          <>
            {draft && (
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                <RotateCcw className="w-3.5 h-3.5" />
                Discard
              </Button>
            )}
            <Button size="sm" variant="primary" disabled={Boolean(error) || !changed} onClick={() => setConfirming(true)}>
              <Save className="w-3.5 h-3.5" />
              Save changes
            </Button>
          </>
        ) : (
          <Badge>Read only</Badge>
        )
      }
    >
      <div className="space-y-7">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1">Free</h3>
          <p className="text-xs text-neutral-500 mb-3">
            Free AI CVs of any kind (new, tailored or improved). After that, CVs can still be made but are paid for at download — up to this many
            unpaid ones at a time. Per-user limit grants add free CVs.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <label className="block">
              <span className={LABEL}>Free CVs</span>
              <NumberCell value={form.free.generations} disabled={disabled} onChange={(n) => update((p) => void (p.free.generations = n))} />
            </label>
            <label className="block">
              <span className={LABEL}>Unpaid CVs at a time</span>
              <NumberCell value={form.free.unpaidCvCap} disabled={disabled} onChange={(n) => update((p) => void (p.free.unpaidCvCap = n))} />
            </label>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1">Plus limits</h3>
          <p className="text-xs text-neutral-500 mb-3">Per billing period. Plus Lifetime resets every month from the purchase date. Shown on the pricing page.</p>
          <LimitsTable
            periods={PLUS_PERIODS}
            labels={PERIOD_LABEL}
            values={form.plus}
            disabled={disabled}
            onChange={(period, flow, n) => update((p) => void (p.plus[period][flow] = n))}
          />
        </section>

        <section>
          <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-1">Pro fair-use caps</h3>
          <p className="text-xs text-neutral-500 mb-3">
            Pro is sold as unlimited. These caps are enforced per billing period but never shown in the app — only the Terms mention fair use.
          </p>
          <LimitsTable
            periods={PRO_PERIODS}
            labels={PERIOD_LABEL}
            values={form.proFairUse}
            disabled={disabled}
            onChange={(period, flow, n) => update((p) => void (p.proFairUse[period][flow] = n))}
          />
        </section>

        <section>
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Plus Lifetime offer</h3>
            <SourceTag source="database" />
          </div>
          <p className="text-xs text-neutral-500 mb-3">
            Both limits apply when set: it stops selling when the seats are gone or the end date passes. Choose which one the pricing cards and
            paywalls show.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-800 sm:col-span-2">
              <input
                type="checkbox"
                checked={offer.enabled}
                disabled={disabled}
                onChange={(e) => update((p) => void (p.lifetimeOffer.enabled = e.target.checked))}
                className="accent-neutral-900"
              />
              On sale
            </label>
            <label className="block">
              <span className={LABEL}>Seats (empty = no seat limit)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={offer.seatLimit ?? ""}
                disabled={disabled}
                onChange={(e) => update((p) => void (p.lifetimeOffer.seatLimit = e.target.value === "" ? null : Number(e.target.value)))}
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className={LABEL}>Ends (empty = no end date)</span>
              <input
                type="datetime-local"
                value={toLocalInput(offer.endsAt)}
                disabled={disabled}
                onChange={(e) => update((p) => void (p.lifetimeOffer.endsAt = e.target.value ? new Date(e.target.value).toISOString() : null))}
                className={INPUT}
              />
            </label>
            <fieldset className="sm:col-span-2">
              <legend className={LABEL}>Show on the cards</legend>
              <div className="flex flex-wrap gap-4 text-sm">
                {(
                  [
                    ["seats", "“Limited seats available”"],
                    ["countdown", "A countdown to the end date"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="lifetime-display"
                      checked={offer.display === value}
                      disabled={disabled}
                      onChange={() => update((p) => void (p.lifetimeOffer.display = value))}
                      className="accent-neutral-900"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          {offer.display === "countdown" && !offer.endsAt && (
            <div className="mt-3">
              <Note tone="warn">A countdown needs an end date — without one, the cards show &ldquo;Limited seats available&rdquo; instead.</Note>
            </div>
          )}
        </section>

        {error && <Note tone="warn">{error}</Note>}
        <Note>
          <b>Prices</b> aren&apos;t set here — they&apos;re on the products in the Polar dashboard, and the app&apos;s copies must match them.
        </Note>
      </div>

      <ActionDialog
        open={confirming}
        title="Save plans"
        confirmLabel="Save plans"
        description="New limits apply from each user's next request (other server instances pick them up within about 30 seconds). Lowering a limit doesn't reset anyone's usage."
        onConfirm={save}
        onClose={() => setConfirming(false)}
      />
    </Card>
  );
}
