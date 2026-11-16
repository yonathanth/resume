"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { ChevronDown } from "lucide-react";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { hasSession } from "@/lib/api";
import { usePricing, useSubscriptionStatus } from "@/hooks/use-subscription";
import { LifetimeDeal, PlanCards } from "@/components/pricing/PlanCards";
import { FALLBACK_PRICING } from "@/lib/plans";
import { pricingFaqs } from "@/lib/help-content";

// Free, Plus and Pro with a billing-period toggle, the Plus Lifetime deal and
// pay-per-CV (see components/pricing/PlanCards.tsx). A signed-in visitor
// starts checkout for that exact plan from here; a signed-out one goes to
// /signup first — there's no anonymous checkout.

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const hasMounted = useHasMounted();
  // hasMounted guards this (not a direct typeof window check) so the server
  // render and the client's first hydration pass agree — see use-has-mounted.ts.
  const isSignedIn = hasMounted && hasSession();
  const { data: status } = useSubscriptionStatus();
  // The same answers as the help center, with prices and limits from the live price list.
  const { data: pricing } = usePricing();
  const faqs = pricingFaqs(pricing ?? FALLBACK_PRICING);

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-[#0a0a0a] font-sans text-white selection:bg-accent selection:text-white">
      {/* Subtle dot grid + a faint warm glow at the top */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[800px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(255,122,46,0.10),transparent)] blur-3xl" />

      <Navbar theme="dark" />

      <main className="relative z-10 mx-auto w-full max-w-page px-4 pb-24 pt-36 sm:px-6 sm:pt-40 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl sm:leading-[1.05]">
            Simple <span className="text-accent">pricing.</span>
          </h1>
          <p className="mt-4 text-[16px] text-neutral-400">Start free. Pick a plan when you&apos;re applying a lot, or pay per CV when you&apos;re not.</p>
        </Reveal>

        <Reveal delay={100} className="mt-12">
          <PlanCards theme="dark" signedIn={isSignedIn} status={status} periodOnCards />
        </Reveal>

        <Reveal delay={200}>
          <LifetimeDeal theme="dark" signedIn={isSignedIn} status={status} />
        </Reveal>

        {/* FAQ */}
        <Reveal className="mx-auto mt-24 max-w-3xl sm:mt-32">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={faq.q} className="overflow-hidden rounded-2xl border border-neutral-800/90 bg-[#141416]">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-[#18181b]"
                  >
                    <span className="text-[15px] font-semibold text-white sm:text-base">{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-accent-light" : "text-neutral-500"}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-neutral-800/50 px-6 pb-5 pt-4 text-[14px] leading-relaxed text-neutral-400">{faq.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </Reveal>
      </main>

      <Footer />
    </div>
  );
}
