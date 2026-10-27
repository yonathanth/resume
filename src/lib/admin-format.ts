// Formatting helpers for the admin dashboard.

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const future = diff < 0;
  const abs = Math.abs(diff);
  const units: [number, string][] = [
    [365 * 86400e3, "y"],
    [30 * 86400e3, "mo"],
    [86400e3, "d"],
    [3600e3, "h"],
    [60e3, "m"],
  ];
  for (const [ms, label] of units) {
    if (abs >= ms) {
      const n = Math.floor(abs / ms);
      return future ? `in ${n}${label}` : `${n}${label} ago`;
    }
  }
  return future ? "in a moment" : "just now";
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

/** Major-unit amounts (e.g. Chapa's 80 ETB). */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency.toUpperCase()}`;
  }
}

/** Minor-unit amounts (Polar reports cents). */
export function formatMinorMoney(amount: number, currency: string): string {
  return formatMoney(amount / 100, currency);
}

export function formatUsd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: amount < 1 ? 4 : 2 }).format(amount);
}

/** ISO string for a <input type="date"> value, at local midnight. */
export function dateInputToIso(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function errorText(err: unknown, fallback = "Something went wrong"): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

// Chapa is no longer offered. Its admin views (payments, revenue, health) are
// hidden but kept, so old Chapa records can be looked at again by flipping this.
export const SHOW_CHAPA = false;
