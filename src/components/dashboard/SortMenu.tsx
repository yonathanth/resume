"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUpDown, Check } from "lucide-react";

// Sort control for the dashboard lists (Past projects, Career profiles): a
// boxed icon beside a search box, or `compact` — a small "Last edited ⇅" link
// at the end of a section header. Opens a small menu of orders.
export function SortMenu<T extends string>({
  value,
  options,
  onChange,
  label = "Sort",
  compact = false,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label ?? ""}`}
        title={`${label}: ${current?.label ?? ""}`}
        className={
          compact
            ? `inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium transition-colors cursor-pointer ${
                open ? "text-neutral-900" : "text-neutral-500 hover:text-accent-strong"
              }`
            : `flex h-10 w-10 items-center justify-center rounded-lg border bg-white transition-colors cursor-pointer ${
                open ? "border-neutral-400 text-neutral-900" : "border-neutral-300 text-neutral-500 hover:text-neutral-900"
              }`
        }
      >
        {compact && current?.label}
        <ArrowUpDown className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-44 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg animate-in fade-in duration-100"
        >
          <div className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{label}</div>
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                  active ? "bg-neutral-100 font-semibold text-neutral-950" : "font-medium text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <span className="flex-1">{o.label}</span>
                {active && <Check className="w-4 h-4 text-neutral-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
