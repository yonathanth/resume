import { Metadata } from "next";
import { UnsubscribeView } from "@/components/AccountRecoveryViews";

export const metadata: Metadata = {
  title: "Unsubscribe – Resumate",
  description: "Stop product announcement emails from Resumate.",
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { u, t } = await searchParams;
  return <UnsubscribeView u={typeof u === "string" ? u : null} t={typeof t === "string" ? t : null} />;
}
