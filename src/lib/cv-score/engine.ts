/**
 * CV score — deterministic rules, no AI and no I/O.
 *
 * This file is shared verbatim with the frontend (resume/src/lib/cv-score/engine.ts)
 * so the editor's live score and the score the backend stores are always the
 * same number. test/unit/cv-score.test.ts fails if the two copies differ:
 * edit one, copy it over the other. Bump SCORE_RULES_VERSION whenever a rule
 * or weight changes.
 *
 * The only AI input is the job's requirements (extracted once per job
 * description and stored), so the same CV + the same job always scores the same.
 */

export const SCORE_RULES_VERSION = "1.0";

type BulletLike = string | { label?: string; text?: string } | null | undefined;

/** The parts of a CV's content (snake_case CVContent) the score reads. Everything is optional — content can be partial. */
export interface ScoreInput {
  personal?: {
    full_name?: string;
    title?: string;
    email?: string;
    phone?: string;
    location?: string;
    links?: { label?: string; url?: string }[];
  };
  summary?: string;
  experience?: { company?: string; role?: string; start_date?: string; end_date?: string; bullets?: BulletLike[] }[];
  education?: { institution?: string; degree?: string; field?: string; start_date?: string; end_date?: string }[];
  skills?: string[];
  skillGroups?: { category?: string; items?: string[] }[];
  projects?: { name?: string; description?: string; tech?: string[]; bullets?: BulletLike[] }[];
}

/** What a job asks for — extracted from the job description once and stored. */
export interface ScoreJobRequirements {
  title: string;
  seniority?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  keywords?: string[];
}

export type ScoreCategoryKey = "contact" | "summary" | "experience" | "skills" | "education" | "writing" | "job";

/** What AI polish can rewrite to fix a check. `bullets` without an index means every role. */
export type PolishTarget =
  | { kind: "summary" }
  | { kind: "bullets"; index?: number }
  | { kind: "skills" }
  | { kind: "headline" };

export interface ScoreCheck {
  id: string;
  category: ScoreCategoryKey;
  label: string;
  status: "pass" | "partial" | "fail";
  points: number;
  max: number;
  /** What to do about it, in plain words (empty when it passes). */
  message: string;
  /** The editor section to open: "personal", "summary", "experience", "education" or "skills". */
  section: string;
  /** The entry to jump to, for list sections. */
  index?: number;
  /** The field to focus, for the personal section. */
  field?: string;
  /** "ai" when AI polish can fix it without inventing facts; "manual" when only the user can. */
  fix: "ai" | "manual";
  polish?: PolishTarget;
}

export interface ScoreCategory {
  key: ScoreCategoryKey;
  label: string;
  score: number;
  max: number;
}

export interface JobMatchSkill {
  skill: string;
  found: boolean;
}

export interface JobMatch {
  title: string;
  required: JobMatchSkill[];
  preferred: JobMatchSkill[];
  /** % of required skills found (100 when the job lists none). */
  coverage: number;
}

export interface CvScore {
  total: number;
  version: string;
  categories: ScoreCategory[];
  checks: ScoreCheck[];
  jobMatch?: JobMatch;
}

// ── Word lists ──────────────────────────────────────────────────────────────

const ACTION_VERBS = new Set(
  (
    "accelerated achieved acquired adapted addressed administered advised advocated aligned allocated analyzed " +
    "answered applied appointed approved architected arranged assembled assessed assigned assisted attained audited " +
    "authored automated balanced boosted briefed budgeted built calculated campaigned captured cataloged centralized " +
    "chaired championed clarified coached collaborated collected combined communicated compiled completed composed " +
    "computed conceived conceptualized conducted configured consolidated constructed consulted contracted contributed " +
    "controlled converted coordinated corrected counseled created cultivated curated customized cut debugged decreased " +
    "defined delegated delivered demonstrated deployed designed detected determined developed devised diagnosed " +
    "directed discovered dispatched documented doubled drafted drove earned edited educated eliminated enabled " +
    "encouraged engineered enhanced ensured established estimated evaluated examined exceeded executed expanded " +
    "expedited experimented explained explored facilitated finalized forecasted formalized formed formulated fostered " +
    "founded generated grew guided halved handled headed helped hired identified implemented improved increased " +
    "influenced informed initiated innovated inspected installed instituted instructed integrated interpreted " +
    "interviewed introduced invented investigated launched led leveraged lifted maintained managed mapped marketed " +
    "maximized measured mediated mentored merged migrated minimized modeled modernized monitored motivated negotiated " +
    "operated optimized orchestrated organized originated outperformed overhauled oversaw partnered performed " +
    "persuaded piloted pioneered planned prepared presented prioritized processed produced programmed projected " +
    "promoted proposed prototyped provided published purchased qualified raised ran rebuilt recommended reconciled " +
    "recorded recruited redesigned reduced refactored refined regulated rehabilitated reinforced released remodeled " +
    "reorganized repaired replaced reported represented researched resolved restored restructured retained revamped " +
    "reviewed revised revitalized saved scaled scheduled screened secured selected served shaped shipped simplified " +
    "slashed solved spearheaded specified sped standardized steered streamlined strengthened structured succeeded " +
    "summarized supervised supported surpassed surveyed sustained synthesized systematized taught tested tracked " +
    "trained transformed translated tripled troubleshot unified upgraded utilized validated verified won wrote"
  ).split(" ")
);

// Present-tense forms of the verbs above count too ("Lead", "Build", "Manage").
const ACTION_VERBS_PRESENT = new Set(
  (
    "accelerate achieve administer advise analyze architect assess audit author automate build coach collaborate " +
    "configure coordinate create debug define deliver deploy design develop direct drive engineer establish evaluate " +
    "execute facilitate generate grow guide implement improve increase integrate launch lead maintain manage mentor " +
    "migrate monitor negotiate operate optimize orchestrate organize oversee own plan prepare present produce " +
    "program reduce refactor research resolve review run scale secure ship streamline supervise support teach test " +
    "train troubleshoot write"
  ).split(" ")
);

const BUZZWORDS = [
  "hard-working", "hardworking", "team player", "go-getter", "go-to person", "detail-oriented", "detail oriented",
  "results-driven", "results driven", "self-starter", "self starter", "think outside the box", "synergy",
  "dynamic", "passionate", "motivated", "proven track record", "best of breed", "go the extra mile",
  "rockstar", "ninja", "guru", "responsible for", "duties included", "references available upon request",
];

const FIRST_PERSON = /(^|[^a-z'])(i|me|my|mine|myself|i'm|i've|i'd|i'll)(?=$|[^a-z'])/;

const STOPWORDS = new Set(
  "a an and the of for to in on at with or senior junior lead principal staff head chief mid level entry intern sr jr i ii iii iv".split(" ")
);

const ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  "node.js": "nodejs",
  node: "nodejs",
  "react.js": "react",
  reactjs: "react",
  "vue.js": "vue",
  vuejs: "vue",
  "next.js": "nextjs",
  k8s: "kubernetes",
  postgres: "postgresql",
  golang: "go",
  "c-sharp": "c#",
  csharp: "c#",
  gcp: "google cloud",
  "ms excel": "excel",
  "e-mail": "email",
};

// ── Text helpers ────────────────────────────────────────────────────────────

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const blank = (value: unknown): boolean => str(value) === "";
const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

function bulletText(value: BulletLike): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const text = str(value.text);
    const label = str(value.label);
    return label && text ? `${label}: ${text}` : text;
  }
  return "";
}

/** A bullet's own sentence, without its "Label:" prefix — what action-verb and length checks read. */
function bulletBody(value: BulletLike): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") return str(value.text);
  return "";
}

function words(text: string): string[] {
  return text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w));
}

function firstWord(text: string): string {
  const word = text.trim().split(/\s+/)[0] ?? "";
  return word.toLowerCase().replace(/[^a-z-]/g, "");
}

const hasNumber = (text: string): boolean => /\d/.test(text) || /[%$€£]/.test(text);

/** Lowercased tokens with aliases applied and a light plural fold — used on both sides of every match. */
function tokens(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9+#./-]+/g, " ")
    .split(" ")
    .map((t) => t.replace(/^[./-]+|[./-]+$/g, ""))
    .filter(Boolean);
  const out: string[] = [];
  for (const token of raw) {
    const alias = ALIASES[token];
    const mapped = alias ?? token;
    for (const part of mapped.split(" ")) {
      out.push(part.length > 4 && part.endsWith("s") && !part.endsWith("ss") ? part.slice(0, -1) : part);
    }
  }
  return out;
}

/** " tok tok tok " — so a phrase matches only on whole words. */
const haystack = (texts: string[]): string => ` ${tokens(texts.join(" \n ")).join(" ")} `;

function contains(hay: string, phrase: string): boolean {
  const needle = tokens(phrase).join(" ");
  return needle !== "" && hay.includes(` ${needle} `);
}

const ratioToStatus = (ratio: number): ScoreCheck["status"] => (ratio >= 0.999 ? "pass" : ratio <= 0 ? "fail" : "partial");
const round1 = (n: number): number => Math.round(n * 10) / 10;
const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

// Recognized date shapes, so "one date format throughout" can be checked.
const DATE_FORMATS: [string, RegExp][] = [
  ["yyyy-mm", /^\d{4}-\d{1,2}$/],
  ["mm/yyyy", /^\d{1,2}\/\d{4}$/],
  ["mon yyyy", /^[a-z]{3,9}\.? \d{4}$/i],
  ["yyyy", /^\d{4}$/],
];

function dateFormat(value: string): string | null {
  const text = value.trim();
  for (const [name, pattern] of DATE_FORMATS) if (pattern.test(text)) return name;
  return null;
}

// ── Scoring ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ScoreCategoryKey, string> = {
  contact: "Contact & header",
  summary: "Summary",
  experience: "Experience",
  skills: "Skills",
  education: "Education",
  writing: "Writing & ATS",
  job: "Job match",
};

interface CheckSpec {
  id: string;
  category: ScoreCategoryKey;
  label: string;
  max: number;
  ratio: number;
  message: string;
  section: string;
  index?: number;
  field?: string;
  fix: "ai" | "manual";
  polish?: PolishTarget;
}

function makeCheck(spec: CheckSpec): ScoreCheck {
  const ratio = clamp01(spec.ratio);
  const status = ratioToStatus(ratio);
  const check: ScoreCheck = {
    id: spec.id,
    category: spec.category,
    label: spec.label,
    status,
    points: round1(spec.max * ratio),
    max: spec.max,
    message: status === "pass" ? "" : spec.message,
    section: spec.section,
    fix: spec.fix,
  };
  if (spec.index !== undefined) check.index = spec.index;
  if (spec.field !== undefined) check.field = spec.field;
  if (spec.polish && status !== "pass") check.polish = spec.polish;
  return check;
}

function lengthRatio(count: number, min: number, max: number): number {
  if (count === 0) return 0;
  if (count < min) return count / min;
  if (count > max) return 1 - (count - max) / max;
  return 1;
}

export function scoreCv(content: ScoreInput | null | undefined, job?: ScoreJobRequirements | null): CvScore {
  const cv: ScoreInput = content && typeof content === "object" ? content : {};
  const personal = cv.personal && typeof cv.personal === "object" ? cv.personal : {};
  const summary = str(cv.summary);
  const experience = list<NonNullable<ScoreInput["experience"]>[number]>(cv.experience).filter((e) => e && typeof e === "object");
  const education = list<NonNullable<ScoreInput["education"]>[number]>(cv.education).filter((e) => e && typeof e === "object");
  const groups = list<{ category?: string; items?: string[] }>(cv.skillGroups).filter((g) => g && typeof g === "object");
  const groupedSkills = groups.flatMap((g) => list<string>(g.items).map(str)).filter(Boolean);
  const skills = groupedSkills.length > 0 ? groupedSkills : list<string>(cv.skills).map(str).filter(Boolean);
  const projects = list<NonNullable<ScoreInput["projects"]>[number]>(cv.projects).filter((p) => p && typeof p === "object");

  const roleBullets = experience.map((e) => list<BulletLike>(e.bullets).map(bulletBody).filter(Boolean));
  const allBullets = roleBullets.flat();
  const checks: ScoreCheck[] = [];
  const add = (spec: CheckSpec) => checks.push(makeCheck(spec));

  // Contact & header — 10
  const contact = (id: string, label: string, max: number, ok: boolean, field: string, message: string) =>
    add({ id, category: "contact", label, max, ratio: ok ? 1 : 0, message, section: "personal", field, fix: "manual" });
  contact("contact.name", "Full name", 2, !blank(personal.full_name), "fullName", "Add your full name.");
  contact(
    "contact.email",
    "Email address",
    2,
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(personal.email)),
    "email",
    "Add a valid email address."
  );
  contact("contact.phone", "Phone number", 2, str(personal.phone).replace(/\D/g, "").length >= 7, "phone", "Add a phone number.");
  contact("contact.location", "Location", 1.5, !blank(personal.location), "location", "Add your city and country.");
  contact("contact.headline", "Headline", 1.5, !blank(personal.title), "headline", "Add a headline, e.g. your target job title.");
  contact(
    "contact.link",
    "Profile link",
    1,
    list<{ url?: string }>(personal.links).some((l) => l && !blank(l.url)),
    "links",
    "Add a LinkedIn, portfolio or GitHub link."
  );

  // Summary — 10
  const summaryWords = words(summary).length;
  const summaryLower = summary.toLowerCase();
  add({
    id: "summary.present",
    category: "summary",
    label: "Professional summary",
    max: 4,
    ratio: summary ? 1 : 0,
    message: "Add a 2–4 sentence summary of who you are and what you're best at.",
    section: "summary",
    fix: allBullets.length > 0 ? "ai" : "manual",
    polish: { kind: "summary" },
  });
  add({
    id: "summary.length",
    category: "summary",
    label: "Summary length",
    max: 3,
    ratio: lengthRatio(summaryWords, 30, 90),
    message:
      summaryWords === 0
        ? "Write a summary of 30–90 words."
        : summaryWords < 30
          ? `Your summary is ${summaryWords} words — aim for 30–90.`
          : `Your summary is ${summaryWords} words — trim it to 90 or fewer.`,
    section: "summary",
    fix: summary || allBullets.length > 0 ? "ai" : "manual",
    polish: { kind: "summary" },
  });
  const summaryIssues = [FIRST_PERSON.test(summaryLower), BUZZWORDS.some((b) => summaryLower.includes(b))].filter(Boolean).length;
  add({
    id: "summary.voice",
    category: "summary",
    label: "Summary voice",
    max: 3,
    ratio: summary ? 1 - summaryIssues / 2 : 0,
    message: summary
      ? "Drop “I/my” and clichés like “hard-working” — state what you do and what you've achieved."
      : "Write a summary without “I/my” or clichés.",
    section: "summary",
    fix: summary || allBullets.length > 0 ? "ai" : "manual",
    polish: { kind: "summary" },
  });

  // Experience — 35
  add({
    id: "experience.present",
    category: "experience",
    label: "Work experience",
    max: 5,
    ratio: experience.length > 0 ? 1 : 0,
    message: "Add at least one role.",
    section: "experience",
    fix: "manual",
  });
  const isComplete = (e: NonNullable<ScoreInput["experience"]>[number]) =>
    !blank(e.role) && !blank(e.company) && !blank(e.start_date) && !blank(e.end_date);
  const incompleteRole = experience.findIndex((e) => !isComplete(e));
  const incompleteCount = experience.filter((e) => !isComplete(e)).length;
  add({
    id: "experience.complete",
    category: "experience",
    label: "Role details",
    max: 8,
    ratio: experience.length ? (experience.length - incompleteCount) / experience.length : 0,
    message: experience.length
      ? `${plural(incompleteCount, "role is", "roles are")} missing a title, company or dates.`
      : "Add a role with its title, company and dates.",
    section: "experience",
    index: incompleteRole >= 0 ? incompleteRole : undefined,
    fix: "manual",
  });
  const thinRole = roleBullets.findIndex((b) => b.length < 3);
  const emptyRole = roleBullets.findIndex((b) => b.length === 0);
  add({
    id: "experience.bulletCount",
    category: "experience",
    label: "Bullets per role",
    max: 7,
    ratio: roleBullets.length ? roleBullets.reduce((sum, b) => sum + Math.min(b.length, 3) / 3, 0) / roleBullets.length : 0,
    message:
      emptyRole >= 0
        ? "Add bullet points to every role — what you did and what changed because of it."
        : "Give each role at least 3 bullet points.",
    section: "experience",
    index: emptyRole >= 0 ? emptyRole : thinRole >= 0 ? thinRole : undefined,
    fix: emptyRole >= 0 || roleBullets.length === 0 ? "manual" : "ai",
    polish: thinRole >= 0 ? { kind: "bullets", index: thinRole } : undefined,
  });
  const verbStart = (b: string) => {
    const w = firstWord(b);
    return ACTION_VERBS.has(w) || ACTION_VERBS_PRESENT.has(w);
  };
  const weakVerbRole = roleBullets.findIndex((bs) => bs.some((b) => !verbStart(b)));
  add({
    id: "experience.actionVerbs",
    category: "experience",
    label: "Action verbs",
    max: 5,
    ratio: allBullets.length ? allBullets.filter(verbStart).length / allBullets.length : 0,
    message: `${plural(allBullets.filter((b) => !verbStart(b)).length, "bullet doesn't", "bullets don't")} start with a strong action verb (Led, Built, Reduced…).`,
    section: "experience",
    index: weakVerbRole >= 0 ? weakVerbRole : undefined,
    fix: allBullets.length ? "ai" : "manual",
    polish: { kind: "bullets" },
  });
  const quantified = allBullets.filter(hasNumber).length;
  const unquantifiedRole = roleBullets.findIndex((bs) => bs.length > 0 && !bs.some(hasNumber));
  add({
    id: "experience.quantified",
    category: "experience",
    label: "Measurable results",
    max: 6,
    ratio: allBullets.length ? quantified / allBullets.length / 0.4 : 0,
    message:
      "Add numbers to at least 40% of your bullets — %, money, time saved, team or user counts. Only you know these, so AI won't make them up.",
    section: "experience",
    index: unquantifiedRole >= 0 ? unquantifiedRole : undefined,
    fix: "manual",
  });
  const goodLength = (b: string) => {
    const n = words(b).length;
    return n >= 8 && n <= 35;
  };
  const badLengthRole = roleBullets.findIndex((bs) => bs.some((b) => !goodLength(b)));
  add({
    id: "experience.bulletLength",
    category: "experience",
    label: "Bullet length",
    max: 4,
    ratio: allBullets.length ? allBullets.filter(goodLength).length / allBullets.length : 0,
    message: `${plural(allBullets.filter((b) => !goodLength(b)).length, "bullet is", "bullets are")} too short or too long — aim for 8–35 words each.`,
    section: "experience",
    index: badLengthRole >= 0 ? badLengthRole : undefined,
    fix: allBullets.length ? "ai" : "manual",
    polish: { kind: "bullets" },
  });

  // Skills — 15
  add({
    id: "skills.count",
    category: "skills",
    label: "Number of skills",
    max: 8,
    ratio: Math.min(skills.length, 6) / 6,
    message: `You list ${plural(skills.length, "skill", "skills")} — add at least 6.`,
    section: "skills",
    fix: allBullets.length > 0 || summary ? "ai" : "manual",
    polish: { kind: "skills" },
  });
  const seen = new Set<string>();
  let duplicates = 0;
  for (const skill of skills) {
    const key = skill.toLowerCase();
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  }
  add({
    id: "skills.duplicates",
    category: "skills",
    label: "No duplicate skills",
    max: 2,
    ratio: skills.length ? (duplicates === 0 ? 1 : 0) : 0,
    message: skills.length ? `${plural(duplicates, "skill is", "skills are")} listed twice.` : "Add your skills.",
    section: "skills",
    fix: skills.length ? "ai" : "manual",
    polish: { kind: "skills" },
  });
  add({
    id: "skills.focused",
    category: "skills",
    label: "Focused skill list",
    max: 2,
    ratio: skills.length === 0 ? 0 : skills.length <= 30 ? 1 : 1 - (skills.length - 30) / 30,
    message: skills.length ? `${skills.length} skills is a lot — keep the 30 most relevant.` : "Add your skills.",
    section: "skills",
    fix: skills.length ? "ai" : "manual",
    polish: { kind: "skills" },
  });
  const namedGroups = groups.filter((g) => !blank(g.category) && list<string>(g.items).some((i) => !blank(i))).length;
  add({
    id: "skills.grouped",
    category: "skills",
    label: "Grouped skills",
    max: 3,
    ratio: skills.length === 0 ? 0 : skills.length < 8 || namedGroups >= 2 ? 1 : 0,
    message: skills.length ? "Group your skills into named categories (e.g. Languages, Tools)." : "Add your skills.",
    section: "skills",
    fix: skills.length ? "ai" : "manual",
    polish: { kind: "skills" },
  });

  // Education — 10
  add({
    id: "education.present",
    category: "education",
    label: "Education",
    max: 5,
    ratio: education.length > 0 ? 1 : 0,
    message: "Add your education.",
    section: "education",
    fix: "manual",
  });
  const eduIncomplete = education.findIndex((e) => blank(e.institution) || blank(e.degree));
  add({
    id: "education.complete",
    category: "education",
    label: "Education details",
    max: 5,
    ratio: education.length
      ? education.filter((e) => !blank(e.institution) && !blank(e.degree)).length / education.length
      : 0,
    message: education.length ? "Add the school and degree for every entry." : "Add a school and degree.",
    section: "education",
    index: eduIncomplete >= 0 ? eduIncomplete : undefined,
    fix: "manual",
  });

  // Writing & ATS — 20
  const proseLower = [summary, ...allBullets].join("\n").toLowerCase();
  const buzzCount = BUZZWORDS.filter((b) => proseLower.includes(b)).length;
  const bulletsLower = allBullets.join("\n").toLowerCase();
  const buzzInBullets = BUZZWORDS.some((b) => bulletsLower.includes(b));
  const hasProse = summary !== "" || allBullets.length > 0;
  add({
    id: "writing.buzzwords",
    category: "writing",
    label: "No clichés",
    max: 5,
    ratio: hasProse ? 1 - buzzCount / 4 : 0,
    message: hasProse
      ? `Replace ${plural(buzzCount, "cliché", "clichés")} (“team player”, “responsible for”…) with concrete results.`
      : "Add a summary and experience bullets.",
    section: buzzInBullets ? "experience" : "summary",
    fix: hasProse ? "ai" : "manual",
    polish: buzzInBullets ? { kind: "bullets" } : { kind: "summary" },
  });
  const firstPersonBullets = allBullets.filter((b) => FIRST_PERSON.test(b.toLowerCase())).length;
  add({
    id: "writing.firstPerson",
    category: "writing",
    label: "No first person in bullets",
    max: 5,
    ratio: allBullets.length ? 1 - firstPersonBullets / allBullets.length : 0,
    message: allBullets.length
      ? `${plural(firstPersonBullets, "bullet uses", "bullets use")} “I/my” — start with the verb instead.`
      : "Add experience bullets.",
    section: "experience",
    fix: allBullets.length ? "ai" : "manual",
    polish: { kind: "bullets" },
  });
  const dates = [
    ...experience.flatMap((e) => [str(e.start_date), str(e.end_date)]),
    ...education.flatMap((e) => [str(e.start_date), str(e.end_date)]),
  ].filter((d) => d && d.toLowerCase() !== "present");
  const formats = dates.map(dateFormat);
  const recognized = formats.filter((f): f is string => f !== null);
  const families = new Set(recognized).size;
  add({
    id: "writing.dates",
    category: "writing",
    label: "Consistent dates",
    max: 3,
    // Nothing dated passes only when there are entries (missing dates are scored in "Role details").
    ratio: dates.length === 0 ? (experience.length + education.length > 0 ? 1 : 0) : (recognized.length / dates.length) * (families <= 1 ? 1 : 0.5),
    message:
      dates.length === 0
        ? "Add your experience and education with dates."
        : recognized.length < dates.length
        ? "Some dates aren't in a format ATS systems read — use one format like 2023-01 or Jan 2023."
        : "Use one date format throughout (e.g. always 2023-01).",
    section: "experience",
    fix: "manual",
  });
  const totalWords =
    words(summary).length +
    allBullets.reduce((sum, b) => sum + words(b).length, 0) +
    projects.reduce(
      (sum, p) => sum + words(str(p.description)).length + list<BulletLike>(p.bullets).reduce((s, b) => s + words(bulletText(b)).length, 0),
      0
    ) +
    skills.length;
  add({
    id: "writing.length",
    category: "writing",
    label: "Overall length",
    max: 4,
    ratio: lengthRatio(totalWords, 250, 1000),
    message:
      totalWords < 250
        ? `Your CV has about ${totalWords} words of content — add more detail to reach 250+.`
        : `Your CV has about ${totalWords} words — tighten it to 1,000 or fewer.`,
    section: "experience",
    fix: totalWords > 1000 ? "ai" : "manual",
    polish: totalWords > 1000 ? { kind: "bullets" } : undefined,
  });
  const verbCounts = new Map<string, number>();
  for (const b of allBullets) {
    const w = firstWord(b);
    if (w) verbCounts.set(w, (verbCounts.get(w) ?? 0) + 1);
  }
  let topVerb = "";
  let topCount = 0;
  for (const [verb, count] of verbCounts) {
    if (count > topCount || (count === topCount && verb < topVerb)) {
      topVerb = verb;
      topCount = count;
    }
  }
  add({
    id: "writing.verbVariety",
    category: "writing",
    label: "Varied wording",
    max: 3,
    ratio: allBullets.length === 0 ? 0 : topCount <= 3 ? 1 : 1 - (topCount - 3) / 3,
    message: allBullets.length
      ? `“${topVerb}” starts ${topCount} bullets — vary your verbs.`
      : "Add experience bullets.",
    section: "experience",
    fix: allBullets.length ? "ai" : "manual",
    polish: { kind: "bullets" },
  });

  // Job match — 30 (only with a job); the rest is scaled to 70.
  let jobMatch: JobMatch | undefined;
  if (job && typeof job === "object") {
    const scale = 0.7;
    for (const check of checks) {
      check.max = round1(check.max * scale);
      check.points = round1(check.points * scale);
    }

    const cvText = [
      str(personal.title),
      summary,
      ...experience.flatMap((e) => [str(e.role), ...list<BulletLike>(e.bullets).map(bulletText)]),
      ...education.flatMap((e) => [str(e.degree), str(e.field)]),
      ...skills,
      ...projects.flatMap((p) => [
        str(p.name),
        str(p.description),
        ...list<string>(p.tech).map(str),
        ...list<BulletLike>(p.bullets).map(bulletText),
      ]),
    ];
    const everywhere = haystack(cvText);
    const inWork = haystack([
      summary,
      ...experience.flatMap((e) => list<BulletLike>(e.bullets).map(bulletText)),
      ...projects.flatMap((p) => [str(p.description), ...list<BulletLike>(p.bullets).map(bulletText)]),
    ]);

    const uniq = (items: unknown): string[] => {
      const out: string[] = [];
      const keys = new Set<string>();
      for (const item of list<string>(items).map(str)) {
        const key = tokens(item).join(" ");
        if (key && !keys.has(key)) {
          keys.add(key);
          out.push(item);
        }
      }
      return out;
    };
    const required = uniq(job.requiredSkills).map((skill) => ({ skill, found: contains(everywhere, skill) }));
    const preferred = uniq(job.preferredSkills).map((skill) => ({ skill, found: contains(everywhere, skill) }));
    const missingRequired = required.filter((s) => !s.found).map((s) => s.skill);
    const missingPreferred = preferred.filter((s) => !s.found).map((s) => s.skill);

    add({
      id: "job.required",
      category: "job",
      label: "Required skills",
      max: 18,
      ratio: required.length ? (required.length - missingRequired.length) / required.length : 1,
      message: `The job asks for ${missingRequired.join(", ")}. Add the ones you really have to your skills or bullets.`,
      section: "skills",
      fix: "manual",
    });
    add({
      id: "job.preferred",
      category: "job",
      label: "Nice-to-have skills",
      max: 6,
      ratio: preferred.length ? (preferred.length - missingPreferred.length) / preferred.length : 1,
      message: `Also mentioned: ${missingPreferred.join(", ")}. Add any you have.`,
      section: "skills",
      fix: "manual",
    });

    const titleTokens = tokens(str(job.title)).filter((t) => !STOPWORDS.has(t));
    const headline = haystack([str(personal.title)]);
    const titleHits = titleTokens.filter((t) => headline.includes(` ${t} `)).length;
    add({
      id: "job.title",
      category: "job",
      label: "Headline matches the job",
      max: 3,
      ratio: titleTokens.length ? titleHits / titleTokens.length : 1,
      message: `Use a headline close to the job title (“${str(job.title)}”) if it fits your experience.`,
      section: "personal",
      field: "headline",
      fix: "ai",
      polish: { kind: "headline" },
    });

    const matched = [...required, ...preferred].filter((s) => s.found);
    const shown = matched.filter((s) => contains(inWork, s.skill)).length;
    add({
      id: "job.inContext",
      category: "job",
      label: "Skills shown in your work",
      max: 3,
      ratio: matched.length ? shown / matched.length / 0.5 : required.length + preferred.length ? 0 : 1,
      message:
        "Mention the job's skills in your summary and bullets where you used them — not only in the skills list.",
      section: "experience",
      fix: matched.length ? "ai" : "manual",
      polish: { kind: "bullets" },
    });

    jobMatch = {
      title: str(job.title),
      required,
      preferred,
      coverage: required.length ? Math.round(((required.length - missingRequired.length) / required.length) * 100) : 100,
    };
  }

  const categoryOrder: ScoreCategoryKey[] = ["contact", "summary", "experience", "skills", "education", "writing", "job"];
  const categories: ScoreCategory[] = categoryOrder
    .map((key) => {
      const inCategory = checks.filter((c) => c.category === key);
      return {
        key,
        label: CATEGORY_LABELS[key],
        score: round1(inCategory.reduce((s, c) => s + c.points, 0)),
        max: round1(inCategory.reduce((s, c) => s + c.max, 0)),
      };
    })
    .filter((c) => c.max > 0);

  const rawTotal = checks.reduce((s, c) => s + c.points, 0);
  const result: CvScore = {
    total: Math.max(0, Math.min(100, Math.round(rawTotal))),
    version: SCORE_RULES_VERSION,
    categories,
    checks,
  };
  if (jobMatch) result.jobMatch = jobMatch;
  return result;
}

/** Whether any of the texts mentions the phrase as whole words (same matching as the job-match checks). */
export function textMentions(texts: string[], phrase: string): boolean {
  return contains(haystack(texts), phrase);
}

/** The plain text of every bullet in a role — for prompts that rewrite them. */
export function roleBulletTexts(content: ScoreInput | null | undefined, index: number): string[] {
  const role = list<NonNullable<ScoreInput["experience"]>[number]>(content?.experience)[index];
  return role ? list<BulletLike>(role.bullets).map(bulletText).filter(Boolean) : [];
}
