import { useQuery } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { api, unwrap } from "../api/client";

function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => unwrap(await api.GET("/health")),
  });
}

/**
 * Auffälliger Hinweis nur für die Mock-KI: Ergebnisse sind Testdaten und dürfen nie
 * mit einer echten Analyse verwechselt werden (Sicherheitsregel, nicht abschaltbar).
 */
export function TestModeBanner() {
  const { data } = useHealth();
  if (!data) return null;
  const notices: string[] = [];
  if (data.ai_provider === "mock") {
    notices.push("Testmodus: Analysen kommen aus der Mock-KI und werten Fotos nicht aus.");
  }
  if (notices.length === 0) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-3 text-sm font-medium text-amber-800 shadow-md"
    >
      <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
      <div className="space-y-1">
        {notices.map((notice) => (
          <p key={notice}>{notice}</p>
        ))}
      </div>
    </div>
  );
}

/**
 * Dezenter Hinweis in der Fußzeile bei flüchtigem Speicher (Vercel-Demo):
 * Projekte und Fotos können verschwinden. Bewusst kein Banner mehr (Wunsch Marco).
 */
export function StorageHint() {
  const { data } = useHealth();
  if (!data || data.persistent_storage) return null;
  return <p>Demo-Speicher: Projekte und Fotos werden nicht dauerhaft gespeichert.</p>;
}
