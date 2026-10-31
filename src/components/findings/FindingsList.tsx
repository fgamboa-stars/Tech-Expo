/**
 * ============================================================================
 * File:        src/components/findings/FindingsList.tsx
 * Purpose:     Renders the auto-generated, plain-language findings.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */

/**
 * Ordered list of findings statements.
 * @param props.statements Sentences from analysis/findings.ts.
 * @param props.limit Optional maximum number to show.
 */
export default function FindingsList({ statements, limit }: { statements: string[]; limit?: number }) {
  return (
    <ul className="findings">
      {statements.slice(0, limit ?? statements.length).map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ul>
  );
}
