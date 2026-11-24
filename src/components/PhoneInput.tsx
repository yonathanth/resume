"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { COUNTRIES, joinPhone, splitPhone, type Country } from "@/lib/countries";

interface PhoneInputProps {
  /** The stored number, always "+<code> <number>" once edited here. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  /** Classes for the outer box (border, radius, focus ring) — matches the form's other inputs. */
  className?: string;
  invalid?: boolean;
}

/**
 * A phone number with its country code: a dropdown of every country with its
 * code beside the number. Stores one consistent string, "+251 911 234 567",
 * so CVs and the account show numbers the same way.
 */
export function PhoneInput({ value, onChange, id, name, placeholder = "911 234 567", className = "", invalid }: PhoneInputProps) {
  const [country, setCountry] = useState<Country>(() => splitPhone(value).country);
  const local = splitPhone(value, country).local;
  // Keep the chosen country when the value changes from outside (e.g. a CV loaded), unless its code differs.
  const lastEmitted = useRef(value);
  useEffect(() => {
    if (value !== lastEmitted.current) {
      setCountry(splitPhone(value, country).country);
      lastEmitted.current = value;
    }
  }, [value, country]);

  const emit = (next: string) => {
    lastEmitted.current = next;
    onChange(next);
  };

  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-lg border bg-white transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10 ${
        invalid ? "border-red-400" : "border-neutral-300"
      } ${className}`}
    >
      <label className="relative flex shrink-0 cursor-pointer items-center gap-1 border-r border-neutral-200 bg-neutral-50 pl-3 pr-2 text-sm font-medium text-neutral-800">
        <span className="sr-only">Country code</span>
        <span>+{country.dial}</span>
        <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
        {/* The native list (searchable by typing, a wheel on phones), laid invisibly over the short label. */}
        <select
          value={country.iso}
          onChange={(e) => {
            const next = COUNTRIES.find((c) => c.iso === e.target.value);
            if (!next) return;
            setCountry(next);
            emit(joinPhone(next, local));
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Country code"
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.name} (+{c.dial})
            </option>
          ))}
        </select>
      </label>
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={local}
        placeholder={placeholder}
        onChange={(e) => {
          const typed = e.target.value;
          // A pasted full international number picks its own country.
          if (typed.trim().startsWith("+")) {
            const split = splitPhone(typed, country);
            setCountry(split.country);
            emit(joinPhone(split.country, split.local));
            return;
          }
          emit(joinPhone(country, typed));
        }}
        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
      />
    </div>
  );
}
