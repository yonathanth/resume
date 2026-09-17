import { ApiCareerProfile, ApiCvDocument, CVContentDTO } from "./api";
import {
  CvData,
  WorkExperience,
  Education,
  ResumeDraft,
  CareerProfile,
  defaultSampleCv,
} from "@/components/dashboard/create-flow/types";

// A genuinely empty CvData skeleton — used as the merge base wherever real
// backend content is about to be loaded in, so a fetch failure (or a
// document with no content yet) renders as visibly blank rather than as
// fabricated sample content indistinguishable from a real resume.
export function createBlankCv(overrides: Partial<CvData> = {}): CvData {
  return {
    id: "cv-new",
    title: "Untitled Resume",
    targetRole: "",
    templateStyle: "tech",
    atsScore: 0,
    personalInfo: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      website: "",
      headline: "",
    },
    summary: "",
    experiences: [],
    education: [],
    skills: [],
    certifications: [],
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
    templateName: "Default",
    accentColor: "bg-neutral-950",
    matchedKeywords: (doc.content?.skills ?? []).slice(0, 5),
  };
}

// Maps a real backend career profile into the local CareerProfile shape the
// "Start from career profile" picker renders. The backend profile is just a
// named container (title only) — the decorative trajectory fields the local
// type carries (domain, readiness score, highlight, etc.) have no backend
// equivalent, so they're left blank rather than fabricated.
export function toCareerProfile(profile: ApiCareerProfile): CareerProfile {
  const skills = profile.summarySkills ?? [];
  return {
    id: profile.id,
    roleTitle: profile.title,
    domain: "",
    readinessScore: 0,
    targetCompanies: [],
    skills,
    highlight: "",
    cvData: {
      ...defaultSampleCv,
      id: "cv-new",
      targetRole: profile.title,
      skills: [],
      personalInfo: { ...defaultSampleCv.personalInfo, fullName: "", email: "", phone: "" },
    },
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
      for (const bullet of exp.bullets ?? []) lines.push(`  * ${bullet}`);
    }
  }

  if (content.education?.length) {
    lines.push("", "Education:");
    for (const ed of content.education) {
      lines.push(`- ${[ed.degree, ed.institution].filter(Boolean).join(", ")}`);
    }
  }

  if (content.skills?.length) {
    lines.push("", "Skills:", content.skills.join(", "));
  }

  return lines.join("\n");
}

// Reverse of applyCvContent — used to persist editor changes back to the
// backend via PATCH /api/v1/cv/:id.
export function toCVContentPatch(cv: CvData): CVContentDTO {
  const links: { label: string; url: string }[] = [];
  if (cv.personalInfo.linkedin) links.push({ label: "LinkedIn", url: cv.personalInfo.linkedin });
  if (cv.personalInfo.website) links.push({ label: "Website", url: cv.personalInfo.website });

  return {
    personal: {
      full_name: cv.personalInfo.fullName,
      title: cv.targetRole,
      email: cv.personalInfo.email,
      phone: cv.personalInfo.phone,
      location: cv.personalInfo.location,
      links: links.length > 0 ? links : undefined,
    },
    summary: cv.summary,
    experience: cv.experiences.map((e) => ({
      company: e.company,
      role: e.role,
      location: e.location,
      start_date: e.startDate,
      end_date: e.isCurrent ? "present" : e.endDate,
      bullets: e.bullets,
    })),
    education: cv.education.map((ed) => ({
      institution: ed.school,
      degree: ed.degree,
      end_date: ed.gradYear,
      honors: ed.honors,
    })),
    skills: cv.skills,
    certifications: cv.certifications?.map((name) => ({ name })),
  };
}

export function applyCvContent(base: CvData, content: CVContentDTO): CvData {
  const personal = content.personal ?? {};
  const links = personal.links ?? [];
  const linkedinLink = links.find((l) => l.label.toLowerCase().includes("linkedin"));
  const websiteLink = links.find((l) => l !== linkedinLink);

  const experiences: WorkExperience[] =
    content.experience && content.experience.length > 0
      ? content.experience.map((e, i) => ({
          id: `exp-${i + 1}`,
          role: e.role ?? "",
          company: e.company ?? "",
          location: e.location ?? "",
          startDate: e.start_date ?? "",
          endDate: e.end_date === "present" ? "Present" : e.end_date ?? "",
          isCurrent: e.end_date === "present",
          bullets: e.bullets ?? [],
        }))
      : base.experiences;

  const education: Education[] =
    content.education && content.education.length > 0
      ? content.education.map((ed, i) => ({
          id: `edu-${i + 1}`,
          degree: ed.degree ?? "",
          school: ed.institution ?? "",
          location: "",
          gradYear: ed.end_date ?? ed.start_date ?? "",
          honors: ed.honors,
        }))
      : base.education;

  return {
    ...base,
    summary: content.summary || base.summary,
    experiences,
    education,
    skills: content.skills && content.skills.length > 0 ? content.skills : base.skills,
    certifications: content.certifications?.length
      ? content.certifications.map((c) => c.name)
      : base.certifications,
    personalInfo: {
      ...base.personalInfo,
      fullName: personal.full_name || base.personalInfo.fullName,
      email: personal.email || base.personalInfo.email,
      phone: personal.phone || base.personalInfo.phone,
      location: personal.location || base.personalInfo.location,
      linkedin: linkedinLink?.url || base.personalInfo.linkedin,
      website: websiteLink?.url || base.personalInfo.website,
      headline: personal.title || base.personalInfo.headline,
    },
  };
}
