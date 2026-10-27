import {
  siAnthropic,
  siGoogle,
  siHubspot,
  siNotion,
  siPaypal,
  siShopify,
  siSpotify,
  siStripe,
  siTrustpilot,
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

/**
 * The rating above the hero headline, and where it's from. PLACEHOLDER for the
 * design: before this goes live it must be our real Trustpilot rating, linked
 * to our Trustpilot page (`href`) — or removed. A made-up rating attributed to
 * Trustpilot misleads visitors and breaks Trustpilot's terms.
 */
export const HERO_RATING = { score: 4.8, platform: "Trustpilot", icon: siTrustpilot, href: undefined as string | undefined };

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
