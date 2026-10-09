// The editor's working model of a CV. It maps 1:1 onto the backend's
// CVContent (see lib/cv-mapper.ts) so nothing is lost when a CV is loaded
// into the editor and saved back. List items carry a local `id` only so React
// can track them; ids are never sent to the backend.

export interface CvBullet {
  id: string;
  /** Optional bold lead-in ("Frontend Architecture"); empty = plain bullet. */
  label: string;
  text: string;
}

export interface WorkExperience {
  id: string;
  role: string;
  company: string;
  location: string;
  url: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  bullets: CvBullet[];
}

export interface Education {
  id: string;
  degree: string;
  field: string;
  school: string;
  location: string;
  gpa: string;
  startDate: string;
  /** Free text — "2026-06" or "Expected 2026". */
  endDate: string;
  honors: string;
  /** Thesis title, final grade, notable coursework. */
  bullets: CvBullet[];
}

export interface CvLink {
  id: string;
  label: string;
  url: string;
}

export interface CvProject {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  tech: string[];
  url: string;
  bullets: CvBullet[];
}

export interface CvCertification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expires: string;
  url: string;
}

/** Research positions, teaching, and extracurricular activities. */
export interface CvPosition {
  id: string;
  title: string;
  organization: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  bullets: CvBullet[];
}

/** A Europass-style fact: { label: "Nationality", value: "German" }. */
export interface CvPersonalDetail {
  id: string;
  label: string;
  value: string;
}

export interface CvLanguage {
  id: string;
  language: string;
  proficiency: string;
}

export interface CvAward {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description: string;
}

export interface CvPublication {
  id: string;
  title: string;
  authors: string;
  venue: string;
  date: string;
  url: string;
}

export interface CvVolunteering {
  id: string;
  organization: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  bullets: CvBullet[];
}

export interface CvCourse {
  id: string;
  name: string;
  institution: string;
  date: string;
}

export interface CvMembership {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface CvPresentation {
  id: string;
  title: string;
  event: string;
  date: string;
  url: string;
}

export interface CvReference {
  id: string;
  name: string;
  title: string;
  organization: string;
  relationship: string;
  email: string;
  phone: string;
}

export interface SkillGroup {
  id: string;
  /** Empty category = an unlabeled list of skills. */
  category: string;
  items: string[];
}

/** A template id from the backend registry (GET /api/v1/templates). */
export type TemplateId = string;

export const DEFAULT_TEMPLATE_ID: TemplateId = "classic";

// Ids saved before templates were real; the backend renders them as the default.
const LEGACY_TEMPLATE_IDS = new Set(["default", "professional", "tech", "executive", "swiss", "finance", "ai", "creative"]);

/** Display name for a stored template id, without needing the template list loaded. */
export function templateLabel(id: TemplateId | undefined): string {
  if (!id || LEGACY_TEMPLATE_IDS.has(id)) return "Classic";
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export interface CvData {
  id: string;
  title: string;
  targetRole: string;
  templateStyle: TemplateId;
  atsScore: number;
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    headline: string;
    links: CvLink[];
    /** data:image/...;base64, or "" for none. */
    photo: string;
  };
  summary: string;
  experiences: WorkExperience[];
  education: Education[];
  /** Grouped skills — what the editor edits and templates render. */
  skillGroups: SkillGroup[];
  /** Every skill as a flat list, always derived from skillGroups. */
  skills: string[];
  projects: CvProject[];
  certifications: CvCertification[];
  languages: CvLanguage[];
  awards: CvAward[];
  publications: CvPublication[];
  volunteering: CvVolunteering[];
  courses: CvCourse[];
  memberships: CvMembership[];
  presentations: CvPresentation[];
  interests: string[];
  references: CvReference[];
  personalDetails: CvPersonalDetail[];
  research: CvPosition[];
  teaching: CvPosition[];
  activities: CvPosition[];
  /** Data-processing consent clause (common on EU CVs). */
  consent: string;
  jobDescription?: string;
  tailorAlignmentScore?: number; // 0 to 10
  enhancementFocus?: string;
}

export interface PastProjectOption {
  id: string;
  title: string;
  role: string;
  company: string;
  atsScore: number;
  templateStyle: TemplateId;
  lastEdited: string;
  /** ISO time of the last save — keeps its preview thumbnail fresh. */
  updatedAt?: string;
  cvData: CvData;
}

export interface JobDescriptionPreset {
  id: string;
  title: string;
  company: string;
  content: string;
  targetRole: string;
  keySkills: string[];
}

// Deliberately blank, not a fabricated sample — this is the merge base used
// throughout the create/tailor/enhance flows whenever a real field hasn't
// been filled in yet (e.g. buildLocalCv's local-only fallback path). A
// realistic-looking fake person here would silently leak into a real user's
// generated CV wherever a field was actually missing, indistinguishable from
// their own data — exactly the fabrication risk the AI pipeline itself is
// built to avoid.
export const defaultSampleCv: CvData = {
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
};

export const SAMPLE_PAST_PROJECTS: PastProjectOption[] = [
  {
    id: "draft-1",
    title: "Senior Cloud Architect (Stripe Application)",
    role: "Senior Cloud Architect",
    company: "Stripe",
    atsScore: 98,
    templateStyle: DEFAULT_TEMPLATE_ID,
    lastEdited: "Today, 3:45 PM",
    cvData: {
      ...defaultSampleCv,
      id: "draft-1",
      title: "Senior Cloud Architect (Stripe)",
      targetRole: "Senior Cloud Architect",
      templateStyle: DEFAULT_TEMPLATE_ID,
      atsScore: 98,
    },
  },
  {
    id: "draft-2",
    title: "Staff Product Designer (Linear & Figma)",
    role: "Staff Product Designer",
    company: "Linear",
    atsScore: 95,
    templateStyle: DEFAULT_TEMPLATE_ID,
    lastEdited: "Yesterday",
    cvData: {
      ...defaultSampleCv,
      id: "draft-2",
      title: "Staff Product Designer (Linear)",
      targetRole: "Staff Product Designer",
      templateStyle: DEFAULT_TEMPLATE_ID,
      atsScore: 95,
      skills: ["Figma", "Design Systems", "Prototyping", "User Research", "Interaction Design"],
    },
  },
  {
    id: "draft-3",
    title: "Quantitative Analyst (Goldman Sachs)",
    role: "Quantitative Analyst",
    company: "Goldman Sachs",
    atsScore: 97,
    templateStyle: DEFAULT_TEMPLATE_ID,
    lastEdited: "Sep 08, 2026",
    cvData: {
      ...defaultSampleCv,
      id: "draft-3",
      title: "Quantitative Analyst (Goldman Sachs)",
      targetRole: "Quantitative Analyst",
      templateStyle: DEFAULT_TEMPLATE_ID,
      atsScore: 97,
      skills: ["Python", "C++", "Fixed Income", "Risk Models", "Stochastic Calculus"],
    },
  },
];

export const SAMPLE_JOB_DESCRIPTIONS: JobDescriptionPreset[] = [
  {
    id: "jd-stripe",
    title: "Staff Distributed Systems Engineer",
    company: "Stripe",
    targetRole: "Staff Distributed Systems Engineer",
    keySkills: ["Kubernetes", "Go", "AWS", "High-Throughput", "Distributed Systems", "Fault Tolerance"],
    content: `Stripe is looking for a Staff Distributed Systems Engineer to lead our Core Ledger Infrastructure pod. You will architect low-latency, highly available payment processing pipelines that handle billions of dollars daily with five-nines (99.999%) reliability. 

Requirements:
- 7+ years of experience architecting distributed systems in Go, C++, or Java.
- Deep hands-on expertise with Kubernetes, cloud-native deployments (AWS), and multi-region failover.
- Proven track record optimizing p99 latency and high-throughput transactional storage (PostgreSQL, Redis).
- Experience leading architectural reviews and mentoring senior engineers across distributed organizations.`,
  },
  {
    id: "jd-vercel",
    title: "Principal Platform & Cloud Architect",
    company: "Vercel",
    targetRole: "Principal Platform Architect",
    keySkills: ["Next.js", "TypeScript", "Edge Computing", "Terraform", "Serverless Infrastructure"],
    content: `Vercel is seeking a Principal Platform Architect to design the future of frontend deployment at global scale. You will own the core runtime and edge infrastructure powering millions of websites worldwide.

Requirements:
- Mastery of modern web platforms (Next.js, React 19, TypeScript) and edge computing runtimes.
- Strong background in cloud networking, global edge caching, DNS, and serverless compute primitives.
- Experience with infrastructure-as-code (Terraform, Pulumi) and zero-downtime blue/green rollouts.
- Excellent written and verbal technical communication skills.`,
  },
  {
    id: "jd-anthropic",
    title: "Senior AI Systems & ML Infrastructure Lead",
    company: "Anthropic",
    targetRole: "Senior AI Systems Engineer",
    keySkills: ["PyTorch", "Distributed Training", "CUDA", "Kubernetes", "High-Performance Computing"],
    content: `Anthropic is searching for a Senior AI Systems Engineer to join our Frontier Training cluster team. You will build and scale GPU compute clusters for training next-generation foundational AI models.

Requirements:
- 5+ years of experience with distributed training clusters (PyTorch, Ray, Slurm, Kubernetes).
- Deep familiarity with low-latency GPU interconnects, RDMA, NCCL, and cluster fault-tolerance.
- Demonstrated success scaling training workflows across thousands of H100/A100 accelerators.`,
  },
];

export interface ResumeDraft {
  id: string;
  /** Template the CV is saved with (drives its thumbnail). */
  templateId?: string;
  /** ISO timestamp of the last save — busts the cached thumbnail after edits. */
  updatedAt?: string;
  title: string;
  /** Name on the CV itself — used for the downloaded file's name. */
  fullName?: string;
  targetRole: string;
  targetCompany: string;
  atsScore: number;
  lastEdited: string;
  templateName: string;
  accentColor: string;
  matchedKeywords: string[];
}

export const INITIAL_DRAFTS: ResumeDraft[] = [
  {
    id: "draft-1",
    title: "Senior Cloud Architect",
    targetRole: "Senior Cloud Architect",
    targetCompany: "Stripe",
    atsScore: 98,
    lastEdited: "Today, 3:45 PM",
    templateName: "Silicon Valley Tech Lead",
    accentColor: "bg-neutral-950",
    matchedKeywords: ["AWS", "Kubernetes", "Go", "Terraform", "Distributed Systems"],
  },
  {
    id: "draft-2",
    title: "Staff Product Designer",
    targetRole: "Staff Product Designer",
    targetCompany: "Linear & Figma",
    atsScore: 95,
    lastEdited: "Yesterday",
    templateName: "Modern Minimalist",
    accentColor: "bg-indigo-600",
    matchedKeywords: ["Design Systems", "Figma", "User Research", "Prototyping"],
  },
  {
    id: "draft-3",
    title: "Quantitative Analyst",
    targetRole: "Quantitative Analyst",
    targetCompany: "Goldman Sachs",
    atsScore: 94,
    lastEdited: "Sep 08, 2026",
    templateName: "Wall Street Standard",
    accentColor: "bg-emerald-700",
    matchedKeywords: ["Python", "C++", "Fixed Income", "Risk Models", "Stochastic Calc"],
  },
  {
    id: "draft-4",
    title: "VP of Engineering",
    targetRole: "VP of Engineering",
    targetCompany: "Series B Scale-up",
    atsScore: 91,
    lastEdited: "Sep 01, 2026",
    templateName: "Executive Ivy",
    accentColor: "bg-stone-800",
    matchedKeywords: ["Org Scaling", "Budgeting", "Enterprise SaaS", "Strategic Roadmaps"],
  },
  {
    id: "draft-5",
    title: "Lead AI Scientist",
    targetRole: "Staff AI Research Scientist",
    targetCompany: "Anthropic / OpenAI",
    atsScore: 99,
    lastEdited: "Aug 28, 2026",
    templateName: "High Density Research",
    accentColor: "bg-teal-700",
    matchedKeywords: ["PyTorch", "Transformers", "LLMs", "Distributed Training"],
  },
  {
    id: "draft-6",
    title: "Full Stack Platform Lead",
    targetRole: "Principal Frontend Engineer",
    targetCompany: "Vercel",
    atsScore: 96,
    lastEdited: "Aug 20, 2026",
    templateName: "Modern Sans",
    accentColor: "bg-blue-600",
    matchedKeywords: ["React 19", "Next.js", "TypeScript", "Micro-frontends"],
  },
];

