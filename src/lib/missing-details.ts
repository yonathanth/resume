import type { CvData } from "@/components/dashboard/create-flow/types";

/**
 * What a CV is missing for its template — the same rules the backend uses to
 * draw placeholders in the editor preview (resume-back
 * src/services/render/missing-details.ts); keep the two in step.
 */

export interface MissingDetail {
  /** "personal" or a template section key — the editor section to open. */
  section: string;
  /** What's missing, e.g. "2 roles without dates". */
  detail: string;
  /** Nothing in the section yet (rather than entries missing details). */
  empty?: boolean;
}

const blank = (value: string | undefined) => !value || !value.trim();

type Item = Record<string, unknown>;
const field = (item: Item, key: string) => (typeof item[key] === "string" ? (item[key] as string) : "");

/** Required fields of each list section, by CvData key: [field, how to describe the gap]. */
const ENTRY_RULES: Record<string, { list: keyof CvData; noun: [string, string]; fields: string[]; dated?: boolean; bulleted?: boolean }> = {
  experience: { list: "experiences", noun: ["role", "roles"], fields: ["role", "company"], dated: true, bulleted: true },
  education: { list: "education", noun: ["degree", "degrees"], fields: ["school", "degree"] },
  projects: { list: "projects", noun: ["project", "projects"], fields: ["name"], bulleted: true },
  certifications: { list: "certifications", noun: ["certification", "certifications"], fields: ["name"] },
  languages: { list: "languages", noun: ["language", "languages"], fields: ["language", "proficiency"] },
  awards: { list: "awards", noun: ["award", "awards"], fields: ["title"] },
  publications: { list: "publications", noun: ["publication", "publications"], fields: ["title"] },
  volunteering: { list: "volunteering", noun: ["entry", "entries"], fields: ["organization"], dated: true },
  courses: { list: "courses", noun: ["course", "courses"], fields: ["name"] },
  memberships: { list: "memberships", noun: ["membership", "memberships"], fields: ["organization"] },
  presentations: { list: "presentations", noun: ["talk", "talks"], fields: ["title"] },
  references: { list: "references", noun: ["reference", "references"], fields: ["name"] },
  research: { list: "research", noun: ["entry", "entries"], fields: ["title"], dated: true },
  teaching: { list: "teaching", noun: ["entry", "entries"], fields: ["title"], dated: true },
  activities: { list: "activities", noun: ["activity", "activities"], fields: ["title"], dated: true },
  personalDetails: { list: "personalDetails", noun: ["detail", "details"], fields: ["label", "value"] },
};

/** The id of a list section's entry, e.g. the 2nd project — for jumping to it in the form. */
export function entryIdAt(cv: CvData, section: string, index: number): string | undefined {
  const rule = ENTRY_RULES[section];
  const items = rule ? (cv[rule.list] as unknown as Item[]) : [];
  const id = items[index]?.id;
  return typeof id === "string" ? id : undefined;
}

const plural = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;

function sectionIsEmpty(cv: CvData, key: string): boolean {
  switch (key) {
    case "summary":
      return blank(cv.summary);
    case "skills":
      return cv.skills.length === 0;
    case "interests":
      return cv.interests.length === 0;
    default: {
      const rule = ENTRY_RULES[key];
      return rule ? (cv[rule.list] as unknown[]).length === 0 : false;
    }
  }
}

/** Every gap the preview highlights, in the template's section order. */
export function getMissingDetails(cv: CvData, templateSections: string[]): MissingDetail[] {
  const missing: MissingDetail[] = [];
  const personal = [
    blank(cv.personalInfo.fullName) && "name",
    // The saved title falls back to the target role (see toCVContentPatch).
    blank(cv.personalInfo.headline) && blank(cv.targetRole) && "headline",
    blank(cv.personalInfo.email) && "email",
    blank(cv.personalInfo.phone) && "phone",
    blank(cv.personalInfo.location) && "location",
    !cv.personalInfo.links.some((link) => !blank(link.url)) && "a link",
    templateSections.includes("photo") && blank(cv.personalInfo.photo) && "photo",
  ].filter(Boolean) as string[];
  if (personal.length) missing.push({ section: "personal", detail: `Your ${personal.join(", ")}` });

  for (const key of templateSections) {
    if (key === "photo" || key === "consent") continue; // the photo is checked with the contact details
    if (sectionIsEmpty(cv, key)) {
      missing.push({ section: key, detail: "Nothing added yet", empty: true });
      continue;
    }
    const rule = ENTRY_RULES[key];
    if (!rule) continue;
    const items = cv[rule.list] as unknown as Item[];
    const incomplete = items.filter((item) => rule.fields.some((f) => blank(field(item, f)))).length;
    const undated = rule.dated
      ? items.filter((item) => blank(field(item, "startDate")) && blank(field(item, "endDate")) && !item.isCurrent).length
      : 0;
    // Education counts as undated without either date too (no "current" flag).
    const undatedEducation =
      key === "education" ? items.filter((item) => blank(field(item, "startDate")) && blank(field(item, "endDate"))).length : 0;
    const withoutBullets = rule.bulleted
      ? items.filter((item) => (item.bullets as unknown[]).length === 0 && blank(field(item, "description"))).length
      : 0;
    const gaps = [
      incomplete && `${plural(incomplete, rule.noun)} missing details`,
      (undated || undatedEducation) && `${plural(undated || undatedEducation, rule.noun)} without dates`,
      withoutBullets && `${plural(withoutBullets, rule.noun)} without bullet points`,
    ].filter(Boolean) as string[];
    if (gaps.length) missing.push({ section: key, detail: gaps.join(" · ") });
  }
  return missing;
}
