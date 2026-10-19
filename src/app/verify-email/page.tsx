import { Metadata } from "next";
import { NO_INDEX } from "@/lib/metadata";
import { VerifyEmailView } from "@/components/VerifyEmailView";

export const metadata: Metadata = {
  title: "Confirm your email",
  description: "Confirm your email address to finish creating your GoMoxie account.",
  // Account and token pages: not for search results.
  robots: NO_INDEX,
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await searchParams;
  return <VerifyEmailView token={typeof token === "string" ? token : null} />;
}
