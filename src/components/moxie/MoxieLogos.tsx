"use client";

import React, { useId } from "react";
import { MOXIE_COLORS as C } from "./moxie.constants";

// Logo concepts drawn from Moxie: simpler than her full artwork, still at any
// size, and readable down to a 16px favicon. Previewed on /dev/moxie to pick
// one. Peepers is the one in use: exported as MoxieLogo (see BrandMark).
//
// Every mark is a 64×64 square. Her eye (a cream ball, a big ink pupil
// looking a little down-right, a cream glint) is the thread through them all.

interface MarkProps {
  size: number;
  className?: string;
}

function Svg({ size, className, children }: MarkProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} overflow="visible" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** One of her eyes: cream ball, ink pupil, glint. `outline` adds her ink rim. */
function Eye({ cx, cy, r, outline = 0 }: { cx: number; cy: number; r: number; outline?: number }) {
  const px = cx + r * 0.16;
  const py = cy + r * 0.12;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C.cream} stroke={outline ? C.ink : undefined} strokeWidth={outline || undefined} />
      <circle cx={px} cy={py} r={r * 0.58} fill={C.ink} />
      <circle cx={px + r * 0.24} cy={py - r * 0.24} r={r * 0.17} fill={C.cream} />
    </g>
  );
}

/** An eye stalk: ink outer, coral core — as on her. */
function Stalk({ d, width = 6.5 }: { d: string; width?: number }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={C.ink} strokeWidth={width} />
      <path d={d} stroke={C.coral} strokeWidth={width * 0.42} />
    </g>
  );
}

/** 1 · Peepers — her dome of a body and two eyes up on stalks. */
/** The Pro crown, small: gold points tipped with coral — sitting on her shell's right shoulder, tilted with its curve, as on the full Moxie. */
function LogoCrown() {
  return (
    <g transform="translate(49.8 38.6) rotate(32)">
      <path d="M-7.5 0 V-6 L-3.8 -3 L0 -9 L3.8 -3 L7.5 -6 V0 Z" fill={C.blush} stroke={C.ink} strokeWidth="1.9" strokeLinejoin="round" />
      <circle cx="0" cy="-9" r="1.6" fill={C.coral} stroke={C.ink} strokeWidth="1" />
      <circle cx="-7.5" cy="-6" r="1.3" fill={C.coral} stroke={C.ink} strokeWidth="0.9" />
      <circle cx="7.5" cy="-6" r="1.3" fill={C.coral} stroke={C.ink} strokeWidth="0.9" />
    </g>
  );
}

function Peepers({ size, className, crowned = false }: MarkProps & { crowned?: boolean }) {
  return (
    <Svg size={size} className={className}>
      <Stalk d="M27 34 Q24 27 22 20" />
      <Stalk d="M37 34 Q40 27 43 19" />
      <path d="M7 55 C7 39 19 32 32 32 C45 32 57 39 57 55 Z" fill={C.coral} stroke={C.ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M25 43 Q32 51 39 43 Z" fill={C.ink} stroke={C.ink} strokeWidth="1.6" strokeLinejoin="round" />
      <Eye cx={21} cy={15} r={9} outline={2.6} />
      <Eye cx={43} cy={14} r={9} outline={2.6} />
      {crowned && <LogoCrown />}
    </Svg>
  );
}

/** The brand logo: Peepers (crowned for Pro accounts). */
export const MoxieLogo = Peepers;

/** 2 · Tile — an app-icon square in her coral, just her face. */
function Tile({ size, className }: MarkProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="2" y="2" width="60" height="60" rx="16" fill={C.coral} />
      <Eye cx={22} cy={26} r={10.5} />
      <Eye cx={42} cy={24} r={10.5} />
      <path d="M23 40 Q32 51 41 40 Z" fill={C.ink} stroke={C.ink} strokeWidth="2" strokeLinejoin="round" />
    </Svg>
  );
}

/** 3 · Peekaboo — a round coral face with her eyes perched on top. */
function Peekaboo({ size, className }: MarkProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="32" cy="39" r="22" fill={C.coral} stroke={C.ink} strokeWidth="3" />
      <ellipse cx="19" cy="44" rx="4" ry="2.4" fill={C.blush} opacity="0.8" />
      <ellipse cx="45" cy="43" rx="4" ry="2.4" fill={C.blush} opacity="0.8" />
      <path d="M25 42 Q32 51 39 42 Z" fill={C.ink} stroke={C.ink} strokeWidth="1.6" strokeLinejoin="round" />
      <Eye cx={23} cy={17} r={9} outline={2.6} />
      <Eye cx={41} cy={16} r={9} outline={2.6} />
    </Svg>
  );
}

/** 4 · Page pal — she holds up a resume and peeks over the top of it. */
function PagePal({ size, className }: MarkProps) {
  return (
    <Svg size={size} className={className}>
      <Stalk d="M26 30 Q24 22 22 16" width={6} />
      <Stalk d="M38 30 Q40 22 42 14" width={6} />
      <rect x="13" y="24" width="38" height="36" rx="4" fill="#fff" stroke={C.ink} strokeWidth="3" />
      <rect x="19" y="31" width="17" height="3.4" rx="1.7" fill={C.coral} />
      <g fill={C.ink} opacity="0.55">
        <rect x="19" y="38.5" width="26" height="2.6" rx="1.3" />
        <rect x="19" y="44.5" width="21" height="2.6" rx="1.3" />
        <rect x="19" y="50.5" width="24" height="2.6" rx="1.3" />
      </g>
      {/* her pincers, gripping the sides */}
      <circle cx="13" cy="42" r="4" fill={C.coral} stroke={C.ink} strokeWidth="2.4" />
      <circle cx="51" cy="42" r="4" fill={C.coral} stroke={C.ink} strokeWidth="2.4" />
      <Eye cx={22} cy={12} r={7.5} outline={2.4} />
      <Eye cx={42} cy={10} r={7.5} outline={2.4} />
    </Svg>
  );
}

/** 5 · Mono — Peepers in one colour (currentColor), for print, stamps and dark or busy backgrounds. */
function Mono({ size, className }: MarkProps) {
  const id = `mono-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <Svg size={size} className={className}>
      <defs>
        <mask id={id}>
          <rect width="64" height="64" fill="#fff" />
          {/* eye whites and the smile are cut out, so the background shows through */}
          <circle cx="21" cy="15" r="6.4" fill="#000" />
          <circle cx="43" cy="14" r="6.4" fill="#000" />
          <path d="M25 43 Q32 51 39 43" fill="none" stroke="#000" strokeWidth="3.4" strokeLinecap="round" />
        </mask>
      </defs>
      <g fill="currentColor" mask={`url(#${id})`}>
        <path d="M27 34 Q24 27 22 20" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M37 34 Q40 27 43 19" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M7 55 C7 39 19 32 32 32 C45 32 57 39 57 55 Z" />
        <circle cx="21" cy="15" r="9" />
        <circle cx="43" cy="14" r="9" />
      </g>
      <circle cx="22.6" cy="16.2" r="3.6" fill="currentColor" />
      <circle cx="44.6" cy="15.2" r="3.6" fill="currentColor" />
    </Svg>
  );
}

/** 6 · Stalks — only her eyes on their stalks, meeting at the base: the barest mark. */
function Stalks({ size, className }: MarkProps) {
  return (
    <Svg size={size} className={className}>
      <Stalk d="M32 59 Q30 42 21 25" width={7.5} />
      <Stalk d="M32 59 Q34 42 43 23" width={7.5} />
      <Eye cx={20} cy={18} r={11} outline={3} />
      <Eye cx={44} cy={16} r={11} outline={3} />
    </Svg>
  );
}

// ---- Round 2: as simple, but each one says something about the app ----

/** 7 · Check — her stalks bend into a tick: job-ready, passes the scan. */
function Check({ size, className }: MarkProps) {
  return (
    <Svg size={size} className={className}>
      <Stalk d="M25 53 Q19 45 13 39" width={8} />
      <Stalk d="M25 53 Q35 35 46 18" width={8} />
      <Eye cx={11} cy={33} r={8} outline={2.6} />
      <Eye cx={48} cy={13} r={9.5} outline={2.8} />
    </Svg>
  );
}

/** 8 · R — a lowercase r for GoMoxie, its shoulder reaching out into her eye. */
function LetterR({ size, className }: MarkProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M21 56 V30 Q21 21 32 20" fill="none" stroke={C.ink} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 56 V30 Q21 21 32 20" fill="none" stroke={C.coral} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <Eye cx={42} cy={20} r={11} outline={3} />
    </Svg>
  );
}

/** 9 · Peek page — a resume tile with her eyes resting on its top edge. */
function PeekPage({ size, className }: MarkProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="11" y="21" width="42" height="39" rx="8" fill="#fff" stroke={C.ink} strokeWidth="3.2" />
      <rect x="18" y="34" width="19" height="4.2" rx="2.1" fill={C.coral} />
      <g fill={C.ink} opacity="0.5">
        <rect x="18" y="42" width="28" height="3.2" rx="1.6" />
        <rect x="18" y="49" width="21" height="3.2" rx="1.6" />
      </g>
      <Eye cx={24} cy={19} r={9} outline={2.8} />
      <Eye cx={41} cy={18} r={9} outline={2.8} />
    </Svg>
  );
}

/** 10 · Shell — a hermit crab whose shell is a resume: the page is her home. */
function Shell({ size, className }: MarkProps) {
  return (
    <Svg size={size} className={className}>
      <Stalk d="M14 46 Q11 38 11 31" width={5.5} />
      <Stalk d="M21 45 Q22 37 25 30" width={5.5} />
      <ellipse cx="20" cy="51" rx="13" ry="8.5" fill={C.coral} stroke={C.ink} strokeWidth="3" />
      <path d="M29 14 H45 L56 25 V52 Q56 57 51 57 H34 Q29 57 29 52 V19 Q29 14 34 14 Z" fill="#fff" stroke={C.ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M45 14 V25 H56" fill={C.cream} stroke={C.ink} strokeWidth="2.6" strokeLinejoin="round" />
      <rect x="35" y="30" width="14" height="3.6" rx="1.8" fill={C.coral} />
      <g fill={C.ink} opacity="0.5">
        <rect x="35" y="37" width="15" height="2.8" rx="1.4" />
        <rect x="35" y="43" width="11" height="2.8" rx="1.4" />
      </g>
      <Eye cx={10} cy={26} r={6.5} outline={2.2} />
      <Eye cx={26} cy={25} r={6.5} outline={2.2} />
    </Svg>
  );
}

/** 11 · Nib — a pen nib in her coral with her eyes on top: she writes it for you. */
function Nib({ size, className }: MarkProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M32 60 L16 34 Q16 25 25 22 H39 Q48 25 48 34 Z" fill={C.coral} stroke={C.ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 58 V41" stroke={C.ink} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="32" cy="38" r="3.2" fill={C.ink} />
      <Eye cx={25} cy={18} r={8.5} outline={2.6} />
      <Eye cx={40} cy={17} r={8.5} outline={2.6} />
    </Svg>
  );
}

/** 12 · Case — a coral briefcase with her eyes peeking over it: off to the job. */
function Case({ size, className }: MarkProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M24 29 V21 Q24 16 29 16 H35 Q40 16 40 21 V29" fill="none" stroke={C.ink} strokeWidth="4.5" strokeLinecap="round" />
      <rect x="6" y="27" width="52" height="31" rx="8" fill={C.coral} stroke={C.ink} strokeWidth="3" />
      <rect x="28" y="36" width="8" height="7" rx="2" fill={C.cream} stroke={C.ink} strokeWidth="2.2" />
      <path d="M26 48 Q32 55 38 48 Z" fill={C.ink} stroke={C.ink} strokeWidth="1.6" strokeLinejoin="round" />
      <Eye cx={15} cy={26} r={8.5} outline={2.6} />
      <Eye cx={49} cy={25} r={8.5} outline={2.6} />
    </Svg>
  );
}

// ---- Round 3: Peepers, but unmistakably a crab ----

/** A raised pincer: a ball with a V notch at the top, on a short arm. */
function Pincer({ cx, cy, tilt }: { cx: number; cy: number; tilt: number }) {
  return (
    <path
      d="M3.29 -6.18 A7 7 0 1 1 -3.29 -6.18 L0 -1.2 Z"
      transform={`translate(${cx} ${cy}) rotate(${tilt})`}
      fill={C.coral}
      stroke={C.ink}
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
  );
}

/** 13 · Crab — Peepers with her pincers up: the dome stays, the snail goes. */
function Crab({ size, className }: MarkProps) {
  return (
    <Svg size={size} className={className}>
      <Stalk d="M13 48 Q8 44 9 39" width={6} />
      <Stalk d="M51 48 Q56 44 55 39" width={6} />
      <Pincer cx={9} cy={33} tilt={-22} />
      <Pincer cx={55} cy={33} tilt={22} />
      <Stalk d="M28 37 Q25 30 23 22" />
      <Stalk d="M36 37 Q39 30 41 21" />
      <path d="M11 57 C11 43 21 36 32 36 C43 36 53 43 53 57 Z" fill={C.coral} stroke={C.ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M26 46 Q32 53 38 46 Z" fill={C.ink} stroke={C.ink} strokeWidth="1.6" strokeLinejoin="round" />
      <Eye cx={22} cy={16} r={8.5} outline={2.6} />
      <Eye cx={42} cy={15} r={8.5} outline={2.6} />
    </Svg>
  );
}

/** 14 · Crab oval — her real oval body, pincers up, three little legs. */
function CrabOval({ size, className }: MarkProps) {
  return (
    <Svg size={size} className={className}>
      <g fill={C.coral} stroke={C.ink} strokeWidth="2.4">
        <rect x="20" y="49" width="6" height="10" rx="3" />
        <rect x="29" y="51" width="6" height="10" rx="3" />
        <rect x="38" y="49" width="6" height="10" rx="3" />
      </g>
      <Stalk d="M13 45 Q8 42 9 37" width={6} />
      <Stalk d="M51 45 Q56 42 55 37" width={6} />
      <Pincer cx={9} cy={31} tilt={-22} />
      <Pincer cx={55} cy={31} tilt={22} />
      <Stalk d="M28 36 Q25 29 23 22" />
      <Stalk d="M36 36 Q39 29 41 21" />
      <ellipse cx="32" cy="44" rx="21" ry="12.5" fill={C.coral} stroke={C.ink} strokeWidth="3" />
      <path d="M26 43 Q32 50 38 43 Z" fill={C.ink} stroke={C.ink} strokeWidth="1.6" strokeLinejoin="round" />
      <Eye cx={22} cy={16} r={8.5} outline={2.6} />
      <Eye cx={42} cy={15} r={8.5} outline={2.6} />
    </Svg>
  );
}

export const MOXIE_LOGOS: { name: string; note: string; Mark: React.ComponentType<MarkProps>; mono?: boolean; round: 1 | 2 | 3 }[] = [
  { name: "Peepers", note: "Her body and eyes on stalks — the closest to her, simplified.", Mark: Peepers, round: 1 },
  { name: "Tile", note: "App-icon square, just her face. Strongest as a favicon.", Mark: Tile, round: 1 },
  { name: "Peekaboo", note: "Round face, eyes perched on top. Friendly, holds up small.", Mark: Peekaboo, round: 1 },
  { name: "Page pal", note: "Peeking over a resume she's holding — says what we do.", Mark: PagePal, round: 1 },
  { name: "Mono", note: "Peepers in one colour, for print and dark or busy backgrounds.", Mark: Mono, mono: true, round: 1 },
  { name: "Stalks", note: "Only her eyes on stalks — the barest, most graphic mark.", Mark: Stalks, round: 1 },
  { name: "Check", note: "Her stalks bend into a tick — job-ready, passes the scan.", Mark: Check, round: 2 },
  { name: "R", note: "A lowercase r for GoMoxie, its shoulder reaching into her eye.", Mark: LetterR, round: 2 },
  { name: "Peek page", note: "A resume tile with her eyes resting on top. Tile-simple, says resume.", Mark: PeekPage, round: 2 },
  { name: "Shell", note: "A hermit crab whose shell is a resume — the page is her home.", Mark: Shell, round: 2 },
  { name: "Nib", note: "A pen nib with her eyes on top — she writes it for you.", Mark: Nib, round: 2 },
  { name: "Case", note: "A briefcase with her eyes peeking over — off to the job.", Mark: Case, round: 2 },
  { name: "Crab", note: "Peepers with her pincers raised — still minimal, now clearly a crab.", Mark: Crab, round: 3 },
  { name: "Crab oval", note: "Her real oval body, pincers up and three little legs.", Mark: CrabOval, round: 3 },
];
