import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/metadata";
import { TryFlow, type TryFlowKind } from "./TryFlow";

const FLOWS: readonly TryFlowKind[] = ["create", "tailor", "improve"];

// Each flow is its own landing page (the links to promote): its own title,
// description and share image (opengraph-image.tsx next to this file).
const FLOW_META: Record<TryFlowKind, { title: string; description: string }> = {
  create: {
    title: "Build a resume with AI",
    description:
      "Answer a few questions and get a finished, ATS-friendly resume in minutes. Start right away; sign up only when it's time to see the result.",
  },
  tailor: {
    title: "Tailor your resume to a job with AI",
    description:
      "Paste a job posting and get your CV matched to it: the right keywords, your most relevant experience first. Start right away, no account needed.",
  },
  improve: {
    title: "Improve your resume with AI",
    description:
      "Upload the CV you have and get clearer bullet points and stronger wording, in the template of your choice. Start right away, no account needed.",
  },
};

export function generateStaticParams() {
  return FLOWS.map((flow) => ({ flow }));
}

export async function generateMetadata({ params }: { params: Promise<{ flow: string }> }): Promise<Metadata> {
  const { flow } = await params;
  const meta = FLOW_META[flow as TryFlowKind];
  if (!meta) return {};
  return pageMetadata({ ...meta, path: `/try/${flow}` });
}

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
