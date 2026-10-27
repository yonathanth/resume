"use client";

import React, { useId, useState } from "react";
import { Check, Search } from "lucide-react";
import { useOccupationSearch } from "@/hooks/use-occupations";

interface ProfessionInputProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * Picking a suggestion, or Enter on what's typed: hands the title over (for
   * a list of professions — see ProfessionsInput) instead of just filling the field.
   */
  onCommit?: (title: string) => void;
  id?: string;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * One text field with suggestions from the occupation catalog. Picking a
 * suggestion fills it in; anything else the user types is kept as their own
 * profession (the server links it to the catalog if it matches exactly).
 */
export function ProfessionInput({
  value,
  onChange,
  onCommit,
  id,
  autoFocus,
  placeholder = "e.g. Software Engineer, Nurse, Accountant",
  className = "",
}: ProfessionInputProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const { data: suggestions = [], isFetching } = useOccupationSearch(value, open);

  const trimmed = value.trim();
  const exactMatch = suggestions.some((s) => s.title.toLowerCase() === trimmed.toLowerCase());
  // Suggestions only while something is typed: an empty, merely focused field
  // keeps the list closed so it never covers the buttons below it.
  const showList = open && trimmed.length > 0;

  const choose = (title: string) => {
    if (onCommit) {
      onCommit(title);
      onChange("");
    } else {
      onChange(title);
      setOpen(false);
    }
    setHighlight(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter" && showList && highlight >= 0 && suggestions[highlight]) {
      e.preventDefault();
      choose(suggestions[highlight].title);
    } else if (e.key === "Enter" && onCommit) {
      // In a list, Enter adds what's typed (and never submits the surrounding form).
      e.preventDefault();
      if (trimmed) choose(trimmed);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={highlight >= 0 ? `${listId}-${highlight}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        // Delay so a click on a suggestion lands before the list closes.
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        className={`w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition ${className}`}
      />

      {showList && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1.5 w-full max-h-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg py-1 animate-in fade-in duration-100"
        >
          {suggestions.map((s, i) => {
            const isChosen = s.title.toLowerCase() === trimmed.toLowerCase();
            return (
              <button
                key={s.id}
                id={`${listId}-${i}`}
                type="button"
                role="option"
                aria-selected={highlight === i}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(s.title)}
                className={`w-full px-3.5 py-2 flex items-center justify-between gap-3 text-left cursor-pointer ${
                  highlight === i ? "bg-neutral-50" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-neutral-900 truncate">{s.title}</span>
                  <span className="block text-xs text-neutral-500 truncate">{s.category}</span>
                </span>
                {isChosen && <Check className="w-4 h-4 shrink-0 text-accent" />}
              </button>
            );
          })}

          {trimmed && !exactMatch && (
            <div className={`px-3.5 py-2 text-xs text-neutral-500 ${suggestions.length > 0 ? "border-t border-neutral-100 mt-1" : ""}`}>
              {isFetching && suggestions.length === 0 ? (
                "Searching..."
              ) : (
                <>
                  Not listed? We&apos;ll save <span className="font-semibold text-neutral-800">&ldquo;{trimmed}&rdquo;</span> as
                  your profession.
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
