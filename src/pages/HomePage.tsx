/**
 * ============================================================================
 * File:        src/pages/HomePage.tsx
 * Purpose:     Landing page and Story Mode: the research question, a live
 *              headline count, and a narrative on why heritage matters, how
 *              climate threatens it, what the analysis found, and what to do.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial page (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — Story Mode:
 * StoryMaps work because they lead with a question, show evidence, and end
 * with what it means. This page follows that arc. Every number on it comes
 * from `useAnalysis().summary`, so the story rewrites itself when you load
 * national GIS results or analyze a new state.
 */
import { useMemo } from "react";
import { useAnalysis } from "../context/AnalysisContext";
import { stateName } from "../config/states";
import { isFireThreatened, isWaterThreatened, rankByVulnerability } from "../analysis/findings";
import FindingsList from "../components/findings/FindingsList";
import { HazardChips, RiskBadge } from "../components/landmarks/RiskBadge";
import DatasetBanner from "../components/common/DatasetBanner";
import type { RiskAssessment } from "../types/analysis";

/**
 * The hero graphic: a tide staff gauge showing today's high tide and the
 * +1 ft / +2 ft levels NOAA projects around 2050.
 */
function TideGauge({ underwater, burned }: { underwater: number; burned: number }) {
  return (
    <figure className="gauge" aria-label={`${underwater} landmarks could be underwater and ${burned} could burn by 2050`}>
      <svg viewBox="0 0 220 360" className="gauge__svg" aria-hidden="true">
        {/* staff */}
        <rect x="10" y="20" width="44" height="320" rx="4" className="gauge__staff" />
        {Array.from({ length: 33 }, (_, i) => {
          const y = 340 - i * 10;
          const major = i % 10 === 0;
          return <line key={i} x1="10" x2={major ? 40 : i % 5 === 0 ? 32 : 24} y1={y} y2={y} className="gauge__tick" />;
        })}
        {[0, 1, 2, 3].map((ft) => (
          <text key={ft} x="44" y={344 - ft * 100} className="gauge__num">
            {ft}
          </text>
        ))}
        {/* water rising to the +1 ft (≈2050) mark */}
        <g className="gauge__water">
          <rect x="0" y="240" width="220" height="120" className="gauge__water-fill" />
          <path d="M0 240 q14 -6 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 v8 H0 Z" className="gauge__wave" />
        </g>
        <line x1="62" x2="96" y1="340" y2="340" className="gauge__mark" />
        <line x1="62" x2="96" y1="240" y2="240" className="gauge__mark gauge__mark--strong" />
        <line x1="62" x2="96" y1="140" y2="140" className="gauge__mark" />
      </svg>
      <figcaption className="gauge__labels">
        <span style={{ top: "38.9%" }}>+2 ft · high-end 2050</span>
        <span style={{ top: "66.7%" }} className="strong">+1 ft · likely by 2050</span>
        <span style={{ top: "94.4%" }}>Today's high tide</span>
      </figcaption>
    </figure>
  );
}

/** One "case file" — a featured landmark in the story. */
function CaseFile({ a, kicker }: { a: RiskAssessment; kicker: string }) {
  return (
    <article className="case">
      <p className="case__kicker">{kicker}</p>
      <h3 className="case__name">{a.landmark.name}</h3>
      <p className="case__place">
        {a.landmark.city ? `${a.landmark.city}, ` : ""}
        {stateName(a.landmark.state)}
      </p>
      {a.landmark.significance && <p>{a.landmark.significance}</p>}
      <p className="case__why">{a.reasons[0]}</p>
      <div className="case__foot">
        <RiskBadge riskClass={a.riskClass} score={a.score} />
        <HazardChips assessment={a} />
      </div>
    </article>
  );
}

/** Renders the home page with Story Mode. */
export default function HomePage() {
  const { summary, assessments, mode } = useAnalysis();

  // Pick three contrasting case files: worst water threat, worst fire threat, worst compound threat.
  const cases = useMemo(() => {
    const ranked = rankByVulnerability(assessments);
    const picked: { a: RiskAssessment; kicker: string }[] = [];
    const take = (pred: (a: RiskAssessment) => boolean, kicker: string) => {
      const a = ranked.find((x) => pred(x) && !picked.some((p) => p.a.landmark.id === x.landmark.id));
      if (a) picked.push({ a, kicker });
    };
    take((a) => a.significantHazards.includes("slr"), "Rising water");
    take((a) => isFireThreatened(a) && !isWaterThreatened(a), "Fire");
    take((a) => isFireThreatened(a) && isWaterThreatened(a), "Water and fire");
    return picked;
  }, [assessments]);

  const leaders = summary.byState.filter((s) => s.threatened > 0).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="hero__text">
          <h1 className="hero__title">Which historic landmarks could be underwater or burned by&nbsp;2050?</h1>
          <p className="hero__lede">
            We mapped America's historic places against federal flood, sea-level-rise and wildfire data to find the ones running
            out of time — and to explain why.
          </p>
          <div className="hero__counts">
            <p>
              <span className="hero__num hero__num--water">{summary.underwater.toLocaleString("en-US")}</span>
              could be underwater
            </p>
            <p>
              <span className="hero__num hero__num--fire">{summary.burned.toLocaleString("en-US")}</span>
              could burn
            </p>
            <p>
              <span className="hero__num">{summary.multiHazard.toLocaleString("en-US")}</span>
              face more than one hazard
            </p>
          </div>
          <div className="hero__actions">
            <a className="btn btn--primary" href="#/explore">
              Pick a state
            </a>
            <a className="btn" href="#/map">
              Open the map
            </a>
          </div>
          <DatasetBanner />
        </div>
        <TideGauge underwater={summary.underwater} burned={summary.burned} />
      </section>

      <article className="story">
        <section className="story__section">
          <h2>Places are how a nation remembers</h2>
          <p>
            A battlefield, a mill town's main street, a lighthouse, a temple built by a king: historic places hold stories that
            documents alone cannot. They are where people go to understand who came before them, and they anchor local identity,
            tourism and jobs. The National Register of Historic Places lists more than 97,000 of them; about 2,600 are National
            Historic Landmarks, the places judged to matter to the whole country.
          </p>
        </section>

        <section className="story__section">
          <h2>Why preservation cannot wait</h2>
          <p>
            Historic places are not renewable. A burned 1913 chalet can be rebuilt, but the original timbers, craft and context
            are gone. Preservation works best before disaster — documenting, reinforcing and planning — yet most hazard planning
            focuses on homes and infrastructure. Cultural sites are often left out of the data entirely. This project puts them
            back in.
          </p>
        </section>

        <section className="story__section">
          <h2>Four ways climate reaches a landmark</h2>
          <div className="hazard-grid">
            <div className="hazard-card hazard-card--flood">
              <h3>Flooding</h3>
              <p>FEMA flood zones mark land with a 1% chance of flooding each year. Heavier downpours and higher seas push that line further.</p>
            </div>
            <div className="hazard-card hazard-card--slr">
              <h3>Sea-level rise</h3>
              <p>NOAA projects 10–12 inches of rise on U.S. coasts by 2050. Land below that line floods at ordinary high tide.</p>
            </div>
            <div className="hazard-card hazard-card--wildfire">
              <h3>Wildfire</h3>
              <p>The Forest Service maps where fire would be hard to contain. Longer, hotter fire seasons put wooden landmarks in the path.</p>
            </div>
            <div className="hazard-card hazard-card--coastal">
              <h3>Coastal communities</h3>
              <p>FEMA's National Risk Index rates each neighborhood's coastal-flood risk and how well it can recover afterward.</p>
            </div>
          </div>
        </section>

        <section className="story__section">
          <h2>What the analysis found</h2>
          <FindingsList statements={summary.statements} />
          {leaders.length > 0 && (
            <p>
              The states with the most threatened places are{" "}
              {leaders.map((l, i) => (
                <span key={l.state}>
                  <a href={`#/explore/${l.state}`}>{stateName(l.state)}</a> ({l.threatened})
                  {i < leaders.length - 2 ? ", " : i === leaders.length - 2 ? " and " : ""}
                </span>
              ))}
              .{mode === "reference" ? " In the reference set these totals reflect where threats are documented, not a census." : ""}
            </p>
          )}
          <p>
            <a className="btn" href="#/dashboard">
              See every finding
            </a>
          </p>
        </section>

        {cases.length > 0 && (
          <section className="story__section story__section--wide">
            <h2>Case files</h2>
            <div className="cases">
              {cases.map((c) => (
                <CaseFile key={c.a.landmark.id} a={c.a} kicker={c.kicker} />
              ))}
            </div>
          </section>
        )}

        <section className="story__section">
          <h2>What communities can do now</h2>
          <ol className="recommendations">
            <li>
              <strong>Document the most threatened sites first.</strong> High-resolution 3D scans, measured drawings and oral
              histories preserve knowledge even if the structure is lost.
            </li>
            <li>
              <strong>Put heritage in hazard-mitigation plans.</strong> Local plans unlock FEMA mitigation funding; listing
              historic sites in them makes protection projects eligible.
            </li>
            <li>
              <strong>Triage with data.</strong> Use risk scores like these alongside significance to decide where limited
              preservation dollars go first.
            </li>
            <li>
              <strong>Adapt in place where it works.</strong> Flood-proof basements and move systems upstairs; clear fuel and
              install sprinklers around wooden buildings in fire country.
            </li>
            <li>
              <strong>Plan honestly for loss.</strong> Some places cannot be saved where they stand. Decide with descendant
              communities what to relocate, what to record, and how to tell the story.
            </li>
          </ol>
        </section>

        <section className="story__section">
          <h2>Looking ahead</h2>
          <p>
            This is a screening tool: it tests one point per landmark against today's best national layers. Future versions
            could add extreme heat and riverine flood projections, a time slider to compare 2030, 2050 and 2100, and building
            footprints instead of points. The method is open — every number traces back to a public service you can query
            yourself. Read <a href="#/data">how the analysis works</a>.
          </p>
        </section>
      </article>
    </>
  );
}
