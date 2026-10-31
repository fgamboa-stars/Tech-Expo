/**
 * ============================================================================
 * File:        src/pages/AboutDataPage.tsx
 * Purpose:     Documents every dataset, the spatial-analysis workflow, the
 *              risk-scoring method and the limitations — so judges and users
 *              can check how each number was produced.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial page (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */
import { FEMA_FLOOD_URL, NRHP_POINTS_URL, NRI_TRACTS_URL, STATES_URL, WHP_URL, slrServiceUrl } from "../config/layers";
import { CLASS_THRESHOLDS, HAZARD_WEIGHTS, MULTI_HAZARD_BONUS } from "../analysis/riskScoring";

/** Dataset rows: [name, publisher, role, url]. */
const DATASETS: [string, string, string, string][] = [
  ["National Register of Historic Places (points)", "National Park Service", "The landmarks: name, location, National Historic Landmark status.", NRHP_POINTS_URL],
  ["USA States (generalized)", "Esri, ArcGIS Living Atlas / U.S. Census Bureau", "Assigns each landmark to a state; clickable state boundaries.", STATES_URL],
  ["USA Flood Hazard Areas (National Flood Hazard Layer)", "FEMA via ArcGIS Living Atlas", "Is the landmark in a 100-year, 500-year or coastal high-hazard flood zone?", FEMA_FLOOD_URL],
  ["Sea Level Rise Viewer, +1 ft and +2 ft inundation", "NOAA Office for Coastal Management", "Would the landmark be below high tide with 1 or 2 feet of sea-level rise?", `${slrServiceUrl(1)} · ${slrServiceUrl(2)}`],
  ["Wildfire Hazard Potential 2023 (classified)", "USDA Forest Service, Fire Modeling Institute", "How hard would a wildfire here be to contain (very low → very high)?", WHP_URL],
  ["National Risk Index, census tracts", "FEMA", "Coastal-flood risk rating and community resilience for the surrounding tract.", NRI_TRACTS_URL],
];

/** Renders the About the Data page. */
export default function AboutDataPage() {
  return (
    <div className="page prose-page">
      <header className="page__head">
        <h1>About the data</h1>
        <p className="page__lede">Every number in this app comes from a public federal dataset you can query yourself. Here is what we used and exactly how.</p>
      </header>

      <section>
        <h2>Datasets</h2>
        <div className="table-scroll">
          <table className="data-table data-table--wide">
            <thead>
              <tr>
                <th scope="col">Dataset</th>
                <th scope="col">Publisher</th>
                <th scope="col">Question it answers</th>
                <th scope="col">Service</th>
              </tr>
            </thead>
            <tbody>
              {DATASETS.map(([name, pub, role, url]) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td>{pub}</td>
                  <td>{role}</td>
                  <td className="url-cell">{url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          All services are public and need no login. The reference set of documented sites lists its sources on each landmark;
          the 2050 sea-level framing follows NOAA's 2022 Sea Level Rise Technical Report, which projects 10–12 inches of rise along
          U.S. coasts between 2020 and 2050 (14–18 inches on the Gulf Coast, 4–8 inches on the West Coast).
        </p>
      </section>

      <section>
        <h2>How the analysis works</h2>
        <ol className="steps">
          <li>
            <strong>Acquire landmarks.</strong> Query the National Park Service service for National Historic Landmarks (or every
            listing) inside a state's bounding box, then keep the points that fall inside the state polygon.
          </li>
          <li>
            <strong>Intersect with flood zones.</strong> Ask FEMA's flood layer which zone polygon contains each landmark's point.
          </li>
          <li>
            <strong>Read the wildfire raster.</strong> Identify the Wildfire Hazard Potential class of the 270 m cell under each point.
          </li>
          <li>
            <strong>Look up the community.</strong> Find the census tract in FEMA's National Risk Index for its coastal-flood rating
            and community resilience.
          </li>
          <li>
            <strong>Test sea-level rise (coastal places only).</strong> If the tract or flood zone is coastal, ask NOAA whether the
            point is inundated at +2 ft, and if so at +1 ft. Inland places skip this step.
          </li>
          <li>
            <strong>Score and classify.</strong> Convert each answer to a 0–3 severity, combine them into a 0–100 score, and assign a
            risk class (below).
          </li>
          <li>
            <strong>Generate findings.</strong> Count landmarks by state, hazard and class, and write the findings sentences.
          </li>
        </ol>
      </section>

      <section>
        <h2>Risk scoring</h2>
        <div className="table-scroll">
          <table className="data-table data-table--wide">
            <caption>Severity (0 none · 1 low · 2 elevated · 3 severe)</caption>
            <thead>
              <tr>
                <th scope="col">Hazard</th>
                <th scope="col">3 · severe</th>
                <th scope="col">2 · elevated</th>
                <th scope="col">1 · low</th>
                <th scope="col">Weight</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">FEMA flood zone</th>
                <td>Zone V / VE (coastal wave action)</td>
                <td>Zone A, AE, AH, AO, AR, A99 (100-year)</td>
                <td>0.2% annual chance (500-year), or behind a levee</td>
                <td>{HAZARD_WEIGHTS.flood}</td>
              </tr>
              <tr>
                <th scope="row">Sea-level rise</th>
                <td>Inundated at +1 ft</td>
                <td>Inundated at +2 ft only</td>
                <td>—</td>
                <td>{HAZARD_WEIGHTS.slr}</td>
              </tr>
              <tr>
                <th scope="row">Wildfire hazard</th>
                <td>Very high (class 5)</td>
                <td>High (class 4)</td>
                <td>Moderate (class 3)</td>
                <td>{HAZARD_WEIGHTS.wildfire}</td>
              </tr>
              <tr>
                <th scope="row">Coastal flood risk (NRI)</th>
                <td>Very high</td>
                <td>Relatively high</td>
                <td>Relatively moderate</td>
                <td>{HAZARD_WEIGHTS.coastal}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong>Score</strong> = 100 × Σ(weight × severity) ÷ Σ(weight × 3), multiplied by 1.10 when FEMA rates community
          resilience "very low" (1.05 for "relatively low"), plus {MULTI_HAZARD_BONUS} points for each additional hazard at elevated
          or severe. Capped at 100.
        </p>
        <ul>
          <li>
            <strong>Critical</strong>: score ≥ {CLASS_THRESHOLDS.critical}, or one severe hazard plus another elevated one.
          </li>
          <li>
            <strong>High</strong>: score ≥ {CLASS_THRESHOLDS.high}, or any single severe hazard.
          </li>
          <li>
            <strong>Moderate</strong>: score ≥ {CLASS_THRESHOLDS.moderate}, or any elevated hazard.
          </li>
          <li>
            <strong>Low</strong>: everything else. Moderate and above count as "threatened".
          </li>
        </ul>
      </section>

      <section>
        <h2>Limitations</h2>
        <ul>
          <li>Each landmark is one point. Large districts and parks extend beyond it, so exposure can be under- or over-stated.</li>
          <li>FEMA maps show today's flood risk, not 2050's; some areas are unmapped or out of date. No polygon means "not mapped as hazardous", not "safe".</li>
          <li>NOAA's sea-level layers model high-tide inundation, not storm surge, and do not cover Alaska.</li>
          <li>Wildfire Hazard Potential estimates difficulty of control, not the chance a specific building burns.</li>
          <li>When a service does not respond, that hazard is marked "not assessed" and counts as zero in the score; the landmark is flagged as incomplete.</li>
          <li>The reference set is curated from published sources and is not a random sample; it shows documented cases, not national rates.</li>
        </ul>
      </section>
    </div>
  );
}
