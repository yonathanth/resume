import type { OgCardInput } from "./card";

// The share card for each public page: what a link shows on Telegram,
// WhatsApp, LinkedIn, X and the rest. `alt` describes the image for screen
// readers (and the platforms that show it).

type PageCard = OgCardInput & { alt: string };

export const PAGE_CARDS = {
  home: {
    eyebrow: "Free AI resume builder",
    title: "Resumes that land interviews",
    subtitle: "Create, tailor or improve your CV in minutes.",
    pose: "folder",
    alt: "GoMoxie — AI resumes that land interviews. Moxie the hermit crab holds a CV folder.",
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Start free. Go Pro when you're applying hard.",
    subtitle: "Every tool free to try. Pro from $4.99 a week.",
    pose: "crown",
    alt: "GoMoxie pricing — start free, Pro from $4.99 a week.",
  },
  templates: {
    eyebrow: "Free resume templates",
    title: "Templates recruiters can actually read",
    subtitle: "ATS-friendly layouts, from one-pagers to academic CVs.",
    pose: "pencil",
    alt: "GoMoxie resume templates — ATS-friendly layouts.",
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "From your story to a finished CV",
    subtitle: "Tell us about your work. AI writes it. You polish and download.",
    pose: "editor",
    alt: "How GoMoxie works — from your story to a finished CV.",
  },
  help: {
    eyebrow: "Help center",
    title: "Answers about your CV, templates and plans",
    pose: "glasses",
    alt: "GoMoxie help center.",
  },
  signup: {
    eyebrow: "Free account",
    title: "Your next CV is five minutes away",
    subtitle: "Sign up free. No credit card.",
    pose: "folder",
    alt: "Create a free GoMoxie account.",
  },
  create: {
    eyebrow: "Create a resume",
    title: "Build a resume from scratch, with AI",
    subtitle: "Answer a few questions. Get a finished, ATS-friendly CV.",
    pose: "pencil",
    alt: "Build a resume from scratch with GoMoxie's AI.",
  },
  tailor: {
    eyebrow: "Tailor to a job",
    title: "Tailor your CV to any job posting",
    subtitle: "Paste the job. We match the keywords and lead with your best.",
    pose: "magnifier",
    alt: "Tailor your CV to a job posting with GoMoxie.",
  },
  improve: {
    eyebrow: "Improve your CV",
    title: "Make the CV you have stronger",
    subtitle: "Upload it. Get clearer bullets and stronger wording.",
    pose: "editor",
    alt: "Improve your existing CV with GoMoxie.",
  },
} satisfies Record<string, PageCard>;

export type PageCardKey = keyof typeof PAGE_CARDS;
