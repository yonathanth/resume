import { Metadata } from "next";
import { NO_INDEX } from "@/lib/metadata";
import { ResetPasswordView } from "@/components/AccountRecoveryViews";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your gomoxie account.",
  // Account and token pages: not for search results.
  robots: NO_INDEX,
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordView token={typeof token === "string" ? token : null} />;
}
