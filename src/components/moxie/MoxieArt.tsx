import React from "react";
import { EYE_L, EYE_R, EYE_RADIUS, LID_PARK_GAP, MOXIE_COLORS as C, MOXIE_VIEWBOX, SPARKLE_BURST, SPARKLE_ORIGIN, ZZZ_COUNT, ZZZ_ORIGIN } from "./moxie.constants";

// Moxie's vector artwork, regrouped into animatable layers. Every path,
// colour and stroke comes verbatim from the source SVG, and the paint order
// is unchanged — each `data-part` group only wraps elements that were
// already adjacent (or don't overlap), so the resting render is identical.
//
// Additions, all invisible or near-invisible at rest:
//   • eyelids — clipped inside each eye and parked above it until used
//   • a soft ground shadow
//   • sparkle and "z" particles (opacity 0 until an animation shows them)
//
// Static markup only: it renders on the server, and the animation layer
// (Moxie.tsx) finds the parts by `data-part` after mount.

const STAR = "M0 -10 C1.5 -2.5 2.5 -1.5 10 0 C2.5 1.5 1.5 2.5 0 10 C-1.5 2.5 -2.5 1.5 -10 0 C-2.5 -1.5 -1.5 -2.5 0 -10 Z";
const ZED = "M-6 -6 H6 L-6 6 H6";

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
          </g>
        </g>

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

        <g data-part="face">
          <path d="M273 316 Q 300 344 330 316" fill={C.ink} stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
          <path d="M285 327 Q 301 337 318 327" fill="none" stroke={C.coralShade} strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="248" cy="318" rx="10" ry="6" fill={C.blush} opacity="0.8" />
          <ellipse cx="354" cy="312" rx="10" ry="6" fill={C.blush} opacity="0.8" />
        </g>
      </g>

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
