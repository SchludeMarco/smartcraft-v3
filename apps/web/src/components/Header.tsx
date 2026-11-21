import { Hammer, Zap } from "lucide-react";
import { Link } from "react-router";

/** Glanzstreifen und Stahlblau-Akzentlinie der V2-Kopfleiste (reines Deko-Overlay). */
function HeaderPlate() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1000 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="headerGloss" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="47%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="51%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="headerSteelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6fb1e8" />
          <stop offset="100%" stopColor="#3d7fb8" />
        </linearGradient>
      </defs>
      <rect width="1000" height="100" fill="url(#headerGloss)" style={{ mixBlendMode: "overlay" }} />
      <rect x="0" y="96" width="1000" height="3" fill="url(#headerSteelGrad)" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="header-ornate relative w-full rounded-t-2xl p-5 print:hidden">
      <HeaderPlate />
      <div className="relative z-10 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" aria-label="Sm@rtCraft – zur Projektübersicht">
          <span className="relative block h-10 w-10" aria-hidden="true">
            <Hammer className="absolute inset-0 h-full w-full text-white/90" />
            <Zap className="fill-steel-light text-steel-light absolute right-0 bottom-0 h-5 w-5 translate-x-1 translate-y-1" />
          </span>
          <span className="font-display text-2xl font-bold tracking-wide text-steel-light">
            Sm@rt<span className="text-white">Craft</span>!
          </span>
        </Link>
        <span className="rounded-full border border-steel-light/60 px-2 py-0.5 text-xs font-semibold text-steel-light">
          3.0
        </span>
      </div>
      <p className="relative z-10 mt-1 text-sm text-white/80 italic">Der Kollege in der Hosentasche.</p>
    </header>
  );
}
