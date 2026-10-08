"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { ArrowRight, Check, ChevronDown } from "lucide-react";

// Free accounts get one free AI generation per dashboard tab — Create,
// Tailor, Improve — one-time-only, not a shared pool (see
// entitlement.service.ts's FlowType). Pro is unlimited.
//
// The Weekly/Monthly/3-months cards below are a display-only pricing
// preview — every "Get Pro" CTA still routes to /signup and the backend
// still only knows a single Pro product ($5/month recurring through Polar,
// or a fixed 1-month period for 80 ETB through Chapa, no auto-renewal; see
// ProUpgradeModal and services/payment/products.ts). Wire real per-cycle
// checkout before relying on these displayed prices being what users
// actually get charged.

const FREE_FEATURES = [
  "1 free use each of Create, Tailor and Improve",
  "Every recruiter-tested template",
  "Import your old CV (PDF or DOCX)",
  "Click-to-edit resume editor",
  "PDF download",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited AI resume generations",
  "Unlimited tailoring to job posts",
  "Unlimited resume improvements",
  "Cancel anytime",
];

// Billing-cycle options for Pro — same feature set, different commitment
// lengths. "Monthly" mirrors what used to be the single Pro card.
const SUBSCRIPTION_PLANS = [
  {
    id: "weekly",
    name: "Weekly",
    price: "$4.99",
    period: "/ week",
    blurb: "A short burst of applications.",
    popular: false,
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$9.99",
    period: "/ month",
    blurb: "An active job search.",
    popular: true,
  },
  {
    id: "3-months",
    name: "3 Months",
    price: "$24.99",
    period: "/ 3 months",
    blurb: "A longer search — the best value.",
    popular: false,
  },
];

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What can I do on the free plan?",
    answer:
      "You get one free AI generation on each of the three tabs — Create, Tailor and Improve — plus every template, the full editor and PDF downloads. No card needed.",
  },
  {
    question: "What counts as a generation?",
    answer:
      "Each tab — Create, Tailor and Improve — gives you one free AI generation, one time only. If the AI fails and gives you nothing usable, that free use is given back.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel your Pro subscription from your account settings and you keep Pro until the end of the period you've already paid for. Nothing already paid is refunded.",
  },
  {
    question: "I'm in Ethiopia — how do I pay?",
    answer:
      "Choose Chapa at checkout and pay 80 ETB for one month of Pro. Chapa payments don't renew automatically, so you simply pay again when you want another month.",
  },
  {
    question: "Which file formats are supported?",
    answer:
      "You can import an existing CV as a PDF or Word (DOCX) file, and download your finished resume as a PDF — the format applicant tracking systems read most reliably.",
  },
];

function FeatureList({ items, strong }: { items: string[]; strong?: boolean }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3 text-[14.5px] text-neutral-300">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              strong ? "bg-accent text-white" : "bg-neutral-800 text-neutral-400"
            }`}
          >
            <Check className="h-3 w-3 stroke-[3]" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-[#0a0a0a] font-sans text-white selection:bg-accent selection:text-white">
      {/* Subtle dot grid + a faint warm glow at the top */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[800px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(255,122,46,0.10),transparent)] blur-3xl" />

      <Navbar theme="dark" />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-36 sm:px-6 sm:pt-40 lg:px-8">
        {/* Header */}
        <Reveal className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl sm:leading-[1.05]">
            Simple <span className="text-accent">pricing.</span>
          </h1>
        </Reveal>

        {/* Plans */}
        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Free */}
          <Reveal delay={100}>
          <div className="flex h-full flex-col rounded-3xl border border-neutral-800 bg-[#141416] p-8">
            <h2 className="text-[17px] font-semibold text-white">Free</h2>
            <p className="mt-1 text-[14px] text-neutral-400">Try it on your next application.</p>
            <div className="mt-6 flex items-baseline gap-1.5">
              <span className="text-5xl font-bold tracking-tight text-white">$0</span>
              <span className="text-[14px] text-neutral-500">forever</span>
            </div>
            <p className="mt-1.5 text-[13px] text-neutral-500">No card needed</p>
            <Link
              href="/signup"
              className="mt-5 flex items-center justify-center rounded-full border border-neutral-700 bg-[#1e1e21] px-8 py-4 text-[15.5px] font-semibold tracking-[-0.01em] text-white transition-colors hover:border-neutral-600 hover:bg-neutral-800 active:scale-[0.98]"
            >
              Start for free
            </Link>

            {/* Pay-per-use — folded into Free rather than given its own
                card, since it's a top-up on the free plan, not a separate tier. */}
            <div className="mt-5 rounded-2xl border border-neutral-800/90 bg-[#0f0f11] p-4">
              <p className="text-[12.5px] font-semibold text-neutral-300">
                Need just one or two? Pay as you go:
              </p>
              <ul className="mt-2 space-y-1 text-[13px] text-neutral-400">
                <li>$1.99 per tailoring or enhancement</li>
                <li>$3.99 per new CV</li>
              </ul>
            </div>

            <div className="mt-8 border-t border-neutral-800 pt-7">
              <FeatureList items={FREE_FEATURES} />
            </div>
          </div>
          </Reveal>

          {/* Pro — Weekly / Monthly / 3 Months billing cycles */}
          {SUBSCRIPTION_PLANS.map((plan, idx) => (
            <Reveal key={plan.id} delay={200 + idx * 100}>
              <div
                className={`flex h-full flex-col rounded-3xl border p-8 ${
                  plan.popular
                    ? "border-accent/50 bg-[#18181b] shadow-[0_24px_60px_-30px_rgba(255,94,31,0.45)]"
                    : "border-neutral-800 bg-[#141416]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-[17px] font-semibold text-white">{plan.name}</h2>
                  {plan.popular && (
                    <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[12px] font-semibold text-accent-light">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[14px] text-neutral-400">{plan.blurb}</p>
                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-5xl font-bold tracking-tight text-white">{plan.price}</span>
                  <span className="text-[14px] text-neutral-500">{plan.period}</span>
                </div>
                <p className="mt-1.5 text-[13px] text-neutral-500">Billed in Ethiopia via Chapa, too</p>
                <Link
                  href="/signup"
                  className={`mt-5 flex items-center justify-center gap-2 rounded-full px-8 py-4 text-[15.5px] font-semibold tracking-[-0.01em] text-white transition-colors active:scale-[0.98] ${
                    plan.popular
                      ? "group bg-accent hover:bg-accent-strong"
                      : "border border-neutral-700 bg-[#1e1e21] hover:border-neutral-600 hover:bg-neutral-800"
                  }`}
                >
                  Get Pro
                  {plan.popular && (
                    <ArrowRight className="h-4 w-4 text-white/80 transition-transform duration-200 group-hover:translate-x-0.5" />
                  )}
                </Link>
                <div className="mt-8 border-t border-neutral-800 pt-7">
                  <FeatureList items={PRO_FEATURES} strong={plan.popular} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* FAQ */}
        <Reveal className="mx-auto mt-24 max-w-3xl sm:mt-32">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={faq.question} className="overflow-hidden rounded-2xl border border-neutral-800/90 bg-[#141416]">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-[#18181b]"
                  >
                    <span className="text-[15px] font-semibold text-white sm:text-base">{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-accent-light" : "text-neutral-500"}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-neutral-800/50 px-6 pb-5 pt-4 text-[14px] leading-relaxed text-neutral-400">{faq.answer}</div>
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
