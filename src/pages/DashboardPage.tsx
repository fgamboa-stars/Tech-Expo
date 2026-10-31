/**
 * ============================================================================
 * File:        src/pages/DashboardPage.tsx
 * Purpose:     Findings Dashboard: headline numbers, auto-generated findings,
 *              charts by state / hazard / risk class, and the ten most
 *              vulnerable landmarks.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial page (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — dashboard generation:
 * The page does no math of its own. It reads `summary` (built by
 * analysis/findings.ts → summarize()) and maps each field to a visual:
 *   summary.threatened, .underwater, .burned  → stat tiles
 *   summary.byState                           → bar chart (top 12)
 *   summary.byHazard                          → bar chart (fixed hazard colors)
 *   summary.byClass                           → segmented bar
 *   summary.top10                             → ranked list
 * To add a metric: compute it in summarize(), then render it here
 * (see DEVELOPER_GUIDE.md §11).
 */
import { useMemo, useState } from "react";
import { BarChart, ChartFrame, SegmentedBar, StatTile } from "../components/charts/Charts";
import FindingsList from "../components/findings/FindingsList";
import LandmarkList from "../components/landmarks/LandmarkList";
import DatasetBanner from "../components/common/DatasetBanner";
import StateSelect from "../components/common/StateSelect";
import { useAnalysis } from "../context/AnalysisContext";
import { HAZARD_LAYERS } from "../config/layers";
import { stateName } from "../config/states";
import { filterByState, summarize } from "../analysis/findings";
import { RISK_CLASSES } from "../types/analysis";

/** Renders the Findings Dashboard. */
export default function DashboardPage() {
  const { assessments, mode, liveStates } = useAnalysis();
  const [state, setState] = useState("");
  const scoped = useMemo(() => filterByState(assessments, state), [assessments, state]);
  const s = useMemo(() => summarize(scoped, state && liveStates.includes(state) ? "national-gis" : mode), [scoped, state, liveStates, mode]);
  const scopeLabel = state ? stateName(state) : "all states";

  const topStates = s.byState.filter((r) => r.threatened > 0).slice(0, 12);

  return (
    <div className="page dashboard">
      <header className="page__head">
        <h1>Findings</h1>
        <p className="page__lede">What the analysis says about historic places and climate hazards to 2050, for {scopeLabel}.</p>
        <div className="dashboard__filters">
          <StateSelect value={state} onChange={setState} allLabel="All states" label="Show" />
        </div>
        <DatasetBanner />
      </header>

      <section className="stats-row stats-row--hero" aria-label="Headline numbers">
        <StatTile value={s.analyzed} label="landmarks analyzed" />
        <StatTile value={s.threatened} label="threatened (Moderate or worse)" tone="accent" />
        <StatTile value={s.underwater} label="could be underwater" note="flood, sea-level or coastal hazard ≥ elevated" tone="water" />
        <StatTile value={s.burned} label="could burn" note="high or very high wildfire hazard" tone="fire" />
        <StatTile value={s.multiHazard} label="exposed to multiple hazards" note={`${s.waterAndFire} face both water and fire`} />
        <StatTile value={s.byClass.Critical} label="rated Critical" tone="critical" />
      </section>

      <section className="dashboard__findings" aria-labelledby="findings-title">
        <h2 id="findings-title">Key findings</h2>
        <FindingsList statements={s.statements} />
      </section>

      <section className="chart-grid">
        <ChartFrame
          title="Threatened landmarks by state"
          subtitle={state ? "Selected state" : "Top 12 states"}
          table={{ columns: ["State", "Threatened"], rows: s.byState.map((r) => [stateName(r.state), r.threatened]) }}
        >
          <BarChart
            unit="threatened landmarks"
            ariaLabel="Threatened landmarks by state"
            data={topStates.map((r) => ({ key: r.state, label: stateName(r.state), value: r.threatened, note: `of ${r.analyzed} analyzed`, href: `#/explore/${r.state}` }))}
          />
        </ChartFrame>

        <ChartFrame
          title="Threatened landmarks by hazard type"
          subtitle="Landmarks with an elevated or severe rating for each hazard; one landmark can count under several."
          table={{ columns: ["Hazard", "Landmarks"], rows: HAZARD_LAYERS.map((h) => [h.label, s.byHazard[h.id]]) }}
        >
          <BarChart
            unit="landmarks"
            ariaLabel="Landmarks with elevated exposure by hazard type"
            data={HAZARD_LAYERS.map((h) => ({ key: h.id, label: h.label, value: s.byHazard[h.id], color: `var(--hz-${h.id})` }))}
          />
        </ChartFrame>

        <ChartFrame
          title="Risk classes"
          subtitle="Share of analyzed landmarks in each class"
          table={{ columns: ["Risk class", "Landmarks"], rows: RISK_CLASSES.map((c) => [c, s.byClass[c]]) }}
        >
          <SegmentedBar
            ariaLabel={RISK_CLASSES.map((c) => `${c}: ${s.byClass[c]}`).join(", ")}
            segments={RISK_CLASSES.map((c) => ({ key: c, label: c, value: s.byClass[c], color: `var(--risk-${c.toLowerCase()})` }))}
          />
          <p className="chart__note">
            Classes combine a weighted 0–100 score with the worst single hazard; see <a href="#/data">the scoring method</a>.
          </p>
        </ChartFrame>
      </section>

      <section className="dashboard__top" aria-labelledby="top-title">
        <h2 id="top-title">Top 10 most vulnerable landmarks</h2>
        <p className="muted">Ranked by risk score. Open a row to see the evidence for each hazard.</p>
        <LandmarkList items={s.top10} pageSize={10} />
      </section>
    </div>
  );
}
