import type { OgCardInput } from "./card";

// The share card for each public page: what a link shows on Telegram,
// WhatsApp, LinkedIn, X and the rest. `alt` describes the image for screen
// readers (and the platforms that show it).

/** `title` and `description` are text only (never drawn): what a shared /go link says beside the image. */
type PageCard = OgCardInput & { alt: string; title: string; description: string };

export const PAGE_CARDS = {
  home: {
    title: "Resumes that land interviews",
    description: "Create, tailor or improve your CV in minutes.",
    lines: ["Build a CV that's", "impossible to ignore."],
    accent: "impossible",
    pose: "folder",
    alt: "gomoxie: build a CV that's impossible to ignore. Moxie the hermit crab holds a CV folder.",
  },
  pricing: {
    title: "Start free. Upgrade when you need more.",
    description: "Your first AI CV is free. Plus and Pro when you need more, or pay per CV.",
    lines: ["Start free.", "Upgrade anytime."],
    accent: "free.",
    pose: "crown",
    alt: "gomoxie pricing: start free, upgrade anytime.",
  },
  templates: {
    title: "Templates recruiters can actually read",
    description: "ATS-friendly layouts, from one-pagers to academic CVs.",
    lines: ["Templates built to", "pass the scan."],
    accent: "pass the scan.",
    pose: "pencil",
    alt: "gomoxie resume templates, built to pass applicant tracking systems.",
  },
  howItWorks: {
    title: "From your story to a finished CV",
    description: "Tell us about your work. AI writes it. You polish and download.",
    lines: ["From your story", "to a finished CV."],
    accent: "finished",
    pose: "editor",
    alt: "How gomoxie works: from your story to a finished CV.",
  },
  help: {
    title: "Answers about your CV, templates and plans",
    description: "Guides and answers for gomoxie.",
    lines: ["Questions?", "We've got answers."],
    accent: "answers.",
    pose: "glasses",
    alt: "gomoxie help center.",
  },
  signup: {
    title: "Your next CV is five minutes away",
    description: "Sign up free. No credit card.",
    lines: ["Your next CV is", "minutes away."],
    accent: "minutes",
    pose: "folder",
    alt: "Create a free gomoxie account.",
  },
  create: {
    title: "Build a resume from scratch, with AI",
    description: "Answer a few questions. Get a finished, ATS-friendly CV.",
    lines: ["Build your CV", "from scratch."],
    accent: "scratch.",
    pose: "pencil",
    alt: "Build a resume from scratch with gomoxie's AI.",
  },
  tailor: {
    title: "Tailor your CV to any job posting",
    description: "Paste the job. We match the keywords and lead with your best.",
    lines: ["Tailor your CV", "to any job."],
    accent: "any job.",
    pose: "magnifier",
    alt: "Tailor your CV to a job posting with gomoxie.",
  },
  improve: {
    title: "Make the CV you have stronger",
    description: "Upload it. Get clearer bullets and stronger wording.",
    lines: ["Make your CV", "stronger."],
    accent: "stronger.",
    pose: "editor",
    alt: "Improve your existing CV with gomoxie.",
  },
} satisfies Record<string, PageCard>;

export type PageCardKey = keyof typeof PAGE_CARDS;
