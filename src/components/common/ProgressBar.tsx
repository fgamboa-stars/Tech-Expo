/**
 * ============================================================================
 * File:        src/components/common/ProgressBar.tsx
 * Purpose:     Accessible progress bar for the live analysis.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */

export interface ProgressBarProps {
  /** Completed units; when total is 0 the bar is indeterminate. */
  value: number;
  total: number;
  label: string;
}

/**
 * Renders a determinate or indeterminate progress bar with a text label.
 * @param props See ProgressBarProps.
 */
export default function ProgressBar({ value, total, label }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((100 * value) / total) : undefined;
  return (
    <div className="progress">
      <div
        className={`progress__track ${pct === undefined ? "progress__track--indeterminate" : ""}`}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="progress__fill" style={{ width: pct === undefined ? "30%" : `${pct}%` }} />
      </div>
      <p className="progress__label" aria-live="polite">
        {label}
        {pct !== undefined ? ` — ${pct}%` : ""}
      </p>
    </div>
  );
}
