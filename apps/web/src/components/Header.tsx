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
          <stop offset="0%" stopColor="#c7d2fe" />
          <stop offset="50%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
      </defs>
      <rect width="1000" height="100" fill="url(#headerGloss)" style={{ mixBlendMode: "overlay" }} />
      <rect x="0" y="97" width="1000" height="2" fill="url(#headerSteelGrad)" opacity="0.8" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="header-brand relative w-full rounded-t-2xl p-5 print:hidden">
      <HeaderPlate />
      <div className="relative z-10 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" aria-label="Sm@rtCraft – zur Projektübersicht">
          <span className="relative block h-10 w-10" aria-hidden="true">
            <Hammer className="absolute inset-0 h-full w-full text-white/90" />
            <Zap className="absolute fill-brand-light text-brand-light right-0 bottom-0 h-5 w-5 translate-x-1 translate-y-1" />
          </span>
          <span className="font-display text-2xl font-bold tracking-wide text-brand-light">
            Sm@rt<span className="text-white">Craft</span>!
          </span>
        </Link>
        <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/90 shadow-inner">
          3.0
        </span>
      </div>
      <p className="relative z-10 mt-1 text-sm text-white/75">Der Kollege in der Hosentasche.</p>
    </header>
  );
}
