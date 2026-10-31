/**
 * ============================================================================
 * File:        src/components/lost/LostFilters.tsx
 * Purpose:     Filter bar for Lost America: search by name or city, state,
 *              decade lost, cause of loss, and the NPS removed-listings layer.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * This is a "controlled" form: it holds no state of its own. The page owns
 * the LostFilters object and passes it down with an onChange callback, so
 * the map, list, Then vs Now card and counts all read the same filters.
 */
import { useId } from "react";
import { LOSS_CAUSE_CONFIG } from "../../config/lostCauses";
import { decadeLabel } from "../../analysis/lostAnalysis";
import StateSelect from "../common/StateSelect";
import type { LossCause, LostFilters as Filters } from "../../types/lost";
import { LOSS_CAUSES } from "../../types/lost";

export interface LostFiltersProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  decades: number[];
  /** Number of places per state, shown in the state dropdown. */
  stateCounts: Record<string, number>;
  /** Number of places per cause (before the cause filter), shown on chips. */
  causeCounts: Partial<Record<LossCause, number>>;
  showRemoved: boolean;
  onShowRemovedChange: (v: boolean) => void;
  /** Whether the NPS removed-listings layer failed to load. */
  removedUnavailable?: boolean;
  resultCount: number;
}

/**
 * Renders the Lost America filters.
 * @param props See LostFiltersProps.
 */
export default function LostFilters(props: LostFiltersProps) {
  const { filters, onChange, decades, stateCounts, causeCounts, showRemoved, onShowRemovedChange, removedUnavailable, resultCount } = props;
  const searchId = useId();
  const decadeId = useId();
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const toggleCause = (c: LossCause) =>
    set({ causes: filters.causes.includes(c) ? filters.causes.filter((x) => x !== c) : LOSS_CAUSES.filter((x) => x === c || filters.causes.includes(x)) });
  const isDefault = !filters.state && filters.decade === null && !filters.query && filters.causes.length === LOSS_CAUSES.length;

  return (
    <div className="lost-filters" role="search" aria-label="Filter lost places">
      <div className="lost-filters__row">
        <div className="field">
          <label className="field__label" htmlFor={searchId}>
            Search by name or city
          </label>
          <input
            id={searchId}
            type="search"
            className="text-input"
            value={filters.query}
            placeholder="e.g. Penn Station, Detroit"
            onChange={(e) => set({ query: e.target.value })}
          />
        </div>
        <StateSelect value={filters.state} onChange={(state) => set({ state })} counts={stateCounts} allLabel="All states" label="State" countLabel="lost" />
        <div className="field">
          <label className="field__label" htmlFor={decadeId}>
            Decade lost
          </label>
          <select id={decadeId} value={filters.decade ?? ""} onChange={(e) => set({ decade: e.target.value ? Number(e.target.value) : null })}>
            <option value="">All decades</option>
            {decades.map((d) => (
              <option key={d} value={d}>
                {decadeLabel(d)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="lost-filters__row lost-filters__row--chips">
        <fieldset className="cause-chips">
          <legend className="field__label">Cause of loss</legend>
          {LOSS_CAUSE_CONFIG.filter((c) => (causeCounts[c.id] ?? 0) > 0).map((c) => (
            <label key={c.id} className="chip-toggle">
              <input type="checkbox" checked={filters.causes.includes(c.id)} onChange={() => toggleCause(c.id)} />
              <span className={`loss-swatch loss-swatch--${c.id}`} aria-hidden="true" />
              {c.label}
              <span className="chip-toggle__count">{causeCounts[c.id]}</span>
            </label>
          ))}
        </fieldset>
        <label className="toggle toggle--inline lost-filters__removed">
          <input type="checkbox" checked={showRemoved} onChange={(e) => onShowRemovedChange(e.target.checked)} />
          <span>
            Show every listing removed from the National Register (NPS)
            {removedUnavailable && <span className="layer-status layer-status--error"> unavailable</span>}
          </span>
        </label>
      </div>

      <p className="lost-filters__count" aria-live="polite">
        Showing <strong>{resultCount}</strong> {resultCount === 1 ? "place" : "places"}
        {!isDefault && (
          <>
            {" · "}
            <button type="button" className="link-button" onClick={() => onChange({ state: "", decade: null, causes: [...LOSS_CAUSES], query: "" })}>
              Clear filters
            </button>
          </>
        )}
      </p>
    </div>
  );
}
