"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  dismissNotification,
  getPlatformStatus,
  hasSession,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import { useHasMounted } from "./use-has-mounted";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

// In-app notifications from the FitCV team. Polled gently while the
// dashboard is open; push (when the user opted in) is a separate channel.
export function useNotifications() {
  const hasMounted = useHasMounted();
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: listNotifications,
    enabled: hasMounted && hasSession(),
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useNotificationActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
  return {
    markRead: useMutation({ mutationFn: markNotificationRead, onSuccess: refresh }),
    markAllRead: useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh }),
    dismiss: useMutation({ mutationFn: dismissNotification, onSuccess: refresh }),
  };
}

// Maintenance banner and sign-up availability (public endpoint).
export function usePlatformStatus() {
  const hasMounted = useHasMounted();
  return useQuery({
    queryKey: ["platform-status"],
    queryFn: getPlatformStatus,
    enabled: hasMounted,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
