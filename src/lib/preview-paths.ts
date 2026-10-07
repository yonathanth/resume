import type { CvData } from "@/components/dashboard/create-flow/types";
import { KEEP } from "./cv-mapper";

/**
 * Maps a clicked spot on the preview back to the editor. The backend tags
 * every text value in the preview with its content path ("experience.0.role",
 * see resume-back src/services/render/content-paths.ts); indices count only
 * the entries toCVContentPatch keeps, so they're resolved with the same KEEP rules.
 */

export interface EditorTarget {
  /** Editor section to open: "personal" or a template section key. */
  section: string;
  /** The entry card to expand and highlight. */
  entryId?: string;
  /** The field inside it (see `data-field` in the editor). */
  field?: string;
}

// Backend content key → [editor section, CvData list, keep rule].
const LISTS: Record<string, [string, keyof CvData, (item: never) => boolean]> = {
  experience: ["experience", "experiences", () => true],
  education: ["education", "education", () => true],
  projects: ["projects", "projects", KEEP.project as (item: never) => boolean],
  certifications: ["certifications", "certifications", KEEP.certification as (item: never) => boolean],
  languages: ["languages", "languages", KEEP.language as (item: never) => boolean],
  awards: ["awards", "awards", KEEP.award as (item: never) => boolean],
  publications: ["publications", "publications", KEEP.publication as (item: never) => boolean],
  volunteering: ["volunteering", "volunteering", KEEP.volunteering as (item: never) => boolean],
  courses: ["courses", "courses", KEEP.course as (item: never) => boolean],
  memberships: ["memberships", "memberships", KEEP.membership as (item: never) => boolean],
  presentations: ["presentations", "presentations", KEEP.presentation as (item: never) => boolean],
  references: ["references", "references", KEEP.reference as (item: never) => boolean],
  personalDetails: ["personalDetails", "personalDetails", KEEP.personalDetail as (item: never) => boolean],
  research: ["research", "research", KEEP.position as (item: never) => boolean],
  teaching: ["teaching", "teaching", KEEP.position as (item: never) => boolean],
  activities: ["activities", "activities", KEEP.position as (item: never) => boolean],
  skillGroups: ["skills", "skillGroups", KEEP.skillGroup as (item: never) => boolean],
};

// Backend field names that differ from the editor's.
const FIELD_NAMES: Record<string, string> = {
  start_date: "startDate",
  end_date: "endDate",
  institution: "school",
  full_name: "fullName",
};

type Item = { id: string; bullets?: { id: string; text: string; label: string }[] };

/** The `n`th entry that survives `keep`, as the preview counted them. */
function nthKept<T>(items: T[], keep: (item: T) => boolean, n: number): T | undefined {
  return items.filter(keep)[n];
}

export function resolvePreviewPath(cv: CvData, path: string): EditorTarget | null {
  const [root, second, third, fourth] = path.split(".");
  if (!root) return null;

  if (root === "personal") {
    if (second === "links") return { section: "personal", field: "links" };
    if (second === "title") return { section: "personal", field: "headline" };
    return { section: "personal", field: FIELD_NAMES[second] ?? second };
  }
  if (root === "summary" || root === "consent") return { section: root, field: root };
  if (root === "interests") return { section: "interests", field: "interests" };
  if (root === "skills") return { section: "skills" };

  const list = LISTS[root];
  if (!list) return { section: root };
  const [section, key, keep] = list;
  const entry = nthKept(cv[key] as unknown as never[], keep, Number(second)) as Item | undefined;
  if (!entry) return { section }; // e.g. a placeholder for an empty section

  // "experience.0.bullets.2.text" → that bullet's text box
  if (third === "bullets" && entry.bullets) {
    const bullet = nthKept(entry.bullets, KEEP.bullet, Number(fourth));
    return { section, entryId: entry.id, field: bullet ? `bullet:${bullet.id}` : "bullets" };
  }
  return { section, entryId: entry.id, field: third ? (FIELD_NAMES[third] ?? third) : undefined };
}
