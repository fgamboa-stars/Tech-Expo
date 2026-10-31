/**
 * ============================================================================
 * File:        src/components/map/LayerPanel.tsx
 * Purpose:     Layer controls for the map: toggle hazard overlays on/off,
 *              filter landmarks by risk class and hazard, and see whether
 *              each data service loaded.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial panel (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * The panel is a plain React form — it owns no ArcGIS objects. It only
 * changes state (visibility, filters) held by the page, and HeritageMap
 * applies that state to the map. Keeping UI and map logic separate makes
 * both easier to test and reuse.
 */
import { HAZARD_LAYERS } from "../../config/layers";
import type { RiskClass } from "../../types/analysis";
import { RISK_CLASSES } from "../../types/analysis";
import type { HazardId } from "../../types/hazard";
import type { LayerStatus } from "./HeritageMap";
import type { MapLayerId } from "./mapLayers";

export interface LayerPanelProps {
  visibility: Partial<Record<MapLayerId, boolean>>;
  onVisibilityChange: (id: MapLayerId, visible: boolean) => void;
  status: Partial<Record<MapLayerId, LayerStatus>>;
  classFilter: RiskClass[];
  onClassFilterChange: (classes: RiskClass[]) => void;
  hazardFilter: HazardId | "";
  onHazardFilterChange: (h: HazardId | "") => void;
  /** Counts per class among the current landmarks, shown beside each checkbox. */
  classCounts: Record<RiskClass, number>;
}

/** Small status note beside a layer name. */
function StatusNote({ status }: { status?: LayerStatus }) {
  if (status === "error") return <span className="layer-status layer-status--error">unavailable</span>;
  if (status === "loading") return <span className="layer-status">loading…</span>;
  return null;
}

/**
 * Renders the layer and filter controls.
 * @param props See LayerPanelProps.
 */
export default function LayerPanel(props: LayerPanelProps) {
  const { visibility, onVisibilityChange, status, classFilter, onClassFilterChange, hazardFilter, onHazardFilterChange, classCounts } = props;

  const toggleClass = (c: RiskClass) =>
    onClassFilterChange(classFilter.includes(c) ? classFilter.filter((x) => x !== c) : RISK_CLASSES.filter((x) => x === c || classFilter.includes(x)));

  return (
    <div className="layer-panel">
      <fieldset className="layer-panel__group">
        <legend>Landmarks</legend>
        <label className="toggle">
          <input type="checkbox" checked={visibility.landmarks !== false} onChange={(e) => onVisibilityChange("landmarks", e.target.checked)} />
          <span>Analyzed landmarks</span>
        </label>
        <div className="class-filter" role="group" aria-label="Show risk classes">
          {[...RISK_CLASSES].reverse().map((c) => (
            <label key={c} className="class-filter__item">
              <input type="checkbox" checked={classFilter.includes(c)} onChange={() => toggleClass(c)} />
              <span className={`risk-dot risk-dot--${c.toLowerCase()}`} aria-hidden="true" />
              <span>{c}</span>
              <span className="class-filter__count">{classCounts[c]}</span>
            </label>
          ))}
        </div>
        <label className="field">
          <span className="field__label">Only landmarks with elevated</span>
          <select value={hazardFilter} onChange={(e) => onHazardFilterChange(e.target.value as HazardId | "")}>
            <option value="">Any hazard</option>
            {HAZARD_LAYERS.map((h) => (
              <option key={h.id} value={h.id}>
                {h.label}
              </option>
            ))}
          </select>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={!!visibility.nrhp} onChange={(e) => onVisibilityChange("nrhp", e.target.checked)} />
          <span>
            All National Register listings <StatusNote status={status.nrhp} />
            <small>Context only; draws when zoomed in.</small>
          </span>
        </label>
      </fieldset>

      <fieldset className="layer-panel__group">
        <legend>Hazard layers</legend>
        {HAZARD_LAYERS.map((h) => (
          <label key={h.id} className="toggle">
            <input type="checkbox" checked={!!visibility[h.id]} onChange={(e) => onVisibilityChange(h.id, e.target.checked)} />
            <span>
              <span className={`hazard-swatch hazard-swatch--${h.id}`} aria-hidden="true" />
              {h.label} <StatusNote status={status[h.id]} />
              <small>{h.description}</small>
              {h.scaleNote && <small className="muted">{h.scaleNote}</small>}
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="layer-panel__group">
        <legend>Boundaries</legend>
        <label className="toggle">
          <input type="checkbox" checked={visibility.states !== false} onChange={(e) => onVisibilityChange("states", e.target.checked)} />
          <span>
            State boundaries <StatusNote status={status.states} />
            <small>Click a state on the map to explore it.</small>
          </span>
        </label>
      </fieldset>
    </div>
  );
}
