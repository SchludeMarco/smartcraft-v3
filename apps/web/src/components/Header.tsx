import { FolderOpen, Hammer, History, Zap } from "lucide-react";
import { Link } from "react-router";

/** Glanzstreifen und Akzentlinie der V2-Kopfleiste (reines Deko-Overlay). */
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
        <linearGradient id="headerAccentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#6fb1e8" />
        </linearGradient>
      </defs>
      <rect width="1000" height="100" fill="url(#headerGloss)" style={{ mixBlendMode: "overlay" }} />
      <rect x="0" y="96" width="1000" height="3" fill="url(#headerAccentGrad)" />
    </svg>
  );
}

const ROUND =
  "flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10 bg-white/20 ring-2 ring-white/70 ring-offset-2 ring-offset-transparent transition duration-200 hover:bg-white/30";

/** Kopfleiste wie V2: Logo (Hammer + Blitz), Schriftzug, Untertitel, rechts runder Knopf. */
export function Header({ onHistory }: { onHistory: () => void }) {
  return (
    <header className="header-ornate relative w-full p-4 sm:p-5 print:hidden">
      <HeaderPlate />
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            to="/"
            title="Zur Startseite"
            aria-label="Sm@rtCraft – zur Startseite"
            className="relative block h-9 w-9 shrink-0 rounded-full sm:h-10 sm:w-10 focus:ring-2 focus:ring-white/70 focus:outline-none"
          >
            <Hammer className="absolute inset-0 h-full w-full text-white/90" aria-hidden="true" />
            <Zap
              className="absolute right-0 bottom-0 h-5 w-5 translate-x-1 translate-y-1 fill-lavender text-lavender"
              aria-hidden="true"
            />
          </Link>
          <h1 className="font-display min-w-0 text-lg font-bold tracking-wide whitespace-nowrap text-lavender min-[400px]:text-xl sm:text-2xl">
            Sm@rt<span className="text-white">Craft</span>!
          </h1>
        </div>
        <div className="flex shrink-0 gap-2 sm:gap-3">
          <div className="relative flex flex-col items-center">
            <span className="mb-0.5 text-[9px] tracking-wide text-white/70 uppercase sm:text-[10px]">Verlauf:</span>
            <button
              type="button"
              onClick={onHistory}
              aria-label="Verlauf"
              title="Verlauf"
              className={ROUND}
            >
              <History className="h-5 w-5 text-white" aria-hidden="true" />
            </button>
          </div>
          <div className="relative flex flex-col items-center">
            <span className="mb-0.5 text-[9px] tracking-wide text-white/70 uppercase sm:text-[10px]">Projekte:</span>
            <Link to="/projects" aria-label="Projekte" title="Projekte" className={ROUND}>
              <FolderOpen className="h-5 w-5 text-white" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
      <p className="relative z-10 mt-1 flex items-center gap-2 text-sm text-white/80 italic">
        Der Kollege in der Hosentasche.
        <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold not-italic text-white/90">
          3.0
        </span>
      </p>
    </header>
  );
}
