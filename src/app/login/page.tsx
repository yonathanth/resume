import { Metadata } from "next";
import { AuthLayout } from "@/components/AuthLayout";

export const metadata: Metadata = {
  title: "Log in – Resumate",
  description: "Log in to your Resumate account to continue building resumes.",
};

export default function LoginPage() {
  return <AuthLayout mode="login" />;
}
