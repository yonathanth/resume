import { ImageResponse } from "next/og";
import { MOXIE_SVG } from "@/lib/og/moxie-art.generated";

// The home-screen icon on iPhones and iPads (and the manifest's PNG icon): Moxie on white.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const moxie = `data:image/svg+xml;base64,${Buffer.from(MOXIE_SVG).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#fff6f0" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img> */}
        <img src={moxie} width={150} height={150} alt="" />
      </div>
    ),
    size
  );
}
