/**
 * ============================================================================
 * File:        src/pages/AboutProjectPage.tsx
 * Purpose:     Project purpose, research question, goals, expected outcomes,
 *              team placeholders and technology overview.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial page (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */

/** Renders the About the Project page. */
export default function AboutProjectPage() {
  return (
    <div className="page prose-page">
      <header className="page__head">
        <h1>About the project</h1>
        <p className="page__lede">Heritage at Risk is a GIS research tool built for a technology expo: it turns federal hazard maps into evidence about the places that tell America's story.</p>
      </header>

      <section>
        <h2>Research question</h2>
        <blockquote className="question">Which historic landmarks could be underwater or burned by 2050?</blockquote>
        <p>
          "Underwater" means a landmark sits in a FEMA flood zone, inside NOAA's projected high-tide line with 1–2 feet of sea-level
          rise, or in a community with high coastal-flood risk. "Burned" means it sits where the Forest Service rates wildfire as
          hard to contain.
        </p>
      </section>

      <section>
        <h2>Goals</h2>
        <ul>
          <li>Identify which historic places face flood, sea-level-rise and wildfire hazards, state by state.</li>
          <li>Explain why each one is at risk, with evidence a non-specialist can follow.</li>
          <li>Rank sites so preservation effort can go where it matters most.</li>
          <li>Show that open government data and GIS can answer real community questions.</li>
        </ul>
      </section>

      <section>
        <h2>Expected outcomes</h2>
        <ul>
          <li>A ranked list of threatened landmarks per state, with the hazard evidence for each.</li>
          <li>National findings: totals by hazard, by state, and for places facing compound threats.</li>
          <li>A repeatable, documented method others can audit, extend, or run for their own region.</li>
        </ul>
      </section>

      <section>
        <h2>How it is built</h2>
        <ul>
          <li><strong>React + TypeScript</strong> for the interface, with a small hash router and context-based state.</li>
          <li><strong>ArcGIS Maps SDK for JavaScript</strong> for the map, hazard layers, search and legend.</li>
          <li><strong>ArcGIS REST services</strong> from Living Atlas, FEMA, NOAA, USDA and NPS for the spatial analysis.</li>
          <li><strong>A shared analysis engine</strong> that runs in the browser (one state, live) and in Node (all landmarks, batch).</li>
        </ul>
        <p>
          The source code, developer guide and Git workflow live in the project repository (README.md, DEVELOPER_GUIDE.md,
          GIT_WORKFLOW.md).
        </p>
      </section>

      <section>
        <h2>Team</h2>
        <ul className="team">
          <li>[Team member name] — [role, e.g. GIS analysis]</li>
          <li>[Team member name] — [role, e.g. front-end development]</li>
          <li>[Team member name] — [role, e.g. research and storytelling]</li>
          <li>[Advisor / mentor name] — [organization]</li>
        </ul>
      </section>

      <section>
        <h2>Acknowledgments</h2>
        <p>
          Thanks to the National Park Service, FEMA, NOAA, the USDA Forest Service and Esri's ArcGIS Living Atlas team for publishing
          open data, and to the Union of Concerned Scientists, whose 2014 report <em>National Landmarks at Risk</em> informed the
          reference set.
        </p>
      </section>
    </div>
  );
}
