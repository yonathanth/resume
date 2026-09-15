import { ResumeData } from "@/types/resume";

export const initialResumeData: ResumeData = {
  title: "Full Stack Engineer Resume",
  personalInfo: {
    fullName: "Alex Rivera",
    headline: "Senior Full Stack Software Engineer",
    email: "alex.rivera@example.com",
    phone: "+1 (555) 345-6789",
    location: "San Francisco, CA",
    website: "https://alexrivera.dev",
    linkedin: "https://linkedin.com/in/alexrivera",
    github: "https://github.com/alexrivera",
    summary:
      "Results-driven Senior Full Stack Engineer with 6+ years of experience architecting high-scale cloud web applications, modern React/Next.js interfaces, and distributed microservices. Proven track record of boosting conversion and cutting latency.",
  },
  experience: [
    {
      id: "exp-1",
      role: "Senior Frontend Engineer",
      company: "Apex Cloud Solutions",
      location: "San Francisco, CA",
      startDate: "2023-01",
      endDate: "Present",
      current: true,
      highlights: [
        "Architected next-generation enterprise analytics dashboard using Next.js 15, Tailwind CSS, and TypeScript, improving page load speed by 42%.",
        "Implemented real-time collaboration workflows using WebSockets and optimistic UI mutations for 80,000+ daily active users.",
        "Mentored a team of 6 engineers and spearheaded adoption of design system component library.",
      ],
    },
    {
      id: "exp-2",
      role: "Software Engineer",
      company: "Vanguard Digital",
      location: "Austin, TX",
      startDate: "2020-06",
      endDate: "2022-12",
      current: false,
      highlights: [
        "Built responsive client portals integrated with GraphQL APIs and PostgreSQL.",
        "Refactored legacy state management to React Query and Zustand, reducing bundle size by 35%.",
        "Automated CI/CD deployment pipelines on GitHub Actions, cutting release turnaround times by half.",
      ],
    },
  ],
  education: [
    {
      id: "edu-1",
      degree: "B.S. in Computer Science",
      field: "Computer Science & Engineering",
      institution: "University of California, Berkeley",
      location: "Berkeley, CA",
      startDate: "2016",
      endDate: "2020",
      gpa: "3.85 / 4.0",
      honors: ["Dean's Honor List", "Summa Cum Laude"],
    },
  ],
  skills: [
    {
      category: "Frontend",
      items: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Redux Toolkit", "HTML5 / CSS3"],
    },
    {
      category: "Backend & Cloud",
      items: ["Node.js", "Express", "PostgreSQL", "Prisma", "AWS (S3, Lambda)", "Docker"],
    },
    {
      category: "Tools & Testing",
      items: ["Git", "Jest", "Playwright", "Turborepo", "Figma", "REST & GraphQL APIs"],
    },
  ],
  projects: [
    {
      id: "proj-1",
      title: "AI Job Match & Resume Tailorer",
      description:
        "An AI-powered web tool that scans job postings, calculates ATS keyword matching, and recommends targeted bullet points.",
      technologies: ["Next.js", "TypeScript", "Tailwind CSS", "OpenAI API"],
      link: "https://resume-tailor.demo",
      highlights: [
        "Parsed PDF resumes and job descriptions using vector embeddings.",
        "Generated real-time ATS match scores and missing keyword suggestions.",
      ],
    },
  ],
  certifications: [
    "AWS Certified Solutions Architect – Associate",
    "Meta Frontend Developer Professional Certificate",
  ],
};
