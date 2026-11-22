import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import type { AnalysisResult } from "../../api/types";

const FEMALE = ["anna", "petra", "katja", "female", "hedda", "helena", "marlene", "frau", "vicki"];
const MALE = ["stefan", "markus", "male", "yannick", "conrad", "mann", "hans"];
const RISK = { low: "niedrig", medium: "mittel", high: "hoch" } as const;

type Mode = "short" | "full";
type Gender = "female" | "male";

/** Vorlesetext: Sicherheit immer zuerst (auch in der Kurzfassung). */
export function speechText(result: AnalysisResult, mode: Mode): string {
  const parts: string[] = [];
  if (result.source.is_test_data) parts.push("Achtung, Testdaten. Nicht für Entscheidungen verwenden.");
  parts.push(`Risiko ${RISK[result.safety.risk_level]}.`);
  if (result.safety.qualified_person_required) parts.push("Prüfung und Ausführung durch eine Fachkraft erforderlich.");
  if (result.diagnosis) parts.push(`Diagnose: ${result.diagnosis}`);
  const steps = result.solution_steps.filter((s) => !s.startsWith("Achtung:"));
  const chosen = mode === "short" ? steps.slice(0, 3) : steps;
  if (chosen.length) parts.push(`Lösung: ${chosen.map((s, i) => `Schritt ${i + 1}: ${s}`).join(" ")}`);
  if (mode === "full") {
    parts.push(`Befund: ${result.summary}`);
    if (result.safety.notices.length) parts.push(`Sicherheitshinweise: ${result.safety.notices.join(" ")}`);
    if (result.next_checks.length)
      parts.push(`Nächste Prüfschritte: ${result.next_checks.map((c) => c.action).join(". ")}`);
  }
  parts.push("Das ist eine KI-Ersteinschätzung und keine Sicherheitsfreigabe.");
  return parts.join(" ").replace(/[*_#`]/g, "");
}

function pickVoice(gender: Gender): SpeechSynthesisVoice | undefined {
  const german = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("de"));
  const hints = gender === "female" ? FEMALE : MALE;
  return german.find((v) => hints.some((h) => v.name.toLowerCase().includes(h))) ?? german[0];
}

/**
 * Diagnose vorlesen wie V2 (Kurz/Vollständig, Weiblich/Männlich) – mit der kostenlosen
 * Browser-Stimme. Die kostenpflichtige Google-Stimme aus V2 nur nach Zustimmung.
 */
export function ReadAloud({ result }: { result: AnalysisResult }) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<Mode>("short");
  const [gender, setGender] = useState<Gender>("female");

  useEffect(() => {
    if (!supported) return;
    window.speechSynthesis.getVoices(); // Stimmen früh laden (Chrome)
    return () => window.speechSynthesis.cancel();
  }, [supported]);

  if (!supported) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (playing) {
      synth.cancel();
      setPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(speechText(result, mode));
    utterance.lang = "de-DE";
    const voice = pickVoice(gender);
    if (voice) utterance.voice = voice;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    synth.cancel();
    synth.speak(utterance);
    setPlaying(true);
  }

  const seg = (active: boolean) =>
    `px-3 py-2 transition-colors ${active ? "bg-(--accent) text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`;

  return (
    <div className="space-y-2 rounded-lg border-l-4 border-(--accent) bg-gray-50 p-3 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center rounded-lg bg-(--accent) px-3 py-2 text-sm font-bold text-white shadow-md transition duration-300 active:scale-[0.98]"
        >
          {playing ? <VolumeX className="mr-2 h-4 w-4" aria-hidden="true" /> : <Volume2 className="mr-2 h-4 w-4" aria-hidden="true" />}
          {playing ? "Vorlesen stoppen" : "Diagnose vorlesen"}
        </button>
        <div className="flex overflow-hidden rounded-lg border border-gray-300 text-xs font-semibold" role="group" aria-label="Umfang">
          <button type="button" aria-pressed={mode === "short"} onClick={() => setMode("short")} className={seg(mode === "short")}>
            Kurz
          </button>
          <button type="button" aria-pressed={mode === "full"} onClick={() => setMode("full")} className={`border-l border-gray-300 ${seg(mode === "full")}`}>
            Vollständig
          </button>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-gray-300 text-xs font-semibold" role="group" aria-label="Stimme">
          <button type="button" aria-pressed={gender === "female"} onClick={() => setGender("female")} className={seg(gender === "female")}>
            Weiblich
          </button>
          <button type="button" aria-pressed={gender === "male"} onClick={() => setGender("male")} className={`border-l border-gray-300 ${seg(gender === "male")}`}>
            Männlich
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500">Stimme: Browser-Stimme des Geräts (kostenlos, ohne Upload)</p>
    </div>
  );
}
