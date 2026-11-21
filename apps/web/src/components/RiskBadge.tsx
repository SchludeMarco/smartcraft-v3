import type { RiskLevel } from "../api/types";

const STYLES: Record<RiskLevel, { label: string; className: string }> = {
  high: { label: "Risiko hoch", className: "bg-red-700 text-white" },
  medium: { label: "Risiko mittel", className: "bg-amber-500 text-amber-950" },
  low: { label: "Risiko niedrig", className: "bg-stone-300 text-stone-900" },
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const style = STYLES[level];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}
