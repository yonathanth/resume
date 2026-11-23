// Tracks the in-flight Chapa Pro-subscription payment across the full-page
// redirect to Chapa's checkout and back, without depending on whatever (if
// anything) Chapa appends to the static CHAPA_RETURN_URL's query string —
// the Chapa return page has no other way to know which payment to
// re-verify.
const LAST_CHAPA_PAYMENT_ID_KEY = "resumate_last_chapa_payment_id";

export function saveLastChapaPaymentId(paymentId: string) {
  try {
    sessionStorage.setItem(LAST_CHAPA_PAYMENT_ID_KEY, paymentId);
  } catch {
    // Best-effort — worst case the return page just shows a generic
    // "confirming" state and relies on the webhook instead.
  }
}

export function readAndClearLastChapaPaymentId(): string | null {
  try {
    const paymentId = sessionStorage.getItem(LAST_CHAPA_PAYMENT_ID_KEY);
    sessionStorage.removeItem(LAST_CHAPA_PAYMENT_ID_KEY);
    return paymentId;
  } catch {
    return null;
  }
}

// What a Dodo checkout was for, so the return page knows what to wait for
// (the plan, the lifetime deal, or one CV's unlock) and where to go after.
export type PendingPurchase = (
  | { kind: "plan"; tier: "plus" | "pro" }
  | { kind: "lifetime" }
  | { kind: "unlock"; cvDocumentId: string }
) & {
  /** The page the checkout was started from (filled in by savePendingPurchase). */
  returnTo?: string;
  /** Started from a locked CV's download dialog: once paid, open that CV and download it. */
  downloadCvId?: string;
};

const PENDING_PURCHASE_KEY = "gomoxie_pending_purchase";

/**
 * The page to go back to: only an in-app path. Once paid, only a dashboard
 * page is worth going back to (not pricing, the landing page, or the upgrade
 * page, which have nothing left to do); a failed payment goes back to try again.
 */
function safeReturnPath(path: string | undefined, confirmed: boolean): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/payment")) return null;
  if (confirmed && (!path.startsWith("/dashboard") || path.startsWith("/dashboard/upgrade"))) return null;
  return path;
}

/**
 * Where the return page sends the browser once the payment is settled.
 * Confirmed: the CV that was being downloaded (downloading it), else the page
 * the checkout started from. Still unconfirmed (it most likely went through,
 * the webhook is just late): the same places, but nothing downloads yet.
 * Failed: back where they were, to try again.
 */
export function pendingPurchaseDestination(
  pending: PendingPurchase | null,
  outcome: "confirmed" | "unconfirmed" | "failed"
): string {
  const cvId = pending?.kind === "unlock" ? pending.cvDocumentId : pending?.downloadCvId;
  if (cvId) {
    const editor = `/dashboard/editor/${encodeURIComponent(cvId)}`;
    return outcome === "confirmed" ? `${editor}?download=1` : editor;
  }
  const failed = outcome === "failed";
  return safeReturnPath(pending?.returnTo, !failed) ?? (failed ? "/dashboard/upgrade" : "/dashboard");
}

export function savePendingPurchase(purchase: PendingPurchase) {
  try {
    // Without the one-shot flags (a fresh draft's feedback card, an auto-download), so going back doesn't replay them.
    const params = new URLSearchParams(window.location.search);
    params.delete("fresh");
    params.delete("download");
    const query = params.toString();
    const returnTo = window.location.pathname + (query ? `?${query}` : "");
    sessionStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify({ returnTo, ...purchase }));
  } catch {
    // Best-effort — the return page falls back to "any paid plan".
  }
}

// Set by the return page once a plan / lifetime payment is confirmed: the
// flow that was stopped by the paywall reruns its step on opening (see
// useResumeAfterPayment). Short-lived, and read only once.
const PAID_RETURN_KEY = "gomoxie_paid_return";
const PAID_RETURN_MAX_AGE_MS = 10 * 60 * 1000;

export function markPaidReturn() {
  try {
    sessionStorage.setItem(PAID_RETURN_KEY, String(Date.now()));
  } catch {
    // The flow just reopens on its step; one more click.
  }
}

/** True once, right after a confirmed payment. */
export function consumePaidReturn(): boolean {
  try {
    const at = Number(sessionStorage.getItem(PAID_RETURN_KEY));
    sessionStorage.removeItem(PAID_RETURN_KEY);
    return at > 0 && Date.now() - at < PAID_RETURN_MAX_AGE_MS;
  } catch {
    return false;
  }
}

export function readPendingPurchase(): PendingPurchase | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PURCHASE_KEY);
    return raw ? (JSON.parse(raw) as PendingPurchase) : null;
  } catch {
    return null;
  }
}

export function clearPendingPurchase() {
  try {
    sessionStorage.removeItem(PENDING_PURCHASE_KEY);
  } catch {
    // Nothing to do.
  }
}
