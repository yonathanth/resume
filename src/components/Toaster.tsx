"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

/**
 * App-wide toasts: short feedback ("Saved", "Your PDF is ready", "Couldn't
 * save") shown at a readable size in one consistent place, instead of small
 * status text scattered next to whatever triggered it.
 */

type ToastTone = "success" | "error" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  /** A toast with the same id replaces the previous one instead of stacking. */
  id?: string;
  description?: string;
  action?: ToastAction;
  /** Milliseconds before it hides itself; errors stay until dismissed unless set. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  tone: ToastTone;
  title: string;
}

interface ToastApi {
  success: (title: string, options?: ToastOptions) => string;
  error: (title: string, options?: ToastOptions) => string;
  info: (title: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION: Record<ToastTone, number | null> = { success: 3500, info: 4500, error: null };

const TONE_STYLES: Record<ToastTone, { icon: React.ComponentType<{ className?: string }>; tile: string }> = {
  success: { icon: CheckCircle2, tile: "bg-emerald-50 border-emerald-200 text-emerald-600" },
  error: { icon: AlertCircle, tile: "bg-red-50 border-red-200 text-red-600" },
  info: { icon: Info, tile: "bg-accent-soft border-accent-border text-accent-strong" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (tone: ToastTone, title: string, options: ToastOptions = {}) => {
      const id = options.id ?? `toast-${++counter.current}`;
      clearTimeout(timers.current.get(id));
      setToasts((prev) => [...prev.filter((t) => t.id !== id), { ...options, id, tone, title }].slice(-4));
      const duration = options.duration ?? DEFAULT_DURATION[tone];
      if (duration) timers.current.set(id, setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, options) => show("success", title, options),
      error: (title, options) => show("error", title, options),
      info: (title, options) => show("info", title, options),
      dismiss,
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
      >
        {toasts.map((toast) => {
          const { icon: Icon, tile } = TONE_STYLES[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className="toast-enter pointer-events-auto w-full flex items-start gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-3 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.25)]"
            >
              <span className={`mt-0.5 w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border ${tile}`}>
                <Icon className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm font-semibold text-neutral-950 leading-snug">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-sm text-neutral-500 leading-snug">{toast.description}</p>}
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      dismiss(toast.id);
                    }}
                    className="mt-2 text-sm font-semibold text-accent-strong hover:text-accent transition-colors cursor-pointer"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="p-1 -mr-1 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}
