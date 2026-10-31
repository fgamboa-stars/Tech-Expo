/**
 * ============================================================================
 * File:        src/components/lost/WhatCouldBeLostNext.tsx
 * Purpose:     Transition from Lost America (the past) to the existing
 *              Heritage at Risk climate analysis (the future), using live
 *              numbers from the risk analysis.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * This component reads the SAME AnalysisContext as the risk pages, so the
 * numbers here always match the Findings dashboard. It is the hinge of the
 * app's narrative: places already lost → places that still exist → places
 * threatened by future hazards.
 */
import { useAnalysis } from "../../context/AnalysisContext";
import { stateName } from "../../config/states";

/**
 * Renders the "What Could Be Lost Next?" section.
 * @param props.lostCount Number of lost places shown above, for the first step.
 */
export default function WhatCouldBeLostNext({ lostCount }: { lostCount: number }) {
  const { summary } = useAnalysis();
  const leader = summary.byState.find((s) => s.threatened > 0);
  return (
    <section className="next-lost" aria-labelledby="next-lost-title">
      <h2 id="next-lost-title">What could be lost next?</h2>
      <p className="next-lost__lede">
        The places on this map are gone. The places below still stand — and fire, floods and rising seas are already reaching
        some of them.
      </p>
      <ol className="next-lost__steps">
        <li>
          <span className="next-lost__num">{lostCount}</span>
          <span className="next-lost__label">Places already lost</span>
          <span className="next-lost__note">You are here.</span>
        </li>
        <li>
          <span className="next-lost__num">{summary.analyzed.toLocaleString("en-US")}</span>
          <span className="next-lost__label">Places that still exist, analyzed</span>
          <a href="#/explore">Explore a state</a>
        </li>
        <li>
          <span className="next-lost__num next-lost__num--risk">{summary.threatened.toLocaleString("en-US")}</span>
          <span className="next-lost__label">Threatened by future hazards</span>
          <a href="#/dashboard">See the findings</a>
        </li>
      </ol>
      <p>
        {summary.underwater.toLocaleString("en-US")} could be underwater and {summary.burned.toLocaleString("en-US")} could burn by
        2050{leader ? `; ${stateName(leader.state)} has the most threatened sites` : ""}.
      </p>
      <div className="next-lost__actions">
        <a className="btn btn--primary" href="#/explore">
          Find threatened landmarks in your state
        </a>
        <a className="btn" href="#/map">
          Open the climate-risk map
        </a>
      </div>
    </section>
  );
}
