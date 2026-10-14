// Which create / tailor / improve flow is open on the dashboard lives in its
// URL — /dashboard?flow=tailor&fs=… (plus &template=… or &profile=… for a
// CV started from one) — so a refresh reopens it and Back closes it. The step
// inside it is ?step=… (see flow-steps). `fs` names this one opening of the
// flow: once it's closed or finished, Back onto its old steps shows the
// dashboard instead of reopening it empty.

import type { FlowKind } from "./flow-drafts";

export interface OpenFlow {
  kind: FlowKind;
  /** This opening of the flow. */
  session: string;
  template?: string;
  profile?: string;
}

const KINDS: readonly FlowKind[] = ["create", "tailor", "improve"];
const CLOSED_KEY = "closedFlowSessions";

export function dashboardFlowHref(kind: FlowKind, options: { template?: string; profile?: string } = {}): string {
  const params = new URLSearchParams({ flow: kind, fs: Math.random().toString(36).slice(2, 10) });
  if (options.template) params.set("template", options.template);
  if (options.profile) params.set("profile", options.profile);
  return `/dashboard?${params.toString()}`;
}

export function readOpenFlow(params: URLSearchParams): OpenFlow | null {
  const kind = params.get("flow") as FlowKind | null;
  const session = params.get("fs");
  if (!kind || !KINDS.includes(kind) || !session) return null;
  return { kind, session, template: params.get("template") ?? undefined, profile: params.get("profile") ?? undefined };
}

function closedSessions(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(CLOSED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function markFlowClosed(session: string) {
  try {
    sessionStorage.setItem(CLOSED_KEY, JSON.stringify([...closedSessions(), session].slice(-50)));
  } catch {
    // Storage blocked: Back onto its steps just reopens it from the start.
  }
}

export function isFlowClosed(session: string): boolean {
  return closedSessions().includes(session);
}
