import type { Confidence, Hazard, Severity } from "../../api/types";

// Reine Anzeigetexte – keine Sicherheitslogik (die liegt ausschließlich im Backend).
export const HAZARD_LABELS: Record<Hazard, string> = {
  electrical: "Elektrische Gefahr",
  gas: "Gas",
  structural: "Tragwerk / Statik",
  working_at_height: "Arbeiten in der Höhe",
  hazardous_material: "Verdacht auf Schadstoffe",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Kritisch",
  warning: "Warnung",
  notice: "Hinweis",
  info: "Info",
};

export const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-red-700 text-white",
  warning: "bg-orange-500 text-white",
  notice: "bg-amber-200 text-amber-950",
  info: "bg-stone-200 text-stone-800",
};

export const MARKER_STYLES: Record<Severity | "none", string> = {
  critical: "border-red-600",
  warning: "border-orange-500",
  notice: "border-amber-400",
  info: "border-sky-500",
  none: "border-sky-500",
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: "sicher erkannt",
  medium: "wahrscheinlich",
  low: "unsicher",
};
