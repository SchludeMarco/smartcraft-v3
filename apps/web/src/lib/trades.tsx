import {
  BrickWall,
  Flower,
  Hammer,
  Home,
  Paintbrush,
  Pipette,
  Ruler,
  Settings,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { Trade } from "../api/types";

/** Darstellung je Gewerk – Icons und Farben wie in Sm@rtCraft V2 (reine Gestaltung). */
export type TradeTheme = { accent: string; accentDark: string; accentSoft: string; icon: LucideIcon };

export const TRADE_THEMES: Record<Trade, TradeTheme> = {
  klempner: { accent: "#1E7A8C", accentDark: "#175F6E", accentSoft: "#DCEEF1", icon: Pipette },
  elektriker: { accent: "#96690A", accentDark: "#7A5408", accentSoft: "#EFE4C8", icon: Zap },
  maler: { accent: "#7D4F92", accentDark: "#643E76", accentSoft: "#EDE2F1", icon: Paintbrush },
  tischler: { accent: "#6B4F3B", accentDark: "#563F2F", accentSoft: "#EFE8E1", icon: Ruler },
  zimmerer: { accent: "#A15C32", accentDark: "#804A28", accentSoft: "#F0E0D2", icon: Hammer },
  mechaniker: { accent: "#5C5C5C", accentDark: "#454545", accentSoft: "#E6E6E6", icon: Wrench },
  maurer: { accent: "#A3432F", accentDark: "#813526", accentSoft: "#F0DBD5", icon: BrickWall },
  dachdecker: { accent: "#2E4A5E", accentDark: "#253A4A", accentSoft: "#DCE4EA", icon: Home },
  gaertner: { accent: "#3F7D45", accentDark: "#326336", accentSoft: "#E0EDE1", icon: Flower },
  allround: { accent: "#6B6355", accentDark: "#554F45", accentSoft: "#EAE7E0", icon: Settings },
};

export const DEFAULT_TRADE: Trade = "allround";

/** CSS-Variablen für die Akzentfarbe eines Gewerks (wie V2: --accent, --accent-dark, --accent-soft). */
export function tradeStyle(trade: Trade | null | undefined): CSSProperties {
  const theme = TRADE_THEMES[trade ?? DEFAULT_TRADE];
  return {
    "--accent": theme.accent,
    "--accent-dark": theme.accentDark,
    "--accent-soft": theme.accentSoft,
  } as CSSProperties;
}
