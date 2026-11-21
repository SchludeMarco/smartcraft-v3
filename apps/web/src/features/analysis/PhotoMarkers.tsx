import type { Capture, OverlayAnchor } from "../../api/types";
import { MARKER_STYLES } from "./labels";

type Props = {
  capture: Capture;
  imageUrl: string;
  anchors: OverlayAnchor[];
  selected: number | null;
  onSelect: (componentIndex: number | null) => void;
};

/**
 * Foto mit markierten Bauteilen (AR-1). Die Positionen kommen aus der geräteunabhängigen
 * Overlay-Schnittstelle – dieselben Daten nutzt später eine AR-Brille.
 */
export function PhotoMarkers({ capture, imageUrl, anchors, selected, onSelect }: Props) {
  const own = anchors.filter((a) => a.region.capture_index === capture.position);
  return (
    <figure className="relative overflow-hidden rounded-lg bg-stone-200">
      <img src={imageUrl} alt={`Foto ${capture.position + 1}`} className="block h-auto w-full" />
      {own.map((anchor) => {
        const { x, y, width, height } = anchor.region;
        const active = selected === anchor.component_index;
        return (
          <button
            key={anchor.component_index}
            type="button"
            onClick={() => onSelect(active ? null : anchor.component_index)}
            aria-pressed={active}
            aria-label={`Bauteil ${anchor.component_index + 1}: ${anchor.name}`}
            className={`absolute rounded border-2 ${MARKER_STYLES[anchor.highest_severity ?? "none"]} ${
              active ? "bg-white/30 ring-4 ring-white/70" : "bg-transparent"
            }`}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${width * 100}%`,
              height: `${height * 100}%`,
            }}
          >
            <span className="absolute -top-0.5 -left-0.5 rounded-br bg-stone-900 px-1.5 text-xs font-bold text-white">
              {anchor.component_index + 1}
            </span>
          </button>
        );
      })}
    </figure>
  );
}
