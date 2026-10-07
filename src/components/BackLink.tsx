"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// The tracker keeps a small stack of the in-app pages visited in this tab, so
// "Back" can step back exactly — even through several pages (sign-up → Terms →
// Privacy → Back → Back). document.referrer can't be used — client navigation
// never updates it — and history.length can't tell whether the previous entry
// was one of our pages.
const STACK_KEY = "resumate:path-stack";

function readStack(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(STACK_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Mounted once in the root layout: records each in-app page change. */
export function NavigationTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const stack = readStack();
    if (stack[stack.length - 1] === pathname) return;
    // Arriving at the page before the top means we went back: pop instead of push.
    if (stack[stack.length - 2] === pathname) stack.pop();
    else stack.push(pathname);
    try {
      sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-20)));
    } catch {
      // Storage unavailable (private mode, blocked): Back falls back to home.
    }
  }, [pathname]);

  return null;
}

/**
 * "Back" for pages people reach from elsewhere on the site (e.g. the Terms
 * link on the sign-up form): returns to the page they came from, or goes home
 * when the page was opened fresh in a new tab or from a pasted link.
 */
export function BackLink({ className = "" }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const goBack = () => {
    const stack = readStack();
    const previous = stack[stack.length - 1] === pathname ? stack[stack.length - 2] : stack[stack.length - 1];
    router.push(previous && previous !== pathname ? previous : "/");
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={`group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-200 bg-white/90 py-2 pl-3 pr-4 text-[13.5px] font-medium text-neutral-700 shadow-[0_1px_2px_rgba(15,17,21,0.05),0_8px_20px_-10px_rgba(15,17,21,0.25)] backdrop-blur transition-colors hover:border-neutral-300 hover:text-neutral-950 ${className}`}
    >
      <ArrowLeft className="h-3.5 w-3.5 text-accent transition-transform group-hover:-translate-x-0.5" />
      Back
    </button>
  );
}
