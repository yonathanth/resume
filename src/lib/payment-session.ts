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

// What a Polar checkout was for, so the return page knows what to wait for
// (the plan, the lifetime deal, or one CV's unlock) and where to go after.
export type PendingPurchase =
  | { kind: "plan"; tier: "plus" | "pro" }
  | { kind: "lifetime" }
  | { kind: "unlock"; cvDocumentId: string };

const PENDING_PURCHASE_KEY = "gomoxie_pending_purchase";

export function savePendingPurchase(purchase: PendingPurchase) {
  try {
    sessionStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify(purchase));
  } catch {
    // Best-effort — the return page falls back to "any paid plan".
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
