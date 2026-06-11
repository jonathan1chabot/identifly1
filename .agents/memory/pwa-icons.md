---
name: PWA icon generation with sharp
description: How to generate PNG PWA icons from SVG source in a pnpm monorepo artifact
---

**Pattern:** Write `artifacts/<slug>/generate-icons.mjs`, install `sharp` as a devDep in the artifact package, run it once to produce `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`.

```bash
pnpm add --filter @workspace/<slug> -D sharp
node artifacts/<slug>/generate-icons.mjs
```

**Why:** `vite-plugin-pwa` needs pre-built PNG icons at build time; SVG-only works on modern browsers but PNG ensures maximum device compatibility including iOS.

**How to apply:** Any new PWA artifact that needs cross-platform icon support.
