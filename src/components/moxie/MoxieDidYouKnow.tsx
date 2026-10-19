"use client";

import React, { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Moxie } from "./Moxie";
import { WordByWord } from "./WordByWord";
import { PRESENT_SECONDS } from "./moxie.animations";

/** Short, true, and about resumes, job hunting or GoMoxie. Shown in a random order, one per round of her presenting. */
const FACTS = [
  // Six seconds, as on the home page ("Recruiters give you six seconds"): the well-known Ladders eye-tracking study.
  "In a well-known eye-tracking study, recruiters spent about six seconds on their first look at a resume. Put your best right at the top.",
  "Many employers screen applications with tracking software first. Plain headings like “Experience” and “Education” help it read yours.",
  "Numbers catch the eye: “cut costs by 20%” lands harder than “reduced costs”.",
  "Starting bullet points with verbs like led, built or launched makes them quicker to scan.",
  "Mirroring the skills a job posting asks for helps recruiters see the match. Tailor to a job does it for you.",
  "A resume tailored to each job usually beats one generic resume sent everywhere.",
  "Most recent first: recruiters expect your latest role at the top of your experience.",
  "Three to five bullet points per role is usually enough. Keep the ones that show results.",
  "A short summary of two or three lines at the top tells a recruiter who you are before they read the rest.",
  "Fancy columns and graphics can confuse tracking software. Clean, simple layouts are read more reliably.",
  "Save and send your resume as a PDF, so it looks the same on every screen.",
  "A file named “Firstname-Lastname-Resume.pdf” is easier for a recruiter to find again than “resume_final_v3.pdf”.",
  "Check your email and phone number twice. A typo there can cost you the call back.",
  "For most roles, one or two pages is plenty. Academic CVs are the exception.",
  "You can switch templates at any time. Nothing you've written is lost.",
  "Career profiles remember your skills and history, so your next resume starts half-written.",
  "Hermit crabs move into a bigger shell as they grow. Moxie thinks resumes should too.",
];

/** The facts in a fresh random order, so each wait opens on a different one. */
function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Her intro (folders in, glasses on) before the first round; the facts change on her beat after that. */
const INTRO_MS = 1200;
/** From her showing up to the end of her first round (intro, then one fact). */
export const ONE_ROUND_MS = INTRO_MS + PRESENT_SECONDS * 1000;
/** Her size: scaled down with the screen, so she and the card fit side by side even on a small phone. */
const MOXIE_SIZE = "clamp(96px, 28vw, 150px)";
/** A new fact waits for the old one to fade (moxie-line-out in globals.css). */
const HANDOVER_MS = 380;

/**
 * Moxie presenting a "Did you know?" card beside her while something loads:
 * folders under one arm, she sweeps the other out to the card each round as
 * a new fact arrives on it, reads it, and is amazed. The card sits up on her
 * left, where her big claw reaches out to it. On a phone, both shrink with
 * the screen, and she stands tucked under the card's bottom-right corner so
 * the card can stay wide.
 */
export function MoxieDidYouKnow({ size = MOXIE_SIZE, crowned = false }: { size?: number | string; crowned?: boolean }) {
  // She only shows up in the browser, after a wait has gone on a moment (see MoxieWait), so a random order can't mismatch a server render.
  const [facts] = useState(() => shuffled(FACTS));
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let every: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      setIndex((i) => i + 1);
      every = setInterval(() => setIndex((i) => i + 1), PRESENT_SECONDS * 1000);
    }, INTRO_MS + PRESENT_SECONDS * 1000);
    return () => {
      clearTimeout(first);
      if (every) clearInterval(every);
    };
  }, []);

  const fact = facts[index % facts.length];
  const leaving = index > 0 ? facts[(index - 1) % facts.length] : null;

  return (
    <div className="flex items-end sm:items-center">
      <div className="relative mb-24 w-[min(68vw,18rem)] shrink-0 rounded-2xl border border-neutral-200 bg-white px-4 pb-3.5 pt-3.5 text-left shadow-[0_12px_32px_-16px_rgba(0,0,0,0.25)] sm:mb-20 sm:px-5 sm:pb-4 sm:pt-4">
        {/* The tail, toward her claw: on phones on its bottom edge (she's below its right end); beside her, low on its right edge. */}
        <span
          aria-hidden="true"
          className="absolute -bottom-[7px] left-[74%] h-3 w-3 rotate-45 border-b border-r border-neutral-200 bg-white sm:bottom-auto sm:left-auto sm:-right-[7px] sm:top-[72%] sm:-translate-y-1/2 sm:-rotate-45"
        />
        <div className="flex items-center gap-1.5 text-xs font-semibold text-accent-strong">
          <Lightbulb className="h-3.5 w-3.5" />
          Did you know?
        </div>
        <div className="relative mt-2 min-h-[6.5rem] sm:min-h-[5rem]">
          {leaving && (
            <p key={`out-${index}`} aria-hidden="true" className="moxie-line-out absolute inset-x-0 top-0 text-[13px] leading-relaxed text-neutral-700 sm:text-sm">
              {leaving}
            </p>
          )}
          <p key={`in-${index}`} className="text-[13px] leading-relaxed text-neutral-700 sm:text-sm">
            <WordByWord text={fact} delayMs={leaving ? HANDOVER_MS : 0} />
          </p>
        </div>
      </div>
      {/* Phones: tucked in under the card's bottom-right corner, so the card can be wider — drawn over it, so her eyes stay in view when she stretches up. */}
      <div className="relative z-10 -ml-16 shrink-0 sm:ml-0">
        <Moxie animation="presenting" size={size} ticklish crowned={crowned} decorative />
      </div>
    </div>
  );
}
