"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { hasSession } from "@/lib/api";
import { useSubscriptionStatus } from "@/hooks/use-subscription";
import { LifetimeDeal, PlanCards } from "@/components/pricing/PlanCards";

// The home page's pricing: the same Free / Plus / Pro cards as /pricing, in
// the home page's light style. The lifetime deal, pay per CV and the FAQ are
// on /pricing.
export function PricingSection() {
  const hasMounted = useHasMounted();
  const isSignedIn = hasMounted && hasSession();
  const { data: status } = useSubscriptionStatus();

  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-5xl sm:leading-[1.08]">
          Simple <span className="text-accent">pricing.</span>
        </h2>
      </Reveal>

      <Reveal delay={100} className="mt-12">
        <PlanCards theme="light" signedIn={isSignedIn} status={status} periodOnCards />
        <LifetimeDeal theme="light" signedIn={isSignedIn} status={status} />
      </Reveal>

      <Reveal className="mt-12 flex flex-col items-center text-center">
        <Link
          href="/pricing"
          className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-neutral-600 transition-colors hover:text-neutral-950"
        >
          See full pricing &amp; FAQ
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Reveal>
    </section>
  );
}
