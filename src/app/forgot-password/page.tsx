import { Metadata } from "next";
import { NO_INDEX } from "@/lib/metadata";
import { ForgotPasswordView } from "@/components/AccountRecoveryViews";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Get a link to choose a new GoMoxie password.",
  // Account and token pages: not for search results.
  robots: NO_INDEX,
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
