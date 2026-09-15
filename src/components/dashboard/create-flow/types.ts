export interface WorkExperience {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  bullets: string[];
}

export interface Education {
  id: string;
  degree: string;
  school: string;
  location: string;
  gradYear: string;
  honors?: string;
}

export type TemplateId =
  | "tech"
  | "executive"
  | "swiss"
  | "finance"
  | "ai"
  | "creative";

export interface TemplateOption {
  id: TemplateId;
  name: string;
  category: string;
  fontFamily: string;
  description: string;
  atsScore: number;
  badge: string;
}

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: "tech",
    name: "Tech Modern",
    category: "Software & Cloud",
    fontFamily: "Geist / Inter Sans",
    description:
      "Compact high-density hierarchy optimized for technical recruiters, cloud architectures, and GitHub metrics.",
    atsScore: 98,
    badge: "Most Popular",
  },
  {
    id: "executive",
    name: "Executive Serif",
    category: "Leadership & Strategy",
    fontFamily: "Merriweather / Times Serif",
    description:
      "Classic authoritative serif typography with centered credentials for Directors, VPs, and C-suite leaders.",
    atsScore: 97,
    badge: "Ivy League",
  },
  {
    id: "swiss",
    name: "Minimal Swiss",
    category: "Product & Design",
    fontFamily: "Helvetica / Modern Sans",
    description:
      "Ultra-clean balanced whitespace with strict typographic grid for Product Managers, Designers, and Founders.",
    atsScore: 96,
    badge: "Clean Modern",
  },
  {
    id: "finance",
    name: "Wall Street Standard",
    category: "Finance & Quant",
    fontFamily: "Georgia / Classic Serif",
    description:
      "Conservative investment banking and PE format with strict tabular dates and quantitative bullet hierarchy.",
    atsScore: 99,
    badge: "M&A Ready",
  },
  {
    id: "ai",
    name: "Research & AI",
    category: "R&D & Machine Learning",
    fontFamily: "Inter / Code Sans",
    description:
      "Structured layout highlighting arXiv publications, algorithmic benchmarks, and open-source contributions.",
    atsScore: 98,
    badge: "DeepTech",
  },
  {
    id: "creative",
    name: "Editorial Brand",
    category: "Brand & Creative",
    fontFamily: "Playfair / Editorial Sans",
    description:
      "Distinct editorial headline hierarchy and campaign impact callouts for Marketing & Creative Directors.",
    atsScore: 95,
    badge: "Impact",
  },
];

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
    linkedin: string;
    website?: string;
    headline: string;
  };
  summary: string;
  experiences: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications?: string[];
  jobDescription?: string;
  tailorAlignmentScore?: number; // 0 to 10
  enhancementFocus?: string;
}

export interface CareerProfile {
  id: string;
  roleTitle: string;
  domain: string;
  readinessScore: number;
  targetCompanies: string[];
  skills: string[];
  highlight: string;
  cvData: CvData;
}

export interface PastProjectOption {
  id: string;
  title: string;
  role: string;
  company: string;
  atsScore: number;
  templateStyle: TemplateId;
  lastEdited: string;
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

export const defaultSampleCv: CvData = {
  id: "cv-new",
  title: "Senior Full Stack & Cloud Architect",
  targetRole: "Senior Cloud Architect",
  templateStyle: "tech",
  atsScore: 98,
  personalInfo: {
    fullName: "Alex Rivera",
    email: "alex.rivera@example.com",
    phone: "+1 (555) 234-5678",
    location: "San Francisco, CA",
    linkedin: "linkedin.com/in/alexrivera-cloud",
    website: "alexrivera.dev",
    headline: "Senior Cloud Architect & Distributed Systems Engineer",
  },
  summary:
    "Engineering leader with 7+ years architecting high-throughput cloud infrastructure and fault-tolerant microservices. Proven record reducing p99 latency by 44% and optimizing multi-region AWS footprints serving 12M+ active requests daily.",
  experiences: [
    {
      id: "exp-1",
      role: "Lead Cloud Infrastructure Architect",
      company: "Stripe & FinScale",
      location: "San Francisco, CA",
      startDate: "2022",
      endDate: "Present",
      isCurrent: true,
      bullets: [
        "Architected multi-region Kubernetes clusters on AWS EKS across 3 availability zones, maintaining 99.995% service uptime across 12M+ daily transactions.",
        "Engineered automated Terraform & GitOps pipelines reducing deployment rollback incidence by 62% while enabling 28 daily zero-downtime releases.",
        "Optimized AWS infrastructure cost efficiency by $320K/yr through reserved instances, spot fleet management, and automated node pool autoscaling.",
      ],
    },
    {
      id: "exp-2",
      role: "Senior Distributed Systems Engineer",
      company: "Vercel / CloudPlatform",
      location: "Remote",
      startDate: "2019",
      endDate: "2022",
      isCurrent: false,
      bullets: [
        "Spearheaded redesign of real-time edge caching layer utilizing Redis and Go, accelerating API response speeds by 44% across 8 global edge POPs.",
        "Mentored a pod of 6 backend engineers, instituting automated unit and integration tests yielding 94% test coverage.",
      ],
    },
  ],
  education: [
    {
      id: "edu-1",
      degree: "B.S. in Computer Science & Distributed Systems",
      school: "University of California, Berkeley",
      location: "Berkeley, CA",
      gradYear: "2019",
      honors: "Summa Cum Laude, Dean's Honors List",
    },
  ],
  skills: [
    "AWS & GCP",
    "Kubernetes (EKS)",
    "Terraform",
    "Docker",
    "Go (Golang)",
    "TypeScript",
    "Node.js",
    "PostgreSQL",
    "Redis",
    "Distributed Systems",
    "CI/CD (GitHub Actions)",
    "System Architecture",
  ],
  certifications: [
    "AWS Certified Solutions Architect - Professional",
    "Certified Kubernetes Administrator (CKA)",
  ],
};

export const SAMPLE_CAREER_PROFILES: CareerProfile[] = [
  {
    id: "profile-cloud-architect",
    roleTitle: "Senior Cloud Architect",
    domain: "Infrastructure & Distributed Systems",
    readinessScore: 98,
    targetCompanies: ["Stripe", "AWS", "Cloudflare", "Datadog"],
    skills: ["AWS", "Kubernetes", "Terraform", "Go", "Distributed Systems", "Docker", "PostgreSQL"],
    highlight: "12M+ daily requests, p99 latency optimization, Terraform & K8s multi-region clusters",
    cvData: {
      ...defaultSampleCv,
      id: "cv-prof-1",
      title: "Senior Cloud Architect – Master Profile",
      targetRole: "Senior Cloud Architect",
      templateStyle: "tech",
      atsScore: 98,
    },
  },
  {
    id: "profile-fullstack-lead",
    roleTitle: "Staff Full Stack Engineer",
    domain: "Web Architecture & Micro-Frontends",
    readinessScore: 96,
    targetCompanies: ["Vercel", "Linear", "Supabase", "Retool"],
    skills: ["Next.js 16", "React 19", "TypeScript", "Node.js", "Edge Caching", "Tailwind CSS", "GraphQL"],
    highlight: "Next.js 16 & React 19 micro-frontends, edge caching, real-time sync engines",
    cvData: {
      ...defaultSampleCv,
      id: "cv-prof-2",
      title: "Staff Full Stack Engineer – Master Profile",
      targetRole: "Staff Full Stack Engineer",
      templateStyle: "swiss",
      atsScore: 96,
      skills: ["Next.js 16", "React 19", "TypeScript", "Node.js", "Edge Caching", "PostgreSQL", "Redis"],
    },
  },
  {
    id: "profile-engineering-lead",
    roleTitle: "VP of Engineering / Lead",
    domain: "Leadership, Org Scaling & Strategy",
    readinessScore: 93,
    targetCompanies: ["Scale AI", "Shopify", "Notion", "Figma"],
    skills: ["Org Scaling", "Budgeting", "Enterprise SaaS", "Strategic Roadmaps", "Hiring & Mentorship"],
    highlight: "Scaled engineering team from 6 to 34 engineers, zero-downtime delivery cadence",
    cvData: {
      ...defaultSampleCv,
      id: "cv-prof-3",
      title: "VP of Engineering – Master Profile",
      targetRole: "VP of Engineering",
      templateStyle: "executive",
      atsScore: 94,
    },
  },
];

export const SAMPLE_PAST_PROJECTS: PastProjectOption[] = [
  {
    id: "draft-1",
    title: "Senior Cloud Architect (Stripe Application)",
    role: "Senior Cloud Architect",
    company: "Stripe",
    atsScore: 98,
    templateStyle: "tech",
    lastEdited: "Today, 3:45 PM",
    cvData: {
      ...defaultSampleCv,
      id: "draft-1",
      title: "Senior Cloud Architect (Stripe)",
      targetRole: "Senior Cloud Architect",
      templateStyle: "tech",
      atsScore: 98,
    },
  },
  {
    id: "draft-2",
    title: "Staff Product Designer (Linear & Figma)",
    role: "Staff Product Designer",
    company: "Linear",
    atsScore: 95,
    templateStyle: "swiss",
    lastEdited: "Yesterday",
    cvData: {
      ...defaultSampleCv,
      id: "draft-2",
      title: "Staff Product Designer (Linear)",
      targetRole: "Staff Product Designer",
      templateStyle: "swiss",
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
    templateStyle: "finance",
    lastEdited: "Sep 08, 2026",
    cvData: {
      ...defaultSampleCv,
      id: "draft-3",
      title: "Quantitative Analyst (Goldman Sachs)",
      targetRole: "Quantitative Analyst",
      templateStyle: "finance",
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
  title: string;
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

