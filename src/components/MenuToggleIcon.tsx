import React from "react";

/** The menu button's icon: two bold bars that turn into an X while the menu is open. */
export function MenuToggleIcon({ open, className = "" }: { open: boolean; className?: string }) {
  const bar = "absolute left-[2px] right-[2px] h-[2.5px] rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";
  return (
    <span aria-hidden="true" className={`relative block h-5 w-5 ${className}`}>
      <span className={`${bar} ${open ? "top-[8.75px] rotate-45" : "top-[5.5px]"}`} />
      <span className={`${bar} ${open ? "top-[8.75px] -rotate-45" : "top-[12px]"}`} />
    </span>
  );
}
