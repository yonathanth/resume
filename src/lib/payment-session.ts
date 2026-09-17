// Tracks in-flight CV-download payments across the full-page redirect to
// Chapa's checkout and back, without depending on whatever (if anything)
// Chapa appends to the return URL's query string.
const PENDING_PAYMENT_KEY_PREFIX = "resumate_pending_payment_";
const LAST_REDIRECT_KEY = "resumate_last_payment_redirect";

export function savePendingPayment(cvId: string, paymentId: string) {
  try {
    sessionStorage.setItem(`${PENDING_PAYMENT_KEY_PREFIX}${cvId}`, paymentId);
  } catch {
    // Best-effort — worst case the user just has to click Download twice.
  }
}

export function readPendingPayment(cvId: string): string | null {
  try {
    return sessionStorage.getItem(`${PENDING_PAYMENT_KEY_PREFIX}${cvId}`);
  } catch {
    return null;
  }
}

export function clearPendingPayment(cvId: string) {
  try {
    sessionStorage.removeItem(`${PENDING_PAYMENT_KEY_PREFIX}${cvId}`);
  } catch {
    // Ignore.
  }
}

// A single breadcrumb (not per-CV) recording which CV's payment we most
// recently sent to Chapa — read by the generic Chapa return page, which has
// no other way to know which CV to send the user back to.
export function saveLastPaymentRedirect(cvId: string) {
  try {
    sessionStorage.setItem(LAST_REDIRECT_KEY, cvId);
  } catch {
    // Ignore.
  }
}

export function readAndClearLastPaymentRedirect(): string | null {
  try {
    const cvId = sessionStorage.getItem(LAST_REDIRECT_KEY);
    sessionStorage.removeItem(LAST_REDIRECT_KEY);
    return cvId;
  } catch {
    return null;
  }
}
