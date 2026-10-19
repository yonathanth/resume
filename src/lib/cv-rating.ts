// When to ask "How did your CV turn out?" (see CvRatingHost): right after a
// PDF download, and when they leave the editor having made their first CV.
// The editor and the resume cards only announce those moments here; the host
// in the dashboard layout decides whether to ask.

const DOWNLOADED_EVENT = "resumate:cv-downloaded";
const LEFT_EDITOR_KEY = "rateAfterEditor";

/** A PDF was just downloaded. */
export function notifyCvDownloaded(cvDocumentId: string) {
  window.dispatchEvent(new CustomEvent<string>(DOWNLOADED_EVENT, { detail: cvDocumentId }));
}

export function onCvDownloaded(listener: (cvDocumentId: string) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<string>).detail);
  window.addEventListener(DOWNLOADED_EVENT, handler);
  return () => window.removeEventListener(DOWNLOADED_EVENT, handler);
}

/** Leaving the editor: the page they land on may ask (kept across the navigation). */
export function notifyLeftEditor(cvDocumentId: string | null) {
  try {
    sessionStorage.setItem(LEFT_EDITOR_KEY, cvDocumentId ?? "");
  } catch {
    // Storage blocked: they're just not asked at this moment.
  }
}

/** Whether they just left the editor (without taking it). */
export function peekLeftEditor(): boolean {
  try {
    return sessionStorage.getItem(LEFT_EDITOR_KEY) !== null;
  } catch {
    return false;
  }
}

/** The CV they just left the editor on, once ("" when it had no saved id). Null if they didn't. */
export function takeLeftEditor(): string | null {
  try {
    const value = sessionStorage.getItem(LEFT_EDITOR_KEY);
    sessionStorage.removeItem(LEFT_EDITOR_KEY);
    return value;
  } catch {
    return null;
  }
}
