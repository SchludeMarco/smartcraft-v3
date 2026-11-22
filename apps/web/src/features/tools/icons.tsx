import {
  Bug,
  Calculator,
  CloudRain,
  Droplets,
  Euro,
  FileText,
  HardHat,
  Layers,
  Package,
  Palette,
  Puzzle,
  Ruler,
  Scissors,
  Search,
  Shield,
  Sparkles,
  TreePine,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Icons wie in V2 (reine Gestaltung). */
const ICONS: Record<string, LucideIcon> = {
  materialliste: Package,
  "sicherheits-check": Shield,
  kostenschaetzung: Euro,
  kundenbericht: FileText,
  "klempner-trinkwv": Droplets,
  "klempner-normteile": Search,
  "elektriker-vde": Zap,
  "elektriker-querschnitt": Calculator,
  "maler-mengenrechner": Calculator,
  "maler-trocknung": CloudRain,
  "tischler-verbindung": Puzzle,
  "tischler-oberflaeche": Palette,
  "gaertner-bestimmung": Bug,
  "gaertner-pflegekalender": Scissors,
  "zimmerer-holzart": TreePine,
  "zimmerer-holzmenge": Ruler,
  "mechaniker-fehlercode": Search,
  "mechaniker-ersatzteil": Wrench,
  "maurer-mengenrechner": Calculator,
  "maurer-statik": Layers,
  "dachdecker-material": HardHat,
  "dachdecker-wetterfenster": CloudRain,
};

/** Icon eines Werkzeugs (statisch nachgeschlagen, kein Komponentenbau beim Rendern). */
export function ToolIcon({ toolId, className, color }: { toolId: string; className?: string; color?: string }) {
  const Icon = ICONS[toolId] ?? Sparkles;
  return <Icon className={className} style={color ? { color } : undefined} aria-hidden="true" />;
}

/** Feste Farben der allgemeinen Werkzeuge wie V2 (Indigo, Teal, Emerald, Blau). */
export const GENERIC_TOOL_COLORS: Record<string, string> = {
  materialliste: "#4f46e5",
  "sicherheits-check": "#0d9488",
  kostenschaetzung: "#059669",
  kundenbericht: "#2563eb",
};
