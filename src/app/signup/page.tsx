import { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { AuthLayout } from "@/components/AuthLayout";

export const metadata: Metadata = pageMetadata({
  title: "Create your free account",
  description:
    "Sign up free and build an ATS-friendly resume in minutes: create one from scratch, tailor it to a job, or improve the one you have.",
  path: "/signup",
});

export default function SignupPage() {
  return <AuthLayout mode="signup" />;
}
