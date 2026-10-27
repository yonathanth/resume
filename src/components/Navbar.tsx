"use client";

import React, { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CtaButton } from "@/components/CtaButton";
import { MenuToggleIcon } from "@/components/MenuToggleIcon";

interface NavbarProps {
  onOpenEditor?: () => void;
  theme?: "light" | "dark";
}

const NAV_LINKS = [
  { href: "/templates", label: "Templates" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

// The phone menu: a plain list in sections — what we'd most like people to
// do first (straight into a flow, no account needed until the AI runs — see
// /try), then the rest.
const MENU_SECTIONS = [
  {
    title: "Start now",
    links: [
      { href: "/try/create", label: "Build a resume" },
      { href: "/try/tailor", label: "Tailor to a job" },
      { href: "/try/improve", label: "Improve my resume" },
    ],
  },
  {
    title: "Explore",
    links: [
      { href: "/templates", label: "Templates" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/#results", label: "Before & after" },
      { href: "/pricing", label: "Pricing" },
      { href: "/help", label: "Help center" },
    ],
  },
];

// Full-width bar: logo and links on the left, account actions on the right.
// Transparent over the hero; frosts with a hairline border once scrolled.
export function Navbar({ theme = "light" }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isDark = theme === "dark";
  const pathname = usePathname();
  // The page you're on (its section, e.g. /templates/classic → Templates).
  const isCurrent = (href: string) => !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));

  // The phone menu covers the page: hold the page still and let Escape close it.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const surface = mobileMenuOpen
    ? isDark
      ? "bg-[#0a0a0a] border-neutral-800/80"
      : "bg-[#f5f5f4] border-neutral-200/70"
    : scrolled
      ? isDark
        ? "bg-[#0a0a0a]/80 border-neutral-800/80 backdrop-blur-xl"
        : "bg-white/80 border-neutral-200/70 backdrop-blur-xl"
      : "bg-transparent border-transparent";

  const close = () => setMobileMenuOpen(false);

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
          <Link href="/" className="flex items-center gap-2 group" aria-label="gomoxie home">
            <BrandMark size={36} className="transition-transform duration-200 group-hover:scale-105" />
            <span className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-neutral-950"}`}>
              gomoxie
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-[16px] font-medium">
            {NAV_LINKS.map((link) => {
              const current = isCurrent(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  className={`group relative transition-colors duration-200 ${current ? "text-accent" : linkClass}`}
                >
                  {link.label}
                  {/* A short centred underline: grows in under the current page, faintly on hover for the others. */}
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-0.5 left-1/2 h-[2px] w-5 -translate-x-1/2 origin-center rounded-full bg-accent transition-transform duration-300 ease-out ${
                      current ? "nav-underline-in scale-x-100" : "scale-x-0 opacity-60 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            })}
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
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          <MenuToggleIcon open={mobileMenuOpen} className="h-6 w-6" />
        </button>
      </nav>

      {/* Phone menu: the whole screen under the bar */}
      {mobileMenuOpen && (
        <div
          className={`menu-in md:hidden fixed inset-x-0 bottom-0 top-20 sm:top-24 flex flex-col overflow-y-auto ${
            isDark ? "bg-[#0a0a0a] text-white" : "bg-[#f5f5f4] text-neutral-950"
          }`}
        >
          <div className="flex-1 px-6 pt-6 sm:px-8">
          {MENU_SECTIONS.map((section, s) => (
            <div key={section.title} className="mb-6">
              <div className="menu-item-in mb-1.5 text-[13px] font-medium text-neutral-500" style={{ animationDelay: `${s * 120}ms` }}>
                {section.title}
              </div>
              <ul className="flex flex-col gap-2">
                {section.links.map((link, i) => (
                  <li key={link.href} className="menu-item-in" style={{ animationDelay: `${s * 120 + (i + 1) * 35}ms` }}>
                    <Link
                      href={link.href}
                      onClick={close}
                      aria-current={isCurrent(link.href) ? "page" : undefined}
                      className={`text-[18px] font-medium tracking-tight ${isCurrent(link.href) ? "text-accent" : ""}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          </div>

          {/* Account, kept at the bottom */}
          <div
            style={{ animationDelay: "180ms" }}
            className={`menu-item-in sticky bottom-0 grid grid-cols-2 gap-2.5 border-t px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-8 ${
              isDark ? "border-neutral-800 bg-[#0a0a0a]" : "border-neutral-200/70 bg-[#f5f5f4]"
            }`}
          >
            <Link
              href="/login"
              onClick={close}
              className={`rounded-full border py-3 text-center text-[15px] font-semibold ${
                isDark ? "border-neutral-700 text-white" : "border-neutral-300 bg-white text-neutral-950"
              }`}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={close}
              className={`rounded-full py-3 text-center text-[15px] font-semibold ${
                isDark ? "bg-white text-neutral-950" : "bg-neutral-950 text-white"
              }`}
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
