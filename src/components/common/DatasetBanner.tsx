/**
 * ============================================================================
 * File:        src/components/common/DatasetBanner.tsx
 * Purpose:     Tells the viewer which evidence they are looking at
 *              (curated reference set, national GIS analysis, or live state
 *              runs). Shown on every data page so numbers are never mistaken
 *              for something they are not.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */
import { useAnalysis } from "../../context/AnalysisContext";
import { stateName } from "../../config/states";

/** Renders the dataset notice. */
export default function DatasetBanner() {
  const { mode, nationalMeta, liveStates, summary } = useAnalysis();
  const live = liveStates.length > 0 ? ` Plus live GIS results for ${liveStates.map(stateName).join(", ")}.` : "";

  if (mode === "national-gis") {
    return (
      <p className="dataset-banner dataset-banner--gis" role="note">
        <strong>GIS analysis.</strong> {summary.analyzed.toLocaleString("en-US")} landmarks intersected with FEMA, NOAA and USDA
        hazard layers ({nationalMeta?.scope}, generated {nationalMeta ? new Date(nationalMeta.generatedAt).toLocaleDateString() : "—"}).
        {live}
      </p>
    );
  }
  return (
    <p className="dataset-banner" role="note">
      <strong>Reference set.</strong> {summary.analyzed} historic places with climate threats documented by published assessments
      and recent disasters. Pick a state in the <a href="#/explore">State Explorer</a> to run the live GIS analysis on every
      National Historic Landmark there.{live}
    </p>
  );
}
