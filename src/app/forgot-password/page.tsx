import { Metadata } from "next";
import { ForgotPasswordView } from "@/components/AccountRecoveryViews";

export const metadata: Metadata = {
  title: "Reset your password – Resumate",
  description: "Get a link to choose a new Resumate password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
