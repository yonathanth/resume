"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Moxie } from "@/components/moxie";

/** Something broke while rendering a page: Moxie's pencil snaps — and a way to try again. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <Moxie animation="oops" size={200} decorative ticklish />
      <h1 className="mt-4 text-xl font-bold tracking-tight text-neutral-950">Oops, something broke</h1>
      <p className="mt-1.5 text-sm text-neutral-500">That didn&apos;t work. Let&apos;s try that again.</p>
      <div className="mt-6 flex items-center gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 cursor-pointer"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Back to your dashboard
        </Link>
      </div>
    </main>
  );
}
