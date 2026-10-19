import { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { AuthLayout } from "@/components/AuthLayout";

export const metadata: Metadata = pageMetadata({
  title: "Log in",
  description:
    "Log in to GoMoxie to keep building your resumes.",
  path: "/login",
});

export default function LoginPage() {
  return <AuthLayout mode="login" />;
}
