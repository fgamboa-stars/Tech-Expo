/**
 * ============================================================================
 * File:        src/components/lost/LostDashboardSection.tsx
 * Purpose:     Lost America metrics for the Findings dashboard: totals,
 *              oldest and most recent losses, and charts by state, decade
 *              and cause — built with the existing chart components.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — dashboard additions:
 * Like the rest of the dashboard, this section does no math itself: it calls
 * summarizeLost() and maps each field to a StatTile or a ChartFrame +
 * BarChart, so Lost America charts share the same look, hover tooltips and
 * accessible table view as the climate-risk charts.
 */
import { useMemo } from "react";
import { BarChart, ChartFrame, StatTile } from "../charts/Charts";
import FindingsList from "../findings/FindingsList";
import { LOST_PLACES } from "../../data/lostPlaces";
import { ALL_LOST_FILTERS, decadeLabel, filterLostPlaces, summarizeLost } from "../../analysis/lostAnalysis";
import { lossCause } from "../../config/lostCauses";
import { stateName } from "../../config/states";
import { useRemovedCount } from "../../hooks/useLostData";

/**
 * Renders the Lost America dashboard section.
 * @param props.state Two-letter state filter from the dashboard ("" = all).
 */
export default function LostDashboardSection({ state }: { state: string }) {
  const places = useMemo(() => filterLostPlaces(LOST_PLACES, { ...ALL_LOST_FILTERS, state }), [state]);
  const s = useMemo(() => summarizeLost(places), [places]);
  const removed = useRemovedCount();

  return (
    <section className="dashboard__lost" aria-labelledby="lost-dash-title">
      <h2 id="lost-dash-title">Lost America</h2>
      <p className="muted">
        Places already gone, from the curated Lost America set{state ? ` (${stateName(state)})` : ""}.{" "}
        <a href="#/lost">Open Lost America</a>
      </p>

      <div className="stats-row" aria-label="Lost America headline numbers">
        <StatTile value={s.total} label="historic places lost" note="curated, documented set" tone="accent" />
        {!state && (
          <StatTile
            value={removed === null ? "…" : removed === "unavailable" ? "—" : removed}
            label="removed from the National Register"
            note={removed === "unavailable" ? "NPS service unavailable" : "all reasons, NPS (live)"}
          />
        )}
        <StatTile
          value={s.oldest ? (s.oldest.builtLabel ?? String(s.oldest.yearBuilt)) : "—"}
          label="oldest lost landmark"
          note={s.oldest?.name}
        />
        <StatTile value={s.mostRecent?.yearLost != null ? String(s.mostRecent.yearLost) : "—"} label="most recently lost" note={s.mostRecent?.name} />
        <StatTile value={s.medianYearsStood ?? "—"} label="median years standing" note="before being lost" />
      </div>

      {s.total > 0 && <FindingsList statements={s.statements} />}

      {s.total > 0 && (
        <div className="chart-grid">
          <ChartFrame
            title="Lost sites by state"
            table={{ columns: ["State", "Lost places"], rows: s.byState.map((r) => [stateName(r.state), r.count]) }}
          >
            <BarChart
              unit="lost places"
              ariaLabel="Lost places by state"
              data={s.byState.map((r) => ({ key: r.state, label: stateName(r.state), value: r.count, color: "var(--loss-demolished)" }))}
            />
          </ChartFrame>
          <ChartFrame
            title="Lost sites by decade"
            subtitle="Decade each place was lost, oldest first"
            table={{ columns: ["Decade", "Lost places"], rows: s.byDecade.map((r) => [decadeLabel(r.decade), r.count]) }}
          >
            <BarChart
              unit="lost places"
              ariaLabel="Lost places by decade"
              data={s.byDecade.map((r) => ({ key: String(r.decade), label: decadeLabel(r.decade), value: r.count, color: "var(--loss-demolished)" }))}
            />
          </ChartFrame>
          <ChartFrame
            title="Most common causes of loss"
            table={{ columns: ["Cause", "Lost places"], rows: s.byCause.map((r) => [lossCause(r.cause).label, r.count]) }}
          >
            <BarChart
              unit="lost places"
              ariaLabel="Lost places by cause of loss"
              data={s.byCause.map((r) => ({ key: r.cause, label: lossCause(r.cause).label, value: r.count, color: `var(--loss-${r.cause})` }))}
            />
          </ChartFrame>
        </div>
      )}
    </section>
  );
}
