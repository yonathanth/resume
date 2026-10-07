"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/Toaster";
import { NavigationTracker } from "@/components/BackLink";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationTracker />
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
