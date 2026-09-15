"use client";

import React from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

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
        
        {/* Top Area: Brand & Tagline on Left, 2 Link Columns on Right */}
        <div className="flex flex-col md:flex-row justify-between gap-12 lg:gap-16">
          
          {/* Left Column: Logo & Tagline */}
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-white text-neutral-950 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
                <FileText className="w-4 h-4 stroke-[2.4]" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">Resumate</span>
            </Link>
            
            <p className="mt-5 text-sm sm:text-base text-neutral-400 font-normal leading-relaxed">
              Craft resumes that land interviews with Resumate.
            </p>
          </div>

          {/* Right Columns: Two Navigation Columns */}
          <div className="grid grid-cols-2 gap-12 sm:gap-20 lg:gap-24">
            
            {/* Column 1 */}
            <div>
              <ul className="space-y-3.5 text-[13px] sm:text-[14px]">
                {[
                  { label: "Templates", href: "/#templates" },
                  { label: "How it works", href: "/#how-it-works" },
                  { label: "Real results", href: "/#results" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "ATS Scanner", href: "/#editor" },
                  { label: "Changelog", href: "#" },
                  { label: "Blog", href: "#" },
                  { label: "Enterprise", href: "/pricing" },
                ].map((item, idx) => (
                  <li key={idx}>
                    <Link
                      href={item.href}
                      className="text-neutral-300 hover:text-white transition-colors duration-150"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2 */}
            <div>
              <ul className="space-y-3.5 text-[13px] sm:text-[14px]">
                {[
                  { label: "Contact", href: "#" },
                  { label: "Help center", href: "#" },
                  { label: "Careers", href: "#" },
                  { label: "Community", href: "#" },
                  { label: "X (Twitter)", href: "#" },
                  { label: "LinkedIn", href: "#" },
                ].map((item, idx) => (
                  <li key={idx}>
                    <Link
                      href={item.href}
                      className="text-neutral-300 hover:text-white transition-colors duration-150"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>

        {/* Bottom Area: Copyright on Left, Privacy & Terms Aligned Under the Two Columns on Right */}
        <div className="mt-20 sm:mt-24 pt-8 border-t border-neutral-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          
          {/* Bottom Left: Copyright */}
          <div className="text-xs sm:text-[13px] text-neutral-500 font-normal">
            © Resumate 2026. All rights reserved.
          </div>

          {/* Bottom Right: Aligned with the two columns above */}
          <div className="grid grid-cols-2 gap-12 sm:gap-20 lg:gap-24 text-xs sm:text-[13px]">
            <Link
              href="#privacy"
              className="text-neutral-500 hover:text-neutral-300 transition-colors duration-150"
            >
              Privacy policy
            </Link>
            <Link
              href="#terms"
              className="text-neutral-500 hover:text-neutral-300 transition-colors duration-150"
            >
              Terms
            </Link>
          </div>

        </div>

      </div>
    </footer>
  );
}
