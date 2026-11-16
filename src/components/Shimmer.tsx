import React from "react";

/**
 * Loading placeholders in the shape of what's coming, instead of a spinner:
 * the page settles into place rather than popping in. Same soft grey pulse
 * everywhere (the editor's and Past Projects' skeletons use it too).
 *
 *   if (isLoading) return <ShimmerStatus label="Loading your profiles…"><ProfileCardsSkeleton /></ShimmerStatus>;
 *
 * A spinner is still right for a hand-off with nothing to sketch (signing in
 * with Google, a redirect) and inside a button doing its action.
 */
export function Shimmer({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-neutral-200/70 ${className}`} />;
}

/** Wraps a skeleton so screen readers hear what's loading (the shapes themselves are hidden from them). */
export function ShimmerStatus({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Rows of text — a list in a popover, a step in a flow, an admin table. */
export function RowsSkeleton({ rows = 4, avatar = false, className = "" }: { rows?: number; avatar?: boolean; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          {avatar && <Shimmer className="w-9 h-9 rounded-lg shrink-0" />}
          <div className="flex-1 space-y-1.5">
            <Shimmer className={`h-3 ${i % 3 === 0 ? "w-2/3" : i % 3 === 1 ? "w-1/2" : "w-3/5"}`} />
            <Shimmer className={`h-2.5 ${i % 2 === 0 ? "w-11/12" : "w-4/5"}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The career profile cards grid (CareerProfilesView), in outline. */
export function ProfileCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-start gap-3.5">
            <Shimmer className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 pt-0.5">
              <Shimmer className="h-4 w-3/5" />
              <Shimmer className="h-3 w-2/5" />
            </div>
          </div>
          <div className="mt-4 space-y-1.5 min-h-[2.5rem]">
            <Shimmer className="h-2.5 w-4/5" />
          </div>
          <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between">
            <Shimmer className="h-2.5 w-24" />
            <Shimmer className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** One career profile's page (ProfileEditorView): back link, header, tabs, section cards. */
export function ProfileEditorSkeleton() {
  return (
    <div className="space-y-6">
      <Shimmer className="h-3.5 w-28" />
      <div className="flex items-start gap-3.5">
        <Shimmer className="w-11 h-11 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Shimmer className="h-5 w-56 max-w-full" />
          <Shimmer className="h-3 w-40" />
        </div>
        <Shimmer className="hidden sm:block h-10 w-32 rounded-lg" />
      </div>
      <div className="flex gap-4 border-b border-neutral-200 pb-3">
        {["w-16", "w-14", "w-[60px]"].map((width) => (
          <Shimmer key={width} className={`h-4 ${width}`} />
        ))}
      </div>
      {[0, 1, 2].map((card) => (
        <div key={card} className="rounded-lg border border-neutral-200 bg-white p-5 space-y-3">
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-5/6" />
          {card === 0 && <Shimmer className="h-3 w-2/3" />}
        </div>
      ))}
    </div>
  );
}

/** The dashboard frame (sidebar + page) while the session is restored. */
export function DashboardShellSkeleton() {
  return (
    <div className="h-screen w-full overflow-hidden bg-[#fbfbfb] flex">
      <div className="hidden md:flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50">
        <div className="h-16 border-b border-neutral-200 px-4 flex items-center gap-2.5">
          <Shimmer className="w-10 h-10 rounded-xl" />
          <Shimmer className="h-4 w-24" />
        </div>
        <div className="p-3 space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <Shimmer className="w-5 h-5 rounded-md" />
              <Shimmer className={`h-3.5 ${["w-20", "w-24", "w-28", "w-20", "w-16"][i]}`} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 min-w-0 px-8 pt-8 sm:px-14 lg:px-20">
        <Shimmer className="h-7 w-56" />
        <Shimmer className="mt-3 h-4 w-80 max-w-full" />
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
