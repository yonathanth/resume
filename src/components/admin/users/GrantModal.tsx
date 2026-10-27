"use client";

import { useState } from "react";
import { grantEntitlement, type ExemptionKey, type FlowKey, type GrantableFeature, type GrantInput } from "@/lib/admin-api";
import { dateInputToIso, errorText, formatDateTime } from "@/lib/admin-format";
import { Button, INPUT, LABEL, Modal, Note } from "@/components/admin/ui";
import { useToast } from "@/components/Toaster";
import { EXEMPTION_LABELS, FEATURE_LABELS, FLOW_LABELS, FLOWS, describeGrant, useUserAction } from "./shared";

type Kind = GrantInput["kind"];
type Duration = "7" | "30" | "90" | "custom" | "none";

const KIND_OPTIONS: { value: Kind; label: string; hint: string }[] = [
  { value: "PRO_ACCESS", label: "Pro access", hint: "Everything a paying Pro user gets, without a payment." },
  { value: "PLUS_ACCESS", label: "Plus access", hint: "Plus with its monthly limits, without a payment." },
  { value: "LIFETIME_PLUS", label: "Plus Lifetime", hint: "Plus for life, limits reset monthly. Counts toward the deal's seats." },
  { value: "FEATURE", label: "Single feature", hint: "Opens one paid or beta feature without a plan." },
  { value: "LIMIT_ADJUSTMENT", label: "Adjust free CVs", hint: "Adds to (or takes from) the free CVs a Free user gets." },
  { value: "EXEMPTION", label: "Exemption", hint: "Lifts a specific limit for this user." },
];

const DURATIONS: { value: Duration; label: string }[] = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "custom", label: "Custom end date" },
  { value: "none", label: "No end date" },
];

/** yyyy-mm-dd for tomorrow, the earliest valid custom end date. */
function tomorrowInput(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Mount only while open, so every opening starts from a clean form. */
export function GrantModal({ userId, userEmail, onClose }: { userId: string; userEmail: string; onClose: () => void }) {
  const run = useUserAction(userId);
  const toast = useToast();
  const [kind, setKind] = useState<Kind>("PRO_ACCESS");
  const [feature, setFeature] = useState<GrantableFeature>("careerProfiles");
  const [exemption, setExemption] = useState<ExemptionKey>("aiRateLimit");
  const [flow, setFlow] = useState<FlowKey>("create");
  const [amount, setAmount] = useState("5");
  const [duration, setDuration] = useState<Duration>("30");
  const [customDate, setCustomDate] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Number(amount);
  const amountOk = kind !== "LIMIT_ADJUSTMENT" || (amount.trim() !== "" && Number.isInteger(amountNum) && amountNum !== 0 && Math.abs(amountNum) <= 1000);
  const customIso = duration === "custom" ? dateInputToIso(customDate, true) : undefined;
  const durationOk = duration !== "custom" || Boolean(customIso);
  const reasonOk = reason.trim().length >= 3;
  const canSubmit = amountOk && durationOk && reasonOk && !pending;

  const build = (): GrantInput => {
    const common = {
      reason: reason.trim(),
      ...(note.trim() && { note: note.trim() }),
      ...(duration === "7" || duration === "30" || duration === "90" ? { durationDays: Number(duration) } : {}),
      ...(duration === "custom" && customIso ? { expiresAt: customIso } : {}),
    };
    switch (kind) {
      case "FEATURE":
        return { ...common, kind, feature };
      case "LIMIT_ADJUSTMENT":
        return { ...common, kind, flow, amount: amountNum };
      case "EXEMPTION":
        return { ...common, kind, feature: exemption };
      case "PLUS_ACCESS":
      case "LIFETIME_PLUS":
        return { ...common, kind };
      default:
        return { ...common, kind: "PRO_ACCESS" };
    }
  };

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await run(() => grantEntitlement(userId, build()), {
        success: (g) =>
          toast.success("Access granted", {
            description: `${describeGrant(g)}${g.expiresAt ? ` until ${formatDateTime(g.expiresAt)}` : ", no end date"}.`,
          }),
        error: "Couldn't create the grant",
      });
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPending(false);
    }
  };

  const summary = (() => {
    const label =
      kind === "LIMIT_ADJUSTMENT"
        ? describeGrant({ kind, feature: null, flow, amount: amountOk ? amountNum : 0 })
        : describeGrant({ kind, feature: kind === "FEATURE" ? feature : kind === "EXEMPTION" ? exemption : null, flow: null, amount: null });
    const until =
      duration === "none"
        ? "with no end date"
        : duration === "custom"
          ? customIso
            ? `until ${formatDateTime(customIso)}`
            : "until the chosen date"
          : `for ${duration} days`;
    return `${label} for ${userEmail}, ${until}.`;
  })();

  return (
    <Modal open title="Grant access" onClose={pending ? () => {} : onClose} wide>
      <div className="space-y-4">
        <div>
          <label className={LABEL} htmlFor="grant-kind">
            What to grant
          </label>
          <select id="grant-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={INPUT}>
            {KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-500">{KIND_OPTIONS.find((k) => k.value === kind)?.hint}</p>
        </div>

        {kind === "FEATURE" && (
          <div>
            <label className={LABEL} htmlFor="grant-feature">
              Feature
            </label>
            <select id="grant-feature" value={feature} onChange={(e) => setFeature(e.target.value as GrantableFeature)} className={INPUT}>
              {(Object.keys(FEATURE_LABELS) as GrantableFeature[]).map((f) => (
                <option key={f} value={f}>
                  {FEATURE_LABELS[f]}
                </option>
              ))}
            </select>
            {feature === "beta" && <p className="mt-1 text-xs text-neutral-500">Puts the user in the beta program: opens every feature whose rule is “beta”.</p>}
          </div>
        )}

        {kind === "EXEMPTION" && (
          <div>
            <label className={LABEL} htmlFor="grant-exemption">
              Exemption
            </label>
            <select id="grant-exemption" value={exemption} onChange={(e) => setExemption(e.target.value as ExemptionKey)} className={INPUT}>
              {(Object.keys(EXEMPTION_LABELS) as ExemptionKey[]).map((x) => (
                <option key={x} value={x}>
                  {EXEMPTION_LABELS[x]}
                </option>
              ))}
            </select>
          </div>
        )}

        {kind === "LIMIT_ADJUSTMENT" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="grant-flow">
                Flow
              </label>
              <select id="grant-flow" value={flow} onChange={(e) => setFlow(e.target.value as FlowKey)} className={INPUT}>
                {FLOWS.map((f) => (
                  <option key={f} value={f}>
                    {FLOW_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="grant-amount">
                Amount (negative to reduce)
              </label>
              <input id="grant-amount" type="number" step={1} min={-1000} max={1000} value={amount} onChange={(e) => setAmount(e.target.value)} className={INPUT} />
              {!amountOk && <p className="mt-1 text-xs text-rose-600">A whole number between -1000 and 1000, not 0.</p>}
            </div>
          </div>
        )}

        <div>
          <span className={LABEL}>Duration</span>
          <div className="flex flex-wrap gap-1.5">
            {DURATIONS.map((d) => (
              <Button key={d.value} size="sm" variant={duration === d.value ? "primary" : "secondary"} onClick={() => setDuration(d.value)} aria-pressed={duration === d.value}>
                {d.label}
              </Button>
            ))}
          </div>
          {duration === "custom" && (
            <div className="mt-2 max-w-xs">
              <label className={LABEL} htmlFor="grant-date">
                Ends at the end of
              </label>
              <input id="grant-date" type="date" min={tomorrowInput()} value={customDate} onChange={(e) => setCustomDate(e.target.value)} className={INPUT} />
            </div>
          )}
        </div>

        <div>
          <label className={LABEL} htmlFor="grant-reason">
            Reason (required, kept in the audit log)
          </label>
          <textarea
            id="grant-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            className={INPUT}
            placeholder="e.g. Compensation for the outage on 3 Oct"
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="grant-note">
            Internal note (optional)
          </label>
          <textarea id="grant-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} className={INPUT} placeholder="Only admins see this" />
        </div>

        <Note tone="info">
          This is a manual grant, not a payment. It never creates a Polar or Chapa record. When it ends, access falls back to what the user&apos;s billing allows.
        </Note>
        <p className="text-xs text-neutral-600">{summary}</p>

        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" loading={pending} disabled={!canSubmit} onClick={submit}>
            Grant
          </Button>
        </div>
      </div>
    </Modal>
  );
}
