import React from "react";
import type { SimpleIcon } from "simple-icons";

/** A brand's mark from simple-icons, in its own color. */
export function BrandIcon({ icon, className = "", mono = false }: { icon: SimpleIcon; className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={icon.title} className={`shrink-0 ${className}`} fill={mono ? "currentColor" : `#${icon.hex}`}>
      <path d={icon.path} />
    </svg>
  );
}
