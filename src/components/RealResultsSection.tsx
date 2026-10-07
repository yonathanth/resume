"use client";

import React, { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/Reveal";
import { CtaButton } from "@/components/CtaButton";

// Before & after: the same (fictional) person's resume as a typical
// home-made Word document, and as Resumate writes and lays it out.
// Both sheets are drawn at A4 proportions and scaled to fit their column.

const SHEET_W = 595;
const SHEET_H = 842;

// The magnifier: a round lens that follows the pointer and shows the sheet
// under it at LENS_ZOOM× its on-screen size.
const LENS_SIZE = 130;
const LENS_ZOOM = 2.4;

function Sheet({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  // Pointer position in the sheet's own (untilted) pixels. It's kept after the
  // pointer leaves so the lens fades out where it was instead of jumping.
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = width / SHEET_W;
  // offsetX/Y are measured in the overlay's own coordinates, so the lens
  // tracks correctly even though the sheets are rotated.
  const track = (e: React.MouseEvent<HTMLDivElement>) => {
    setPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
    setActive(true);
  };

  return (
    <div ref={ref} className={`relative w-full bg-white ${className}`} style={{ height: SHEET_H * scale || undefined, aspectRatio: width ? undefined : "210 / 297" }}>
      {width > 0 && (
        <>
          <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
            <div className="absolute left-0 top-0 origin-top-left" style={{ width: SHEET_W, height: SHEET_H, transform: `scale(${scale})` }}>
              {children}
            </div>
          </div>

          {/* Hover surface */}
          <div className="absolute inset-0 z-10 cursor-none" onMouseMove={track} onMouseEnter={track} onMouseLeave={() => setActive(false)} />

          {/* Magnifying glass: black rim and handle, orange collar */}
          <div
            aria-hidden
            className={`pointer-events-none absolute z-20 transition-[opacity,transform] duration-200 ease-out ${
              active ? "scale-100 opacity-100" : "scale-75 opacity-0"
            }`}
            style={{ width: LENS_SIZE, height: LENS_SIZE, left: pos.x - LENS_SIZE / 2, top: pos.y - LENS_SIZE / 2 }}
          >
            {/* Handle, angled down and to the right from the rim */}
            <div
              className="absolute left-1/2 top-1/2 flex h-[14px] origin-left -translate-y-1/2 rotate-45 items-center drop-shadow-[0_8px_10px_rgba(15,17,21,0.3)]"
              style={{ width: LENS_SIZE / 2 + 74, paddingLeft: LENS_SIZE / 2 - 2 }}
            >
              <span className="h-[10px] w-3 bg-neutral-800" />
              <span className="h-[14px] w-2.5 rounded-[2px] bg-accent" />
              <span className="h-[14px] flex-1 rounded-r-full bg-gradient-to-b from-neutral-700 to-neutral-950" />
            </div>

            {/* Glass */}
            <div className="absolute inset-0 overflow-hidden rounded-full border-[5px] border-neutral-950 bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.6)_inset,0_16px_32px_-10px_rgba(15,17,21,0.45)]">
              <div
                className="absolute left-0 top-0 origin-top-left"
                style={{
                  width: SHEET_W,
                  height: SHEET_H,
                  // offset by the rim so the point under the pointer sits in the centre of the glass
                  transform: `translate(${LENS_SIZE / 2 - 5 - pos.x * LENS_ZOOM}px, ${LENS_SIZE / 2 - 5 - pos.y * LENS_ZOOM}px) scale(${scale * LENS_ZOOM})`,
                }}
              >
                {children}
              </div>
              {/* Glare */}
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.55),transparent_45%)]" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- Before: cramped, inconsistent, vague -----------------------------------

function BeforeResume() {
  return (
    <div className="h-full px-[54px] py-[48px] text-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <div className="text-center">
        <div className="text-[30px] font-bold uppercase" style={{ fontFamily: "Arial, sans-serif" }}>
          Robel Kassa
        </div>
        <div className="mt-1 text-[11px]">Addis Ababa, Ethiopia</div>
        <div className="text-[11px] text-[#0000ee] underline">robelkassa1995@yahoo.com</div>
        <div className="text-[11px]">Tel: 0911 23 45 67</div>
      </div>

      <div className="mt-6 text-[14px] font-bold text-[#1f4e9c] underline" style={{ fontFamily: "Arial, sans-serif" }}>
        OBJECTIVE
      </div>
      <p className="mt-1 text-[12px] leading-[1.35]">
        To obtain a challenging position in a reputable organization where I can use my skills and knowledge
        and grow with the company. I am a hard working and team player person.
      </p>

      <div className="mt-5 text-[14px] font-bold text-[#1f4e9c] underline" style={{ fontFamily: "Arial, sans-serif" }}>
        WORK EXPERIENCE
      </div>
      <div className="mt-1 text-[12px] font-bold">Software Developer - Abay Fintech (2021 - now)</div>
      <ul className="ml-6 list-disc text-[12px] leading-[1.35]">
        <li>Worked on the mobile app</li>
        <li>Responsible for fixing bugs</li>
        <li>Attended meetings with the team</li>
      </ul>
      <div className="mt-2 text-[12px] font-bold">Junior developer, Entoto systems, 2019-2021</div>
      <ul className="ml-6 list-disc text-[12px] leading-[1.35]">
        <li>helped senior developers</li>
        <li>Did testing and documentation</li>
      </ul>

      <div className="mt-5 text-[14px] font-bold text-[#1f4e9c] underline" style={{ fontFamily: "Arial, sans-serif" }}>
        EDUCATION
      </div>
      <div className="mt-1 text-[12px]">BSc in Computer Science, Addis Ababa University, 2019</div>

      <div className="mt-5 text-[14px] font-bold text-[#1f4e9c] underline" style={{ fontFamily: "Arial, sans-serif" }}>
        SKILLS
      </div>
      <div className="mt-1 text-[12px] leading-[1.35]">
        Microsoft Office, Java, Communication, Problem solving, HTML, Teamwork, Fast learner
      </div>

      <div className="mt-5 text-[14px] font-bold text-[#1f4e9c] underline" style={{ fontFamily: "Arial, sans-serif" }}>
        HOBBIES
      </div>
      <div className="mt-1 text-[12px]">Reading, football, listening music</div>

      <div className="mt-8 text-center text-[12px] italic">References available upon request</div>
    </div>
  );
}

// --- After: structured, quantified, packed ----------------------------------

const AFTER_EXPERIENCE = [
  {
    role: "Senior Software Engineer",
    company: "Abay Fintech",
    place: "Addis Ababa",
    dates: "2021 — Present",
    bullets: [
      "Led a 5-engineer squad rebuilding the mobile wallet in React Native, lifting monthly active users from 180K to 420K in 14 months.",
      "Cut payment failure rate 37% by redesigning retry and idempotency logic across 6 Node.js microservices.",
      "Introduced CI/CD with GitHub Actions and Docker, reducing release time from 2 days to 25 minutes.",
      "Mentored 4 junior engineers; two promoted to mid-level within a year.",
    ],
  },
  {
    role: "Software Engineer",
    company: "Entoto Systems",
    place: "Addis Ababa",
    dates: "2019 — 2021",
    bullets: [
      "Built a Java/Spring inventory platform used by 120+ retail branches, replacing paper logs and saving 30 staff-hours a week.",
      "Raised automated test coverage from 18% to 81%, halving production incidents quarter over quarter.",
      "Wrote the team's API documentation standard, adopted across 3 product lines.",
    ],
  },
  {
    role: "Software Engineering Intern",
    company: "Lalibela Digital",
    place: "Addis Ababa",
    dates: "2018",
    bullets: [
      "Shipped a booking dashboard in React used by 40 tour operators; cut manual scheduling errors by half.",
    ],
  },
];

function AfterHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-2 text-[9.8px] font-bold uppercase tracking-[0.16em] text-[#e2470b]">
      {children}
      <span className="h-px flex-1 bg-[#f1d9cc]" />
    </div>
  );
}

function AfterResume() {
  return (
    <div className="h-full px-[38px] py-[34px] text-[#1b1d22]" style={{ fontFamily: "var(--font-geist-sans), Inter, sans-serif" }}>
      {/* Header */}
      <div className="flex items-end justify-between border-b border-[#e6e8eb] pb-3">
        <div>
          <div className="text-[32px] font-bold leading-none tracking-[-0.02em]">Robel Kassa</div>
          <div className="mt-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#e2470b]">Senior Software Engineer</div>
        </div>
        <div className="text-right text-[9px] leading-[1.6] text-[#5b6170]">
          <div>robel.kassa@email.com · +251 911 234 567</div>
          <div>linkedin.com/in/robelkassa · github.com/robelk</div>
          <div>Addis Ababa, Ethiopia</div>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-[1fr_170px] gap-5">
        {/* Main column */}
        <div>
          <AfterHeading>Summary</AfterHeading>
          <p className="text-[9.8px] leading-[1.5] text-[#3a3f4a]">
            Full-stack engineer with 6 years building payment and retail platforms used by 400K+ people.
            Strong in React Native, Node.js and Java; known for shipping fast with high test coverage and for
            growing junior engineers.
          </p>

          <div className="mt-3.5">
            <AfterHeading>Experience</AfterHeading>
            {AFTER_EXPERIENCE.map((job) => (
              <div key={job.company} className="mb-2.5">
                <div className="flex items-baseline justify-between">
                  <div className="text-[11px] font-bold">
                    {job.role} <span className="font-medium text-[#5b6170]">· {job.company}</span>
                  </div>
                  <div className="text-[8.5px] font-medium text-[#8a90a0]">{job.dates}</div>
                </div>
                <ul className="mt-1 space-y-[3px]">
                  {job.bullets.map((b) => (
                    <li key={b} className="relative pl-2.5 text-[9.6px] leading-[1.45] text-[#3a3f4a]">
                      <span className="absolute left-0 top-[6px] h-[3.5px] w-[3.5px] rounded-full bg-[#ff5e1f]" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-1">
            <AfterHeading>Projects</AfterHeading>
            <div className="text-[10.5px] font-bold">
              Meskel Pay SDK <span className="font-medium text-[#5b6170]">· Open source</span>
            </div>
            <p className="mt-0.5 text-[9.6px] leading-[1.45] text-[#3a3f4a]">
              TypeScript SDK for local mobile-money APIs; 1.2K GitHub stars and used by 30+ startups.
            </p>
            <div className="mt-1.5 text-[10.5px] font-bold">
              Merkato Price Tracker <span className="font-medium text-[#5b6170]">· Side project</span>
            </div>
            <p className="mt-0.5 text-[9.6px] leading-[1.45] text-[#3a3f4a]">
              Next.js app tracking 2,000 market prices daily; featured in a national tech newsletter.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="border-l border-[#eceef1] pl-4">
          <AfterHeading>Skills</AfterHeading>
          {[
            ["Languages", ["TypeScript", "Java", "Kotlin", "SQL"]],
            ["Frameworks", ["React Native", "Node.js", "Spring", "Next.js"]],
            ["Infra", ["Docker", "AWS", "PostgreSQL", "Redis"]],
          ].map(([group, items]) => (
            <div key={group as string} className="mb-2">
              <div className="mb-1 text-[8.5px] font-semibold text-[#8a90a0]">{group as string}</div>
              <div className="flex flex-wrap gap-1">
                {(items as string[]).map((s) => (
                  <span key={s} className="rounded-[3px] bg-[#f4f5f7] px-1.5 py-[2px] text-[8.5px] font-medium text-[#3a3f4a]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-3">
            <AfterHeading>Education</AfterHeading>
            <div className="text-[9.8px] font-bold">BSc Computer Science</div>
            <div className="text-[9px] text-[#5b6170]">Addis Ababa University · 2019</div>
            <div className="text-[9px] text-[#5b6170]">Graduated with distinction</div>
          </div>

          <div className="mt-3">
            <AfterHeading>Certifications</AfterHeading>
            <div className="space-y-1 text-[9px] leading-[1.4] text-[#3a3f4a]">
              <div>AWS Certified Developer – Associate</div>
              <div>Google Associate Android Developer</div>
            </div>
          </div>

          <div className="mt-3">
            <AfterHeading>Awards</AfterHeading>
            <div className="text-[9px] leading-[1.4] text-[#3a3f4a]">Engineer of the Year, Abay Fintech · 2023</div>
          </div>

          <div className="mt-3">
            <AfterHeading>Volunteering</AfterHeading>
            <div className="text-[9px] leading-[1.4] text-[#3a3f4a]">Coding mentor, Addis Youth Coding Club · 25 students a year</div>
          </div>

          <div className="mt-3">
            <AfterHeading>Languages</AfterHeading>
            <div className="space-y-0.5 text-[9px] text-[#3a3f4a]">
              <div className="flex justify-between"><span>Amharic</span><span className="text-[#8a90a0]">Native</span></div>
              <div className="flex justify-between"><span>English</span><span className="text-[#8a90a0]">Fluent</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Section -----------------------------------------------------------------

export function RealResultsSection() {
  return (
    <section id="results" className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8">
      {/* Header */}
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-5xl sm:leading-[1.08]">
          Recruiters give you six seconds.
          <br />
          <span className="text-neutral-400">Make them count.</span>
        </h2>
      </Reveal>

      {/* Sheets: Before sits lower and leans left, After rises, leans right and
          overlaps it a little; a hand-drawn arrow sweeps from one to the other. */}
      <div className="relative mx-auto mt-16 grid max-w-sm grid-cols-1 gap-14 md:mt-12 md:max-w-3xl md:grid-cols-2 md:gap-0">
        <Reveal delay={450} className="pointer-events-none absolute left-[42%] top-3 z-20 hidden w-[16%] md:block">
          <svg viewBox="0 0 160 90" fill="none" className="w-full text-accent" aria-hidden>
            <path d="M8 82 C 24 34, 70 10, 140 16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M126 6 L 142 16 L 128 28" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Reveal>

        <Reveal className="md:mt-16">
          <figure className="md:-rotate-[2.5deg]">
            <figcaption className="mb-4 flex justify-center">
              <span className="rounded-full bg-neutral-100 px-4 py-1.5 text-[13.5px] font-medium text-neutral-500">Before</span>
            </figcaption>
            <Sheet className="rounded-lg border border-neutral-200/80 shadow-[0_1px_2px_rgba(15,17,21,0.05),0_10px_28px_-12px_rgba(15,17,21,0.18)]">
              <BeforeResume />
            </Sheet>
          </figure>
        </Reveal>

        <Reveal delay={600} className="relative z-10 md:-ml-6">
          <figure className="md:rotate-[2deg]">
            <figcaption className="mb-4 flex justify-center">
              <span className="rounded-full bg-neutral-950 px-4 py-1.5 text-[13.5px] font-medium text-white">After</span>
            </figcaption>
            <Sheet className="rounded-lg border border-neutral-200/80 shadow-[0_1px_2px_rgba(15,17,21,0.05),0_10px_28px_-12px_rgba(15,17,21,0.18)]">
              <AfterResume />
            </Sheet>
          </figure>
        </Reveal>
      </div>

      {/* CTA */}
      <Reveal className="mt-16 flex flex-col items-center text-center">
        <CtaButton href="/signup">Try it with your resume</CtaButton>
      </Reveal>
    </section>
  );
}
