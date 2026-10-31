/**
 * ============================================================================
 * File:        src/pages/LostAmericaPage.tsx
 * Purpose:     The Lost America page: historic places that no longer exist.
 *              Clustered map with search and state / decade / cause filters,
 *              a selectable list, a Then vs Now card, a storytelling panel,
 *              and the "What could be lost next?" transition into the
 *              climate-risk workflow.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial page (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — data flow on this page:
 *   LOST_PLACES (curated data)
 *      └─ filterLostPlaces(filters) ──► LostMap (clusters) + LostPlaceList
 *                                   └─► summarizeLost() ──► header numbers
 *   selectedId (map click or list click) ──► ThenNowCard + map popup
 *   NPS "Removed" listings ──► optional clustered context layer on the map
 * One `filters` object and one `selectedId` drive everything, so every
 * panel always describes the same places.
 */
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import LostFilters from "../components/lost/LostFilters";
import LostPlaceList from "../components/lost/LostPlaceList";
import LostStoryPanel from "../components/lost/LostStoryPanel";
import WhatCouldBeLostNext from "../components/lost/WhatCouldBeLostNext";
import ThenNowCard from "../components/lost/ThenNowCard";
import StoryArc from "../components/common/StoryArc";
import { StatTile } from "../components/charts/Charts";
import { LOST_PLACES } from "../data/lostPlaces";
import { ALL_LOST_FILTERS, availableDecades, filterLostPlaces, summarizeLost } from "../analysis/lostAnalysis";
import { useRemovedCount } from "../hooks/useLostData";
import { lossCause } from "../config/lostCauses";
import type { LossCause, LostFilters as Filters } from "../types/lost";

const LostMap = lazy(() => import("../components/lost/LostMap"));

/** Renders the Lost America page. */
export default function LostAmericaPage() {
  const [filters, setFilters] = useState<Filters>(ALL_LOST_FILTERS);
  const [selectedId, setSelectedId] = useState<string>(() => LOST_PLACES.find((p) => p.featured)?.id ?? LOST_PLACES[0].id);
  const [showRemoved, setShowRemoved] = useState(false);
  const [removedUnavailable, setRemovedUnavailable] = useState(false);
  const removedCount = useRemovedCount();

  const filtered = useMemo(() => filterLostPlaces(LOST_PLACES, filters), [filters]);
  const overall = useMemo(() => summarizeLost(LOST_PLACES), []);
  const decades = useMemo(() => availableDecades(LOST_PLACES), []);
  const featured = useMemo(() => LOST_PLACES.filter((p) => p.featured), []);
  const selected = LOST_PLACES.find((p) => p.id === selectedId);

  // Counts shown inside the filter controls (each ignores its own filter so options never show 0 for themselves).
  const stateCounts = useMemo(() => {
    const rows = filterLostPlaces(LOST_PLACES, { ...filters, state: "" });
    return rows.reduce<Record<string, number>>((m, p) => ({ ...m, [p.state]: (m[p.state] ?? 0) + 1 }), {});
  }, [filters]);
  const causeCounts = useMemo(() => {
    const rows = filterLostPlaces(LOST_PLACES, { ...filters, causes: [...ALL_LOST_FILTERS.causes] });
    return rows.reduce<Partial<Record<LossCause, number>>>((m, p) => ({ ...m, [p.cause]: (m[p.cause] ?? 0) + 1 }), {});
  }, [filters]);

  const select = useCallback((id: string) => setSelectedId(id), []);
  const showOnMap = useCallback((id: string) => {
    setSelectedId(id);
    document.getElementById("lost-map-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="page lost-page">
      <header className="lost-hero">
        <StoryArc current="past" />
        <h1>Lost America</h1>
        <p className="lost-hero__message">Every dot on this map represents a place that once existed and is now gone.</p>
        <p className="page__lede">
          Demolished for progress, burned in wildfires, crushed by hurricanes, drowned by reservoirs and rising water. These are
          the historic places the country has already lost — and the forces that could take the next ones.
        </p>
        <div className="stats-row">
          <StatTile value={overall.total} label="documented places lost" tone="accent" />
          <StatTile
            value={removedCount === null ? "…" : removedCount === "unavailable" ? "—" : removedCount}
            label="listings removed from the National Register"
            note="NPS, live; turn on the layer below to map them"
          />
          <StatTile value={overall.medianYearsStood ?? "—"} label="median years each place stood" />
          {overall.byCause[0] && (
            <StatTile value={overall.byCause[0].count} label={`were ${lossCause(overall.byCause[0].cause).verb}`} note="the most common cause" />
          )}
        </div>
      </header>

      <section id="lost-map-section" className="lost-explore" aria-label="Map of lost places">
        <LostFilters
          filters={filters}
          onChange={setFilters}
          decades={decades}
          stateCounts={stateCounts}
          causeCounts={causeCounts}
          showRemoved={showRemoved}
          onShowRemovedChange={setShowRemoved}
          removedUnavailable={removedUnavailable}
          resultCount={filtered.length}
        />
        <div className="lost-explore__body">
          <div className="lost-explore__map">
            <Suspense fallback={<p className="loading">Loading the map…</p>}>
              <LostMap
                places={filtered}
                showRemoved={showRemoved}
                selectedState={filters.state}
                selectedId={selectedId}
                onSelect={select}
                onRemovedLayerStatus={(ok) => setRemovedUnavailable(!ok)}
                ariaLabel="Map of historic places that have been lost, clustered, styled by cause of loss"
              />
            </Suspense>
          </div>
          <div className="lost-explore__list">
            <LostPlaceList places={filtered} selectedId={selectedId} onSelect={select} />
          </div>
        </div>
      </section>

      {selected && <ThenNowCard place={selected} />}

      <LostStoryPanel featured={featured} summary={overall} onShow={showOnMap} />

      <WhatCouldBeLostNext lostCount={overall.total} />
    </div>
  );
}
