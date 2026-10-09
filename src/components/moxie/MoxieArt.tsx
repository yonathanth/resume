import React from "react";
import {
  bridgePath,
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
  PAPER_SEAL,
  paperPoint,
  paperRowPoints,
  PENCIL,
  PENCIL_TIP,
  polylineLength,
  READ_PAPER,
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
  return (
    <HeldTool part="pencil">
      <rect x="-9" y="-4.5" width="11" height="9" rx="2.5" fill={C.coral} stroke={C.ink} strokeWidth="2.5" />
      <rect data-part="pencilBody" x="0" y="-4.5" width={body} height="9" fill={C.blush} stroke={C.ink} strokeWidth="2.5" />
      <path d={`M${body} -4.5 L${PENCIL.length} 0 L${body} 4.5 Z`} fill={C.cream} stroke={C.ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d={`M${PENCIL.length - 4.5} -1.6 L${PENCIL.length} 0 L${PENCIL.length - 4.5} 1.6 Z`} fill={C.ink} />
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
    </g>
  );
}

export interface MoxieArtProps {
  /** Unique per instance — used to scope the eyelid clip-path ids. */
  idPrefix: string;
  title?: string;
  decorative?: boolean;
  showShadow?: boolean;
  className?: string;
}

export const MoxieArt = React.forwardRef<SVGSVGElement, MoxieArtProps>(function MoxieArt(
  { idPrefix, title = "Moxie the hermit crab", decorative = false, showShadow = true, className },
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
      <g data-part="root">
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
              d="M404 325 C392 322 386 303 395 292 C398 287 404 288 405 294 L408 305 L412 294 C415 286 425 288 426 297 C428 312 418 327 404 325 Z"
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

        {/* In front of the stalks (it is the nearer layer), so a claw reaching across her
            body passes over them — and over her face. */}
        <g data-part="bigClaw">
          <path d="M240 312 Q 222 300 212 288" fill="none" stroke={C.ink} strokeWidth="24" strokeLinecap="round" />
          <path d="M240 312 Q 222 300 212 288" fill="none" stroke={C.coral} strokeWidth="15" strokeLinecap="round" />
          <g data-part="bigPincer">
            <path
              d="M215 297 C165 302 143 257 158 214 C163 198 180 198 184 214 L194 246 L200 213 C205 192 232 196 234 224 C238 266 232 292 215 297 Z"
              fill={C.coral}
              stroke={C.ink}
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M172 262 Q 180 282 205 284" fill="none" stroke={C.coralShade} strokeWidth="6" strokeLinecap="round" opacity="0.7" />
            <Pencil />
            <Stamp />
            <Scissors />
          </g>
        </g>

      </g>
      </g>

      {/* In front of her, lying on the ground (not part of her, so it stays put while she moves). */}
      <GroundPost />

      {/* Effects — positioned by a static outer group, animated on the inner one. */}
      <g aria-hidden="true">
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
