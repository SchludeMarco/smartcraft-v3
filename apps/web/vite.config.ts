import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// Im Entwicklungsmodus leitet Vite /api/* an das lokale FastAPI-Backend weiter.
export default defineConfig({
  plugins: [
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
