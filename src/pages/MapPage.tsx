/**
 * ============================================================================
 * File:        src/pages/MapPage.tsx
 * Purpose:     Full-screen national map with layer controls, filters and a
 *              details card for the clicked state or landmark.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial page (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */
import { useCallback, useMemo, useState } from "react";
import HeritageMap, { type LayerStatus } from "../components/map/HeritageMap";
import LayerPanel from "../components/map/LayerPanel";
import type { MapLayerId } from "../components/map/mapLayers";
import StateSelect from "../components/common/StateSelect";
import DatasetBanner from "../components/common/DatasetBanner";
import { HazardChips, RiskBadge } from "../components/landmarks/RiskBadge";
import { useAnalysis } from "../context/AnalysisContext";
import { HAZARD_LAYERS } from "../config/layers";
import { stateName } from "../config/states";
import { filterByState, summarize } from "../analysis/findings";
import type { RiskClass } from "../types/analysis";
import { RISK_CLASSES } from "../types/analysis";
import type { HazardId } from "../types/hazard";

/** Initial layer visibility, taken from the hazard configuration. */
function defaultVisibility(): Partial<Record<MapLayerId, boolean>> {
  const v: Partial<Record<MapLayerId, boolean>> = { landmarks: true, states: true, nrhp: false };
  for (const h of HAZARD_LAYERS) v[h.id] = h.defaultVisible;
  return v;
}

/** Renders the interactive map page. */
export default function MapPage() {
  const { assessments } = useAnalysis();
  const [visibility, setVisibility] = useState(defaultVisibility);
  const [status, setStatus] = useState<Partial<Record<MapLayerId, LayerStatus>>>({});
  const [classFilter, setClassFilter] = useState<RiskClass[]>(RISK_CLASSES);
  const [hazardFilter, setHazardFilter] = useState<HazardId | "">("");
  const [state, setState] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [panelOpen, setPanelOpen] = useState(true);

  const classCounts = useMemo(() => {
    const c = Object.fromEntries(RISK_CLASSES.map((k) => [k, 0])) as Record<RiskClass, number>;
    for (const a of assessments) c[a.riskClass]++;
    return c;
  }, [assessments]);

  const stateSummary = useMemo(() => (state ? summarize(filterByState(assessments, state)) : null), [assessments, state]);
  const selected = assessments.find((a) => a.landmark.id === selectedId);

  const onLayerStatus = useCallback((id: MapLayerId, s: LayerStatus) => setStatus((prev) => (prev[id] === s ? prev : { ...prev, [id]: s })), []);
  const onStateClick = useCallback((abbr: string) => {
    setState(abbr);
    setSelectedId(undefined);
  }, []);

  return (
    <div className={`map-page ${panelOpen ? "" : "map-page--collapsed"}`}>
      <aside className="map-page__panel" aria-label="Map controls">
        <div className="map-page__panel-head">
          <h1>Interactive map</h1>
          <button type="button" className="btn btn--quiet btn--small" aria-expanded={panelOpen} onClick={() => setPanelOpen((o) => !o)}>
            {panelOpen ? "Hide controls" : "Show controls"}
          </button>
        </div>
        <div className="map-page__panel-body">
          <p className="muted">
            Points are historic landmarks colored by risk class. Turn on hazard layers to see why. Click a landmark for its
            evidence, or a state to zoom in.
          </p>
          <StateSelect value={state} onChange={onStateClick} allLabel="All states" label="Zoom to state" />

          {stateSummary && (
            <div className="info-card">
              <h2>{stateName(state)}</h2>
              <p>
                <strong>{stateSummary.threatened}</strong> of {stateSummary.analyzed} landmarks shown are threatened
                {stateSummary.analyzed === 0 ? " — none analyzed yet" : ""}.
              </p>
              <a className="btn btn--primary btn--small" href={`#/explore/${state}`}>
                Explore {stateName(state)}
              </a>
            </div>
          )}

          {selected && (
            <div className="info-card">
              <h2>{selected.landmark.name}</h2>
              <RiskBadge riskClass={selected.riskClass} score={selected.score} />
              <HazardChips assessment={selected} />
              <p className="small">{selected.reasons[0]}</p>
            </div>
          )}

          <LayerPanel
            visibility={visibility}
            onVisibilityChange={(id, v) => setVisibility((prev) => ({ ...prev, [id]: v }))}
            status={status}
            classFilter={classFilter}
            onClassFilterChange={setClassFilter}
            hazardFilter={hazardFilter}
            onHazardFilterChange={setHazardFilter}
            classCounts={classCounts}
          />
          <DatasetBanner />
        </div>
      </aside>
      <HeritageMap
        className="map-page__map"
        assessments={assessments}
        layerVisibility={visibility}
        classFilter={classFilter}
        hazardFilter={hazardFilter}
        selectedState={state}
        onStateClick={onStateClick}
        onLandmarkClick={setSelectedId}
        onLayerStatus={onLayerStatus}
        ariaLabel="Map of U.S. historic landmarks colored by climate risk class, with optional flood, sea-level-rise, wildfire and coastal-risk layers"
      />
    </div>
  );
}
