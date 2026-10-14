// Quick links (/go/...): shareable and ad links that take someone straight to
// one of the app's services. The intent is remembered in localStorage while
// they sign up or log in — including the round trip through Google — and the
// dashboard opens it once they arrive (see QuickLinkLauncher).

export type QuickIntent =
  | { kind: "create" }
  | { kind: "tailor" }
  | { kind: "improve" }
  | { kind: "template"; templateId: string }
  | { kind: "pro" };

const STORAGE_KEY = "quickLinkIntent";
/** A link someone clicked but didn't finish signing up from shouldn't fire days later. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * The intent behind a /go/... path, or null if it isn't one:
 * /go/create, /go/tailor, /go/improve, /go/template/<id>, /go/pro.
 */
export function parseQuickIntent(slug: string[]): QuickIntent | null {
  const [kind, arg, ...rest] = slug.map((s) => s.toLowerCase());
  if (rest.length) return null;
  if (kind === "template") return arg && /^[a-z0-9-]+$/.test(arg) ? { kind, templateId: arg } : null;
  if (arg) return null;
  if (kind === "create" || kind === "tailor" || kind === "improve" || kind === "pro") return { kind };
  return null;
}

/** What the visitor is about to do — said on the sign-up page while they're asked to make an account. */
export function describeQuickIntent(intent: QuickIntent): string {
  switch (intent.kind) {
    case "create":
      return "create your CV";
    case "tailor":
      return "tailor your CV to a job";
    case "improve":
      return "improve your CV";
    case "template":
      return "start your CV from this template";
    case "pro":
      return "upgrade to Pro";
  }
}

export function saveQuickIntent(intent: QuickIntent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ intent, savedAt: Date.now() }));
  } catch {
    // Storage blocked (private mode): the link still lands them in the app, just without opening the service.
  }
}

/** The remembered intent, if there is one and it's still fresh. */
export function peekQuickIntent(): QuickIntent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { intent, savedAt } = JSON.parse(raw) as { intent: QuickIntent; savedAt: number };
    if (typeof savedAt !== "number" || Date.now() - savedAt > MAX_AGE_MS) {
      clearQuickIntent();
      return null;
    }
    return intent;
  } catch {
    return null;
  }
}

export function clearQuickIntent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Takes the remembered intent (so it opens only once). */
export function consumeQuickIntent(): QuickIntent | null {
  const intent = peekQuickIntent();
  clearQuickIntent();
  return intent;
}
