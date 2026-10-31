/**
 * ============================================================================
 * File:        src/components/lost/LostPlaceList.tsx
 * Purpose:     Selectable list of the filtered lost places, beside the map.
 *              Gives keyboard and screen-reader users the same access as
 *              clicking dots on the map.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */
import { lossCause } from "../../config/lostCauses";
import { stateName } from "../../config/states";
import type { LostPlace } from "../../types/lost";

export interface LostPlaceListProps {
  places: LostPlace[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

/** Formats the life span of a place, e.g. "1910–1963" (or "lost 1957" when the build date is not a year). */
export function lifespan(p: LostPlace): string {
  if (p.yearBuilt === null) return p.yearLost !== null ? `lost ${p.yearLost}` : "date unknown";
  const built = p.builtLabel?.startsWith("c.") ? p.builtLabel : String(p.yearBuilt);
  return `${built}–${p.yearLost ?? "?"}`;
}

/**
 * Renders the list, most recently lost first.
 * @param props See LostPlaceListProps.
 */
export default function LostPlaceList({ places, selectedId, onSelect }: LostPlaceListProps) {
  if (places.length === 0) return <p className="empty">No lost places match these filters. Clear a filter to see more.</p>;
  const sorted = [...places].sort((a, b) => (b.yearLost ?? 0) - (a.yearLost ?? 0) || a.name.localeCompare(b.name));
  return (
    <ul className="lost-list">
      {sorted.map((p) => (
        <li key={p.id}>
          <button type="button" className="lost-list__item" aria-pressed={p.id === selectedId} onClick={() => onSelect(p.id)}>
            <span className="lost-list__name">{p.name}</span>
            <span className="lost-list__meta">
              {p.city}, {stateName(p.state)}
            </span>
            <span className="lost-list__meta">
              <span className={`loss-swatch loss-swatch--${p.cause}`} aria-hidden="true" />
              {lossCause(p.cause).label}, {lifespan(p)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
