/**
 * ============================================================================
 * File:        src/components/common/StateSelect.tsx
 * Purpose:     Accessible dropdown for choosing a U.S. state. Optionally
 *              shows how many threatened landmarks each state has.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Heritage at Risk v1.0)
 *   - 2026-10-31  Added countLabel prop for Lost America ("3 lost")
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */
import { useId } from "react";
import { STATES } from "../../config/states";

export interface StateSelectProps {
  value: string;
  onChange: (abbr: string) => void;
  /** Threatened counts by state abbreviation, appended to option labels. */
  counts?: Record<string, number>;
  /** Text for the "no state" option; omit to require a state. */
  allLabel?: string;
  label?: string;
  /** Word after each count, e.g. "threatened" (default) or "lost". */
  countLabel?: string;
}

/**
 * Renders a labeled <select> of all states.
 * @param props See StateSelectProps.
 */
export default function StateSelect({ value, onChange, counts, allLabel, label = "State", countLabel = "threatened" }: StateSelectProps) {
  const id = useId();
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {allLabel === undefined && !value && (
          <option value="" disabled>
            Choose a state…
          </option>
        )}
        {STATES.map((s) => (
          <option key={s.abbr} value={s.abbr}>
            {s.name}
            {counts && counts[s.abbr] ? ` (${counts[s.abbr]} ${countLabel})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
