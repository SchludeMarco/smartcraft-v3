import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

// Das Änderungsprotokoll liegt im Repo-Wurzelverzeichnis (CHANGELOG.md) und wird beim Bauen
// als Modul `virtual:changelog` in die App eingebunden – ohne das Repo für Vite freizugeben.
const CHANGELOG = fileURLToPath(new URL("../../CHANGELOG.md", import.meta.url));
const VIRTUAL_ID = "virtual:changelog";

function changelogPlugin(): Plugin {
  return {
    name: "smartcraft-changelog",
    resolveId: (id) => (id === VIRTUAL_ID ? `\0${VIRTUAL_ID}` : undefined),
    load(id) {
      if (id !== `\0${VIRTUAL_ID}`) return undefined;
      this.addWatchFile(CHANGELOG);
      return `export default ${JSON.stringify(readFileSync(CHANGELOG, "utf8"))};`;
    },
  };
}

// Im Entwicklungsmodus leitet Vite /api/* an das lokale FastAPI-Backend weiter.
export default defineConfig({
  plugins: [
    changelogPlugin(),
    react(),
    tailwindcss(),
    // Installierbar wie V2: App-Hülle wird gecacht, damit die App auch ohne Empfang startet
    // (Offline-Kurzhilfe, Warteschlange). /api läuft nie über den Service Worker.
    VitePWA({
      registerType: "autoUpdate",
      // Demo liegt hinter der Vercel-Anmeldung: Manifest mit Cookies laden
      useCredentials: true,
      includeAssets: ["favicon.svg", "favicon.ico", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Sm@rtCraft 3.0 – Der Kollege in der Hosentasche",
        short_name: "Sm@rtCraft",
        description:
          "Foto oder Beschreibung vom Problem – KI-Diagnose mit Lösungsweg, Sicherheitshinweisen und Prüfschritten.",
        lang: "de",
        theme_color: "#3f3a8f",
        background_color: "#16133a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
