// Google sign-in in a small pop-up window (the try-first sign-up pop-up):
// the window lands on our own /auth/google (or /login?error=…) page, which
// reports back to the page that opened it with this message, then closes.

export const GOOGLE_POPUP_MESSAGE = "google-sign-in";
export type GooglePopupMessage = { type: typeof GOOGLE_POPUP_MESSAGE; ok: boolean; code?: string };

/** True in a window opened by one of our own pages (the Google sign-in pop-up). */
export function isOwnPopup(): boolean {
  try {
    return Boolean(window.opener) && window.opener.location.origin === window.location.origin;
  } catch {
    return false; // opened by another site
  }
}

/** From the pop-up: tell the page that opened it how Google sign-in went, and close. */
export function reportToOpener(message: Omit<GooglePopupMessage, "type">) {
  window.opener.postMessage({ type: GOOGLE_POPUP_MESSAGE, ...message } satisfies GooglePopupMessage, window.location.origin);
  window.close();
}
