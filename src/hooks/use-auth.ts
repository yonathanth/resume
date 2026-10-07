"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  register,
  login,
  googleAuth,
  logout,
  logoutAll,
  changePassword,
  deleteAccount,
  getMe,
  updateMe,
  setAccessToken,
  clearAccessToken,
  getAccessToken,
  AuthResponse,
  UpdateMeInput,
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
    mutationFn: (input: UpdateMeInput) => updateMe(input),
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

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { currentPassword?: string; newPassword: string }) => changePassword(input),
    onSuccess: (user) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
    },
  });
}

// Signs out everywhere. Like useLogout, this device is cleared even if the
// request fails.
export function useLogoutAll() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logoutAll(),
    onSettled: () => {
      clearAccessToken();
      queryClient.clear();
      router.push("/login");
    },
  });
}

// Only clears local state once the server confirms the account is gone — a
// failed delete (wrong password, active subscription) keeps the user signed in.
export function useDeleteAccount() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { password?: string; confirmEmail?: string }) => deleteAccount(input),
    onSuccess: () => {
      clearAccessToken();
      queryClient.clear();
      router.push("/");
    },
  });
}
