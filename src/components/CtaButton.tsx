"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface CtaButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  /** primary: black pill. secondary: white pill with a hairline border. */
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  /** Keep the arrow neutral instead of the brand colour. */
  plainArrow?: boolean;
  className?: string;
}

/** The landing pages' call-to-action pill — a little taller and bolder, nothing louder. */
export function CtaButton({ children, href, onClick, variant = "primary", size = "md", plainArrow = false, className = "" }: CtaButtonProps) {
  const primary = variant === "primary";

  const shell = [
    "group inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-colors duration-200 active:scale-[0.98]",
    size === "sm" ? "px-5 py-2.5 text-[14px]" : "px-8 py-4 text-[15.5px]",
    primary
      ? "bg-neutral-950 text-white hover:bg-neutral-800"
      : "border border-neutral-200 bg-white text-neutral-950 hover:border-neutral-300 hover:bg-neutral-50",
    className,
  ].join(" ");

  const content = (
    <>
      <span>{children}</span>
      <ArrowRight
        className={`${size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} transition-transform duration-200 group-hover:translate-x-0.5 ${
          plainArrow ? (primary ? "text-white/70" : "text-neutral-400") : primary ? "text-accent-light" : "text-accent"
        }`}
      />
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={shell}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={shell}>
      {content}
    </button>
  );
}
