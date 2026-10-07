"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CreditCard, LayoutTemplate, LogIn, Mail, Search, UserPlus } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FaqItem } from "@/components/FaqItem";
import { SUPPORT_EMAIL, WRITING_TIPS, filterFaqGroups } from "@/lib/help-content";
import { SOFT_TONES, type SoftTone } from "@/components/dashboard/create-flow/OptionCard";

// The public Help center: the same answers as the dashboard's Help page, open
// to anyone — no account needed.

// Icon tiles in the same soft colours as the dashboard's cards.
const QUICK_LINKS: { title: string; description: string; icon: React.ComponentType<{ className?: string }>; tone: SoftTone; href: string }[] = [
  { title: "Get started", description: "Create a free account.", icon: UserPlus, tone: "peach", href: "/signup" },
  { title: "Browse templates", description: "See every layout.", icon: LayoutTemplate, tone: "sage", href: "/#templates" },
  { title: "Pricing", description: "Free and Pro plans.", icon: CreditCard, tone: "blue", href: "/pricing" },
  { title: "Log in", description: "Back to your resumes.", icon: LogIn, tone: "lavender", href: "/login" },
];

export default function PublicHelpPage() {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const searching = query.trim().length > 0;
  const groups = filterFaqGroups(query);
  const supportHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Help with Resumate")}`;

  return (
    <div className="relative min-h-screen bg-[#fdfdfd] font-sans text-neutral-900">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl px-4 pb-28 pt-36 sm:px-6 sm:pt-40">
        {/* Header + search */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-950 sm:text-5xl">How can we help?</h1>
          <div className="relative mx-auto mt-8 max-w-xl">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions, e.g. download, cancel, template"
              className="w-full rounded-full border border-neutral-200 bg-white py-3.5 pl-11 pr-5 text-[15px] text-neutral-900 shadow-[0_1px_2px_rgba(15,17,21,0.05),0_6px_16px_-10px_rgba(15,17,21,0.15)] placeholder:text-neutral-400 transition focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/10"
            />
          </div>
        </div>

        {/* Quick links */}
        {!searching && (
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK_LINKS.map(({ title, description, icon: Icon, tone, href }) => (
              <Link
                key={title}
                href={href}
                className="group rounded-2xl border border-neutral-200/80 bg-white p-4 transition-colors hover:border-accent-border"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${SOFT_TONES[tone]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="mt-3 block text-[14.5px] font-semibold text-neutral-950">{title}</span>
                <span className="mt-0.5 block text-[13px] text-neutral-500">{description}</span>
              </Link>
            ))}
          </div>
        )}

        {/* FAQs */}
        <div className="mt-12 space-y-5">
          {groups.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200/80 bg-white py-12 text-center">
              <p className="text-[15px] font-medium text-neutral-800">No answers match &ldquo;{query}&rdquo;</p>
              <p className="mt-1 text-[13.5px] text-neutral-500">Try another word, or email us below.</p>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.topic} className="rounded-2xl border border-neutral-200/80 bg-white px-6 pb-1 pt-5 sm:px-7">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{group.topic}</h2>
                <div className="mt-1">
                  {group.faqs.map((faq) => {
                    const key = `${group.topic}:${faq.q}`;
                    // While searching, show every match expanded.
                    const isOpen = searching || openKey === key;
                    return <FaqItem key={key} faq={faq} isOpen={isOpen} onToggle={() => setOpenKey(openKey === key ? null : key)} />;
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Writing tips */}
        {!searching && (
          <section className="mt-16">
            <h2 className="mb-5 text-2xl font-bold tracking-tight text-neutral-950">Tips for getting past screening</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {WRITING_TIPS.map((tip, i) => (
                <div key={tip.title} className="flex gap-3 rounded-2xl border border-neutral-200/80 bg-white p-5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">{i + 1}</span>
                  <div>
                    <div className="text-[14.5px] font-semibold text-neutral-950">{tip.title}</div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-neutral-600">{tip.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        <div className="mt-16 flex flex-col justify-between gap-5 rounded-2xl border border-neutral-200/80 bg-white p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="flex items-start gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${SOFT_TONES.peach}`}>
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-[17px] font-bold tracking-tight text-neutral-950">Still stuck?</h3>
              <p className="mt-0.5 text-[14px] text-neutral-500">
                Email <span className="font-medium text-neutral-800">{SUPPORT_EMAIL}</span> and tell us what you were trying to do.
              </p>
            </div>
          </div>
          <a
            href={supportHref}
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-neutral-800"
          >
            Email support
            <ArrowRight className="h-4 w-4 text-accent-light transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
