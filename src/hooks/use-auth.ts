"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { register, login, googleAuth, setAccessToken, AuthResponse } from "@/lib/api";

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
