import type { Trade } from "../api/types";
import { TRADE_THEMES } from "../lib/trades";

const SHORT: Record<Trade, string> = {
  klempner: "Klempner",
  elektriker: "Elektriker",
  maler: "Maler",
  tischler: "Tischler/Schreiner",
  zimmerer: "Zimmerer",
  mechaniker: "Mechaniker",
  maurer: "Maurer",
  dachdecker: "Dachdecker",
  gaertner: "Gärtner",
  allround: "Allround",
};

/** Kleines Gewerk-Etikett in der Farbe des Berufs (wie die Verlaufs-Badges in V2). */
export function TradeChip({ trade }: { trade: Trade }) {
  const theme = TRADE_THEMES[trade];
  const Icon = theme.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: theme.accent }}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {SHORT[trade]}
    </span>
  );
}
