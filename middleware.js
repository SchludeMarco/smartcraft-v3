// Gästetür: nur für Gäste von Marcos gemeinsamer Gästeliste (guest-gate.js).
import { guestGate } from "./guest-gate.js";

// Ohne Cookie erreichbar: Symbole und Manifest (Android holt sie ohne Cookie
// beim Installieren als App; sie enthalten keine Daten).
const OPEN = [/^\/(favicon\.(ico|svg)|robots\.txt|manifest\.webmanifest|sw\.js|apple-touch-icon[\w-]*\.png|(pwa|maskable-icon)[\w-]*\.png)$/];

export const config = {
  // Gebaute JS-/CSS-Dateien enthalten keine Daten; die Seiten, die sie laden, werden geprüft.
  matcher: ["/((?!assets/).*)"],
};

export default async function middleware(request) {
  const out = await guestGate(request, OPEN);
  if (out.response) return out.response;
  const headers = new Headers({ "x-middleware-next": "1" });
  if (out.cookie) headers.append("Set-Cookie", out.cookie);
  return new Response(null, { headers });
}
