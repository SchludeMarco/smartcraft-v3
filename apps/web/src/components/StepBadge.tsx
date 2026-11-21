import type { ReactNode } from "react";

/** Grünes Schritt-/Abschnitts-Label wie in V2 („1. Beruf auswählen“). */
export function StepBadge({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3">
      <span className="badge-pill">{children}</span>
    </h2>
  );
}
