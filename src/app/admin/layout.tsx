"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";

// The sign-in page renders on its own; every other /admin page is inside
// the shell, which confirms the admin role with the backend first.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;
  return <AdminShell>{children}</AdminShell>;
}
