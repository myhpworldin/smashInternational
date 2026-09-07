import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
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

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          position: "relative",
        }}
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <path
            d="M180,0 L124,56 L146,78 L78,134 L100,158"
            stroke="#E50914"
            strokeWidth="8"
            fill="none"
          />
        </svg>
        <div
          style={{
            display: "flex",
            fontFamily: "Archivo",
            fontSize: 120,
            color: "#FFFFFF",
          }}
        >
          S
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
