/**
 * ============================================================================
 * File:        src/components/landmarks/LandmarkList.tsx
 * Purpose:     Ranked list of landmarks. Each row expands to show the
 *              evidence for every hazard — the answer to "why is this place
 *              threatened?".
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */
import { useState } from "react";
import { hazardConfig } from "../../config/layers";
import { stateName } from "../../config/states";
import { SEVERITY_LABELS } from "../../analysis/riskScoring";
import type { RiskAssessment } from "../../types/analysis";
import type { Severity } from "../../types/hazard";
import { HazardChips, RiskBadge } from "./RiskBadge";

export interface LandmarkListProps {
  items: RiskAssessment[];
  /** Called with a landmark id when "Show on map" is pressed. */
  onShowOnMap?: (id: string) => void;
  /** Show the state name in each row (off inside a single-state view). */
  showState?: boolean;
  /** Rows to show before "Show more". */
  pageSize?: number;
  emptyMessage?: string;
}

/**
 * Evidence table for one assessment.
 * @param props.a The assessment.
 */
export function EvidenceTable({ a }: { a: RiskAssessment }) {
  return (
    <table className="evidence">
      <caption className="visually-hidden">Hazard evidence for {a.landmark.name}</caption>
      <thead>
        <tr>
          <th scope="col">Hazard</th>
          <th scope="col">Severity</th>
          <th scope="col">Finding</th>
        </tr>
      </thead>
      <tbody>
        {a.exposures.map((e) => (
          <tr key={e.hazard} className={e.severity === null ? "evidence__row--na" : ""}>
            <th scope="row">
              <span className={`hazard-swatch hazard-swatch--${e.hazard}`} aria-hidden="true" />
              {hazardConfig(e.hazard).label}
            </th>
            <td>
              <span className={`sev sev--${e.severity ?? "na"}`}>{e.severity === null ? "Not assessed" : SEVERITY_LABELS[e.severity as Severity]}</span>
            </td>
            <td>
              <span className="evidence__label">{e.label}</span>
              <span className="evidence__detail">{e.detail}</span>
              {e.source !== "—" && (
                <span className="evidence__source">
                  {e.method === "documented" ? "Documented: " : "GIS: "}
                  {e.sourceUrl ? (
                    <a href={e.sourceUrl} target="_blank" rel="noreferrer">
                      {e.source}
                    </a>
                  ) : (
                    e.source
                  )}
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Renders the expandable ranked list.
 * @param props See LandmarkListProps.
 */
export default function LandmarkList({ items, onShowOnMap, showState = true, pageSize = 25, emptyMessage }: LandmarkListProps) {
  const [limit, setLimit] = useState(pageSize);
  if (items.length === 0) return <p className="empty">{emptyMessage ?? "No landmarks match these filters."}</p>;

  return (
    <>
      <ol className="landmark-list">
        {items.slice(0, limit).map((a, i) => (
          <li key={a.landmark.id} className="landmark-row">
            <details>
              <summary>
                <span className="landmark-row__rank" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="landmark-row__main">
                  <span className="landmark-row__name">{a.landmark.name}</span>
                  <span className="landmark-row__place">
                    {[a.landmark.city, showState ? stateName(a.landmark.state) : null].filter(Boolean).join(", ")}
                    {a.landmark.isNHL ? " · National Historic Landmark" : ""}
                  </span>
                  <HazardChips assessment={a} />
                </span>
                <RiskBadge riskClass={a.riskClass} score={a.score} />
              </summary>
              <div className="landmark-row__body">
                {a.landmark.significance && <p className="landmark-row__sig">{a.landmark.significance}</p>}
                <h4>Why it is threatened</h4>
                <ul className="reasons">
                  {a.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <EvidenceTable a={a} />
                {a.incomplete && (
                  <p className="muted small">
                    Some hazards were not assessed{a.landmark.source === "reference" ? " in the reference sources" : " because a service did not respond"}.
                  </p>
                )}
                {onShowOnMap && (
                  <button type="button" className="btn btn--quiet" onClick={() => onShowOnMap(a.landmark.id)}>
                    Show on map
                  </button>
                )}
              </div>
            </details>
          </li>
        ))}
      </ol>
      {items.length > limit && (
        <button type="button" className="btn btn--quiet show-more" onClick={() => setLimit((l) => l + pageSize)}>
          Show {Math.min(pageSize, items.length - limit)} more of {items.length - limit} remaining
        </button>
      )}
    </>
  );
}
