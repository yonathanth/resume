"use client";

import React from "react";
import { BrandMark } from "@/components/BrandMark";
import Link from "next/link";
import { ArrowUp } from "lucide-react";

// Only pages and sections that exist.
const LINK_COLUMNS = [
  {
    // Straight into a flow, no account needed until the AI runs (see /try).
    title: "Quick start",
    links: [
      { label: "Build a resume", href: "/try/create" },
      { label: "Tailor to a job", href: "/try/tailor" },
      { label: "Improve my resume", href: "/try/improve" },
    ],
  },
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Before & after", href: "/#results" },
      { label: "Templates", href: "/templates" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Get started", href: "/signup" },
      { label: "Log in", href: "/login" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Help center", href: "/help" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative bg-[#0a0a0a] text-white pt-20 pb-14 px-4 sm:px-6 lg:px-8">
      {/* Inverted / Concave Top-Left Corner matching Mobbin reference */}
      <svg
        className="absolute -top-10 sm:-top-12 lg:-top-14 left-0 w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-[#0a0a0a] pointer-events-none select-none"
        viewBox="0 0 48 48"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M0,0 C0,26.51 21.49,48 48,48 L0,48 Z" />
      </svg>

      {/* Inverted / Concave Top-Right Corner matching Mobbin reference */}
      <svg
        className="absolute -top-10 sm:-top-12 lg:-top-14 right-0 w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-[#0a0a0a] pointer-events-none select-none"
        viewBox="0 0 48 48"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M48,0 C48,26.51 26.51,48 0,48 L48,48 Z" />
      </svg>

      <div className="max-w-6xl mx-auto">
        {/* Top: brand on the left, link columns on the right */}
        <div className="flex flex-col md:flex-row justify-between gap-12 lg:gap-16">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <BrandMark size={36} className="transition-transform duration-200 group-hover:scale-105" />
              <span className="text-lg font-bold tracking-tight text-white">gomoxie</span>
            </Link>
            <p className="mt-5 flex items-start gap-2.5 text-sm sm:text-base text-neutral-400 leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              Craft resumes that land interviews — tailored to every job, ready in minutes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-10 sm:grid-cols-3 sm:gap-x-14 lg:gap-x-20">
            {LINK_COLUMNS.map((column) => (
              <div key={column.title}>
                <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{column.title}</div>
                <ul className="space-y-3.5 text-[14px]">
                  {column.links.map((item) => (
                    <li key={item.label}>
                      <Link href={item.href} className="text-neutral-300 hover:text-accent-light transition-colors duration-150">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: divider with a warm start, copyright, back to top.
            Mobile: legal links + back to top share a row, copyright below.
            sm+: copyright, legal links, then back to top on the right. */}
        <div className="relative mt-14 sm:mt-24 pt-8 border-t border-neutral-900 flex flex-wrap items-center justify-between gap-x-6 gap-y-5 sm:flex-nowrap text-[13px] text-neutral-500">
          <div className="absolute -top-px left-0 h-px w-40 bg-gradient-to-r from-accent/70 to-transparent" />
          <div className="order-1 sm:order-2 sm:mr-auto flex items-center gap-6">
            <Link href="/terms" className="hover:text-accent-light transition-colors duration-150">Terms</Link>
            <Link href="/privacy" className="hover:text-accent-light transition-colors duration-150">Privacy</Link>
          </div>
          <Link href="#" className="order-2 sm:order-3 group inline-flex items-center gap-1.5 hover:text-accent-light transition-colors duration-150">
            Back to top
            <ArrowUp className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
          </Link>
          <span className="order-3 sm:order-1 w-full sm:w-auto text-neutral-600 sm:text-neutral-500">© gomoxie 2026. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
