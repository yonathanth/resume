import { Metadata } from "next";
import { NO_INDEX } from "@/lib/metadata";
import { UnsubscribeView } from "@/components/AccountRecoveryViews";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Stop product announcement emails from GoMoxie.",
  // Account and token pages: not for search results.
  robots: NO_INDEX,
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { u, t } = await searchParams;
  return <UnsubscribeView u={typeof u === "string" ? u : null} t={typeof t === "string" ? t : null} />;
}
