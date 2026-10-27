import React from "react";
import type { ResultStory } from "@/lib/social-proof";

// The "before" resumes in "Real results", drawn from a story's data at A4 size
// (595 × 842, see Sheet): four typical home-made Word styles. The "after" is a
// real template, rendered by the backend (see ResultsCarousel).

const SERIF = '"Times New Roman", Times, serif';
const ARIAL = "Arial, Helvetica, sans-serif";
const GEORGIA = 'Georgia, "Times New Roman", serif';

// --- Before ---------------------------------------------------------------------

export function MiniBefore({ story }: { story: ResultStory }) {
  const { before } = story;

  if (story.look.before === "boxed") {
    const bar = "mt-5 bg-[#d9d9d9] px-2 py-1 text-[13px] font-bold uppercase";
    return (
      <div className="h-full px-[48px] py-[46px] text-black" style={{ fontFamily: ARIAL }}>
        <div className="text-[28px] font-bold">{story.name}</div>
        <div className="mt-1 text-[12px]">{before.contact}</div>
        <hr className="mt-3 border-black" />
        <div className={bar}>Career Objective</div>
        <p className="mt-1.5 text-[12.5px] leading-[1.4]">{before.objective}</p>
        <div className={bar}>Work History</div>
        {before.jobs.map((job) => (
          <div key={job.line} className="mt-2">
            <div className="text-[12.5px] font-bold">{job.line}</div>
            <ul className="ml-5 list-[square] text-[12.5px] leading-[1.4]">
              {job.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
        <div className={bar}>Skills</div>
        <div className="mt-1.5 text-[12.5px]">{before.skills}</div>
        <div className={bar}>Personal Information</div>
        <div className="mt-1.5 text-[12.5px] leading-[1.5]">
          Nationality: — <br /> Marital status: Single <br /> Date of birth: 12/03/1994
        </div>
      </div>
    );
  }

  if (story.look.before === "centered") {
    const heading = "mt-6 border-y border-black py-0.5 text-center text-[13px] font-bold uppercase tracking-[0.2em]";
    return (
      <div className="h-full px-[56px] py-[50px] text-center text-black" style={{ fontFamily: GEORGIA }}>
        <div className="text-[26px] font-bold underline">{story.name}</div>
        <div className="mt-1.5 text-[12px] italic">{before.contact}</div>
        <div className={heading}>Objective</div>
        <p className="mt-2 text-[12.5px] italic leading-[1.5]">{before.objective}</p>
        <div className={heading}>Experience</div>
        {before.jobs.map((job) => (
          <div key={job.line} className="mt-2">
            <div className="text-[12.5px] font-bold">{job.line}</div>
            {job.bullets.map((b) => (
              <div key={b} className="text-[12.5px] leading-[1.5]">
                {b}
              </div>
            ))}
          </div>
        ))}
        <div className={heading}>Skills</div>
        <div className="mt-2 text-[12.5px]">{before.skills}</div>
        <div className={heading}>Hobbies</div>
        <div className="mt-2 text-[12.5px]">Reading, travelling, music</div>
      </div>
    );
  }

  if (story.look.before === "cramped") {
    return (
      <div className="h-full px-[40px] py-[36px] text-[#222]" style={{ fontFamily: ARIAL }}>
        <div className="text-[24px] font-bold text-[#7030a0]">{story.name.toUpperCase()}</div>
        <div className="text-[11px]">{before.contact} · References on request</div>
        <div className="mt-3 text-[12px]">
          <b>Objective:</b> {before.objective}
        </div>
        <div className="mt-3 text-[12.5px] font-bold text-[#7030a0]">Experience:</div>
        {before.jobs.map((job) => (
          <div key={job.line} className="mt-1 text-[11.5px] leading-[1.35]">
            <b>{job.line}</b>
            {job.bullets.map((b) => (
              <div key={b}>➢ {b}</div>
            ))}
          </div>
        ))}
        <div className="mt-3 text-[12.5px] font-bold text-[#7030a0]">Skills:</div>
        <div className="text-[11.5px]">{before.skills}</div>
        <div className="mt-3 text-[12.5px] font-bold text-[#7030a0]">Interests:</div>
        <div className="text-[11.5px]">Football, movies, cooking, social media</div>
      </div>
    );
  }

  // "word": Word's defaults — Times, blue underlined headings.
  const heading = "mt-6 text-[15px] font-bold text-[#1f4e9c] underline";
  return (
    <div className="h-full px-[54px] py-[50px] text-black" style={{ fontFamily: SERIF }}>
      <div className="text-center">
        <div className="text-[30px] font-bold uppercase" style={{ fontFamily: ARIAL }}>
          {story.name}
        </div>
        <div className="mt-1 text-[12px] text-[#0000ee] underline">{before.contact}</div>
      </div>
      <div className={heading} style={{ fontFamily: ARIAL }}>OBJECTIVE</div>
      <p className="mt-1 text-[13px] leading-[1.4]">{before.objective}</p>
      <div className={heading} style={{ fontFamily: ARIAL }}>WORK EXPERIENCE</div>
      {before.jobs.map((job) => (
        <div key={job.line} className="mt-2">
          <div className="text-[13px] font-bold">{job.line}</div>
          <ul className="ml-6 list-disc text-[13px] leading-[1.4]">
            {job.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ))}
      <div className={heading} style={{ fontFamily: ARIAL }}>SKILLS</div>
      <div className="mt-1 text-[13px] leading-[1.4]">{before.skills}</div>
      <div className="mt-10 text-center text-[13px] italic">References available upon request</div>
    </div>
  );
}
