/**
 * ============================================================================
 * File:        src/components/landmarks/RiskBadge.tsx
 * Purpose:     Risk-class badge and hazard chips used in lists and cards.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial components (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE (accessibility):
 * The badge always prints the class name ("Critical") next to its color, so
 * people with color-vision deficiencies, or reading a grayscale printout,
 * get the same information.
 */
import { hazardConfig } from "../../config/layers";
import type { RiskAssessment, RiskClass } from "../../types/analysis";

/**
 * Colored label for a risk class.
 * @param props.riskClass Class to display.
 * @param props.score Optional 0–100 score shown after the class.
 */
export function RiskBadge({ riskClass, score }: { riskClass: RiskClass; score?: number }) {
  return (
    <span className={`risk-badge risk-badge--${riskClass.toLowerCase()}`}>
      <span className="risk-badge__dot" aria-hidden="true" />
      {riskClass}
      {score !== undefined && <span className="risk-badge__score">{Math.round(score)}</span>}
    </span>
  );
}

/**
 * Chips naming each hazard at severity ≥ 2 for an assessment.
 * @param props.assessment The landmark's assessment.
 */
export function HazardChips({ assessment }: { assessment: RiskAssessment }) {
  if (assessment.significantHazards.length === 0) return <span className="muted">No elevated hazard</span>;
  return (
    <ul className="hazard-chips" aria-label="Elevated hazards">
      {assessment.significantHazards.map((h) => {
        const sev = assessment.exposures.find((e) => e.hazard === h)?.severity;
        return (
          <li key={h} className={`hazard-chip hazard-chip--${h}`}>
            <span className="hazard-swatch" aria-hidden="true" />
            {hazardConfig(h).label}
            {sev === 3 ? " · severe" : ""}
          </li>
        );
      })}
    </ul>
  );
}
