"use client";

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Plus, Search, Trash2, X } from "lucide-react";
import { CvBullet } from "./types";
import { ICON_TONES, OptionTone } from "./OptionCard";
import { newLocalId } from "@/lib/cv-mapper";

// The same form controls as Settings, so the editor reads as part of the app.
export const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition";
export const labelClass = "block text-xs font-semibold text-neutral-700 mb-1.5";
export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-300 bg-white text-sm font-semibold text-neutral-800 hover:border-neutral-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
  /** Which value this edits ("role", "startDate"…) — lets a click on the preview find it. */
  name?: string;
}

export function Field({ label, value, onChange, placeholder, type = "text", hint, name }: FieldProps) {
  return (
    <label className="block" data-field={name}>
      <span className={labelClass}>{label}</span>
      {type === "text" ? (
        <GrowingText value={value} onChange={onChange} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      )}
      {hint && <span className="block mt-1.5 text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}

/**
 * A one-line value that wraps instead of scrolling sideways: it grows a line
 * at a time so the whole text stays in view. Still a single line of data:
 * Enter doesn't add a break, and pasted breaks become spaces.
 */
export function GrowingText({
  value,
  onChange,
  placeholder,
  className = "",
  ...rest
}: { value: string; onChange: (value: string) => void; placeholder?: string; className?: string } & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "placeholder" | "className"
>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // scrollHeight leaves out the border; add it back so nothing scrolls.
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
  };
  useLayoutEffect(fit, [value]);
  // Rewrap when the column changes width (window resize, preview opened).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <textarea
      {...rest}
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/[ \t]*\r?\n[ \t]*/g, " "))}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.preventDefault();
        rest.onKeyDown?.(e);
      }}
      className={`${inputClass} block resize-none overflow-hidden leading-5 ${className}`}
    />
  );
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2023-01" → {2023, 0}; "2023" → {2023, null}; anything else → null. */
function parseMonth(value: string): { year: number; month: number | null } | null {
  const text = value.trim();
  let m = /^(\d{4})-(\d{1,2})$/.exec(text);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return { year: Number(m[1]), month: Number(m[2]) - 1 };
  m = /(\d{4})/.exec(text);
  return m ? { year: Number(m[1]), month: null } : null;
}

/**
 * A date on a CV (month and year, or just the year): type it, or pick it from
 * the calendar button. Picking saves "2023-01" (the format every template
 * formats); typing anything else ("Expected 2026") is kept as written.
 */
export function MonthField({
  label,
  value,
  onChange,
  placeholder = "2023-01",
  name,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseMonth(value);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(parsed?.year ?? thisYear);
  const box = useRef<HTMLDivElement>(null);

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div className="block" data-field={name} ref={box}>
      <span className={labelClass}>{label}</span>
      <div className="relative">
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-10 disabled:bg-neutral-50 disabled:text-neutral-400`}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setYear(parseMonth(value)?.year ?? thisYear);
            setOpen((v) => !v);
          }}
          aria-label={`Pick ${label.toLowerCase()} date`}
          aria-expanded={open}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
            open ? "bg-accent-soft text-accent-strong" : "text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
        </button>

        {open && (
          <div
            role="dialog"
            aria-label={`${label} date`}
            className="absolute z-30 right-0 mt-1.5 w-64 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => setYear((y) => y - 1)} className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer" aria-label="Previous year">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold tabular-nums text-neutral-950">{year}</span>
              <button
                type="button"
                onClick={() => setYear((y) => y + 1)}
                disabled={year >= thisYear + 10}
                className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next year"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {MONTH_NAMES.map((m, i) => {
                const selected = parsed?.year === year && parsed.month === i;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pick(`${year}-${String(i + 1).padStart(2, "0")}`)}
                    className={`py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      selected ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-accent-soft hover:text-accent-strong"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => pick(String(year))}
                className={`text-xs font-semibold cursor-pointer ${
                  parsed?.year === year && parsed.month === null ? "text-accent-strong" : "text-neutral-600 hover:text-neutral-950"
                }`}
              >
                Just the year ({year})
              </button>
              {value && (
                <button type="button" onClick={() => pick("")} className="text-xs font-semibold text-neutral-400 hover:text-red-600 cursor-pointer">
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Common languages for the language field's suggestions; anything else can still be typed.
const LANGUAGES = [
  "Afrikaans", "Albanian", "Amharic", "Arabic", "Armenian", "Azerbaijani", "Basque", "Belarusian", "Bengali", "Bosnian",
  "Bulgarian", "Burmese", "Catalan", "Cantonese", "Croatian", "Czech", "Danish", "Dutch", "English", "Estonian", "Filipino",
  "Finnish", "French", "Galician", "Georgian", "German", "Greek", "Gujarati", "Hausa", "Hebrew", "Hindi", "Hungarian",
  "Icelandic", "Igbo", "Indonesian", "Irish", "Italian", "Japanese", "Kannada", "Kazakh", "Khmer", "Kinyarwanda", "Korean",
  "Kurdish", "Kyrgyz", "Lao", "Latvian", "Lithuanian", "Macedonian", "Malay", "Malayalam", "Maltese", "Mandarin", "Marathi",
  "Mongolian", "Nepali", "Norwegian", "Oromo", "Pashto", "Persian", "Polish", "Portuguese", "Punjabi", "Romanian", "Russian",
  "Serbian", "Sign language", "Sinhala", "Slovak", "Slovenian", "Somali", "Spanish", "Swahili", "Swedish", "Tagalog", "Tajik",
  "Tamil", "Telugu", "Thai", "Tigrinya", "Turkish", "Turkmen", "Ukrainian", "Urdu", "Uzbek", "Vietnamese", "Welsh", "Xhosa",
  "Yoruba", "Zulu",
];

/** Languages matching what's typed: those that start with it first ("en" → English), then those that contain it. */
function matchLanguages(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = LANGUAGES.filter((l) => l.toLowerCase().startsWith(q));
  const contains = LANGUAGES.filter((l) => !l.toLowerCase().startsWith(q) && l.toLowerCase().includes(q));
  return [...starts, ...contains].slice(0, 8);
}

/**
 * The language of a Languages entry, with suggestions as you type — the same
 * typeahead as the profession field in onboarding. Anything not listed is
 * kept as typed.
 */
export function LanguageField({ value, onChange, name = "language" }: { value: string; onChange: (value: string) => void; name?: string }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const suggestions = matchLanguages(value);
  const trimmed = value.trim();
  const exact = suggestions.some((s) => s.toLowerCase() === trimmed.toLowerCase());
  const showList = open && trimmed.length > 0 && (suggestions.length > 0 || !exact);

  const choose = (language: string) => {
    onChange(language);
    setOpen(false);
    setHighlight(-1);
  };

  return (
    <label className="block" data-field={name}>
      <span className={labelClass}>Language</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={highlight >= 0 ? `${listId}-${highlight}` : undefined}
          autoComplete="off"
          value={value}
          placeholder="e.g. English, Amharic"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          // Delay so a click on a suggestion lands before the list closes.
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, -1));
            } else if (e.key === "Enter" && showList) {
              e.preventDefault();
              if (highlight >= 0 && suggestions[highlight]) choose(suggestions[highlight]);
              else setOpen(false);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={`${inputClass} pl-10`}
        />
        {showList && (
          <div
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1.5 w-full max-h-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg py-1 animate-in fade-in duration-100"
          >
            {suggestions.map((s, i) => (
              <button
                key={s}
                id={`${listId}-${i}`}
                type="button"
                role="option"
                aria-selected={highlight === i}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(s)}
                className={`w-full px-3.5 py-2 flex items-center justify-between gap-3 text-left text-sm font-medium text-neutral-900 cursor-pointer ${
                  highlight === i ? "bg-neutral-50" : ""
                }`}
              >
                {s}
                {s.toLowerCase() === trimmed.toLowerCase() && <Check className="w-4 h-4 shrink-0 text-accent" />}
              </button>
            ))}
            {!exact && (
              <div className={`px-3.5 py-2 text-xs text-neutral-500 ${suggestions.length > 0 ? "border-t border-neutral-100 mt-1" : ""}`}>
                Not listed? We&apos;ll keep <span className="font-semibold text-neutral-800">&ldquo;{trimmed}&rdquo;</span> as you wrote it.
              </div>
            )}
          </div>
        )}
      </div>
    </label>
  );
}

/** "I currently work here" and friends. */
export function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="mt-2 inline-flex items-center gap-2 text-sm text-neutral-700 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-neutral-300 accent-[var(--accent)] cursor-pointer"
      />
      {label}
    </label>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: OptionTone;
  actionLabel?: string;
  onAction?: () => void;
  /** Extra controls on the right, e.g. AI Polish. */
  children?: React.ReactNode;
}

/** A section's title row — the icon tile and type of the dashboard's section cards. */
export function SectionHeader({ title, subtitle, icon: Icon, tone = "neutral", actionLabel, onAction, children }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 pb-5 border-b border-neutral-200">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-b border ${ICON_TONES[tone]}`}>
            <Icon className="w-4 h-4" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-bold text-neutral-950 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {children}
        {actionLabel && onAction && (
          <button type="button" onClick={onAction} className={secondaryButtonClass}>
            <Plus className="w-4 h-4" />
            <span>{actionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface EntryCardProps {
  title: string;
  /** A short line under the title, e.g. "Acme · 2021 – Present". */
  meta?: string;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Lets the editor find this card ("data-entry-id"). */
  entryId?: string;
  /** Changes each time the card is picked from the preview: it opens, scrolls into view, and flashes. */
  focusSignal?: number;
  children: React.ReactNode;
}

const iconButtonClass =
  "p-1.5 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed";

/** One entry (a role, a degree...) — collapsible, reorderable, removable. */
export function EntryCard({ title, meta, onRemove, onMoveUp, onMoveDown, entryId, focusSignal, children }: EntryCardProps) {
  const [open, setOpen] = useState(true);
  const [flash, setFlash] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusSignal) return;
    // Picked from the preview: show it, bring it into view, and flash it.
    /* eslint-disable react-hooks/set-state-in-effect -- reacting to an external pick, not syncing derived state */
    setOpen(true);
    setFlash(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const frame = requestAnimationFrame(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    const timer = setTimeout(() => setFlash(false), 1600);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [focusSignal]);

  return (
    <div
      ref={cardRef}
      data-entry-id={entryId}
      className={`rounded-lg border bg-white transition-colors duration-700 ${
        flash ? "border-accent-border bg-accent-soft/30" : "border-neutral-300"
      }`}
    >
      <div className="flex items-center gap-2 pl-4 pr-2 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer"
        >
          <ChevronDown className={`w-4 h-4 shrink-0 text-neutral-400 transition-transform ${open ? "" : "-rotate-90"}`} />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-neutral-950 truncate">{title}</span>
            {meta && <span className="block text-xs text-neutral-500 truncate">{meta}</span>}
          </span>
        </button>
        {(onMoveUp || onMoveDown) && (
          <>
            <button type="button" onClick={onMoveUp} disabled={!onMoveUp} className={iconButtonClass} aria-label="Move up">
              <ArrowUp className="w-4 h-4" />
            </button>
            <button type="button" onClick={onMoveDown} disabled={!onMoveDown} className={iconButtonClass} aria-label="Move down">
              <ArrowDown className="w-4 h-4" />
            </button>
          </>
        )}
        <button type="button" onClick={onRemove} className={`${iconButtonClass} hover:!text-red-600 hover:!bg-red-50`} aria-label={`Remove ${title}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {open && <div className="px-4 pb-4 pt-3 space-y-4 border-t border-neutral-200">{children}</div>}
    </div>
  );
}

/** A dashed full-width "add another" button that sits under a list. */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 py-3 rounded-lg border border-dashed border-neutral-300 text-sm font-semibold text-neutral-600 hover:text-accent-strong hover:border-accent-border hover:bg-accent-soft/50 transition-colors cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      {label}
    </button>
  );
}

export function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50/70 px-6 py-10 text-center">
      <p className="text-sm text-neutral-500">{message}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className={`${secondaryButtonClass} mt-4`}>
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

interface BulletEditorProps {
  bullets: CvBullet[];
  onChange: (bullets: CvBullet[]) => void;
}

/** Bullets with an optional bold label — "Label: text" in the rendered CV. */
export function BulletEditor({ bullets, onChange }: BulletEditorProps) {
  const update = (id: string, patch: Partial<CvBullet>) =>
    onChange(bullets.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  return (
    <div className="space-y-3 pt-4 border-t border-neutral-200" data-field="bullets">
      <span className={labelClass}>Bullet points</span>
      {bullets.map((bullet) => (
        <div key={bullet.id} data-field={`bullet:${bullet.id}`} className="flex items-start gap-2">
          <span className="mt-3 w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={bullet.label}
              onChange={(e) => update(bullet.id, { label: e.target.value })}
              placeholder="Label (optional), e.g. Performance"
              className={`${inputClass} font-semibold`}
            />
            <textarea
              rows={2}
              value={bullet.text}
              onChange={(e) => update(bullet.id, { text: e.target.value })}
              placeholder="What you did and the result"
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(bullets.filter((b) => b.id !== bullet.id))}
            className={`${iconButtonClass} mt-1.5 hover:!text-red-600 hover:!bg-red-50`}
            aria-label="Remove bullet"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <AddButton label="Add bullet point" onClick={() => onChange([...bullets, { id: newLocalId("b"), label: "", text: "" }])} />
    </div>
  );
}

interface TagInputProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}

/** Tags added with Enter or comma; pasting "a, b, c" adds all three. */
export function TagInput({ items, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const additions = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !items.some((i) => i.toLowerCase() === s.toLowerCase()));
    if (additions.length) onChange([...items, ...additions]);
    setDraft("");
  };

  return (
    <div className="space-y-2.5">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-md text-sm font-medium bg-neutral-50 text-neutral-800 border border-neutral-300"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((i) => i !== item))}
                className="p-0.5 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/70 cursor-pointer"
                aria-label={`Remove ${item}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => {
          if (e.target.value.includes(",")) commit(e.target.value);
          else setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          }
        }}
        onBlur={() => draft.trim() && commit(draft)}
        className={inputClass}
      />
    </div>
  );
}
