"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2, X } from "lucide-react";
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
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
      {hint && <span className="block mt-1.5 text-xs text-neutral-500">{hint}</span>}
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
