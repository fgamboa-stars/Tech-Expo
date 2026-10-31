/**
 * ============================================================================
 * File:        src/pages/StateExplorerPage.tsx
 * Purpose:     Pick a state (dropdown or map click) and see its threatened
 *              landmarks, summary statistics, findings, and the evidence
 *              behind each risk rating. Can run the live GIS analysis for
 *              every National Historic Landmark in the state.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial page (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — state filtering:
 * The selected state lives in the URL (#/explore/LA). That makes every
 * state view shareable and bookmarkable, and the browser Back button works.
 * Filtering itself is one line — filterByState() keeps assessments whose
 * landmark.state matches — because each landmark was already assigned to a
 * state by a point-in-polygon test when it was loaded.
 */
import { useMemo, useState } from "react";
import HeritageMap from "../components/map/HeritageMap";
import type { MapLayerId } from "../components/map/mapLayers";
import StateSelect from "../components/common/StateSelect";
import ProgressBar from "../components/common/ProgressBar";
import DatasetBanner from "../components/common/DatasetBanner";
import LandmarkList from "../components/landmarks/LandmarkList";
import FindingsList from "../components/findings/FindingsList";
import { BarChart, ChartFrame, StatTile } from "../components/charts/Charts";
import { useAnalysis } from "../context/AnalysisContext";
import { HAZARD_LAYERS } from "../config/layers";
import { getState, stateName } from "../config/states";
import { filterByState, rankByVulnerability, summarize } from "../analysis/findings";
import type { LandmarkScope } from "../analysis/landmarkSource";

/**
 * Renders the State Explorer.
 * @param props.stateParam State code from the URL, if any.
 * @param props.navigate Router navigate function.
 */
export default function StateExplorerPage({ stateParam, navigate }: { stateParam?: string; navigate: (to: string) => void }) {
  const { assessments, summary, mode, liveStates, liveRun, runLiveAnalysis, cancelLiveAnalysis } = useAnalysis();
  const state = getState(stateParam)?.abbr ?? "";
  const [scope, setScope] = useState<LandmarkScope>("nhl");
  const [maxLandmarks, setMaxLandmarks] = useState(300);
  const [onlyThreatened, setOnlyThreatened] = useState(false);
  const [focusId, setFocusId] = useState<string>();
  const [visibility, setVisibility] = useState<Partial<Record<MapLayerId, boolean>>>({
    landmarks: true,
    states: true,
    flood: false,
    slr: false,
    wildfire: false,
    coastal: false,
  });

  const counts = useMemo(() => Object.fromEntries(summary.byState.map((s) => [s.state, s.threatened])), [summary]);
  const stateItems = useMemo(() => rankByVulnerability(filterByState(assessments, state)), [assessments, state]);
  const isLive = liveStates.includes(state);
  const stateSummary = useMemo(() => summarize(stateItems, isLive ? "national-gis" : mode), [stateItems, isLive, mode]);
  const listItems = onlyThreatened ? stateItems.filter((a) => a.threatened) : stateItems;
  const running = liveRun?.status === "running";
  const runForThisState = liveRun?.state === state ? liveRun : undefined;

  const go = (abbr: string) => {
    setFocusId(undefined);
    navigate(abbr ? `/explore/${abbr}` : "/explore");
  };

  return (
    <div className="page explorer">
      <header className="page__head">
        <h1>State Explorer</h1>
        <p className="page__lede">Choose a state to see which historic places are threatened, by what, and how badly.</p>
        <div className="explorer__picker">
          <StateSelect value={state} onChange={go} counts={counts} label="State" />
        </div>
      </header>

      {!state && (
        <section className="explorer__overview">
          <DatasetBanner />
          <ChartFrame
            title="Threatened landmarks by state"
            subtitle="Select a bar to open that state."
            table={{ columns: ["State", "Threatened"], rows: summary.byState.map((s) => [stateName(s.state), s.threatened]) }}
          >
            <BarChart
              unit="threatened landmarks"
              ariaLabel="Threatened landmarks by state"
              data={summary.byState
                .filter((s) => s.threatened > 0)
                .map((s) => ({ key: s.state, label: stateName(s.state), value: s.threatened, note: `of ${s.analyzed} analyzed`, href: `#/explore/${s.state}` }))}
            />
          </ChartFrame>
          <p className="muted">Every state can be analyzed live, even ones with no bar yet.</p>
        </section>
      )}

      {state && (
        <>
          <section className="explorer__summary" aria-labelledby="state-title">
            <h2 id="state-title" className="explorer__state-name">
              {stateName(state)}
            </h2>
            <div className="stats-row">
              <StatTile value={stateSummary.analyzed} label="landmarks analyzed" />
              <StatTile value={stateSummary.threatened} label="threatened" tone="accent" />
              <StatTile value={stateSummary.underwater} label="could be underwater" tone="water" />
              <StatTile value={stateSummary.burned} label="could burn" tone="fire" />
              <StatTile value={stateSummary.multiHazard} label="face multiple hazards" />
              <StatTile value={stateSummary.byClass.Critical} label="rated Critical" tone="critical" />
            </div>
            <FindingsList statements={stateSummary.statements} />
          </section>

          <section className="live-panel" aria-labelledby="live-title">
            <h2 id="live-title">{isLive ? "Live GIS results loaded" : "Run the live GIS analysis"}</h2>
            <p>
              {isLive
                ? `These results come from intersecting ${stateName(state)}'s landmarks with the FEMA, NOAA and USDA layers just now. Run again to refresh.`
                : `Load every ${scope === "nhl" ? "National Historic Landmark" : "National Register listing"} in ${stateName(state)} from the National Park Service and test each one against all four hazard layers. Takes about a minute for most states.`}
            </p>
            <div className="live-panel__controls">
              <fieldset className="radio-row">
                <legend>Landmarks to analyze</legend>
                <label>
                  <input type="radio" name="scope" checked={scope === "nhl"} onChange={() => setScope("nhl")} /> National Historic Landmarks
                </label>
                <label>
                  <input type="radio" name="scope" checked={scope === "all"} onChange={() => setScope("all")} /> All National Register listings
                </label>
              </fieldset>
              <label className="field field--inline">
                <span className="field__label">Maximum</span>
                <input
                  type="number"
                  min={10}
                  max={3000}
                  step={10}
                  value={maxLandmarks}
                  onChange={(e) => setMaxLandmarks(Math.max(10, Math.min(3000, Number(e.target.value) || 10)))}
                />
              </label>
              {running ? (
                <button type="button" className="btn" onClick={cancelLiveAnalysis}>
                  Stop analysis
                </button>
              ) : (
                <button type="button" className="btn btn--primary" onClick={() => runLiveAnalysis(state, scope, maxLandmarks)}>
                  {isLive ? "Run again" : `Analyze ${stateName(state)}`}
                </button>
              )}
            </div>
            {runForThisState && runForThisState.status === "running" && (
              <ProgressBar value={runForThisState.progress.completed} total={runForThisState.progress.total} label={runForThisState.progress.message} />
            )}
            {runForThisState?.status === "done" && (
              <p className="notice notice--ok" role="status">
                Analyzed {runForThisState.found! - (runForThisState.skipped ?? 0)} of {runForThisState.found} landmarks found.
                {runForThisState.skipped ? ` ${runForThisState.skipped} were skipped by the maximum; raise it to include them.` : ""}
              </p>
            )}
            {runForThisState?.status === "error" && (
              <p className="notice notice--error" role="alert">
                The analysis stopped: {runForThisState.error}. Check your connection and try again; results so far were not saved.
              </p>
            )}
            {runForThisState?.status === "cancelled" && <p className="notice" role="status">Analysis stopped. Nothing was changed.</p>}
            {liveRun?.status === "running" && liveRun.state !== state && (
              <p className="notice">An analysis of {stateName(liveRun.state)} is still running.</p>
            )}
          </section>

          <section className="explorer__body">
            <div className="explorer__list">
              <div className="list-head">
                <h2>Landmarks, most vulnerable first</h2>
                <label className="toggle toggle--inline">
                  <input type="checkbox" checked={onlyThreatened} onChange={(e) => setOnlyThreatened(e.target.checked)} />
                  <span>Threatened only</span>
                </label>
              </div>
              <LandmarkList
                items={listItems}
                showState={false}
                onShowOnMap={(id) => setFocusId(id)}
                emptyMessage={`No landmarks loaded for ${stateName(state)} yet. Run the live analysis above to test every National Historic Landmark here.`}
              />
            </div>
            <div className="explorer__map">
              <div className="map-toggles" role="group" aria-label="Hazard layers">
                {HAZARD_LAYERS.map((h) => (
                  <label key={h.id} className="chip-toggle">
                    <input
                      type="checkbox"
                      checked={!!visibility[h.id]}
                      onChange={(e) => setVisibility((v) => ({ ...v, [h.id]: e.target.checked }))}
                    />
                    <span className={`hazard-swatch hazard-swatch--${h.id}`} aria-hidden="true" />
                    {h.label}
                  </label>
                ))}
              </div>
              <HeritageMap
                assessments={stateItems}
                layerVisibility={visibility}
                selectedState={state}
                focusLandmarkId={focusId}
                onStateClick={(abbr) => abbr !== state && go(abbr)}
                showSearch={false}
                ariaLabel={`Map of historic landmarks in ${stateName(state)} colored by climate risk`}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
