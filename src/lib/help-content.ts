// Help center content, shared by the dashboard Help page and the public /help
// page. Answers describe how the app actually behaves — keep them in sync with
// the product.

export const SUPPORT_EMAIL = "support@gomoxie.app";

export type Faq = { q: string; a: string };

export const FAQ_GROUPS: { topic: string; faqs: Faq[] }[] = [
  {
    topic: "Getting started",
    faqs: [
      {
        q: "What's the fastest way to make a resume?",
        a: "On The Builder, choose Create a new resume, then upload your old CV (PDF, DOCX or an image), write your career story in your own words, or start from a career profile, and pick a template. The AI drafts it and asks about anything important that's missing.",
      },
      {
        q: "What is a career profile?",
        a: "A profile holds everything about you for one role you're going for, say \"Backend Engineer\" or \"Product Manager\": your experience, skills, education and projects. You get one per role. Fill it in yourself or save a CV to it, then every new CV for that role starts from all of it. Details you edit by hand are never overwritten by a later CV. A CV tailored to a job only adds facts (roles, skills, education), never its job-specific wording, and Improve a CV shows you the before and after before saving any reworded text to a profile. Career profiles are part of GoMoxie Pro; if you downgrade, they stay saved and readable.",
      },
      {
        q: "Can I tailor a resume to a specific job?",
        a: "Yes. Choose Tailor to a job on The Builder and paste the job description. The AI rewrites your CV toward it and lists any gaps between your experience and the posting.",
      },
    ],
  },
  {
    topic: "Editing & templates",
    faqs: [
      {
        q: "Can I switch templates after I've started?",
        a: "Any time, from the editor. Your content is kept. The template only changes the layout and which sections are shown.",
      },
      {
        q: "Why won't my resume download?",
        a: "A resume needs your personal details, at least one experience entry and at least one skill before it can be exported. Open it in the editor, fill those in, and try again.",
      },
      {
        q: "Is the preview what employers will see?",
        a: "Yes. The preview is rendered with the same template as the exported file, so what you see in the editor is what gets downloaded.",
      },
    ],
  },
  {
    topic: "AI & free generations",
    faqs: [
      {
        q: "How many resumes can I make for free?",
        a: "The free plan includes 3 AI generations. Each time the AI drafts or rewrites a resume counts as one. Editing by hand, switching templates and downloading never count. Pro makes AI generations unlimited.",
      },
      {
        q: "Does the AI make things up?",
        a: "It's instructed to only use facts from what you give it: your uploaded CV, your own description or your profile. It rewrites and structures; it shouldn't invent employers, dates or numbers. Always read the draft before sending it.",
      },
    ],
  },
  {
    topic: "Plan & billing",
    faqs: [
      {
        q: "How much is Pro?",
        a: "$5 a month through Polar, which renews automatically, or 80 ETB for one month through Chapa, which doesn't renew, so you pay again when it ends.",
      },
      {
        q: "What happens if I cancel?",
        a: "Cancelling stops the next renewal. You keep Pro until the end of the period you've paid for, and you can undo the cancellation before then from Account settings.",
      },
    ],
  },
  {
    topic: "Account & privacy",
    faqs: [
      {
        q: "Do you keep the files I upload?",
        a: "No. Uploaded CVs are read in memory and the file itself is never stored. We keep the text read from it, along with the resume content you save.",
      },
      {
        q: "How do I change my password or delete my account?",
        a: "Both are in Account settings. If you signed up with Google you can also set a password there. Deleting your account permanently removes your resumes, profiles and payment history.",
      },
    ],
  },
];

export const WRITING_TIPS = [
  {
    title: "Use standard headings",
    body: "\"Experience\", \"Education\", \"Skills\". Screening software looks for these names, not creative ones.",
  },
  {
    title: "Show results, not duties",
    body: "Lead bullets with what changed because of you: numbers, time saved, people reached.",
  },
  {
    title: "Mirror the job's wording",
    body: "If the posting says \"Kubernetes\", write Kubernetes, not just \"K8s\". Tailor to a job does this for you.",
  },
  {
    title: "Keep one resume per role",
    body: "A focused CV beats one that tries to fit everything. Career profiles make this easy to manage.",
  },
];

/** The FAQ groups whose questions or answers mention `query` (all of them when it's empty). */
export function filterFaqGroups(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return FAQ_GROUPS;
  return FAQ_GROUPS.map((g) => ({
    ...g,
    faqs: g.faqs.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)),
  })).filter((g) => g.faqs.length > 0);
}
