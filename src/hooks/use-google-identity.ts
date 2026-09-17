"use client";

import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity script"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function useGoogleIdentity() {
  const callbackRef = useRef<((credential: string) => void) | null>(null);
  const initialized = useRef(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    loadGoogleScript().then(() => {
      if (initialized.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => callbackRef.current?.(response.credential),
      });
      initialized.current = true;
    });
  }, [clientId]);

  const promptGoogleSignIn = useCallback(
    (onCredential: (credential: string) => void) => {
      if (!clientId || !initialized.current || !window.google) {
        throw new Error("Google sign-in is not configured");
      }
      callbackRef.current = onCredential;
      window.google.accounts.id.prompt();
    },
    [clientId]
  );

  return { promptGoogleSignIn };
}
