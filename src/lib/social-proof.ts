import {
  siAnthropic,
  siGoogle,
  siHubspot,
  siNotion,
  siPaypal,
  siShopify,
  siSpotify,
  siStripe,
  type SimpleIcon,
} from "simple-icons";

/*
 * The landing page's social proof: where users got hired, and the
 * before/after stories.
 *
 * PLACEHOLDERS. These numbers, companies and stories are here to design the
 * page with. Before this goes live, replace them with real, verifiable ones:
 * companies users really joined, and stories from users who agreed to be
 * shown. Showing made-up employers is misleading to visitors and can break
 * the brands' terms.
 */

export interface Brand {
  name: string;
  icon: SimpleIcon;
}

/** "Helping job seekers land roles at {companiesCount} companies like". */
export const HIRED_AT = {
  companiesCount: "1,000+",
  companies: [
    { name: "Google", icon: siGoogle },
    { name: "Anthropic", icon: siAnthropic },
    { name: "HubSpot", icon: siHubspot },
    { name: "PayPal", icon: siPaypal },
    { name: "Stripe", icon: siStripe },
    { name: "Spotify", icon: siSpotify },
    { name: "Shopify", icon: siShopify },
    { name: "Notion", icon: siNotion },
  ] as Brand[],
};

/** A before/after story for the swipeable results. */
export interface ResultStory {
  name: string;
  /** The home-made style the before is drawn in. */
  look: { before: "word" | "boxed" | "centered" | "cramped" };
  /** The after: this real template, rendered by the backend with the story's content (resume-back config/landing-stories, by `key`). */
  after: { template: string; key: string };
  from: string;
  to: string;
  outcome: string;
  before: {
    contact: string;
    objective: string;
    jobs: { line: string; bullets: string[] }[];
    skills: string;
  };
}

export const RESULT_STORIES: ResultStory[] = [
  {
    name: "Hana Bekele",
    after: { template: "classic", key: "hana" },
    look: { before: "word" },
    from: "ICU Nurse",
    to: "Clinical Research Coordinator",
    outcome: "4 interviews in 3 weeks",
    before: {
      contact: "hanab88@gmail.com · 0912 34 56 78",
      objective: "Seeking a position where I can use my nursing knowledge and grow professionally. I am caring, hard working and a team player.",
      jobs: [
        { line: "Nurse - St. Paul's Hospital (2018 - now)", bullets: ["Took care of patients", "Gave medications", "Worked night shifts"] },
        { line: "Intern nurse, Black Lion hospital 2017", bullets: ["Assisted nurses"] },
      ],
      skills: "Patient care, Microsoft Word, Communication, Teamwork",
    },
  },
  {
    name: "Daniel Okafor",
    after: { template: "spark", key: "daniel" },
    look: { before: "boxed" },
    from: "Retail Supervisor",
    to: "Account Executive",
    outcome: "Offer in 5 weeks",
    before: {
      contact: "dan.okafor@yahoo.com · +234 803 000 1122",
      objective: "To get a sales job in a good company. I am motivated and love working with people.",
      jobs: [
        { line: "Store supervisor, ShopRite Lekki 2019-2024", bullets: ["Managed staff", "Responsible for sales", "Handled customer complaints"] },
      ],
      skills: "Sales, Customer service, Excel, Leadership",
    },
  },
  {
    name: "Sara Tesfaye",
    after: { template: "midnight", key: "sara" },
    look: { before: "centered" },
    from: "Accountant",
    to: "Financial Analyst",
    outcome: "3 interviews in 2 weeks",
    before: {
      contact: "sara.t@outlook.com · 0911 22 33 44",
      objective: "Looking for a challenging role in finance. Detail oriented and results driven.",
      jobs: [
        { line: "Accountant - Habesha Breweries (2020 - present)", bullets: ["Did monthly closing", "Prepared reports", "Worked with Excel"] },
      ],
      skills: "Accounting, Peachtree, Excel, Hard working",
    },
  },
  {
    name: "Mateo Ruiz",
    after: { template: "linen", key: "mateo" },
    look: { before: "cramped" },
    from: "High School Teacher",
    to: "Instructional Designer",
    outcome: "Hired in 6 weeks",
    before: {
      contact: "mateo.ruiz.profe@gmail.com · 555 0142",
      objective: "Teacher looking for a new career. Passionate about education and technology.",
      jobs: [
        { line: "Science teacher, Lincoln High School, 2016-2024", bullets: ["Taught biology and chemistry", "Made lesson plans", "Graded exams"] },
      ],
      skills: "Teaching, Google Classroom, PowerPoint, Patience",
    },
  },
];

/**
 * What users say about gomoxie, for the reviews section.
 *
 * PLACEHOLDERS, like the rest of this file: before this goes live, replace
 * them with real reviews from users who agreed to be quoted (the CV ratings
 * and comments in Admin → Feedback are a good place to find them). Made-up
 * reviews shown as real ones mislead visitors and break consumer-protection
 * rules in many countries.
 */
export interface Review {
  name: string;
  /** Their role now, or the move they made. */
  role: string;
  /** 1–5. */
  stars: number;
  quote: string;
  /** When they left it, YYYY-MM-DD. */
  date: string;
}

/** The numbers above the reviews. PLACEHOLDERS too: use real counts, or remove them. */
export const REVIEW_STATS = { reviews: "500+", users: "10,000+" };

/** The first review is shown large, so it can run longer. */
export const REVIEWS: Review[] = [
  {
    name: "Hana Bekele",
    role: "Clinical Research Coordinator",
    stars: 5,
    quote:
      "I'd been sending the same CV for months and hearing nothing back. gomoxie rewrote it around what I'd actually achieved as a nurse, not just my duties, and the score showed me exactly what was still weak. I tailored it to each research role in minutes. Within three weeks I had four interviews, and I start my new job next month.",
    date: "2026-10-12",
  },
  {
    name: "Daniel Okafor",
    role: "Account Executive",
    stars: 5,
    quote: "Tailoring used to take me an evening per application. Now I paste the job post and it's done in minutes, and it still reads like me.",
    date: "2026-10-03",
  },
  {
    name: "Sara Tesfaye",
    role: "Financial Analyst",
    stars: 5,
    quote: "The tips showed me exactly what was weak. My old bullets were all duties, now they're results with numbers.",
    date: "2026-09-27",
  },
  {
    name: "Mateo Ruiz",
    role: "Instructional Designer",
    stars: 5,
    quote: "Switching careers, I didn't know how to make teaching sound relevant. It found the parts I'd never have thought to mention.",
    date: "2026-09-18",
  },
  {
    name: "Amara Nwosu",
    role: "Marketing Graduate",
    stars: 5,
    quote: "Started from a blank page as a fresh grad. A few questions in, I had a CV I was proud to send.",
    date: "2026-09-09",
  },
];
