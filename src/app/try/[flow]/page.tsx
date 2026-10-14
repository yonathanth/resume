import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TryFlow, type TryFlowKind } from "./TryFlow";

export const metadata: Metadata = {
  title: "Build your CV – Resumate",
  description: "Create, tailor or improve your CV with AI. Start right away; sign up when it's time to see the result.",
};

const FLOWS: readonly TryFlowKind[] = ["create", "tailor", "improve"];

/**
 * Try first, sign up later: a flow anyone can start without an account —
 * /try/create (optionally ?template=<id>), /try/tailor, /try/improve. It asks
 * for an account only when it's about to use the AI (see AccountGate).
 */
export default async function TryPage({
  params,
  searchParams,
}: {
  params: Promise<{ flow: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { flow } = await params;
  const { template } = await searchParams;
  if (!FLOWS.includes(flow as TryFlowKind)) notFound();
  return <TryFlow flow={flow as TryFlowKind} templateId={typeof template === "string" ? template : undefined} />;
}
