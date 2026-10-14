import { Metadata } from "next";
import { VerifyEmailView } from "@/components/VerifyEmailView";

export const metadata: Metadata = {
  title: "Confirm your email – Resumate",
  description: "Confirm your email address to finish creating your Resumate account.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await searchParams;
  return <VerifyEmailView token={typeof token === "string" ? token : null} />;
}
