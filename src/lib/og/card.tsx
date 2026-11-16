import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";
import { MOXIE_SVG } from "./moxie-art.generated";

// Share images (Open Graph / Twitter cards), 1200 × 630: the page's message
// in big type on the left; on the right a real template (Spark by default)
// with Moxie beside it, holding whatever fits the page. Built with next/og
// (Satori): flexbox and inline styles only.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK = "#0a0a0a";
const FAINT = "#a3a3a3";
/** The brand orange and its lighter tint (--accent and --accent-light in globals.css). */
const ACCENT = SITE.accent;
const ACCENT_LIGHT = "#ff9b60";

/** What Moxie holds. Each shows parts of her artwork that are hidden at rest. */
export type MoxiePose = "folder" | "pencil" | "magnifier" | "glasses" | "editor" | "crown" | "pdf" | "plain";

const POSE_PARTS: Record<MoxiePose, string[]> = {
  folder: ["hugFiles"],
  pencil: ["pencil"],
  magnifier: ["magnifier"],
  glasses: ["glassesL", "glassesR", "glassesBridge"],
  editor: ["glassesL", "glassesR", "glassesBridge", "pencil"],
  crown: ["crown"],
  pdf: ["pdfFile"],
  plain: [],
};

/**
 * Her eyes: each eye's centre. At rest her pupils (and their glints) look
 * down and to the side; on a share card she looks straight at whoever sees
 * it, so each pupil sits in the middle of its eye, with the glint up and to
 * its right as before.
 */
const EYES = [
  { pupil: "pupilL", glint: "glintL", cx: 264, cy: 172 },
  { pupil: "pupilR", glint: "glintR", cx: 346, cy: 164 },
];
function lookAtViewer(svg: string): string {
  return EYES.reduce(
    (out, eye) =>
      out
        .replace(new RegExp(`(data-part="${eye.pupil}"><circle )cx="[\\d.]+" cy="[\\d.]+"`), `$1cx="${eye.cx}" cy="${eye.cy}"`)
        .replace(new RegExp(`(data-part="${eye.glint}"><circle )cx="[\\d.]+" cy="[\\d.]+"`), `$1cx="${eye.cx + 8}" cy="${eye.cy - 9}"`),
    svg
  );
}

/** Moxie in a pose, looking at the viewer, as an image the card can draw. */
function moxieImage(pose: MoxiePose): string {
  const svg = POSE_PARTS[pose].reduce(
    (out, part) => out.replace(new RegExp(`(data-part="${part}"[^>]*?)style="opacity:0"`, "g"), "$1"),
    lookAtViewer(MOXIE_SVG)
  );
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * A template's first page (its sample CV) as a data URI, from the static
 * pictures in assets/og/templates/ — so cards never wait on the backend.
 * Null for a template without one. Re-render them (resume-back/scripts/
 * render-frontend-template-pictures.ts) when a template's look changes.
 */
const pictures = new Map<string, Promise<string | null>>();
export function templatePicture(id: string): Promise<string | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return Promise.resolve(null);
  let picture = pictures.get(id);
  if (!picture) {
    picture = readFile(join(process.cwd(), "assets/og/templates", `${id}.png`)).then(
      (png) => `data:image/png;base64,${png.toString("base64")}`,
      () => null
    );
    pictures.set(id, picture);
  }
  return picture;
}

/** The template behind Moxie on cards that don't show a template of their own. */
const DEFAULT_TEMPLATE = "spark";

let fontsPromise: Promise<{ regular: Buffer; bold: Buffer }> | null = null;
function fonts() {
  fontsPromise ??= Promise.all([
    readFile(join(process.cwd(), "assets/og/Geist-Regular.ttf")),
    readFile(join(process.cwd(), "assets/og/Geist-Bold.ttf")),
  ]).then(([regular, bold]) => ({ regular, bold }));
  return fontsPromise;
}

/** A real template's first page, in a frame. */
function TemplateSheet({ src }: { src: string }) {
  return (
    <div
      style={{
        display: "flex",
        width: 346,
        height: 489,
        background: "white",
        borderRadius: 10,
        border: "1px solid #e5e5e5",
        overflow: "hidden",
        boxShadow: "0 24px 60px -24px rgba(10,10,10,0.35)",
        transform: "rotate(2deg)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img> */}
      <img src={src} width={346} height={489} alt="" style={{ width: 346, height: 489 }} />
    </div>
  );
}

/**
 * One line of the heading, never wrapping. The accent words (when they're on
 * this line) are drawn like the landing hero's: slanted, in the brand orange,
 * with a hand-drawn underline.
 */
function HeadingLine({ line, accent }: { line: string; accent?: string }) {
  const at = accent ? line.indexOf(accent) : -1;
  if (!accent || at === -1) return <div style={{ display: "flex", whiteSpace: "nowrap" }}>{line}</div>;

  const before = line.slice(0, at).trimEnd();
  const after = line.slice(at + accent.length).trimStart();
  const gap = "0.24em"; // a space's width, since Satori trims spaces at the ends of text
  return (
    <div style={{ display: "flex", whiteSpace: "nowrap", alignItems: "baseline" }}>
      {before && <span style={{ marginRight: gap }}>{before}</span>}
      <span style={{ display: "flex", position: "relative", color: ACCENT, transform: "skewX(-9deg)" }}>
        {accent}
        <svg
          viewBox="0 0 200 14"
          preserveAspectRatio="none"
          style={{ position: "absolute", left: 0, bottom: "-0.06em", width: "100%", height: "0.2em" }}
        >
          <path d="M3 10 C 45 4, 110 2, 197 7" fill="none" stroke={ACCENT_LIGHT} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </span>
      {after && <span style={{ marginLeft: line[at + accent.length] === " " ? "0.2em" : 0 }}>{after}</span>}
    </div>
  );
}

export interface OgCardInput {
  pose: MoxiePose;
  /** The heading, always two lines, like the landing page's hero. */
  lines: [string, string];
  /** The words in `lines` drawn like the hero's accent: slanted, orange, underlined. */
  accent?: string;
  /** A template preview (data URI or URL); without one, the Spark template. */
  templateImage?: string | null;
  /** Hide Moxie (she still signs it, small, by the brand name). */
  quietMoxie?: boolean;
}

export async function ogCard({ lines, accent, pose, templateImage, quietMoxie = false }: OgCardInput) {
  const { regular, bold } = await fonts();
  const moxie = moxieImage(pose);
  const sheet = templateImage ?? (await templatePicture(DEFAULT_TEMPLATE));
  // Sized so the longer line fits the left column on one line (Geist Bold, tightly tracked, averages about 0.48em a letter).
  const titleSize = Math.min(84, Math.floor(600 / (Math.max(...lines.map((l) => l.length)) * 0.48)));

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          fontFamily: "Geist",
          color: INK,
          // One smooth wash, no shapes: white behind the words, warming to soft peach behind the CV.
          background: "linear-gradient(100deg, #ffffff 0%, #fffcfa 50%, #fff3ec 100%)",
          position: "relative",
        }}
      >
        {/* Left: the message */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 690, padding: "64px 0 56px 72px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img> */}
            <img src={moxieImage("plain")} width={44} height={44} alt="" />
            <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em" }}>{SITE.name}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexDirection: "column", fontSize: titleSize, fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.035em" }}>
              {lines.map((line) => (
                <HeadingLine key={line} line={line} accent={accent} />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 22, color: FAINT }}>{SITE.url.replace(/^https?:\/\//, "")}</div>
        </div>

        {/* Right: the CV, with Moxie beside it */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", position: "relative" }}>
          {sheet && <TemplateSheet src={sheet} />}
          {!quietMoxie && (
            // eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img>
            <img src={moxie} width={220} height={220} alt="" style={{ position: "absolute", right: -6, bottom: -6 }} />
          )}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: bold, weight: 700, style: "normal" },
      ],
    }
  );
}
