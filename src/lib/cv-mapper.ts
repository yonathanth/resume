import { ApiCvDocument, CVBulletDTO, CVContentDTO, CVPositionDTO } from "./api";
import {
  CvAward,
  CvBullet,
  CvCertification,
  CvCourse,
  CvData,
  CvLanguage,
  CvLink,
  CvMembership,
  CvPersonalDetail,
  CvPosition,
  CvPresentation,
  CvProject,
  CvPublication,
  CvReference,
  CvVolunteering,
  ResumeDraft,
  SkillGroup,
  DEFAULT_TEMPLATE_ID,
  templateLabel,
} from "@/components/dashboard/create-flow/types";

let localIdCounter = 0;
/** A React key for a list item; never persisted. */
export function newLocalId(prefix: string): string {
  localIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${localIdCounter}`;
}

/** Stored bullets may be legacy plain strings or `{ label?, text }`. */
export function toBullet(value: CVBulletDTO | string | undefined): CvBullet {
  if (typeof value === "string") return { id: newLocalId("b"), label: "", text: value };
  return { id: newLocalId("b"), label: value?.label ?? "", text: value?.text ?? "" };
}

/** "Label: text" — for plain-text contexts (AI source text, polish context). */
export function bulletToText(bullet: { label?: string; text?: string } | string): string {
  if (typeof bullet === "string") return bullet;
  const text = bullet.text?.trim() ?? "";
  const label = bullet.label?.trim();
  return label && text ? `${label}: ${text}` : text;
}

/** The flat skills list is always exactly what's in the groups. */
export function flattenSkillGroups(groups: SkillGroup[]): string[] {
  const seen = new Set<string>();
  const skills: string[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      const skill = item.trim();
      if (skill && !seen.has(skill.toLowerCase())) {
        seen.add(skill.toLowerCase());
        skills.push(skill);
      }
    }
  }
  return skills;
}

const nonEmpty = (value: string | undefined): string | undefined => (value?.trim() ? value.trim() : undefined);

/**
 * Which editor entries make it into saved/previewed content — blank ones are
 * dropped. Shared with lib/preview-paths.ts, which maps a click on the
 * preview back to the entry it came from, so the two can never disagree.
 */
export const KEEP = {
  bullet: (b: CvBullet) => Boolean(b.text.trim()),
  link: (l: CvLink) => Boolean(l.url.trim()),
  skillGroup: (g: SkillGroup) => g.items.some((i) => i.trim()),
  project: (p: CvProject) => Boolean(p.name.trim()),
  certification: (c: CvCertification) => Boolean(c.name.trim()),
  language: (l: CvLanguage) => Boolean(l.language.trim()),
  award: (a: CvAward) => Boolean(a.title.trim()),
  publication: (p: CvPublication) => Boolean(p.title.trim()),
  volunteering: (v: CvVolunteering) => Boolean(v.organization.trim()),
  course: (c: CvCourse) => Boolean(c.name.trim()),
  membership: (m: CvMembership) => Boolean(m.organization.trim()),
  presentation: (p: CvPresentation) => Boolean(p.title.trim()),
  reference: (r: CvReference) => Boolean(r.name.trim()),
  personalDetail: (d: CvPersonalDetail) => Boolean(d.label.trim() && d.value.trim()),
  position: (p: CvPosition) => Boolean(p.title.trim()),
  interest: (i: string) => Boolean(i.trim()),
};

function positionsToDTO(items: CvPosition[]): CVPositionDTO[] {
  return items
    .filter(KEEP.position)
    .map((p) => ({
      title: p.title.trim(),
      organization: nonEmpty(p.organization),
      location: nonEmpty(p.location),
      start_date: nonEmpty(p.startDate),
      end_date: p.isCurrent ? "present" : nonEmpty(p.endDate),
      bullets: bulletsToDTO(p.bullets),
    }));
}

function positionsFromDTO(items: CVPositionDTO[] | undefined, prefix: string): CvPosition[] {
  return (items ?? []).map((p) => ({
    id: newLocalId(prefix),
    title: p.title ?? "",
    organization: p.organization ?? "",
    location: p.location ?? "",
    startDate: p.start_date ?? "",
    endDate: p.end_date === "present" ? "" : p.end_date ?? "",
    isCurrent: p.end_date === "present",
    bullets: (p.bullets ?? []).map(toBullet),
  }));
}

function bulletsToDTO(bullets: CvBullet[]): CVBulletDTO[] {
  return bullets
    .filter(KEEP.bullet)
    .map((b) => (b.label.trim() ? { label: b.label.trim(), text: b.text.trim() } : { text: b.text.trim() }));
}

// A genuinely empty CvData skeleton — used as the merge base wherever real
// backend content is about to be loaded in, so a fetch failure (or a
// document with no content yet) renders as visibly blank rather than as
// fabricated sample content indistinguishable from a real resume.
export function createBlankCv(overrides: Partial<CvData> = {}): CvData {
  return {
    id: "cv-new",
    title: "Untitled Resume",
    targetRole: "",
    templateStyle: DEFAULT_TEMPLATE_ID,
    atsScore: 0,
    personalInfo: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      headline: "",
      links: [],
      photo: "",
    },
    summary: "",
    experiences: [],
    education: [],
    skillGroups: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
    awards: [],
    publications: [],
    volunteering: [],
    courses: [],
    memberships: [],
    presentations: [],
    interests: [],
    references: [],
    personalDetails: [],
    research: [],
    teaching: [],
    activities: [],
    consent: "",
    ...overrides,
  };
}

// Maps a backend CV document (attached to a career profile or standalone)
// into the local ResumeDraft shape the Past Projects page already renders.
export function toResumeDraft(doc: ApiCvDocument): ResumeDraft {
  const personal = doc.content?.personal ?? {};
  const targetRole = personal.title || "Untitled Role";

  return {
    id: doc.id,
    templateId: doc.templateId,
    updatedAt: doc.updatedAt,
    title: doc.title || (personal.title ? `${personal.title} - Resume` : "Untitled Resume"),
    targetRole,
    targetCompany: "General Application",
    atsScore: 90,
    lastEdited: new Date(doc.updatedAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    templateName: templateLabel(doc.templateId),
    accentColor: "bg-neutral-950",
    matchedKeywords: (doc.content?.skills ?? []).slice(0, 5),
  };
}

// Turns a structured CV document back into a plain-text resume dump so it
// can be re-fed as "sourceText" to the AI generation endpoint — used when
// tailoring/enhancing an *existing* profile or past project, where we start
// a fresh document (so the backend's fill-only-empty-fields merge doesn't
// block the rewrite) seeded with the real prior content instead of nothing.
export function serializeCvContentToText(content: CVContentDTO): string {
  const lines: string[] = [];
  const personal = content.personal;

  if (personal) {
    if (personal.full_name) lines.push(personal.full_name);
    if (personal.title) lines.push(personal.title);
    if (personal.email) lines.push(personal.email);
    if (personal.phone) lines.push(personal.phone);
    if (personal.location) lines.push(personal.location);
  }

  if (content.summary) lines.push("", "Summary:", content.summary);

  if (content.experience?.length) {
    lines.push("", "Experience:");
    for (const exp of content.experience) {
      const header = [exp.role, exp.company].filter(Boolean).join(" at ");
      const dates = [exp.start_date, exp.end_date].filter(Boolean).join(" - ");
      lines.push(`- ${[header, dates].filter(Boolean).join(" (")}${dates ? ")" : ""}`);
      for (const bullet of exp.bullets ?? []) lines.push(`  * ${bulletToText(bullet)}`);
    }
  }

  if (content.education?.length) {
    lines.push("", "Education:");
    for (const ed of content.education) {
      const degree = [ed.degree, ed.field].filter(Boolean).join(" in ");
      const dates = [ed.start_date, ed.end_date].filter(Boolean).join(" - ");
      lines.push(
        `- ${[degree, ed.institution, ed.location, ed.gpa && `GPA ${ed.gpa}`, dates].filter(Boolean).join(", ")}`
      );
      for (const bullet of ed.bullets ?? []) lines.push(`  * ${bulletToText(bullet)}`);
    }
  }

  if (content.projects?.length) {
    lines.push("", "Projects:");
    for (const project of content.projects) {
      const tech = project.tech?.length ? ` (${project.tech.join(", ")})` : "";
      lines.push(`- ${project.name ?? ""}${tech}${project.subtitle ? ` – ${project.subtitle}` : ""}`);
      if (project.description) lines.push(`  ${project.description}`);
      for (const bullet of project.bullets ?? []) lines.push(`  * ${bulletToText(bullet)}`);
    }
  }

  if (content.skillGroups?.length) {
    lines.push("", "Skills:");
    for (const group of content.skillGroups) {
      lines.push(`${group.category ? `${group.category}: ` : ""}${(group.items ?? []).join(", ")}`);
    }
  } else if (content.skills?.length) {
    lines.push("", "Skills:", content.skills.join(", "));
  }

  if (content.certifications?.length) {
    lines.push("", "Certifications:");
    for (const cert of content.certifications) {
      lines.push(`- ${[cert.name, cert.issuer, cert.date].filter(Boolean).join(", ")}`);
    }
  }

  if (content.volunteering?.length) {
    lines.push("", "Volunteering:");
    for (const v of content.volunteering) {
      const dates = [v.start_date, v.end_date].filter(Boolean).join(" - ");
      lines.push(`- ${[v.role, v.organization].filter(Boolean).join(" at ")}${dates ? ` (${dates})` : ""}`);
      for (const bullet of v.bullets ?? []) lines.push(`  * ${bulletToText(bullet)}`);
    }
  }

  const positionSections: [string, CVPositionDTO[] | undefined][] = [
    ["Research Experience", content.research],
    ["Teaching Experience", content.teaching],
    ["Activities", content.activities],
  ];
  for (const [heading, items] of positionSections) {
    if (!items?.length) continue;
    lines.push("", `${heading}:`);
    for (const p of items) {
      const dates = [p.start_date, p.end_date].filter(Boolean).join(" - ");
      lines.push(`- ${[p.title, p.organization].filter(Boolean).join(", ")}${dates ? ` (${dates})` : ""}`);
      for (const bullet of p.bullets ?? []) lines.push(`  * ${bulletToText(bullet)}`);
    }
  }
  if (content.personalDetails?.length) {
    lines.push("", "Personal details:", ...content.personalDetails.map((d) => `- ${d.label}: ${d.value}`));
  }

  const simpleLists: [string, string[] | undefined][] = [
    ["Awards", content.awards?.map((a) => [a.title, a.issuer, a.date].filter(Boolean).join(", "))],
    ["Publications", content.publications?.map((p) => [p.authors, p.title, p.venue, p.date].filter(Boolean).join(", "))],
    ["Courses", content.courses?.map((c) => [c.name, c.institution, c.date].filter(Boolean).join(", "))],
    ["Memberships", content.memberships?.map((m) => [m.organization, m.role].filter(Boolean).join(", "))],
    ["Talks & Presentations", content.presentations?.map((p) => [p.title, p.event, p.date].filter(Boolean).join(", "))],
    ["References", content.references?.map((r) => [r.name, r.title, r.organization, r.email, r.phone].filter(Boolean).join(", "))],
  ];
  for (const [heading, items] of simpleLists) {
    if (items?.length) lines.push("", `${heading}:`, ...items.map((item) => `- ${item}`));
  }
  if (content.interests?.length) lines.push("", "Interests:", content.interests.join(", "));

  if (content.languages?.length) {
    lines.push(
      "",
      "Languages:",
      content.languages.map((l) => [l.language, l.proficiency && `(${l.proficiency})`].filter(Boolean).join(" ")).join(", ")
    );
  }

  return lines.join("\n");
}

// Reverse of applyCvContent — used to persist editor changes back to the
// backend via PATCH /api/v1/cv/:id. Blank list entries are dropped.
export function toCVContentPatch(cv: CvData): CVContentDTO {
  const skillGroups = cv.skillGroups
    .filter(KEEP.skillGroup)
    .map((g) => ({ category: g.category.trim(), items: g.items.map((i) => i.trim()).filter(Boolean) }));

  return {
    personal: {
      full_name: cv.personalInfo.fullName,
      title: cv.personalInfo.headline || cv.targetRole,
      email: cv.personalInfo.email,
      phone: cv.personalInfo.phone,
      location: cv.personalInfo.location,
      links: cv.personalInfo.links
        .filter(KEEP.link)
        .map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
      photo: nonEmpty(cv.personalInfo.photo),
    },
    summary: cv.summary,
    experience: cv.experiences.map((e) => ({
      company: e.company,
      role: e.role,
      location: nonEmpty(e.location),
      url: nonEmpty(e.url),
      start_date: e.startDate,
      end_date: e.isCurrent ? "present" : e.endDate,
      bullets: bulletsToDTO(e.bullets),
    })),
    education: cv.education.map((ed) => ({
      institution: ed.school,
      degree: ed.degree,
      field: nonEmpty(ed.field),
      location: nonEmpty(ed.location),
      gpa: nonEmpty(ed.gpa),
      start_date: nonEmpty(ed.startDate),
      end_date: nonEmpty(ed.endDate),
      honors: nonEmpty(ed.honors),
      bullets: bulletsToDTO(ed.bullets),
    })),
    skillGroups,
    skills: flattenSkillGroups(cv.skillGroups),
    projects: cv.projects
      .filter(KEEP.project)
      .map((p) => ({
        name: p.name.trim(),
        subtitle: nonEmpty(p.subtitle),
        description: nonEmpty(p.description),
        tech: p.tech.map((t) => t.trim()).filter(Boolean),
        url: nonEmpty(p.url),
        bullets: bulletsToDTO(p.bullets),
      })),
    certifications: cv.certifications
      .filter(KEEP.certification)
      .map((c) => ({
        name: c.name.trim(),
        issuer: nonEmpty(c.issuer),
        date: nonEmpty(c.date),
        expires: nonEmpty(c.expires),
        url: nonEmpty(c.url),
      })),
    languages: cv.languages
      .filter(KEEP.language)
      .map((l) => ({ language: l.language.trim(), proficiency: l.proficiency.trim() })),
    awards: cv.awards
      .filter(KEEP.award)
      .map((a) => ({ title: a.title.trim(), issuer: nonEmpty(a.issuer), date: nonEmpty(a.date), description: nonEmpty(a.description) })),
    publications: cv.publications
      .filter(KEEP.publication)
      .map((p) => ({
        title: p.title.trim(),
        authors: nonEmpty(p.authors),
        venue: nonEmpty(p.venue),
        date: nonEmpty(p.date),
        url: nonEmpty(p.url),
      })),
    volunteering: cv.volunteering
      .filter(KEEP.volunteering)
      .map((v) => ({
        organization: v.organization.trim(),
        role: nonEmpty(v.role),
        location: nonEmpty(v.location),
        start_date: nonEmpty(v.startDate),
        end_date: v.isCurrent ? "present" : nonEmpty(v.endDate),
        bullets: bulletsToDTO(v.bullets),
      })),
    courses: cv.courses
      .filter(KEEP.course)
      .map((c) => ({ name: c.name.trim(), institution: nonEmpty(c.institution), date: nonEmpty(c.date) })),
    memberships: cv.memberships
      .filter(KEEP.membership)
      .map((m) => ({
        organization: m.organization.trim(),
        role: nonEmpty(m.role),
        start_date: nonEmpty(m.startDate),
        end_date: m.isCurrent ? "present" : nonEmpty(m.endDate),
      })),
    presentations: cv.presentations
      .filter(KEEP.presentation)
      .map((p) => ({ title: p.title.trim(), event: nonEmpty(p.event), date: nonEmpty(p.date), url: nonEmpty(p.url) })),
    interests: cv.interests.filter(KEEP.interest).map((i) => i.trim()),
    references: cv.references
      .filter(KEEP.reference)
      .map((r) => ({
        name: r.name.trim(),
        title: nonEmpty(r.title),
        organization: nonEmpty(r.organization),
        relationship: nonEmpty(r.relationship),
        email: nonEmpty(r.email),
        phone: nonEmpty(r.phone),
      })),
    personalDetails: cv.personalDetails
      .filter(KEEP.personalDetail)
      .map((d) => ({ label: d.label.trim(), value: d.value.trim() })),
    research: positionsToDTO(cv.research),
    teaching: positionsToDTO(cv.teaching),
    activities: positionsToDTO(cv.activities),
    consent: cv.consent.trim(),
  };
}

/** Skill groups from stored content; a CV with only a flat list gets one unlabeled group. */
function toSkillGroups(content: CVContentDTO): SkillGroup[] {
  const groups = (content.skillGroups ?? [])
    .map((g) => ({ id: newLocalId("sg"), category: g.category ?? "", items: (g.items ?? []).filter(Boolean) }))
    .filter((g) => g.items.length > 0);
  if (groups.length) return groups;
  return content.skills?.length ? [{ id: newLocalId("sg"), category: "", items: [...content.skills] }] : [];
}

export function applyCvContent(base: CvData, content: CVContentDTO): CvData {
  const personal = content.personal ?? {};
  const skillGroups = content.skills?.length || content.skillGroups?.length ? toSkillGroups(content) : base.skillGroups;

  return {
    ...base,
    summary: content.summary || base.summary,
    experiences: content.experience?.length
      ? content.experience.map((e) => ({
          id: newLocalId("exp"),
          role: e.role ?? "",
          company: e.company ?? "",
          location: e.location ?? "",
          url: e.url ?? "",
          startDate: e.start_date ?? "",
          endDate: e.end_date === "present" ? "" : e.end_date ?? "",
          isCurrent: e.end_date === "present",
          bullets: (e.bullets ?? []).map(toBullet),
        }))
      : base.experiences,
    education: content.education?.length
      ? content.education.map((ed) => ({
          id: newLocalId("edu"),
          degree: ed.degree ?? "",
          field: ed.field ?? "",
          school: ed.institution ?? "",
          location: ed.location ?? "",
          gpa: ed.gpa ?? "",
          startDate: ed.start_date ?? "",
          endDate: ed.end_date ?? "",
          honors: ed.honors ?? "",
          bullets: (ed.bullets ?? []).map(toBullet),
        }))
      : base.education,
    skillGroups,
    skills: flattenSkillGroups(skillGroups),
    projects: content.projects?.length
      ? content.projects.map((p) => ({
          id: newLocalId("proj"),
          name: p.name ?? "",
          subtitle: p.subtitle ?? "",
          description: p.description ?? "",
          tech: p.tech ?? [],
          url: p.url ?? "",
          bullets: (p.bullets ?? []).map(toBullet),
        }))
      : base.projects,
    certifications: content.certifications?.length
      ? content.certifications.map((c) => ({
          id: newLocalId("cert"),
          name: c.name ?? "",
          issuer: c.issuer ?? "",
          date: c.date ?? "",
          expires: c.expires ?? "",
          url: c.url ?? "",
        }))
      : base.certifications,
    languages: content.languages?.length
      ? content.languages.map((l) => ({
          id: newLocalId("lang"),
          language: l.language ?? "",
          proficiency: l.proficiency ?? "",
        }))
      : base.languages,
    awards: content.awards?.length
      ? content.awards.map((a) => ({
          id: newLocalId("award"),
          title: a.title ?? "",
          issuer: a.issuer ?? "",
          date: a.date ?? "",
          description: a.description ?? "",
        }))
      : base.awards,
    publications: content.publications?.length
      ? content.publications.map((p) => ({
          id: newLocalId("pub"),
          title: p.title ?? "",
          authors: p.authors ?? "",
          venue: p.venue ?? "",
          date: p.date ?? "",
          url: p.url ?? "",
        }))
      : base.publications,
    volunteering: content.volunteering?.length
      ? content.volunteering.map((v) => ({
          id: newLocalId("vol"),
          organization: v.organization ?? "",
          role: v.role ?? "",
          location: v.location ?? "",
          startDate: v.start_date ?? "",
          endDate: v.end_date === "present" ? "" : v.end_date ?? "",
          isCurrent: v.end_date === "present",
          bullets: (v.bullets ?? []).map(toBullet),
        }))
      : base.volunteering,
    courses: content.courses?.length
      ? content.courses.map((c) => ({
          id: newLocalId("course"),
          name: c.name ?? "",
          institution: c.institution ?? "",
          date: c.date ?? "",
        }))
      : base.courses,
    memberships: content.memberships?.length
      ? content.memberships.map((m) => ({
          id: newLocalId("mem"),
          organization: m.organization ?? "",
          role: m.role ?? "",
          startDate: m.start_date ?? "",
          endDate: m.end_date === "present" ? "" : m.end_date ?? "",
          isCurrent: m.end_date === "present",
        }))
      : base.memberships,
    presentations: content.presentations?.length
      ? content.presentations.map((p) => ({
          id: newLocalId("talk"),
          title: p.title ?? "",
          event: p.event ?? "",
          date: p.date ?? "",
          url: p.url ?? "",
        }))
      : base.presentations,
    interests: content.interests?.length ? [...content.interests] : base.interests,
    references: content.references?.length
      ? content.references.map((r) => ({
          id: newLocalId("ref"),
          name: r.name ?? "",
          title: r.title ?? "",
          organization: r.organization ?? "",
          relationship: r.relationship ?? "",
          email: r.email ?? "",
          phone: r.phone ?? "",
        }))
      : base.references,
    personalDetails: content.personalDetails?.length
      ? content.personalDetails.map((d) => ({ id: newLocalId("pd"), label: d.label ?? "", value: d.value ?? "" }))
      : base.personalDetails,
    research: content.research?.length ? positionsFromDTO(content.research, "res") : base.research,
    teaching: content.teaching?.length ? positionsFromDTO(content.teaching, "teach") : base.teaching,
    activities: content.activities?.length ? positionsFromDTO(content.activities, "act") : base.activities,
    consent: content.consent || base.consent,
    personalInfo: {
      ...base.personalInfo,
      fullName: personal.full_name || base.personalInfo.fullName,
      email: personal.email || base.personalInfo.email,
      phone: personal.phone || base.personalInfo.phone,
      location: personal.location || base.personalInfo.location,
      headline: personal.title || base.personalInfo.headline,
      links: personal.links?.length
        ? personal.links.map((l) => ({ id: newLocalId("link"), label: l.label ?? "", url: l.url ?? "" }))
        : base.personalInfo.links,
      photo: personal.photo || base.personalInfo.photo,
    },
  };
}
