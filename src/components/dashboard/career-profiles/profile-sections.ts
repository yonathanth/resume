import type { ProfileChangeSummary, ProfileContentDTO, ProfileSection } from "@/lib/api";

// Describes every career-profile section once — the editor renders forms,
// validation and item summaries from this, so adding a CV section means
// adding an entry here rather than a new form.

export type FieldType = "text" | "textarea" | "list";

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  /** Takes the full row on wide screens (default: half). */
  wide?: boolean;
}

export interface SectionDef {
  key: ProfileSection;
  label: string;
  /** Singular noun for "Add …" buttons. */
  noun: string;
  hint?: string;
  fields: FieldDef[];
  bullets?: boolean;
  /** Shown under "More sections" until it has content. */
  extra?: boolean;
  title: (item: Record<string, unknown>) => string;
  subtitle?: (item: Record<string, unknown>) => string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const join = (...parts: unknown[]) => parts.map(str).filter(Boolean).join(" · ");
const dates = (item: Record<string, unknown>) => {
  const start = str(item.start_date);
  const end = str(item.end_date);
  return start || end ? `${start || "?"} – ${end || "?"}` : "";
};

const DATE_HINT = "e.g. 2023-01";
const END_HINT = "e.g. 2024-06, or present";

const positionFields: FieldDef[] = [
  { key: "title", label: "Title", required: true },
  { key: "organization", label: "Organization" },
  { key: "location", label: "Location" },
  { key: "start_date", label: "Start", placeholder: DATE_HINT },
  { key: "end_date", label: "End", placeholder: END_HINT },
];

export const PROFILE_SECTIONS: SectionDef[] = [
  {
    key: "experience",
    label: "Experience",
    noun: "role",
    hint: "Every job you'd want on a CV for this role. Add all of it here; each CV picks what fits.",
    bullets: true,
    fields: [
      { key: "role", label: "Job title", required: true, placeholder: "e.g. Backend Developer" },
      { key: "company", label: "Company", required: true, placeholder: "e.g. Acme Corp" },
      { key: "location", label: "Location" },
      { key: "url", label: "Company website" },
      { key: "start_date", label: "Start", placeholder: DATE_HINT },
      { key: "end_date", label: "End", placeholder: END_HINT },
    ],
    title: (i) => join(i.role, i.company) || "Untitled role",
    subtitle: (i) => join(dates(i), i.location),
  },
  {
    key: "education",
    label: "Education",
    noun: "school",
    bullets: true,
    fields: [
      { key: "institution", label: "School", required: true },
      { key: "degree", label: "Degree", placeholder: "e.g. BSc" },
      { key: "field", label: "Field of study" },
      { key: "location", label: "Location" },
      { key: "start_date", label: "Start", placeholder: DATE_HINT },
      { key: "end_date", label: "End", placeholder: "e.g. 2021, or Expected 2026" },
      { key: "gpa", label: "GPA" },
      { key: "honors", label: "Honors" },
    ],
    title: (i) => str(i.institution) || "Untitled school",
    subtitle: (i) => join([str(i.degree), str(i.field)].filter(Boolean).join(", "), dates(i)),
  },
  {
    key: "projects",
    label: "Projects",
    noun: "project",
    bullets: true,
    fields: [
      { key: "name", label: "Project name", required: true },
      { key: "subtitle", label: "One-line summary" },
      { key: "url", label: "Link" },
      { key: "tech", label: "Tech used", type: "list", placeholder: "Comma separated, e.g. React, Node.js" },
      { key: "description", label: "Description", type: "textarea", wide: true },
    ],
    title: (i) => str(i.name) || "Untitled project",
    subtitle: (i) => (Array.isArray(i.tech) ? i.tech.join(", ") : str(i.subtitle)),
  },
  {
    key: "certifications",
    label: "Certifications",
    noun: "certification",
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "issuer", label: "Issued by" },
      { key: "date", label: "Date" },
      { key: "expires", label: "Expires" },
      { key: "url", label: "Credential link", wide: true },
    ],
    title: (i) => str(i.name) || "Untitled certification",
    subtitle: (i) => join(i.issuer, i.date),
  },
  {
    key: "languages",
    label: "Languages",
    noun: "language",
    fields: [
      { key: "language", label: "Language", required: true },
      { key: "proficiency", label: "Level", placeholder: "e.g. Native, Fluent, B2" },
    ],
    title: (i) => str(i.language) || "Untitled language",
    subtitle: (i) => str(i.proficiency),
  },
  {
    key: "links",
    label: "Links",
    noun: "link",
    hint: "Portfolio, GitHub, LinkedIn: whatever fits this role.",
    fields: [
      { key: "label", label: "Label", placeholder: "e.g. GitHub" },
      { key: "url", label: "URL", required: true },
    ],
    title: (i) => str(i.label) || str(i.url) || "Untitled link",
    subtitle: (i) => (str(i.label) ? str(i.url) : ""),
  },
  {
    key: "awards",
    label: "Awards",
    noun: "award",
    extra: true,
    fields: [
      { key: "title", label: "Award", required: true },
      { key: "issuer", label: "Given by" },
      { key: "date", label: "Date" },
      { key: "description", label: "Description", type: "textarea", wide: true },
    ],
    title: (i) => str(i.title) || "Untitled award",
    subtitle: (i) => join(i.issuer, i.date),
  },
  {
    key: "volunteering",
    label: "Volunteering",
    noun: "volunteer role",
    extra: true,
    bullets: true,
    fields: [
      { key: "organization", label: "Organization", required: true },
      { key: "role", label: "Role" },
      { key: "location", label: "Location" },
      { key: "start_date", label: "Start", placeholder: DATE_HINT },
      { key: "end_date", label: "End", placeholder: END_HINT },
    ],
    title: (i) => join(i.role, i.organization) || "Untitled",
    subtitle: dates,
  },
  {
    key: "publications",
    label: "Publications",
    noun: "publication",
    extra: true,
    fields: [
      { key: "title", label: "Title", required: true, wide: true },
      { key: "authors", label: "Authors" },
      { key: "venue", label: "Journal / conference" },
      { key: "date", label: "Date" },
      { key: "url", label: "Link" },
    ],
    title: (i) => str(i.title) || "Untitled publication",
    subtitle: (i) => join(i.venue, i.date),
  },
  {
    key: "courses",
    label: "Courses",
    noun: "course",
    extra: true,
    fields: [
      { key: "name", label: "Course", required: true },
      { key: "institution", label: "Provider" },
      { key: "date", label: "Date" },
    ],
    title: (i) => str(i.name) || "Untitled course",
    subtitle: (i) => join(i.institution, i.date),
  },
  {
    key: "memberships",
    label: "Memberships",
    noun: "membership",
    extra: true,
    fields: [
      { key: "organization", label: "Organization", required: true },
      { key: "role", label: "Role" },
      { key: "start_date", label: "Start", placeholder: DATE_HINT },
      { key: "end_date", label: "End", placeholder: END_HINT },
    ],
    title: (i) => str(i.organization) || "Untitled",
    subtitle: (i) => join(i.role, dates(i)),
  },
  {
    key: "presentations",
    label: "Presentations",
    noun: "presentation",
    extra: true,
    fields: [
      { key: "title", label: "Title", required: true, wide: true },
      { key: "event", label: "Event" },
      { key: "date", label: "Date" },
      { key: "url", label: "Link", wide: true },
    ],
    title: (i) => str(i.title) || "Untitled",
    subtitle: (i) => join(i.event, i.date),
  },
  { key: "research", label: "Research", noun: "research position", extra: true, bullets: true, fields: positionFields, title: (i) => join(i.title, i.organization) || "Untitled", subtitle: dates },
  { key: "teaching", label: "Teaching", noun: "teaching position", extra: true, bullets: true, fields: positionFields, title: (i) => join(i.title, i.organization) || "Untitled", subtitle: dates },
  { key: "activities", label: "Activities", noun: "activity", extra: true, bullets: true, fields: positionFields, title: (i) => join(i.title, i.organization) || "Untitled", subtitle: dates },
  {
    key: "references",
    label: "References",
    noun: "reference",
    extra: true,
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "title", label: "Their title" },
      { key: "organization", label: "Organization" },
      { key: "relationship", label: "Relationship" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
    ],
    title: (i) => str(i.name) || "Untitled reference",
    subtitle: (i) => join(i.title, i.organization),
  },
  {
    key: "personalDetails",
    label: "Personal details",
    noun: "detail",
    extra: true,
    hint: "Only if CVs for this role usually include them (e.g. nationality, driving licence).",
    fields: [
      { key: "label", label: "Label", required: true, placeholder: "e.g. Nationality" },
      { key: "value", label: "Value", required: true },
    ],
    title: (i) => join(i.label, i.value) || "Untitled detail",
  },
  {
    key: "skillGroups",
    label: "Skill groups",
    noun: "skill group",
    extra: true,
    hint: "Optional categories some templates show, e.g. “Frontend: React, Next.js”.",
    fields: [
      { key: "category", label: "Category", required: true },
      { key: "items", label: "Skills", type: "list", placeholder: "Comma separated", wide: true },
    ],
    title: (i) => str(i.category) || "Untitled group",
    subtitle: (i) => (Array.isArray(i.items) ? i.items.join(", ") : ""),
  },
];

// ---- client-side helpers shared by the editor

export type ItemRecord = Record<string, unknown> & { id?: string };

let tempCounter = 0;
/** Client-only id for an unsaved item/bullet — the server replaces it on save. */
export const tempId = () => `tmp-${Date.now().toString(36)}-${(tempCounter++).toString(36)}`;
export const isTempId = (id: unknown) => typeof id === "string" && id.startsWith("tmp-");

export function emptyContent(): ProfileContentDTO {
  return {
    interests: [],
    links: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    languages: [],
    awards: [],
    publications: [],
    volunteering: [],
    courses: [],
    memberships: [],
    presentations: [],
    references: [],
    personalDetails: [],
    research: [],
    teaching: [],
    activities: [],
    skills: [],
    skillGroups: [],
  };
}

/** Required fields that are still empty, as "Section: Field" labels. */
export function missingRequired(content: ProfileContentDTO): string[] {
  const missing: string[] = [];
  for (const def of PROFILE_SECTIONS) {
    const items = (content[def.key] ?? []) as ItemRecord[];
    items.forEach((item, index) => {
      for (const field of def.fields) {
        if (field.required && !str(item[field.key])) missing.push(`${def.label} #${index + 1}: ${field.label}`);
      }
    });
  }
  return missing;
}

/**
 * Shapes editor state for the API: trims strings, drops empty optional
 * fields and empty bullets, and removes client-only temp ids (the server
 * assigns real ones). `meta` is left out — the server owns it.
 */
export function toSavePayload(content: ProfileContentDTO): ProfileContentDTO {
  const clean = (item: ItemRecord): ItemRecord => {
    const out: ItemRecord = {};
    for (const [key, value] of Object.entries(item)) {
      if (key === "meta") continue;
      if (key === "id") {
        if (!isTempId(value)) out.id = value as string;
        continue;
      }
      if (key === "bullets" && Array.isArray(value)) {
        out.bullets = value
          .filter((b) => str(b?.text))
          .map((b) => ({ ...(b.id && !isTempId(b.id) ? { id: b.id } : {}), ...(str(b.label) ? { label: str(b.label) } : {}), text: str(b.text) }));
        continue;
      }
      if (Array.isArray(value)) {
        const list = value.map(str).filter(Boolean);
        if (list.length) out[key] = list;
        continue;
      }
      if (typeof value === "string") {
        if (value.trim()) out[key] = value.trim();
        continue;
      }
      if (value !== undefined && value !== null) out[key] = value;
    }
    return out;
  };

  const next = { ...emptyContent() } as unknown as Record<string, unknown>;
  next.headline = str(content.headline) || undefined;
  next.summary = str(content.summary) || undefined;
  next.location = str(content.location) || undefined;
  next.interests = content.interests.map(str).filter(Boolean);
  next.skills = content.skills.filter((s) => str(s.name)).map((s) => clean(s as ItemRecord));
  for (const def of PROFILE_SECTIONS) {
    next[def.key] = ((content[def.key] ?? []) as ItemRecord[]).map(clean);
  }
  return next as unknown as ProfileContentDTO;
}

const SECTION_LABELS: Record<string, string> = Object.fromEntries([
  ...PROFILE_SECTIONS.map((s) => [s.key, s.label.toLowerCase()]),
  ["skills", "skills"],
  ["headline", "headline"],
  ["summary", "summary"],
  ["location", "location"],
  ["interests", "interests"],
]);

export const sectionLabel = (key: string) => SECTION_LABELS[key] ?? key;

/** "+2 experience, +4 skills, 1 updated" — what a change did (or would do). */
export function describeChangeCounts(summary: Partial<ProfileChangeSummary> | null | undefined): string {
  if (!summary) return "";
  const parts: string[] = [];
  for (const [key, n] of Object.entries(summary.added ?? {})) if (n) parts.push(`+${n} ${sectionLabel(key)}`);
  const updated = Object.values(summary.updated ?? {}).reduce<number>((a, n) => a + (n ?? 0), 0);
  const removed = Object.values(summary.removed ?? {}).reduce<number>((a, n) => a + (n ?? 0), 0);
  if (updated) parts.push(`${updated} updated`);
  if (removed) parts.push(`${removed} removed`);
  return parts.join(", ");
}

export function isEmptyChange(summary: Partial<ProfileChangeSummary> | null | undefined): boolean {
  return !describeChangeCounts(summary);
}
