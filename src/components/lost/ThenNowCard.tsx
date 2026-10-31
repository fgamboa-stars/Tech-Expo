/**
 * ============================================================================
 * File:        src/components/lost/ThenNowCard.tsx
 * Purpose:     "Then vs Now" comparison card for one lost place: historic
 *              photo (then) beside the current street map and current
 *              satellite imagery of the same spot (now), with the place's
 *              story and details.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — Then vs Now functionality:
 *  - THEN: the historic photo comes from useArchiveImage() (Wikipedia lead
 *    image, credited and linked). If none exists, the panel says so and
 *    points to the archive record instead of showing a stock picture.
 *  - NOW: two MiniMaps centered on the original coordinates — a street map
 *    (what is there on the map today) and satellite imagery (what it looks
 *    like from above today).
 * Seeing an opera house next to a picture of an office tower's roof makes
 * the loss concrete in seconds.
 */
import { lazy, Suspense } from "react";
import { lossCause } from "../../config/lostCauses";
import { stateName } from "../../config/states";
import { narrativeFor } from "../../analysis/lostAnalysis";
import { useArchiveImage } from "../../hooks/useLostData";
import type { LostPlace } from "../../types/lost";

const MiniMap = lazy(() => import("./MiniMap"));

/**
 * Renders the Then vs Now card.
 * @param props.place The selected lost place.
 */
export default function ThenNowCard({ place }: { place: LostPlace }) {
  const image = useArchiveImage(place.wikipediaTitle);
  const built = place.builtLabel ?? (place.yearBuilt !== null ? String(place.yearBuilt) : "Unknown");

  return (
    <section className="then-now" aria-labelledby="then-now-title">
      <div className="then-now__head">
        <h2 id="then-now-title">Then vs Now</h2>
        <p className="then-now__place">
          <strong>{place.name}</strong>, {place.city}, {stateName(place.state)}
        </p>
      </div>

      <div className="then-now__grid">
        <figure className="then-now__panel">
          <figcaption className="then-now__label">Then</figcaption>
          <div className="then-now__frame then-now__frame--photo">
            {image.status === "ready" && <img src={image.image.src} alt={`Historic photo of ${place.name}`} loading="lazy" />}
            {image.status === "loading" && <p className="then-now__empty">Loading historic photo…</p>}
            {(image.status === "missing" || image.status === "none") && (
              <p className="then-now__empty">
                No historic photo is linked for this place yet. See the{" "}
                {place.archive.url ? (
                  <a href={place.archive.url} target="_blank" rel="noreferrer">
                    archive record
                  </a>
                ) : (
                  "archive record"
                )}
                {place.nomination?.url && (
                  <>
                    {" "}or the{" "}
                    <a href={place.nomination.url} target="_blank" rel="noreferrer">
                      original nomination photos
                    </a>
                  </>
                )}
                .
              </p>
            )}
          </div>
          {image.status === "ready" && (
            <a className="then-now__credit" href={image.image.pageUrl} target="_blank" rel="noreferrer">
              {image.image.credit}
            </a>
          )}
        </figure>

        <figure className="then-now__panel">
          <figcaption className="then-now__label">Now: street map</figcaption>
          <div className="then-now__frame">
            <Suspense fallback={<p className="then-now__empty">Loading map…</p>}>
              <MiniMap lon={place.lon} lat={place.lat} basemap="streets-vector" zoom={16} ariaLabel={`Street map of the site of ${place.name} today`} />
            </Suspense>
          </div>
        </figure>

        <figure className="then-now__panel">
          <figcaption className="then-now__label">Now: satellite</figcaption>
          <div className="then-now__frame">
            <Suspense fallback={<p className="then-now__empty">Loading imagery…</p>}>
              <MiniMap lon={place.lon} lat={place.lat} basemap="satellite" zoom={17} ariaLabel={`Satellite image of the site of ${place.name} today`} />
            </Suspense>
          </div>
        </figure>
      </div>

      <div className="then-now__story">
        <p className="then-now__narrative">{narrativeFor(place)}</p>
        <dl className="then-now__facts">
          <div>
            <dt>Built</dt>
            <dd>{built}</dd>
          </div>
          <div>
            <dt>Lost</dt>
            <dd>{place.yearLost ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Cause</dt>
            <dd>
              <span className={`loss-swatch loss-swatch--${place.cause}`} aria-hidden="true" />
              {lossCause(place.cause).label}
            </dd>
          </div>
          <div>
            <dt>Why it mattered</dt>
            <dd>{place.significance}</dd>
          </div>
          <div>
            <dt>Archive</dt>
            <dd>
              {place.archive.url ? (
                <a href={place.archive.url} target="_blank" rel="noreferrer">
                  {place.archive.label}
                </a>
              ) : (
                place.archive.label
              )}
              {place.nomination?.url && (
                <>
                  {" · "}
                  <a href={place.nomination.url} target="_blank" rel="noreferrer">
                    {place.nomination.label}
                  </a>
                </>
              )}
              {place.citation && (
                <>
                  {" · "}
                  {place.citation.url ? (
                    <a href={place.citation.url} target="_blank" rel="noreferrer">
                      {place.citation.label}
                    </a>
                  ) : (
                    place.citation.label
                  )}
                </>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
