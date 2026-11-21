import type { PricingCatalog } from "@/lib/api";
import { formatPrice } from "@/lib/plans";

// Help center content, shared by the dashboard Help page, the public /help
// page and the pricing page's FAQ. Answers describe how the app actually
// behaves — keep them in sync with the product. Prices and limits are never
// written in here: they come from the live price list (GET /api/v1/pricing,
// usePricing), so an admin's plan change shows up everywhere at once.

export const SUPPORT_EMAIL = "support@gomoxie.app";

export type Faq = { q: string; a: string };
export type FaqGroup = { topic: string; faqs: Faq[] };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "Your first AI CV is free" / "Your first 3 AI CVs are free". */
function freeLine(p: PricingCatalog) {
  const n = p.free.generations;
  return n === 1 ? "Your first AI CV is free" : `Your first ${n} AI CVs are free`;
}

/** "$2.99 for a new CV, $1.99 for one tailored or improved from a CV you already have". */
function payPerCvLine(p: PricingCatalog) {
  return `${formatPrice(p.payPerCv.cv_new.price)} for a new CV, ${formatPrice(p.payPerCv.cv_edit.price)} for one tailored or improved from a CV you already have`;
}

/** "30 tailorings, 20 improvements and 8 new CVs". */
function limitsLine(limits: { create: number; tailor: number; improve: number }) {
  return `${plural(limits.tailor, "tailoring", "tailorings")}, ${plural(limits.improve, "improvement", "improvements")} and ${plural(limits.create, "new CV", "new CVs")}`;
}

/** The answers about plans and paying, shared by the help center and the pricing page. */
function planFaqs(p: PricingCatalog) {
  return {
    free: {
      q: "How many CVs can I make for free?",
      a: `${freeLine(p)}: a new one, a tailored one or an improved one, with every template, the full editor and your CV score. After that you can keep making CVs and pay only for the ones you download (${payPerCvLine(p)}), with up to ${plural(p.free.unpaidCvCap, "unpaid CV", "unpaid CVs")} waiting at a time. Editing by hand and switching templates never count, and if the AI fails to produce a CV, it doesn't count either.`,
    },
    payPerCv: {
      q: "How does paying per CV work?",
      a: `Make your CV, edit it as much as you like, and pay when you download it: ${payPerCvLine(p)}. Any paid plan also unlocks the CVs you made on the free plan.`,
    },
    plusVsPro: {
      q: "What's the difference between Plus and Pro?",
      a: `Plus is from ${formatPrice(p.plans.plus.weekly.price)} a week, with a set number of AI CVs each period (on the monthly plan: ${limitsLine(p.plusLimits.monthly)}). Pro is from ${formatPrice(p.plans.pro.weekly.price)} a week, with no limits under our fair use policy. Both add career profiles, your CV score's full breakdown and one-click AI polish. Each comes weekly, monthly or every 3 months, and renews until you cancel.`,
    },
    plusLimit: {
      q: "What happens when I reach my Plus limit?",
      a: "You can still make CVs and pay for each one when you download it, or move up to Pro for no limits. Your Plus limits reset at the start of each billing period.",
    },
    lifetime: {
      q: "What is Plus Lifetime?",
      a: `One payment of ${formatPrice(p.lifetime.price)} for Plus for good: ${limitsLine(p.lifetime.limits)} every month, reset monthly. It's only offered for a limited time; when it's available, you'll see it on the pricing page.`,
    },
    cancel: {
      q: "Can I cancel or switch plans anytime?",
      a: "Yes. Switch between plans and billing periods from Account settings; the change is prorated. If you cancel, you keep your plan until the end of the period you've paid for, and you can undo the cancellation before then. Within 7 days of your first payment you can ask for a full refund by emailing support@gomoxie.app; see the Refund and Cancellation Policy at gomoxie.app/refunds.",
    },
  };
}

/** Every help center topic, with prices and limits from `pricing`. */
export function faqGroups(pricing: PricingCatalog): FaqGroup[] {
  const plans = planFaqs(pricing);
  return [
    {
      topic: "Getting started",
      faqs: [
        {
          q: "What can I do with gomoxie?",
          a: "Create a new CV from scratch, improve the one you have, or tailor a CV to a specific job. Then check its score, fix what it flags, pick from our templates and download a PDF.",
        },
        {
          q: "What's the fastest way to make a CV?",
          a: "On The Builder, choose Create a new resume. Upload your old CV (PDF, Word or a photo of it), write your career story in your own words, or start from a career profile, then pick a template. The AI drafts it and asks about anything important that's missing.",
        },
        {
          q: "Can I try it before signing up?",
          a: "Yes. Start creating, improving or tailoring a CV straight from the home page, no account needed. We ask you to sign up just before the AI writes your CV, then carry on where you left off.",
        },
        {
          q: "Can I tailor a CV to a specific job?",
          a: "Yes. Choose Tailor to a job on The Builder and paste the job posting. The AI rewrites your CV toward it, leads with your most relevant experience, works in the keywords the posting asks for, and lists any gaps between your experience and the role.",
        },
        {
          q: "How does Improve a CV work?",
          a: "Upload the CV you have. The AI rewrites it around results instead of duties, with clearer bullets and stronger wording, in the template you choose. You review the changes before anything is saved.",
        },
      ],
    },
    {
      topic: "Editing & templates",
      faqs: [
        {
          q: "What is the CV score?",
          a: "Your CV's score shows how strong it is and lists what to fix next, from missing details to weak bullet points. Everyone sees what's missing; Plus and Pro add the full breakdown and one-click AI polish, which you can always undo.",
        },
        {
          q: "Can I switch templates after I've started?",
          a: "Any time, from the editor. Your content is kept. The template only changes the layout and which sections are shown.",
        },
        {
          q: "Is the preview what employers will see?",
          a: "Yes. The preview is rendered with the same template as the PDF and split into pages where the PDF breaks them, so what you see in the editor is what gets downloaded.",
        },
        {
          q: "Why won't my CV download?",
          a: "A CV needs your full name, a valid email address, at least one experience entry and at least one skill before it can be downloaded. The editor lists anything that's missing, so fill those in and try again. If it's a CV you're paying for at download, you'll be asked to pay first.",
        },
        {
          q: "Which file formats are supported?",
          a: "You can start from an existing CV as a PDF, a Word (DOCX) file or an image (PNG or JPG). Finished CVs download as a PDF, the format applicant tracking systems read most reliably.",
        },
      ],
    },
    {
      topic: "Career profiles",
      faqs: [
        {
          q: "What is a career profile?",
          a: "A profile holds everything about you for one role you're going for, say \"Backend Engineer\" or \"Product Manager\": your experience, skills, education and projects. Fill it in yourself or save a CV to it, then every new CV for that role starts from all of it, with no retyping. Career profiles come with Plus and Pro; if you downgrade, they stay saved and readable.",
        },
        {
          q: "Will a new CV overwrite my profile?",
          a: "No. New CVs only add what's new, and details you edited by hand are never overwritten. A CV tailored to a job adds facts (roles, skills, education), never its job-specific wording, and Improve a CV shows you the before and after before saving any reworded text to a profile.",
        },
      ],
    },
    {
      topic: "AI & free CVs",
      faqs: [
        plans.free,
        {
          q: "Does the AI make things up?",
          a: "It's instructed to only use facts from what you give it: your uploaded CV, your own description or your profile. It rewrites and structures; it shouldn't invent employers, dates or numbers. Always read the draft before sending it.",
        },
      ],
    },
    {
      topic: "Plan & billing",
      faqs: [plans.plusVsPro, plans.plusLimit, plans.payPerCv, plans.lifetime, plans.cancel],
    },
    {
      topic: "Account & privacy",
      faqs: [
        {
          q: "Do you keep the files I upload?",
          a: "No. Uploaded CVs are read in memory and the file itself is never stored. We keep the text read from it, along with the CV content you save.",
        },
        {
          q: "How do I change my password or delete my account?",
          a: "Both are in Account settings. If you signed up with Google you can also set a password there. Deleting your account permanently removes your CVs, profiles and payment history.",
        },
      ],
    },
  ];
}

/** The pricing page's FAQ: plans and paying, plus the formats question people ask before buying. */
export function pricingFaqs(pricing: PricingCatalog): Faq[] {
  const plans = planFaqs(pricing);
  const formats = faqGroups(pricing)
    .flatMap((g) => g.faqs)
    .find((f) => f.q === "Which file formats are supported?");
  return [plans.free, plans.payPerCv, plans.plusVsPro, plans.plusLimit, plans.lifetime, plans.cancel, ...(formats ? [formats] : [])];
}

export const WRITING_TIPS = [
  {
    title: "Use standard headings",
    body: "\"Experience\", \"Education\", \"Skills\". Screening software looks for these names, not creative ones.",
  },
  {
    title: "Show results, not duties",
    body: "Lead bullets with what changed because of you: numbers, time saved, people reached. Improve a CV does this for you.",
  },
  {
    title: "Mirror the job's wording",
    body: "If the posting says \"Kubernetes\", write Kubernetes, not just \"K8s\". Tailor to a job does this for you.",
  },
  {
    title: "Keep one CV per role",
    body: "A focused CV beats one that tries to fit everything. Career profiles make this easy to manage.",
  },
];

/** The FAQ groups whose questions or answers mention `query` (all of them when it's empty). */
export function filterFaqGroups(groups: FaqGroup[], query: string): FaqGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((g) => ({ ...g, faqs: g.faqs.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)) }))
    .filter((g) => g.faqs.length > 0);
}
