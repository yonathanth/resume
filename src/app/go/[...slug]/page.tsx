import { notFound } from "next/navigation";
import { parseQuickIntent } from "@/lib/quick-links";
import { QuickLinkRedirect } from "./QuickLinkRedirect";

/**
 * Quick links for sharing and ads — /go/create, /go/tailor, /go/improve,
 * /go/template/<id>, /go/pro. Remembers what the visitor came for, then sends
 * them into the app (or to sign up first); the dashboard opens it from there.
 */
export default async function QuickLinkPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const intent = parseQuickIntent(slug);
  if (!intent) notFound();
  return <QuickLinkRedirect intent={intent} />;
}
