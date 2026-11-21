import { useQuery } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { api, unwrap } from "../api/client";

/**
 * Dauerhafte Hinweise zum Betriebsmodus:
 * - Mock-KI: Ergebnisse sind Testdaten, Fotos werden nicht ausgewertet.
 * - Flüchtiger Speicher (Vercel-Demo): Projekte und Fotos können jederzeit verschwinden.
 */
export function TestModeBanner() {
  const { data } = useQuery({
    queryKey: ["health"],
    queryFn: async () => unwrap(await api.GET("/health")),
  });
  if (!data) return null;
  const notices: string[] = [];
  if (data.ai_provider === "mock") {
    notices.push("Testmodus: Analysen kommen aus der Mock-KI und werten Fotos nicht aus.");
  }
  if (!data.persistent_storage) {
    notices.push("Demo: Projekte und Fotos werden nicht dauerhaft gespeichert und können jederzeit verschwinden.");
  }
  if (notices.length === 0) return null;
  return (
    <div
      role="status"
      className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 shadow-sm"
    >
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        {notices.map((notice) => (
          <p key={notice}>{notice}</p>
        ))}
      </div>
    </div>
  );
}
