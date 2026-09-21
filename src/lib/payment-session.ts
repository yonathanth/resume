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
