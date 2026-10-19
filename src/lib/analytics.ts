// Product analytics from the browser: a short allow-list of UI events (the
// backend refuses anything else — see services/events.service.ts), plus the
// first-touch attribution of this browser (how they first arrived), which is
// sent once with onboarding. Best effort throughout: nothing here ever
// throws or blocks the UI, and with storage blocked it simply sends less.

import { getAccessToken, sendClientEvent, sendAnonymousEvent } from "./api";

export type AnalyticsEvent =
  | { name: "try_started"; props: { flow: "create" | "tailor" | "improve" } }
  | { name: "try_signup_prompted"; props: { flow: "create" | "tailor" | "improve" } }
  | { name: "onboarding_step_viewed"; props: { step: string } }
  | { name: "onboarding_skipped"; props: { step: string } }
  | { name: "checklist_item_clicked"; props: { item: string } }
  | { name: "tour_started"; props: { from: string } }
  | { name: "tour_finished"; props: { steps: number } };

const ANONYMOUS_ID_KEY = "resumate_anon_id";
const ATTRIBUTION_KEY = "resumate_first_touch";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Old browsers: RFC 4122 v4 from Math.random — fine for a non-secret id.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** A random id for this browser, connecting what happened before sign-up to the account. */
export function anonymousId(): string | undefined {
  try {
    let id = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(ANONYMOUS_ID_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

/**
 * Records one UI event. Signed in in this tab: with the account. Otherwise as
 * the anonymous browser — which the server takes for the /try events only.
 */
export function track<E extends AnalyticsEvent>(name: E["name"], props: E["props"]): void {
  if (typeof window === "undefined") return;
  const anonId = anonymousId();
  const send = getAccessToken()
    ? sendClientEvent(name, props, anonId)
    : anonId
      ? sendAnonymousEvent(name, props, anonId)
      : Promise.resolve();
  send.catch(() => {
    // Analytics never gets in anyone's way.
  });
}

// ---- First-touch attribution ----

export interface SignupAttribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  landingPath?: string;
  quickLink?: string;
  firstSeenAt?: string;
}

const clip = (value: string | null | undefined) => (value ? value.trim().slice(0, 200) : undefined) || undefined;

function readAttribution(): SignupAttribution | null {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as SignupAttribution) : null;
  } catch {
    return null;
  }
}

function writeAttribution(value: SignupAttribution) {
  try {
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(value));
  } catch {
    // Storage blocked: attribution just isn't kept.
  }
}

/**
 * Remembers how this browser first arrived — the first page's utm_* params,
 * the referring site (host only) and the path — unless that's already
 * remembered. Called on every page load; only the first one counts.
 */
export function captureFirstTouch(): void {
  if (typeof window === "undefined" || readAttribution()) return;
  const params = new URLSearchParams(window.location.search);
  let referrer: string | undefined;
  try {
    const host = document.referrer ? new URL(document.referrer).host : "";
    referrer = host && host !== window.location.host ? clip(host) : undefined;
  } catch {
    referrer = undefined;
  }
  writeAttribution({
    utmSource: clip(params.get("utm_source")),
    utmMedium: clip(params.get("utm_medium")),
    utmCampaign: clip(params.get("utm_campaign")),
    utmContent: clip(params.get("utm_content")),
    utmTerm: clip(params.get("utm_term")),
    referrer,
    landingPath: clip(window.location.pathname),
    firstSeenAt: new Date().toISOString(),
  });
}

/** A /go link opened: remembered with the first touch, if it's the first one with a link. */
export function noteQuickLink(slug: string): void {
  // Capture the landing first (utm params on the /go link itself), in case this runs before FirstTouchCapture.
  captureFirstTouch();
  const current = readAttribution();
  if (current?.quickLink) return;
  writeAttribution({ ...(current ?? { firstSeenAt: new Date().toISOString() }), quickLink: clip(slug) });
}

/** What to send with onboarding; the server keeps only the first one. */
export function firstTouch(): SignupAttribution | undefined {
  const value = readAttribution();
  if (!value) return undefined;
  const cleaned = Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === "string" && v)) as SignupAttribution;
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}
