/**
 * Generates PWA icons from the base SVG.
 * Run with: node generate-icons.mjs
 * Requires: pnpm add -D sharp (only needed once)
 */
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const sharp = require("sharp");

const svgSource = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="102" fill="#FF3C00"/>
  <circle cx="256" cy="220" r="88" stroke="white" stroke-width="20" fill="none"/>
  <circle cx="256" cy="220" r="44" fill="white"/>
  <line x1="256" y1="100" x2="256" y2="70" stroke="white" stroke-width="20" stroke-linecap="round"/>
  <line x1="256" y1="370" x2="256" y2="340" stroke="white" stroke-width="20" stroke-linecap="round"/>
  <line x1="136" y1="220" x2="106" y2="220" stroke="white" stroke-width="20" stroke-linecap="round"/>
  <line x1="406" y1="220" x2="376" y2="220" stroke="white" stroke-width="20" stroke-linecap="round"/>
  <rect x="136" y="380" width="240" height="16" rx="8" fill="white" opacity="0.9"/>
  <rect x="176" y="408" width="160" height="12" rx="6" fill="white" opacity="0.6"/>
</svg>`;

const svgMaskable = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#FF3C00"/>
  <circle cx="256" cy="224" r="80" stroke="white" stroke-width="18" fill="none"/>
  <circle cx="256" cy="224" r="40" fill="white"/>
  <line x1="256" y1="120" x2="256" y2="96" stroke="white" stroke-width="18" stroke-linecap="round"/>
  <line x1="256" y1="352" x2="256" y2="328" stroke="white" stroke-width="18" stroke-linecap="round"/>
  <line x1="152" y1="224" x2="128" y2="224" stroke="white" stroke-width="18" stroke-linecap="round"/>
  <line x1="384" y1="224" x2="360" y2="224" stroke="white" stroke-width="18" stroke-linecap="round"/>
  <rect x="160" y="390" width="192" height="14" rx="7" fill="white" opacity="0.9"/>
  <rect x="192" y="416" width="128" height="10" rx="5" fill="white" opacity="0.6"/>
</svg>`;

const outDir = path.join(__dirname, "public", "icons");
mkdirSync(outDir, { recursive: true });

const buf = Buffer.from(svgSource);
const bufMaskable = Buffer.from(svgMaskable);

await sharp(buf).resize(192, 192).png().toFile(path.join(outDir, "icon-192.png"));
await sharp(buf).resize(512, 512).png().toFile(path.join(outDir, "icon-512.png"));
await sharp(bufMaskable).resize(512, 512).png().toFile(path.join(outDir, "icon-maskable-512.png"));
await sharp(buf).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));

console.log("✅ PWA icons generated in public/icons/");
