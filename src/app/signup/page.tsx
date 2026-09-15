import { Metadata } from "next";
import { AuthLayout } from "@/components/AuthLayout";

export const metadata: Metadata = {
  title: "Create your free account – Resumate",
  description:
    "Sign up for Resumate to craft ATS-optimized resumes that land interviews.",
};

export default function SignupPage() {
  return <AuthLayout mode="signup" />;
}
