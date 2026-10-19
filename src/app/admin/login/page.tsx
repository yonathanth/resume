import { Metadata } from "next";
import { AdminLoginView } from "@/components/admin/AdminLoginView";

export const metadata: Metadata = {
  title: "Admin sign-in",
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, string> = {
  forbidden: "That account isn't an administrator. Sign in with an admin account.",
  session: "Your session ended. Sign in again.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;
  return <AdminLoginView notice={typeof error === "string" ? NOTICES[error] ?? null : null} />;
}
