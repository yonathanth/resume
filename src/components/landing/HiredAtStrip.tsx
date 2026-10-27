import React from "react";
import { HIRED_AT } from "@/lib/social-proof";
import { BrandIcon } from "./BrandIcon";

/** Under the hero: where people who used GoMoxie got hired. */
export function HiredAtStrip() {
  return (
    <section aria-label="Where our users got hired" className="mx-auto w-full max-w-5xl px-4 pb-16 pt-2 sm:px-6 sm:pb-24 lg:px-8">
      <p className="text-center text-[15px] text-neutral-500">
        Helping job seekers land roles at {HIRED_AT.companiesCount} companies like
      </p>
      {/* Phones: the logos pass by in a loop (the list twice over, the copy hidden from screen readers), faded at the edges. */}
      <div className="-mx-4 mt-7 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] sm:hidden">
        <div className="animate-marquee-left flex w-max">
          {[false, true].map((copy) => (
            <ul key={String(copy)} aria-hidden={copy || undefined} className="flex shrink-0">
              {HIRED_AT.companies.map((company) => (
                <Company key={company.name} company={company} className="pr-9" />
              ))}
            </ul>
          ))}
        </div>
      </div>
      {/* Larger screens: a grid. */}
      <ul className="mt-8 hidden grid-cols-4 gap-x-6 gap-y-10 sm:grid">
        {HIRED_AT.companies.map((company) => (
          <Company key={company.name} company={company} />
        ))}
      </ul>
    </section>
  );
}

function Company({ company, className = "" }: { company: (typeof HIRED_AT.companies)[number]; className?: string }) {
  return (
    <li className={`flex shrink-0 items-center justify-center gap-2.5 ${className}`}>
      <BrandIcon icon={company.icon} className="h-6 w-6 sm:h-7 sm:w-7" />
      <span className="whitespace-nowrap text-lg font-semibold tracking-tight text-neutral-800 sm:text-xl">{company.name}</span>
    </li>
  );
}
