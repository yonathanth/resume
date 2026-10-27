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
      <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4 sm:gap-y-10">
        {HIRED_AT.companies.map((company) => (
          <li key={company.name} className="flex items-center justify-center gap-2.5">
            <BrandIcon icon={company.icon} className="h-6 w-6 sm:h-7 sm:w-7" />
            <span className="text-lg font-semibold tracking-tight text-neutral-800 sm:text-xl">{company.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
