"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileText, ArrowRight, Menu, X } from "lucide-react";

interface NavbarProps {
  onOpenEditor?: () => void;
  theme?: "light" | "dark";
}

export function Navbar({ onOpenEditor, theme = "light" }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDark = theme === "dark";

  return (
    <header className="fixed top-5 inset-x-0 z-50 flex justify-center px-4 sm:px-6 w-full pointer-events-none">
      <nav
        aria-label="Main Navigation"
        className={`pointer-events-auto flex items-center justify-between w-full max-w-4xl px-4 sm:px-6 py-2.5 rounded-full backdrop-blur-md transition-all duration-200 ${
          isDark
            ? "bg-[#141416]/90 border border-neutral-800 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)] text-white"
            : "bg-white/90 border border-neutral-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] text-neutral-950"
        }`}
      >
        {/* Logo */}
        <Link
          href="/"
          className={`flex items-center gap-2.5 font-semibold tracking-tight group ${
            isDark ? "text-white" : "text-neutral-950"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200 ${
              isDark ? "bg-white text-neutral-950" : "bg-neutral-950 text-white"
            }`}
          >
            <FileText className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="text-[15px] font-bold tracking-tight">Resumate</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div
          className={`hidden md:flex items-center gap-8 text-[14px] font-medium ${
            isDark ? "text-neutral-400" : "text-neutral-600"
          }`}
        >
          <Link
            href="/#templates"
            className={`transition-colors duration-150 ${
              isDark ? "hover:text-white" : "hover:text-neutral-950"
            }`}
          >
            Templates
          </Link>
          <Link
            href="/#how-it-works"
            className={`transition-colors duration-150 ${
              isDark ? "hover:text-white" : "hover:text-neutral-950"
            }`}
          >
            How it works
          </Link>
          <Link
            href="/pricing"
            className={`transition-colors duration-150 ${
              isDark ? "text-white font-semibold" : "hover:text-neutral-950"
            }`}
          >
            Pricing
          </Link>
        </div>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className={`text-[14px] font-medium px-3 py-1.5 transition-colors ${
              isDark
                ? "text-neutral-300 hover:text-white"
                : "text-neutral-700 hover:text-neutral-950"
            }`}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold active:scale-98 transition-all shadow-xs ${
              isDark
                ? "bg-white text-neutral-950 hover:bg-neutral-200"
                : "bg-neutral-950 text-white hover:bg-neutral-800"
            }`}
          >
            <span>Get started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`md:hidden p-1.5 rounded-lg focus:outline-none ${
            isDark
              ? "text-neutral-400 hover:text-white"
              : "text-neutral-600 hover:text-neutral-950"
          }`}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div
          className={`pointer-events-auto absolute top-16 inset-x-4 max-w-md mx-auto p-4 rounded-2xl shadow-xl flex flex-col gap-3 md:hidden animate-in fade-in slide-in-from-top-2 ${
            isDark
              ? "bg-[#141416] border border-neutral-800 text-white"
              : "bg-white border border-neutral-200 text-neutral-900"
          }`}
        >
          <Link
            href="/#templates"
            onClick={() => setMobileMenuOpen(false)}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              isDark
                ? "text-neutral-300 hover:bg-neutral-800/80"
                : "text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            Templates
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              isDark
                ? "text-neutral-300 hover:bg-neutral-800/80"
                : "text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            How it works
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              isDark
                ? "text-white font-semibold bg-neutral-800/60"
                : "text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            Pricing
          </Link>
          <div
            className={`pt-2 mt-1 border-t flex flex-col gap-2 ${
              isDark ? "border-neutral-800" : "border-neutral-100"
            }`}
          >
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-medium text-center ${
                isDark
                  ? "text-neutral-300 hover:bg-neutral-800/80"
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full py-2.5 rounded-full text-center text-sm font-semibold ${
                isDark
                  ? "bg-white text-neutral-950 hover:bg-neutral-200"
                  : "bg-neutral-950 text-white hover:bg-neutral-800"
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
