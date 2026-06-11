import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "icons/*.png", "robots.txt", "offline.html", "screenshot-demo.png"],
      manifest: {
        id: "/",
        name: "Identifly - Identify Anything",
        short_name: "Identifly",
        description: "AI-powered object identification — snap a photo and instantly learn what it is for just $1.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
        background_color: "#f5f2ee",
        theme_color: "#1a3d2b",
        orientation: "any",
        dir: "ltr",
        lang: "en",
        categories: ["photo", "reference", "utilities"],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icons/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
        ],
        screenshots: [
          {
            src: "/screenshot-demo.png",
            sizes: "1024x1024",
            type: "image/png",
            label: "Identifly identifying a cat",
          },
        ],
        shortcuts: [
          {
            name: "Identify a photo",
            short_name: "Identify",
            url: "/",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
        prefer_related_applications: false,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Serve offline.html when a navigation request fails (no network)
        navigateFallback: "/offline.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Never cache API calls — always go to network
            urlPattern: /^\/api\//,
            handler: "NetworkOnly",
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
