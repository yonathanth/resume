import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";
import { MOXIE_SVG } from "./moxie-art.generated";

// Share images (Open Graph / Twitter cards), 1200 × 630: the page's message
// in big type on the left; on the right a CV sheet (or the real template)
// with Moxie beside it, holding whatever fits the page. Built with next/og
// (Satori): flexbox and inline styles only.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK = "#0a0a0a";
const MUTED = "#525252";
const FAINT = "#a3a3a3";
const ACCENT = SITE.accent;

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

/** Moxie in a pose, as an image the card can draw. */
function moxieImage(pose: MoxiePose): string {
  const svg = POSE_PARTS[pose].reduce(
    (out, part) => out.replace(new RegExp(`(data-part="${part}"[^>]*?)style="opacity:0"`, "g"), "$1"),
    MOXIE_SVG
  );
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

let fontsPromise: Promise<{ regular: Buffer; bold: Buffer }> | null = null;
function fonts() {
  fontsPromise ??= Promise.all([
    readFile(join(process.cwd(), "assets/og/Geist-Regular.ttf")),
    readFile(join(process.cwd(), "assets/og/Geist-Bold.ttf")),
  ]).then(([regular, bold]) => ({ regular, bold }));
  return fontsPromise;
}

/** A plain CV page drawn with bars: name, title, then sections of lines. */
function CvSheet() {
  const line = (width: string, color = "#e5e5e5") => (
    <div style={{ display: "flex", height: 9, width, borderRadius: 5, background: color, marginTop: 9 }} />
  );
  const section = (lines: string[]) => (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
      <div style={{ display: "flex", height: 11, width: "34%", borderRadius: 6, background: ACCENT, opacity: 0.85 }} />
      {lines.map((w, i) => (
        <div key={i} style={{ display: "flex" }}>
          {line(w)}
        </div>
      ))}
    </div>
  );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 330,
        height: 440,
        padding: "34px 30px",
        background: "white",
        borderRadius: 14,
        border: "1px solid #e5e5e5",
        boxShadow: "0 24px 60px -24px rgba(10,10,10,0.35)",
        transform: "rotate(3deg)",
      }}
    >
      <div style={{ display: "flex", height: 20, width: "62%", borderRadius: 8, background: INK }} />
      {line("44%", "#d4d4d4")}
      {section(["92%", "86%", "70%"])}
      {section(["90%", "80%", "88%", "60%"])}
      {section(["74%", "66%"])}
    </div>
  );
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

export interface OgCardInput {
  /** Small line above the title, e.g. "Free resume builder". */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  pose: MoxiePose;
  /** A template preview (data URI or URL) instead of the drawn CV sheet. */
  templateImage?: string | null;
  /** Hide Moxie (she still signs it, small, by the brand name). */
  quietMoxie?: boolean;
}

export async function ogCard({ eyebrow, title, subtitle, pose, templateImage, quietMoxie = false }: OgCardInput) {
  const { regular, bold } = await fonts();
  const moxie = moxieImage(pose);
  const titleSize = title.length > 46 ? 58 : title.length > 30 ? 66 : 76;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          fontFamily: "Geist",
          color: INK,
          background: "linear-gradient(135deg, #fff6f0 0%, #fffdfb 45%, #ffffff 100%)",
          position: "relative",
        }}
      >
        {/* A soft accent glow behind the visual. */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: -120,
            top: -80,
            width: 640,
            height: 640,
            borderRadius: 9999,
            background: "radial-gradient(closest-side, rgba(255,122,46,0.14), rgba(255,255,255,0))",
          }}
        />

        {/* Left: the message */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 690, padding: "64px 0 56px 72px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img> */}
            <img src={moxieImage("plain")} width={44} height={44} alt="" />
            <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em" }}>{SITE.name}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {eyebrow && (
              <div style={{ display: "flex" }}>
                <span
                  style={{
                    display: "flex",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#e2470b",
                    background: "#fff2eb",
                    border: "1px solid #ffc7a8",
                    borderRadius: 999,
                    padding: "6px 16px",
                    marginBottom: 22,
                  }}
                >
                  {eyebrow}
                </span>
              </div>
            )}
            <div style={{ display: "flex", fontSize: titleSize, fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.035em" }}>{title}</div>
            {subtitle && <div style={{ display: "flex", maxWidth: 600, marginTop: 22, fontSize: 28, lineHeight: 1.35, color: MUTED }}>{subtitle}</div>}
          </div>

          <div style={{ display: "flex", fontSize: 22, color: FAINT }}>{SITE.url.replace(/^https?:\/\//, "")}</div>
        </div>

        {/* Right: the CV, with Moxie beside it */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", position: "relative" }}>
          {templateImage ? <TemplateSheet src={templateImage} /> : <CvSheet />}
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
