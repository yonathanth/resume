"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  register,
  login,
  googleAuth,
  logout,
  getMe,
  updateMe,
  setAccessToken,
  clearAccessToken,
  getAccessToken,
  AuthResponse,
} from "@/lib/api";
import { useHasMounted } from "./use-has-mounted";

function onAuthSuccess(data: AuthResponse, router: ReturnType<typeof useRouter>) {
  setAccessToken(data.accessToken);
  router.push("/dashboard");
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      register(email, password),
    onSuccess: (data) => onAuthSuccess(data, router),
  });
}

export function useLogin() {
  const router = useRouter();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: (data) => onAuthSuccess(data, router),
  });
}

export function useGoogleAuth() {
  const router = useRouter();
  return useMutation({
    mutationFn: (idToken: string) => googleAuth(idToken),
    onSuccess: (data) => onAuthSuccess(data, router),
  });
}

export const ME_QUERY_KEY = ["me"] as const;

// The signed-in user's real profile — the settings page's source of truth
// for the displayed name/email (never a hardcoded placeholder). Gated on
// useHasMounted so the query's enabled state matches between the server
// render and the client's first hydration pass (see use-subscription.ts's
// useSubscriptionStatus for why).
export function useMe() {
  const hasMounted = useHasMounted();
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getMe,
    enabled: hasMounted && !!getAccessToken(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { fullName?: string; email?: string }) => updateMe(input),
    onSuccess: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
    },
  });
}

// Clears the access token client-side regardless of whether the backend
// call succeeds — a failed logout request should never leave the user
// stuck signed in.
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      clearAccessToken();
      queryClient.clear();
      router.push("/login");
    },
  });
}
