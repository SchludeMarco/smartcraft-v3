import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// App-Symbol aus public/favicon.svg erzeugen (V3-Farben: Lila-Blau, Lavendel-Blitz).
// Ausführen: npm run icons
export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: "#3f3a8f" } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: "#3f3a8f" } },
  },
  images: ["public/favicon.svg"],
});
