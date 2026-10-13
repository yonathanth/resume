import Link from "next/link";
import { Moxie } from "@/components/moxie";

/** The 404 page: Moxie pacing, worried, claws behind her back — and a way back. */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <Moxie animation="lost" size={150} decorative ticklish />
      <h1 className="mt-4 text-xl font-bold tracking-tight text-neutral-950">This page wandered off</h1>
      <p className="mt-1.5 text-sm text-neutral-500">We couldn&apos;t find what you were looking for.</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
      >
        Back to your dashboard
      </Link>
    </main>
  );
}
