"use client";

import React, { useState } from "react";
import { ChevronDown, Lock, Plus, Trash2, X } from "lucide-react";
import type { ProfileItemMeta } from "@/lib/api";
import { FieldDef, ItemRecord, SectionDef, tempId } from "./profile-sections";

export const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition disabled:bg-neutral-50 disabled:text-neutral-500";
export const LABEL_CLASS = "block text-xs font-semibold text-neutral-700 mb-1";

type Bullet = { id?: string; label?: string; text: string };

/** Comma-separated text field backed by a string array. Keeps the raw text while typing. */
function ListInput({ value, onChange, placeholder, disabled }: { value: unknown; onChange: (v: string[]) => void; placeholder?: string; disabled?: boolean }) {
  const [text, setText] = useState(() => (Array.isArray(value) ? value.join(", ") : ""));
  return (
    <input
      type="text"
      value={text}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean));
      }}
      className={INPUT_CLASS}
    />
  );
}

function Field({ def, item, onChange, disabled }: { def: FieldDef; item: ItemRecord; onChange: (key: string, value: unknown) => void; disabled?: boolean }) {
  const value = item[def.key];
  const missing = def.required && !(typeof value === "string" && value.trim());
  return (
    <div className={def.wide || def.type === "textarea" ? "sm:col-span-2" : ""}>
      <label className={LABEL_CLASS}>
        {def.label}
        {def.required && <span className="text-accent"> *</span>}
      </label>
      {def.type === "list" ? (
        <ListInput value={value} onChange={(v) => onChange(def.key, v)} placeholder={def.placeholder} disabled={disabled} />
      ) : def.type === "textarea" ? (
        <textarea
          rows={3}
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          placeholder={def.placeholder}
          onChange={(e) => onChange(def.key, e.target.value)}
          className={`${INPUT_CLASS} resize-y`}
        />
      ) : (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          placeholder={def.placeholder}
          onChange={(e) => onChange(def.key, e.target.value)}
          className={`${INPUT_CLASS} ${missing ? "border-amber-400" : ""}`}
        />
      )}
    </div>
  );
}

function BulletsEditor({ bullets, onChange, disabled }: { bullets: Bullet[]; onChange: (b: Bullet[]) => void; disabled?: boolean }) {
  const update = (index: number, text: string) => onChange(bullets.map((b, i) => (i === index ? { ...b, text } : b)));
  return (
    <div className="sm:col-span-2">
      <label className={LABEL_CLASS}>Achievements &amp; responsibilities</label>
      <div className="space-y-2">
        {bullets.map((bullet, index) => (
          <div key={bullet.id ?? index} className="flex items-start gap-2">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
            <textarea
              rows={2}
              value={bullet.label ? `${bullet.label}: ${bullet.text}` : bullet.text}
              disabled={disabled}
              onChange={(e) => {
                // Editing flattens a "Label: text" bullet into plain text.
                if (bullet.label) onChange(bullets.map((b, i) => (i === index ? { id: b.id, text: e.target.value } : b)));
                else update(index, e.target.value);
              }}
              placeholder="What you did, ideally with a result or number"
              className={`${INPUT_CLASS} resize-y`}
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(bullets.filter((_, i) => i !== index))}
                className="mt-1.5 p-1.5 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...bullets, { id: tempId(), text: "" }])}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-strong hover:text-accent cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add a point
        </button>
      )}
    </div>
  );
}

/** Where an item came from, in words — and whether merges will still touch it. */
export function ItemBadge({ meta }: { meta?: ProfileItemMeta }) {
  if (!meta) return <span className="text-[11px] font-medium text-neutral-400">Unsaved</span>;
  if (meta.locked) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500" title="You edited this, so new CVs won't change it">
        <Lock className="w-3 h-3" /> Yours
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium text-sky-700" title="Added from a CV. Edit it to make it yours">
      From a CV
    </span>
  );
}

interface SectionEditorProps {
  def: SectionDef;
  items: ItemRecord[];
  onChange: (items: ItemRecord[]) => void;
  readOnly?: boolean;
}

export function ProfileSectionEditor({ def, items, onChange, readOnly }: SectionEditorProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const updateItem = (id: string | undefined, patch: Record<string, unknown>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const addItem = () => {
    const id = tempId();
    const blank: ItemRecord = { id };
    for (const field of def.fields) blank[field.key] = field.type === "list" ? [] : "";
    if (def.bullets) blank.bullets = [];
    onChange([...items, blank]);
    setOpenId(id);
  };

  return (
    <section className="rounded-lg border border-neutral-300 bg-white">
      <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-neutral-950">
            {def.label}
            {items.length > 0 && <span className="ml-2 text-xs font-semibold text-neutral-400">{items.length}</span>}
          </h3>
          {def.hint && <p className="mt-0.5 text-xs text-neutral-500">{def.hint}</p>}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={addItem}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:border-neutral-400 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add {def.noun}
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <p className="px-5 pb-4 text-xs text-neutral-400">Nothing here yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 border-t border-neutral-200">
          {items.map((item) => {
            const isOpen = openId === item.id;
            const subtitle = def.subtitle?.(item);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : (item.id ?? null))}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-neutral-50 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-neutral-900">{def.title(item)}</span>
                    {subtitle && <span className="block truncate text-xs text-neutral-500">{subtitle}</span>}
                  </span>
                  <ItemBadge meta={item.meta as ProfileItemMeta | undefined} />
                  <ChevronDown className={`w-4 h-4 shrink-0 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 bg-neutral-50/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {def.fields.map((field) => (
                        <Field
                          key={field.key}
                          def={field}
                          item={item}
                          disabled={readOnly}
                          onChange={(key, value) => updateItem(item.id, { [key]: value })}
                        />
                      ))}
                      {def.bullets && (
                        <BulletsEditor
                          bullets={(item.bullets as Bullet[] | undefined) ?? []}
                          disabled={readOnly}
                          onChange={(bullets) => updateItem(item.id, { bullets })}
                        />
                      )}
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => onChange(items.filter((i) => i.id !== item.id))}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove this {def.noun}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Chip editor for plain string lists (skills, interests). */
export function ChipListEditor({
  values,
  onChange,
  placeholder,
  readOnly,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const seen = new Set(values.map((v) => v.toLowerCase()));
    onChange([...values, ...parts.filter((p) => !seen.has(p.toLowerCase()))]);
    setDraft("");
  };
  return (
    <div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {values.map((value) => (
            <span key={value} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-md border border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-800">
              {value}
              {!readOnly && (
                <button type="button" onClick={() => onChange(values.filter((v) => v !== value))} className="p-0.5 rounded text-neutral-400 hover:text-red-600 cursor-pointer" title={`Remove ${value}`}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!readOnly && (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
            className={INPUT_CLASS}
          />
          <button type="button" onClick={add} disabled={!draft.trim()} className="shrink-0 px-3 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:border-neutral-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            Add
          </button>
        </div>
      )}
    </div>
  );
}
