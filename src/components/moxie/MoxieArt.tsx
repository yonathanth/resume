import React from "react";
import {
  armPath,
  BIG_ARM,
  bridgePath,
  COIN,
  CONFETTI_COLORS,
  CONFETTI_COUNT,
  CONFETTI_ORIGIN,
  CROWN,
  CROWN_BASE,
  CROWN_FLOAT,
  EYE_L,
  EYE_R,
  EYE_RADIUS,
  GLASSES,
  GROUND_POST,
  groundPoint,
  INK_STYLE,
  lensCorner,
  LID_PARK_GAP,
  MOUTH,
  MOXIE_COLORS as C,
  MOXIE_VIEWBOX,
  PAPER_ROWS,
  PDF_FILE,
  PAPER_SEAL,
  paperPoint,
  paperRowPoints,
  PENCIL,
  PENCIL_TIP,
  polylineLength,
  READ_PAPER,
  SIDE_BLINK,
  SIDE_LEGS,
  SPARKLE_BURST,
  SPARKLE_ORIGIN,
  ZZZ_COUNT,
  ZZZ_ORIGIN,
} from "./moxie.constants";

// Moxie's vector artwork, regrouped into animatable layers. Every path,
// colour and stroke comes verbatim from the source SVG, and the paint order
// is unchanged — each `data-part` group only wraps elements that were
// already adjacent (or don't overlap), so the resting render is identical.
//
// Additions, all invisible or near-invisible at rest:
//   • eyelids — clipped inside each eye and parked above it until used
//   • a soft ground shadow
//   • sparkle and "z" particles (opacity 0 until an animation shows them)
//   • scene props — a CV page, a job post, paper scraps (opacity 0 until a
//     scene shows them)
//
// Static markup only: it renders on the server, and the animation layer
// (Moxie.tsx) finds the parts by `data-part` after mount.

const STAR = "M0 -10 C1.5 -2.5 2.5 -1.5 10 0 C2.5 1.5 1.5 2.5 0 10 C-1.5 2.5 -2.5 1.5 -10 0 C-2.5 -1.5 -1.5 -2.5 0 -10 Z";
const ZED = "M-6 -6 H6 L-6 6 H6";
/** The big and small pincers' outlines (pointing up, at rest). */
const BIG_PINCER =
  "M215 297 C165 302 143 257 158 214 C163 198 180 198 184 214 L194 246 L200 213 C205 192 232 196 234 224 C238 266 232 292 215 297 Z";
const SMALL_PINCER = "M404 325 C392 322 386 303 395 292 C398 287 404 288 405 294 L408 305 L412 294 C415 286 425 288 426 297 C428 312 418 327 404 325 Z";
const SWEAT = "M0 -9 C4 -3 6 1 6 4 A6 6 0 0 1 -6 4 C-6 1 -4 -3 0 -9 Z";

/** A half-moon reading lens, worn low on the eye — she reads through it and peers over it. */
function HalfMoonLens({ side, eye }: { side: "L" | "R"; eye: { cx: number; cy: number } }) {
  const { cx, cy } = eye;
  const { halfWidth: w, top, bottom } = GLASSES;
  const d = `M${cx - w} ${cy + top} H${cx + w} C${cx + w} ${cy + bottom - 5} ${cx + 11} ${cy + bottom} ${cx} ${cy + bottom} C${cx - 11} ${cy + bottom} ${cx - w} ${cy + bottom - 5} ${cx - w} ${cy + top} Z`;
  return (
    <g data-part={`glasses${side}`} style={{ opacity: 0 }}>
      <path d={d} fill="#FFFFFF" fillOpacity="0.14" stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
      <path d={`M${cx - w + 7} ${cy + top + 5} Q${cx - w + 9} ${cy + bottom - 7} ${cx - 8} ${cy + bottom - 4}`} fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
    </g>
  );
}

function Eye({ side, eye, clipId }: { side: "L" | "R"; eye: { cx: number; cy: number }; clipId: string }) {
  const { cx, cy } = eye;
  // The lid is parked above the eye; animating it down by LID.closed covers it.
  const edge = cy - EYE_RADIUS - LID_PARK_GAP;
  return (
    <g data-part={`eye${side}`}>
      <clipPath id={clipId}>
        <circle cx={cx} cy={cy} r={EYE_RADIUS} />
      </clipPath>
      <circle cx={cx} cy={cy} r={EYE_RADIUS} fill={C.cream} />
      <g data-part={`pupil${side}`}>
        <circle cx={cx + 6} cy={cy + 4} r="22" fill={C.ink} />
      </g>
      <g data-part={`glint${side}`}>
        <circle cx={cx + 14} cy={cy - 5} r="6.5" fill={C.cream} />
      </g>
      <g clipPath={`url(#${clipId})`}>
        <g data-part={`lid${side}`}>
          <path d={`M${cx - 44} ${edge - 90} H${cx + 44} V${edge} Q${cx} ${edge + 14} ${cx - 44} ${edge} Z`} fill={C.coral} />
          <path d={`M${cx - 44} ${edge} Q${cx} ${edge + 14} ${cx + 44} ${edge}`} fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
        </g>
      </g>
      {/* Shown only while the lid is fully shut, so a closed eye reads as closed rather than blank. */}
      <path
        data-part={`lash${side}`}
        d={`M${cx - 22} ${cy + 6} Q${cx} ${cy + 20} ${cx + 22} ${cy + 6}`}
        fill="none"
        stroke={C.ink}
        strokeWidth="5"
        strokeLinecap="round"
        style={{ opacity: 0 }}
      />
      {/* The source draws this outline on the white; drawing it last keeps it crisp over the lid. */}
      <circle cx={cx} cy={cy} r={EYE_RADIUS} fill="none" stroke={C.ink} strokeWidth="5" />
      {/* Squeezed shut with laughter (the tickle giggle): drawn over whatever the eye is doing. */}
      <g data-part={`laugh${side}`} style={{ opacity: 0 }}>
        <circle cx={cx} cy={cy} r={EYE_RADIUS} fill={C.coral} stroke={C.ink} strokeWidth="5" />
        <path
          d={`M${cx - 18} ${cy + 7} Q${cx} ${cy - 13} ${cx + 18} ${cy + 7}`}
          fill="none"
          stroke={C.ink}
          strokeWidth="5.5"
          strokeLinecap="round"
        />
      </g>
      <HalfMoonLens side={side} eye={eye} />
    </g>
  );
}

/**
 * A PDF file — a page with a download arrow and a coral "PDF" band — gripped
 * in the big pincer (drawn behind it, so the tips hold its bottom edge).
 */
function PdfFile() {
  const { x, y, width: w, height: h } = PDF_FILE;
  const mid = x + w / 2;
  return (
    <g data-part="pdfFile" style={{ opacity: 0 }}>
      <path
        d={`M${x + 3} ${y} H${x + w - 8} L${x + w} ${y + 8} V${y + h - 3} Q${x + w} ${y + h} ${x + w - 3} ${y + h} H${x + 3} Q${x} ${y + h} ${x} ${y + h - 3} V${y + 3} Q${x} ${y} ${x + 3} ${y} Z`}
        fill={C.cream}
        stroke={C.ink}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d={`M${x + w - 8} ${y} V${y + 8} H${x + w}`} fill="#EADFD0" stroke={C.ink} strokeWidth="2" strokeLinejoin="round" />
      <path d={`M${mid} ${y + 8} V${y + 21} M${mid - 6} ${y + 15.5} L${mid} ${y + 21.5} L${mid + 6} ${y + 15.5}`} fill="none" stroke={C.ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x={x} y={y + h - 14} width={w} height="12" fill={C.coral} stroke={C.ink} strokeWidth="2.2" />
      <text x={mid} y={y + h - 4.8} textAnchor="middle" fontSize="8.5" fontWeight="800" fill={C.cream} fontFamily="system-ui, sans-serif">
        PDF
      </text>
    </g>
  );
}

/** A gold coin gripped in the big pincer. Its face flips over; the whole coin can be tossed. */
function Coin() {
  const { x, y, radius: r } = COIN;
  return (
    <g data-part="coin" style={{ opacity: 0 }}>
      <g data-part="coinFace">
        <circle cx={x} cy={y} r={r} fill={C.blush} stroke={C.ink} strokeWidth="2.6" />
        <circle cx={x} cy={y} r={r - 4} fill="none" stroke={C.coralShade} strokeWidth="1.4" opacity="0.6" />
        <text x={x} y={y + 4.5} textAnchor="middle" fontSize="13" fontWeight="800" fill={C.coralShade} fontFamily="system-ui, sans-serif">
          $
        </text>
        <path d={`M${x - 6} ${y - 6} Q${x - 3} ${y - 9} ${x + 1} ${y - 9}`} fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      </g>
    </g>
  );
}

/** The Pro crown's drawing — gold points tipped with coral, a jewel in front — around its own bottom-centre (0, 0). */
function CrownShape() {
  const { width: w, height: h } = CROWN;
  const left = -w / 2;
  const right = w / 2;
  const top = -h;
  const tips = [
    { x: left, y: top + 7 },
    { x: 0, y: top },
    { x: right, y: top + 7 },
  ];
  return (
    <>
      <path
        d={`M${left} 0 V${top + 7} L${left + w * 0.27} ${top + 15} L0 ${top} L${right - w * 0.27} ${top + 15} L${right} ${top + 7} V0 Z`}
        fill={C.blush}
        stroke={C.ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d={`M${left + 2} -6 H${right - 2}`} stroke={C.coralShade} strokeWidth="2" opacity="0.55" />
      {tips.map((tip) => (
        <circle key={tip.x} cx={tip.x} cy={tip.y} r="3" fill={C.coral} stroke={C.ink} strokeWidth="1.8" />
      ))}
      <circle cx="0" cy="-11" r="3.6" fill={C.coral} stroke={C.ink} strokeWidth="1.8" />
    </>
  );
}

/** The Pro crown, sitting on top of her body, tilted with the curve of her shell. */
function Crown() {
  return (
    <g transform={`translate(${CROWN_BASE.x} ${CROWN_BASE.y}) rotate(${CROWN.tilt})`}>
      <g data-part="crown" style={{ opacity: 0 }}>
        <CrownShape />
      </g>
    </g>
  );
}

/** A tool gripped in the big pincer like the pencil: drawn along +x from the grip, its working end at PENCIL_TIP. */
function HeldTool({ part, children }: { part: string; children: React.ReactNode }) {
  const rad = (PENCIL.angle * Math.PI) / 180;
  const gripX = PENCIL_TIP.x - PENCIL.length * Math.cos(rad);
  const gripY = PENCIL_TIP.y - PENCIL.length * Math.sin(rad);
  return (
    <g data-part={part} style={{ opacity: 0 }}>
      <g transform={`translate(${gripX.toFixed(1)} ${gripY.toFixed(1)}) rotate(${PENCIL.angle})`}>{children}</g>
    </g>
  );
}

/**
 * A pencil gripped in the big pincer, its point at PENCIL_TIP. Drawn along +x
 * from the grip, then turned into place; it rides along with the claw.
 */
function Pencil() {
  const body = PENCIL.length - 13;
  // Where it breaks, when it snaps: the barrel is drawn in two halves.
  const half = body / 2;
  return (
    <HeldTool part="pencil">
      <rect x="-9" y="-4.5" width="11" height="9" rx="2.5" fill={C.coral} stroke={C.ink} strokeWidth="2.5" />
      <rect data-part="pencilBody" x="0" y="-4.5" width={half + 1} height="9" fill={C.blush} stroke={C.ink} strokeWidth="2.5" />
      {/* The splintered end left on the stub — shown once the front half has snapped off. */}
      <path
        data-part="pencilSplinter"
        d={`M${half} -4.5 L${half + 4} -2.6 L${half + 1.5} -0.8 L${half + 5} 1.2 L${half + 1} 2.6 L${half} 4.5`}
        fill={C.cream}
        stroke={C.ink}
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ opacity: 0 }}
      />
      <g data-part="pencilTip">
        {/* Outlined top and bottom only, so the two halves join without a seam. */}
        <rect data-part="pencilFront" x={half} y="-4.5" width={body - half} height="9" fill={C.blush} />
        <path d={`M${half} -4.5 H${body} M${half} 4.5 H${body}`} stroke={C.ink} strokeWidth="2.5" />
        <path d={`M${body} -4.5 L${PENCIL.length} 0 L${body} 4.5 Z`} fill={C.cream} stroke={C.ink} strokeWidth="2.5" strokeLinejoin="round" />
        <path d={`M${PENCIL.length - 4.5} -1.6 L${PENCIL.length} 0 L${PENCIL.length - 4.5} 1.6 Z`} fill={C.ink} />
      </g>
    </HeldTool>
  );
}

/**
 * A rubber stamp gripped in the big pincer, held like the pencil: wooden
 * handle and knob at the grip, the rubber face where the pencil's point would
 * be — so the claw puts it on the page the same way.
 */
function Stamp() {
  const L = PENCIL.length;
  return (
    <HeldTool part="stamp">
      <rect x="2" y="-3.5" width={L - 20} height="7" rx="2" fill="#E3B98A" stroke={C.ink} strokeWidth="2.5" />
      <circle cx="2" cy="0" r="7" fill={C.coral} stroke={C.ink} strokeWidth="2.5" />
      <rect x={L - 19} y="-9" width="12" height="18" rx="2.5" fill={C.coral} stroke={C.ink} strokeWidth="2.5" />
      <rect x={L - 7} y="-10" width="7" height="20" rx="1.5" fill={C.ink} />
    </HeldTool>
  );
}

/**
 * A magnifying glass: a handle from the grip, and the lens — a ring with a
 * glint — at the working end, where the pencil's point would be.
 */
function Magnifier() {
  const L = PENCIL.length;
  const r = 15;
  return (
    <HeldTool part="magnifier">
      <rect x="-6" y="-3.5" width={L - 2 * r + 6} height="7" rx="3" fill={C.coralShade} stroke={C.ink} strokeWidth="2.4" />
      <circle cx={L - r} cy="0" r={r} fill="#FFFFFF" fillOpacity="0.35" stroke={C.ink} strokeWidth="3" />
      <circle cx={L - r} cy="0" r={r - 3} fill="none" stroke={C.blush} strokeWidth="2" />
      <path d={`M${L - r - 5} -4 Q${L - r - 2} -7 ${L - r + 2} -6.5`} fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </HeldTool>
  );
}

/**
 * Scissors: coral finger loops at the grip, two steel blades from the screw
 * to the tips (where the pencil's point would be). The blades open and close
 * about the screw.
 */
function Scissors() {
  const L = PENCIL.length;
  const screw = 26;
  return (
    <HeldTool part="scissors">
      <path d={`M7 -4 L${screw} -1 M7 4 L${screw} 1`} stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
      {[-5, 5].map((dy) => (
        <g key={dy}>
          <circle cx="3" cy={dy} r="5.5" fill={C.coral} stroke={C.ink} strokeWidth="2.2" />
          <circle cx="3" cy={dy} r="2.3" fill={C.cream} />
        </g>
      ))}
      <g data-part="bladeA">
        <path d={`M${screw} -2.6 L${L} -0.4 L${screw} 1.2 Z`} fill="#DCE1EA" stroke={C.ink} strokeWidth="1.8" strokeLinejoin="round" />
      </g>
      <g data-part="bladeB">
        <path d={`M${screw} -1.2 L${L} 0.4 L${screw} 2.6 Z`} fill="#C9CFDB" stroke={C.ink} strokeWidth="1.8" strokeLinejoin="round" />
      </g>
      <circle cx={screw} cy="0" r="2.2" fill={C.ink} />
    </HeldTool>
  );
}

/**
 * The job post's lines on the held sheet (across u0–u1, down v): its title
 * and company, a coral "requirements" heading, then bulleted requirements.
 */
const JOB_FACE_ROWS = [
  { u0: 0.4, u1: 0.84, v: 0.1, color: C.ink, width: 2.6, opacity: 0.75, bullet: false },
  { u0: 0.4, u1: 0.7, v: 0.16, color: C.ink, width: 1.8, opacity: 0.3, bullet: false },
  { u0: 0.14, u1: 0.46, v: 0.3, color: C.coral, width: 2.2, opacity: 0.9, bullet: false },
  { u0: 0.26, u1: 0.84, v: 0.4, color: C.ink, width: 2, opacity: 0.35, bullet: true },
  { u0: 0.26, u1: 0.74, v: 0.5, color: C.ink, width: 2, opacity: 0.35, bullet: true },
  { u0: 0.26, u1: 0.86, v: 0.6, color: C.ink, width: 2, opacity: 0.35, bullet: true },
  { u0: 0.26, u1: 0.64, v: 0.7, color: C.ink, width: 2, opacity: 0.35, bullet: true },
] as const;

/**
 * The job post lying on the ground in front of her (tailor scene): a squashed
 * sheet seen from the front, with the post's logo, title and requirements
 * foreshortened onto it.
 */
function GroundPost() {
  const { farLeft: fl, farRight: fr, nearRight: nr, nearLeft: nl } = GROUND_POST;
  const pt = (u: number, v: number) => groundPoint(u, v);
  const line = (u0: number, u1: number, v: number) => {
    const a = pt(u0, v);
    const b = pt(u1, v);
    return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  };
  const logo = [pt(0.08, 0.12), pt(0.2, 0.12), pt(0.2, 0.42), pt(0.08, 0.42)];
  return (
    <g data-part="groundPost" style={{ opacity: 0 }}>
      <path
        d={`M${fl.x} ${fl.y} L${fr.x} ${fr.y} L${nr.x} ${nr.y} L${nl.x} ${nl.y} Z`}
        fill="#FFFFFF"
        stroke={C.ink}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d={`M${logo.map((c) => `${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" L")} Z`} fill={C.coral} stroke={C.ink} strokeWidth="1.4" />
      <path d={line(0.27, 0.66, 0.2)} stroke={C.ink} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <path d={line(0.27, 0.52, 0.38)} stroke={C.ink} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <path d={line(0.08, 0.3, 0.58)} stroke={C.coral} strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      <path d={line(0.08, 0.78, 0.74)} stroke={C.ink} strokeWidth="1.6" strokeLinecap="round" opacity="0.3" />
      <path d={line(0.08, 0.6, 0.88)} stroke={C.ink} strokeWidth="1.6" strokeLinecap="round" opacity="0.3" />
    </g>
  );
}

/**
 * The CV she holds out in her small claw to read or write on, angled toward
 * her: foreshortened (narrow, its far edge a little shorter), gently bowed as
 * paper is when held by one corner, shaded darker toward the far edge, a
 * second page peeking out behind, and a staple through the top corner. Its
 * text slopes with it: printed (reading) or handwritten row by row (writing).
 */
function ReadPaper({ idPrefix }: { idPrefix: string }) {
  const { x, y, width: w, height: h, skew } = READ_PAPER;
  const shadeId = `${idPrefix}-paper-shade`;
  const sealAt = paperPoint(PAPER_SEAL.u, PAPER_SEAL.v);
  // One sheet, its top and bottom edges bowed slightly, its far (left) edge curving in.
  const sheet = (dx: number, dy: number) => {
    const left = x + dx;
    const right = x + w + dx;
    const top = y + dy;
    return (
      `M${left} ${top + skew} Q${left + w / 2} ${top + skew / 2 - 2.5} ${right} ${top}` +
      ` L${right} ${top + h} Q${left + w / 2} ${top + h - skew / 2 + 1.5} ${left} ${top + h - skew}` +
      ` Q${left - 2.5} ${top + h / 2} ${left} ${top + skew} Z`
    );
  };
  return (
    <g data-part="paperBack" style={{ opacity: 0 }}>
      <defs>
        <linearGradient id={shadeId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E9DCCB" />
          <stop offset="0.55" stopColor="#F6EDE2" />
          <stop offset="1" stopColor="#FCF7F0" />
        </linearGradient>
      </defs>
      {/* A folder (saved-to-a-profile moment): its back, with a tab, behind the sheet… */}
      <g data-part="folderBack" style={{ opacity: 0 }}>
        <path d={paperQuad(-0.12, 0.42, 0.04, 0.16)} fill="#E7B458" stroke={C.ink} strokeWidth="2.4" strokeLinejoin="round" />
        <path d={paperQuad(-0.12, 1.12, 0.12, 1.1)} fill="#E7B458" stroke={C.ink} strokeWidth="2.6" strokeLinejoin="round" />
      </g>
      <g data-part="paperSheet">
        {/* Page two, peeking out behind. */}
        <path d={sheet(6, 4.5)} fill="#E8DCCB" stroke={C.ink} strokeWidth="2.4" strokeLinejoin="round" />
        <path d={sheet(0, 0)} fill={`url(#${shadeId})`} stroke={C.ink} strokeWidth="3" strokeLinejoin="round" />
        {/* A soft highlight along the near edge, where the paper catches the light. */}
        <path d={`M${x + w - 4} ${y + 6} V${y + h - 6}`} stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        {/* The staple holding the pages together, through the top corner. */}
        <path
          d={`M${x + w - 12} ${y + 7.5} L${x + w - 5} ${y + 5.5}`}
          stroke="#8A8FA3"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d={`M${x + w - 12} ${y + 7.5} l0 1.6 M${x + w - 5} ${y + 5.5} l0 1.6`} stroke="#8A8FA3" strokeWidth="1.6" strokeLinecap="round" />
        {/* The printed CV, sloping with the sheet — shown when she reads it. */}
        <g data-part="paperText">
          {PAPER_ROWS.filter((row) => row.kind !== "strike").map((row) => {
            const style = INK_STYLE[row.kind];
            const a = paperPoint(row.u0, row.v);
            const b = paperPoint(row.u1, row.v);
            return (
              <path
                key={`${row.kind}-${row.v}`}
                d={`M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`}
                stroke={style.color}
                strokeWidth={style.width * 0.75}
                strokeLinecap="round"
                opacity={row.kind === "line" || row.kind === "title" ? 0.35 : 0.85}
              />
            );
          })}
        </g>
        {/* The job post, when that's what she's holding: logo, title, company, requirements, a tag. */}
        <g data-part="paperJob" style={{ opacity: 0 }}>
          <path
            d={`M${[paperPoint(0.14, 0.07), paperPoint(0.32, 0.07), paperPoint(0.32, 0.17), paperPoint(0.14, 0.17)]
              .map((c) => `${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
              .join(" L")} Z`}
            fill={C.coral}
            stroke={C.ink}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {JOB_FACE_ROWS.map((row) => {
            const a = paperPoint(row.u0, row.v);
            const b = paperPoint(row.u1, row.v);
            const dot = paperPoint(0.17, row.v);
            return (
              <g key={row.v}>
                {row.bullet && <circle cx={dot.x} cy={dot.y} r="1.2" fill={C.ink} opacity="0.4" />}
                <path
                  d={`M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`}
                  stroke={row.color}
                  strokeWidth={row.width}
                  strokeLinecap="round"
                  opacity={row.opacity}
                />
              </g>
            );
          })}
          <path
            d={`M${paperPoint(0.14, 0.82).x.toFixed(1)} ${paperPoint(0.14, 0.82).y.toFixed(1)} L${paperPoint(0.44, 0.82).x.toFixed(1)} ${paperPoint(0.44, 0.82).y.toFixed(1)}`}
            stroke={C.blush}
            strokeWidth="4.5"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>
        {/* Handwriting, drawn on row by row as she writes (each starts fully dashed-off, i.e. invisible). */}
        {PAPER_ROWS.map((row) => {
          const points = paperRowPoints(row);
          const length = polylineLength(points);
          const style = INK_STYLE[row.kind];
          return (
            <path
              key={`ink-${row.kind}-${row.v}-${row.u0}`}
              data-part="paperInk"
              d={`M${points.map((pt) => `${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" L")}`}
              fill="none"
              stroke={style.color}
              strokeWidth={style.width * 0.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={style.opacity}
              strokeDasharray={length}
              strokeDashoffset={length}
            />
          );
        })}
        {/* The stamp scene's seal, foreshortened with the sheet. */}
        <g transform={`translate(${sealAt.x.toFixed(1)} ${sealAt.y.toFixed(1)})`}>
          <g data-part="paperSeal" style={{ opacity: 0 }}>
            <ellipse rx="6.5" ry="8.5" fill={C.coral} stroke={C.ink} strokeWidth="2.2" />
            <path d="M-3 0.5 L-0.8 3 L3.2 -2.6" fill="none" stroke={C.cream} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      </g>
      {/* …and its front, over the sheet's lower part — the sheet slides down behind it. */}
      <g data-part="folderFront" style={{ opacity: 0 }}>
        <path d={paperQuad(-0.12, 1.12, 0.5, 1.1)} fill="#F6CF7E" stroke={C.ink} strokeWidth="2.6" strokeLinejoin="round" />
        <path d={paperQuad(0.3, 0.7, 0.62, 0.7)} fill="#FFFFFF" fillOpacity="0.6" stroke={C.ink} strokeWidth="1.4" strokeOpacity="0.5" />
      </g>
    </g>
  );
}

/** A quad on the held sheet's surface, from across u0–u1 and down v0–v1 (it slopes with the sheet). */
function paperQuad(u0: number, u1: number, v0: number, v1: number) {
  const corners = [paperPoint(u0, v0), paperPoint(u1, v0), paperPoint(u1, v1), paperPoint(u0, v1)];
  return `M${corners.map((c) => `${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" L")} Z`;
}

/**
 * An eye, seen from the side: the pupil toward the front. The lid rests
 * just above the eye, out of sight, and only drops into view to blink.
 */
function SideEye({ cx, cy, r, clipId }: { cx: number; cy: number; r: number; clipId: string }) {
  const edge = cy - r - 6;
  return (
    <g>
      <clipPath id={clipId}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <circle cx={cx} cy={cy} r={r} fill={C.cream} />
      <g data-part="sidePupil">
        <circle cx={cx + r * 0.32} cy={cy + r * 0.14} r={r * 0.56} fill={C.ink} />
        <circle cx={cx + r * 0.5} cy={cy - r * 0.1} r={r * 0.17} fill={C.cream} />
      </g>
      <g clipPath={`url(#${clipId})`}>
        <g data-part="sideLid">
          <path d={`M${cx - r - 6} ${edge - SIDE_BLINK} H${cx + r + 6} V${edge} H${cx - r - 6} Z`} fill={C.coral} />
          <path d={`M${cx + r + 6} ${edge} H${cx - r - 6}`} fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
        </g>
      </g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.ink} strokeWidth="5" />
    </g>
  );
}

/** A stalk, ink under coral, as in the front view. */
function SideStalk({ d }: { d: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={C.ink} strokeWidth="16" strokeLinecap="round" />
      <path d={d} fill="none" stroke={C.coral} strokeWidth="8" strokeLinecap="round" />
    </>
  );
}

/**
 * Moxie seen from the side, facing right (the 404 page's pacing): her claws
 * clasped behind her back, crossed; the far stalk and legs set back; a
 * worried mouth; a bead of sweat ready. Hidden until shown.
 */
function SideView({ idPrefix, shown }: { idPrefix: string; shown: boolean }) {
  return (
    <g data-part="side" style={{ opacity: shown ? 1 : 0 }}>
      <g data-part="sideTurn">
        {SIDE_LEGS.map((leg) => (
          <rect
            key={leg.x}
            data-part="sideLeg"
            x={leg.x}
            y={leg.y}
            width="20"
            height={leg.height}
            rx="10"
            fill={leg.far ? C.coralShade : C.coral}
            stroke={C.ink}
            strokeWidth="4"
          />
        ))}
        <g data-part="sideBody">
          {/* Claws clasped behind her back, crossed. The far arm goes back behind her… */}
          <path d="M268 318 L238 312" fill="none" stroke={C.ink} strokeWidth="15" strokeLinecap="round" />
          <path d="M268 318 L238 312" fill="none" stroke={C.coral} strokeWidth="8" strokeLinecap="round" />
          <g transform="translate(238 312) rotate(-138) scale(0.9) translate(-404 -325)">
            <path d={SMALL_PINCER} fill={C.coral} stroke={C.ink} strokeWidth="4.5" strokeLinejoin="round" />
          </g>
          {/* (The far eye, mostly hidden behind the near one.) */}
          <SideStalk d="M306 278 Q 314 232 324 198" />
          <SideEye cx={330} cy={168} r={31} clipId={`${idPrefix}-side-far`} />
          <ellipse cx="305" cy="322" rx="74" ry="54" fill={C.coral} stroke={C.ink} strokeWidth="5" />
          <path d="M258 352 Q 300 372 348 356" fill="none" stroke={C.coralShade} strokeWidth="8" strokeLinecap="round" opacity="0.6" />
          <ellipse cx="344" cy="324" rx="11" ry="7" fill={`url(#${idPrefix}-blush)`} />
          {/* A small, worried mouth at the front. */}
          <path d="M352 342 Q 359 335 367 341" fill="none" stroke={C.ink} strokeWidth="4.5" strokeLinecap="round" />
          {/* …the near arm comes out of her side, toward us, and wraps round her back to the clasp. */}
          <path d="M300 338 Q 268 356 238 352" fill="none" stroke={C.ink} strokeWidth="16" strokeLinecap="round" />
          <path d="M300 338 Q 268 356 238 352" fill="none" stroke={C.coral} strokeWidth="9" strokeLinecap="round" />
          <g transform="translate(236 352) rotate(-48) scale(0.5) translate(-215 -297)">
            <path d={BIG_PINCER} fill={C.coral} stroke={C.ink} strokeWidth="9" strokeLinejoin="round" />
          </g>
          <g transform="translate(262 282) rotate(-30)">
            <g data-part="sideCrown" style={{ opacity: 0 }}>
              <CrownShape />
            </g>
          </g>
          <SideStalk d="M328 280 Q 338 236 344 212" />
          <SideEye cx={348} cy={180} r={36} clipId={`${idPrefix}-side-near`} />
          <g transform="translate(388 148)">
            <g data-part="sideSweat" style={{ opacity: 0 }}>
              <path d={SWEAT} fill="#9CC9F5" stroke={C.ink} strokeWidth="2.2" strokeLinejoin="round" />
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}

export interface MoxieArtProps {
  /** Unique per instance — used to scope the eyelid clip-path ids. */
  idPrefix: string;
  title?: string;
  decorative?: boolean;
  showShadow?: boolean;
  /** Starts out seen from the side (the 404 page), so her front view never flashes up before the animation runs. */
  sideView?: boolean;
  className?: string;
}

export const MoxieArt = React.forwardRef<SVGSVGElement, MoxieArtProps>(function MoxieArt(
  { idPrefix, title = "Moxie the hermit crab", decorative = false, showShadow = true, sideView = false, className },
  ref,
) {
  return (
    <svg
      ref={ref}
      viewBox={MOXIE_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      overflow="visible"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      focusable="false"
    >
      <ellipse
        data-part="shadow"
        cx="305"
        cy="393"
        rx="78"
        ry="8"
        fill={C.ink}
        opacity="0.1"
        visibility={showShadow ? undefined : "hidden"}
      />

      {/* Only the tickle giggle moves this, so it can shake her without touching what she's doing. */}
      <g data-part="jiggle">
      <g data-part="root" style={sideView ? { opacity: 0 } : undefined}>
        <g data-part="legs" fill={C.coral} stroke={C.ink} strokeWidth="4">
          <rect data-part="leg" x="248" y="345" width="22" height="42" rx="11" />
          <rect data-part="leg" x="292" y="350" width="22" height="40" rx="11" />
          <rect data-part="leg" x="338" y="348" width="22" height="40" rx="11" />
        </g>

        <g data-part="smallClaw">
          <path d="M368 328 Q 392 330 404 318" fill="none" stroke={C.ink} strokeWidth="18" strokeLinecap="round" />
          <path d="M368 328 Q 392 330 404 318" fill="none" stroke={C.coral} strokeWidth="10" strokeLinecap="round" />
          <g data-part="smallPincer">
            <path
              d={SMALL_PINCER}
              fill={C.coral}
              stroke={C.ink}
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>
        </g>

        <g data-part="body">
          <ellipse cx="305" cy="320" rx="88" ry="54" fill={C.coral} stroke={C.ink} strokeWidth="5" />
          <path
            data-part="bellyShade"
            d="M255 338 Q 300 365 350 345"
            fill="none"
            stroke={C.coralShade}
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>

        {/* Her face is part of her body: drawn right after it, so claws, papers and
            stalks all pass in front of her mouth and cheeks. */}
        <g data-part="face">
          <g data-part="mouthSmile">
            <path d="M273 316 Q 300 344 330 316" fill={C.ink} stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
            <path d="M285 327 Q 301 337 318 327" fill="none" stroke={C.coralShade} strokeWidth="5" strokeLinecap="round" />
          </g>
          {/* Other mouths, one shown at a time by the scenes. */}
          <ellipse data-part="mouthTalk" cx={MOUTH.x} cy={MOUTH.y} rx="13" ry="9.5" fill={C.ink} style={{ opacity: 0 }} />
          <path
            data-part="mouthFlat"
            d={`M${MOUTH.x - 15} ${MOUTH.y} q3.75 -4 7.5 0 t7.5 0 t7.5 0 t7.5 0`}
            fill="none"
            stroke={C.ink}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0 }}
          />
          <ellipse data-part="mouthO" cx={MOUTH.x} cy={MOUTH.y} rx="8" ry="10" fill={C.ink} style={{ opacity: 0 }} />
          {/* Concentrating: mouth pressed shut, the tip of her tongue poking out of one corner. */}
          <g data-part="mouthTongue" style={{ opacity: 0 }}>
            <path
              d={`M${MOUTH.x + 4} ${MOUTH.y + 1} q5 11 13 4 q1.5 -6 -4 -8 Z`}
              fill={C.tongue}
              stroke={C.ink}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path d={`M${MOUTH.x - 16} ${MOUTH.y - 3} Q${MOUTH.x} ${MOUTH.y + 6} ${MOUTH.x + 16} ${MOUTH.y - 1}`} fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
          </g>
          {/* Laughing (the tickle giggle): covers whichever mouth is showing, then a big open laugh. */}
          <g data-part="mouthLaugh" style={{ opacity: 0 }}>
            <ellipse cx={MOUTH.x} cy={MOUTH.y + 4} rx="33" ry="19" fill={C.coral} />
            <path
              d={`M${MOUTH.x - 22} ${MOUTH.y - 7} Q${MOUTH.x} ${MOUTH.y - 2} ${MOUTH.x + 22} ${MOUTH.y - 7} Q${MOUTH.x + 17} ${MOUTH.y + 20} ${MOUTH.x} ${MOUTH.y + 20} Q${MOUTH.x - 17} ${MOUTH.y + 20} ${MOUTH.x - 22} ${MOUTH.y - 7} Z`}
              fill={C.ink}
              stroke={C.ink}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <ellipse cx={MOUTH.x} cy={MOUTH.y + 13} rx="10" ry="5.5" fill={C.tongue} />
          </g>
          {/* Cheeks: a soft glow that fades out at the edges, sitting on her body under
              everything she holds — so a claw or a paper passes in front of it. */}
          <defs>
            <radialGradient id={`${idPrefix}-blush`}>
              <stop offset="0" stopColor={C.blush} stopOpacity="0.9" />
              <stop offset="0.55" stopColor={C.blush} stopOpacity="0.5" />
              <stop offset="1" stopColor={C.blush} stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="258" cy="321" rx="14" ry="8.5" fill={`url(#${idPrefix}-blush)`} />
          <ellipse cx="352" cy="314" rx="14" ry="8.5" fill={`url(#${idPrefix}-blush)`} />
        </g>

        {/* Over the small claw, which grips its corner from behind; under the stalks
            and the big claw, so her eyes and the pencil stay in front of it. */}
        <ReadPaper idPrefix={idPrefix} />

        {/* Each stalk group bends from its base; the stalk line stretches
            on its own while the eye rides along its tip without distorting. */}
        <g data-part="stalkL">
          <g data-part="stalkLineL">
            <path d="M285 282 Q 272 248 266 208" fill="none" stroke={C.ink} strokeWidth="16" strokeLinecap="round" />
            <path d="M285 282 Q 272 248 266 208" fill="none" stroke={C.coral} strokeWidth="8" strokeLinecap="round" />
          </g>
          <Eye side="L" eye={EYE_L} clipId={`${idPrefix}-lid-l`} />
        </g>

        <g data-part="stalkR">
          <g data-part="stalkLineR">
            <path d="M318 282 Q 332 245 342 200" fill="none" stroke={C.ink} strokeWidth="16" strokeLinecap="round" />
            <path d="M318 282 Q 332 245 342 200" fill="none" stroke={C.coral} strokeWidth="8" strokeLinecap="round" />
          </g>
          <Eye side="R" eye={EYE_R} clipId={`${idPrefix}-lid-r`} />
        </g>

        {/* The glasses' bridge, between the two lenses (redrawn as the eyes move). */}
        <path
          data-part="glassesBridge"
          d={bridgePath(lensCorner("L"), lensCorner("R"))}
          fill="none"
          stroke={C.ink}
          strokeWidth="4.5"
          strokeLinecap="round"
          style={{ opacity: 0 }}
        />

        {/* The Pro crown on her shell: over the stalk beside it, under the big claw. */}
        <Crown />

        {/* In front of the stalks (it is the nearer layer), so a claw reaching across her
            body passes over them — and over her face. */}
        <g data-part="bigClaw">
          <path data-part="bigArm" d={armPath(BIG_ARM.elbow, BIG_ARM.wrist)} fill="none" stroke={C.ink} strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
          <path data-part="bigArm" d={armPath(BIG_ARM.elbow, BIG_ARM.wrist)} fill="none" stroke={C.coral} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
          <g data-part="bigPincer">
            <PdfFile />
            <Coin />
            <path
              d={BIG_PINCER}
              fill={C.coral}
              stroke={C.ink}
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M172 262 Q 180 282 205 284" fill="none" stroke={C.coralShade} strokeWidth="6" strokeLinecap="round" opacity="0.7" />
            <Pencil />
            <Stamp />
            <Scissors />
            <Magnifier />
          </g>
        </g>

      </g>

      {/* Seen from the side (pacing, on the 404 page): hidden until shown in place of her front view. */}
      <SideView idPrefix={idPrefix} shown={sideView} />
      </g>

      {/* In front of her, lying on the ground (not part of her, so it stays put while she moves). */}
      <GroundPost />

      {/* Effects — positioned by a static outer group, animated on the inner one. */}
      <g aria-hidden="true">
        <g transform={`translate(${CROWN_FLOAT.x} ${CROWN_FLOAT.y}) scale(${CROWN_FLOAT.scale})`}>
          <g data-part="crownFloat" style={{ opacity: 0 }}>
            <CrownShape />
          </g>
        </g>
        {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
          <g key={`confetti-${i}`} transform={`translate(${CONFETTI_ORIGIN.x} ${CONFETTI_ORIGIN.y})`}>
            <g data-part="confetti" style={{ opacity: 0 }}>
              <rect x="-4" y="-2" width="8" height="4" rx="1.2" fill={CONFETTI_COLORS[i % CONFETTI_COLORS.length]} stroke={C.ink} strokeWidth="1" />
            </g>
          </g>
        ))}
        {SPARKLE_BURST.map((s, i) => (
          <g key={`sparkle-${i}`} transform={`translate(${SPARKLE_ORIGIN.x} ${SPARKLE_ORIGIN.y})`}>
            <g data-part="sparkle" style={{ opacity: 0 }}>
              <path d={STAR} fill={s.color} stroke={C.ink} strokeWidth="2.5" strokeLinejoin="round" />
            </g>
          </g>
        ))}
        {Array.from({ length: ZZZ_COUNT }, (_, i) => (
          <g key={`z-${i}`} transform={`translate(${ZZZ_ORIGIN.x} ${ZZZ_ORIGIN.y})`}>
            <g data-part="z" style={{ opacity: 0 }}>
              <path d={ZED} fill="none" stroke={C.ink} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
});
