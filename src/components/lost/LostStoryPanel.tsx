/**
 * ============================================================================
 * File:        src/components/lost/LostStoryPanel.tsx
 * Purpose:     Storytelling panel for Lost America: why these places
 *              mattered, what was lost, why preservation matters, and short
 *              generated narratives for featured landmarks.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */
import { lossCause } from "../../config/lostCauses";
import { stateName } from "../../config/states";
import { narrativeFor } from "../../analysis/lostAnalysis";
import type { LostPlace, LostSummary } from "../../types/lost";
import { lifespan } from "./LostPlaceList";

export interface LostStoryPanelProps {
  /** Places to feature (usually those marked `featured`). */
  featured: LostPlace[];
  summary: LostSummary;
  /** Called when a featured place's "See it on the map" is pressed. */
  onShow: (id: string) => void;
}

/**
 * Renders the story panel.
 * @param props See LostStoryPanelProps.
 */
export default function LostStoryPanel({ featured, summary, onShow }: LostStoryPanelProps) {
  return (
    <section className="lost-story" aria-labelledby="lost-story-title">
      <h2 id="lost-story-title">What these places tell us</h2>
      <div className="lost-story__columns">
        <div>
          <h3>Why they mattered</h3>
          <p>
            A train station that welcomed millions, the ballpark where Jackie Robinson broke baseball's color line, a temple built
            by immigrant sugar workers, a river falls where people fished for millennia. Each held memories and identity that
            no photograph fully carries.
          </p>
        </div>
        <div>
          <h3>What was lost</h3>
          <p>
            Most losses on this map were decisions: {summary.byCause.find((c) => c.cause === "demolished")?.count ?? 0} places were
            demolished for something new. The rest were taken by fire, storms and rising water — and those forces are growing.
            The typical place stood {summary.medianYearsStood ?? "—"} years before it was gone.
          </p>
        </div>
        <div>
          <h3>Why preservation matters</h3>
          <p>
            Penn Station's demolition in 1963 shocked the country into action: within three years Congress passed the National
            Historic Preservation Act, which created the National Register. Loss is how we learned to protect; foresight is how we
            avoid repeating it.
          </p>
        </div>
      </div>

      <h3 className="lost-story__subhead">Stories from the map</h3>
      <div className="lost-stories">
        {featured.map((p) => (
          <article key={p.id} className="lost-story-card">
            <p className="lost-story-card__meta">
              <span className={`loss-swatch loss-swatch--${p.cause}`} aria-hidden="true" />
              {lossCause(p.cause).label}, {lifespan(p)}
            </p>
            <h4>{p.name}</h4>
            <p className="lost-story-card__place">
              {p.city}, {stateName(p.state)}
            </p>
            <p>{narrativeFor(p)}</p>
            <button type="button" className="btn btn--quiet btn--small" onClick={() => onShow(p.id)}>
              See it on the map
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
