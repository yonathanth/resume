"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FilePlus, LayoutTemplate, User, CreditCard, Search, Mail, ArrowRight } from "lucide-react";
import { useDashboard } from "./DashboardContext";
import { useMe } from "@/hooks/use-auth";
import { SOFT_TONES, SoftTone } from "./create-flow/OptionCard";
import { SUPPORT_EMAIL, WRITING_TIPS, filterFaqGroups } from "@/lib/help-content";
import { FaqItem } from "@/components/FaqItem";

export function HelpView() {
  const { handleNewResume } = useDashboard();
  const { data: me } = useMe();
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const groups = filterFaqGroups(query);

  const quickLinks: {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: SoftTone;
    onClick?: () => void;
    href?: string;
  }[] = [
    { title: "New Resume", description: "Start a new resume in a few minutes.", icon: FilePlus, tone: "peach", onClick: handleNewResume },
    { title: "Browse templates", description: "Preview every layout.", icon: LayoutTemplate, tone: "sage", href: "/dashboard/templates" },
    { title: "Career profiles", description: "Your experience and skills, one profile per role.", icon: User, tone: "lavender", href: "/dashboard/career-profiles" },
    { title: "Plan & billing", description: "Upgrade, renew or cancel.", icon: CreditCard, tone: "blue", href: "/dashboard/settings#plan" },
  ];

  const supportHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Help with Resumate")}${
    me?.email ? `&body=${encodeURIComponent(`\n\n--\nAccount: ${me.email}`)}` : ""
  }`;

  return (
    <div className="px-8 pt-6 pb-10 sm:px-14 sm:pt-8 sm:pb-14 lg:px-20 lg:pt-8 lg:pb-16 max-w-5xl mx-auto w-full">
      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions, e.g. download, cancel, template"
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition"
          />
        </div>
      </div>

      {/* FAQs */}
      <div className="space-y-6">
        {groups.length === 0 ? (
          <div className="py-12 text-center rounded-lg border border-neutral-300 bg-white">
            <p className="text-sm font-medium text-neutral-800">No answers match &ldquo;{query}&rdquo;</p>
            <p className="mt-1 text-xs text-neutral-500">Try another word, or email us below.</p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.topic} className="rounded-lg border border-neutral-300 bg-white px-6 sm:px-7 pt-5 pb-1">
              <h2 className="text-xs font-semibold text-neutral-500">{group.topic}</h2>
              <div className="mt-1">
                {group.faqs.map((faq) => {
                  const key = `${group.topic}:${faq.q}`;
                  // While searching, show every match expanded.
                  const isOpen = q ? true : openKey === key;
                  return (
                    <FaqItem key={key} faq={faq} isOpen={isOpen} onToggle={() => setOpenKey(openKey === key ? null : key)} />
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Writing tips */}
      {!q && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-neutral-950 tracking-tight mb-4">Tips for getting past screening</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WRITING_TIPS.map((tip, i) => (
              <div key={tip.title} className="flex gap-3 p-4 rounded-lg border border-neutral-300 bg-white">
                <span className="w-6 h-6 rounded-md shrink-0 bg-accent text-white flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-semibold text-neutral-950">{tip.title}</div>
                  <p className="mt-0.5 text-xs text-neutral-600 leading-relaxed">{tip.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick links — shortcuts for when the answer is "go do it" */}
      {!q && (
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map(({ title, description, icon: Icon, tone, onClick, href }) => {
            const content = (
              <>
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center border ${SOFT_TONES[tone]}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="mt-3 block text-sm font-semibold text-neutral-950">{title}</span>
                <span className="mt-0.5 block text-xs text-neutral-500">{description}</span>
              </>
            );
            const className =
              "group block text-left p-4 rounded-lg border border-neutral-300 bg-gradient-to-b from-white to-neutral-50 hover:border-accent-border transition-colors cursor-pointer";
            return href ? (
              <Link key={title} href={href} className={className}>
                {content}
              </Link>
            ) : (
              <button key={title} type="button" onClick={onClick} className={className}>
                {content}
              </button>
            );
          })}
        </div>
      )}

      {/* Contact */}
      <div className="mt-12 rounded-lg border border-neutral-300 bg-white p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center border ${SOFT_TONES.peach}`}>
            <Mail className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-base font-bold text-neutral-950 tracking-tight">Still stuck?</h3>
            <p className="text-sm text-neutral-500 mt-0.5">
              Email <span className="font-medium text-neutral-800">{SUPPORT_EMAIL}</span> and include what you were trying to do.
            </p>
          </div>
        </div>
        <a
          href={supportHref}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-strong transition-colors"
        >
          Email support
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
