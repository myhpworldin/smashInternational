import { ImageResponse } from "next/og";
import { site } from "@/shared/config/site";

export const alt = `${site.name} — Launching soon`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Google serves woff to older user agents instead of woff2 — next/og's
// renderer (Satori) only understands ttf/otf/woff, not woff2.
async function loadArchivoBlack() {
  const cssResponse = await fetch(
    "https://fonts.googleapis.com/css2?family=Archivo:wght@900",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
      },
    },
  );
  const css = await cssResponse.text();
  const match = css.match(/\/\* latin \*\/\s*@font-face\s*{[^}]*src: url\(([^)]+)\)/);
  if (!match) throw new Error("Archivo latin font source not found");
  const fontResponse = await fetch(match[1]);
  return fontResponse.arrayBuffer();
}

const archivoBlack = await loadArchivoBlack();

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: "#000000",
          padding: "64px",
          position: "relative",
        }}
      >
        <svg
          width="1200"
          height="630"
          viewBox="0 0 1200 630"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="seam" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E50914" />
              <stop offset="100%" stopColor="#8C060D" />
            </linearGradient>
          </defs>
          <path
            d="M1200,0 L980,120 L1100,200 L800,360 L920,440 L520,580 L640,630"
            stroke="url(#seam)"
            strokeWidth="3"
            fill="none"
          />
        </svg>
        <div
          style={{
            display: "flex",
            fontFamily: "Archivo",
            fontSize: 220,
            color: "#FFFFFF",
            lineHeight: 0.85,
            letterSpacing: "-4px",
          }}
        >
          SMASH
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Archivo",
            fontSize: 28,
            color: "#8A8A8A",
            marginTop: 20,
          }}
        >
          A {site.parent} company
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Archivo",
          data: archivoBlack,
          style: "normal",
          weight: 900,
        },
      ],
    },
  );
}
