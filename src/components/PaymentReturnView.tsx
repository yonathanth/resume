"use client";

import React from "react";
import { Moxie } from "@/components/moxie";
import { WordByWord } from "@/components/moxie/WordByWord";

export type PaymentReturnState = "pending" | "confirmed" | "timeout";

/** After a successful payment: long enough to watch the crown land on her and her jump for joy. */
export const PAYMENT_CONFIRMED_REDIRECT_MS = 3000;

const COPY: Record<PaymentReturnState, { line: string; note?: string }> = {
  pending: { line: "Confirming your payment…" },
  confirmed: { line: "You're on GoMoxie Pro!", note: "Taking you to your dashboard…" },
  timeout: {
    line: "Still confirming your payment",
    note: "This can take a moment. We'll update your account as soon as it's confirmed.",
  },
};

/**
 * What the payment return pages (Chapa, Polar) show while a payment is
 * confirmed: Moxie inspecting a coin through her glasses — then, once it
 * goes through, a crown drops onto her and she jumps for joy.
 */
export function PaymentReturnView({ state }: { state: PaymentReturnState }) {
  const { line, note } = COPY[state];
  const confirmed = state === "confirmed";
  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#f5f5f7] px-4">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="relative">
          <div
            aria-hidden="true"
            className="moxie-glow pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent), transparent 65%)" }}
          />
          <div className="relative">
            <Moxie animation={confirmed ? "paid" : "verifying"} size={168} decorative crowned={confirmed} />
          </div>
        </div>
        <div role="status" className="mt-3">
          <p key={state} className={`text-[15px] ${confirmed ? "font-semibold text-neutral-900" : "text-neutral-500"}`}>
            <WordByWord text={line} />
          </p>
          {note && <p className="mt-1 text-xs text-neutral-500">{note}</p>}
        </div>
      </div>
    </div>
  );
}
