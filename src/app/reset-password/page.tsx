import { Metadata } from "next";
import { ResetPasswordView } from "@/components/AccountRecoveryViews";

export const metadata: Metadata = {
  title: "Choose a new password – Resumate",
  description: "Set a new password for your Resumate account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordView token={typeof token === "string" ? token : null} />;
}
