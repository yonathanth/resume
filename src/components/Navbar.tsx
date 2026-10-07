"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Menu, X } from "lucide-react";
import { CtaButton } from "@/components/CtaButton";

interface NavbarProps {
  onOpenEditor?: () => void;
  theme?: "light" | "dark";
}

const NAV_LINKS = [
  { href: "/templates", label: "Templates" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

// Full-width bar: logo and links on the left, account actions on the right.
// Transparent over the hero; frosts with a hairline border once scrolled.
export function Navbar({ theme = "light" }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isDark = theme === "dark";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const surface = scrolled || mobileMenuOpen
    ? isDark
      ? "bg-[#0a0a0a]/80 border-neutral-800/80 backdrop-blur-xl"
      : "bg-white/80 border-neutral-200/70 backdrop-blur-xl"
    : "bg-transparent border-transparent";

  const linkClass = isDark
    ? "text-white hover:text-neutral-300"
    : "text-neutral-950 hover:text-neutral-600";

  return (
    <header className={`fixed top-0 inset-x-0 z-50 border-b transition-colors duration-200 ${surface}`}>
      <nav
        aria-label="Main Navigation"
        className="mx-auto flex h-20 sm:h-24 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10"
      >
        {/* Logo + primary links */}
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2 group" aria-label="Resumate home">
            <div
              className={`w-8 h-8 rounded-[10px] flex items-center justify-center group-hover:scale-105 transition-transform duration-200 ${
                isDark ? "bg-white text-neutral-950" : "bg-neutral-950 text-white"
              }`}
            >
              <FileText className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className={`text-[17px] font-bold tracking-tight ${isDark ? "text-white" : "text-neutral-950"}`}>
              Resumate
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-[16px] font-medium">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={`transition-colors duration-150 ${linkClass}`}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Account actions */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/login" className={`text-[16px] font-medium transition-colors ${linkClass}`}>
            Log in
          </Link>
          <span className={`h-5 w-px ${isDark ? "bg-neutral-800" : "bg-neutral-200"}`} />
          <CtaButton href="/signup" size="sm" variant={isDark ? "secondary" : "primary"}>
            Get started
          </CtaButton>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`md:hidden p-1.5 rounded-lg focus:outline-none ${linkClass}`}
          aria-label="Toggle Menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden border-t px-4 pb-5 pt-3 flex flex-col gap-1 ${
            isDark ? "border-neutral-800 text-white" : "border-neutral-100 text-neutral-900"
          }`}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-lg text-[15px] font-medium ${
                isDark ? "text-neutral-300 hover:bg-neutral-800/80" : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className={`pt-3 mt-2 border-t flex flex-col gap-2 ${isDark ? "border-neutral-800" : "border-neutral-100"}`}>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-lg text-[15px] font-medium text-center ${
                isDark ? "text-neutral-300 hover:bg-neutral-800/80" : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full py-2.5 rounded-full text-center text-[15px] font-semibold ${
                isDark ? "bg-white text-neutral-950 hover:bg-neutral-200" : "bg-neutral-950 text-white hover:bg-neutral-800"
              }`}
            >
              Get started free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
