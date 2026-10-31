/**
 * ============================================================================
 * File:        src/components/lost/LostMap.tsx
 * Purpose:     The Lost America map: clustered lost places styled by cause,
 *              an optional clustered layer of NPS "Removed" listings, search,
 *              legend, state zoom and selection.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * This component follows the same pattern as HeritageMap: create the
 * MapView once, keep ArcGIS objects in refs, and push prop changes into them
 * with small effects. Filtering is done in React (lostAnalysis.ts) and the
 * filtered places are handed in as `places`; the layer is rebuilt from them,
 * which keeps clusters, list, and charts in exact agreement.
 */
import { useEffect, useRef, useState } from "react";
import ArcGISMap from "@arcgis/core/Map";
import Basemap from "@arcgis/core/Basemap";
import MapView from "@arcgis/core/views/MapView";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Legend from "@arcgis/core/widgets/Legend";
import Expand from "@arcgis/core/widgets/Expand";
import Search from "@arcgis/core/widgets/Search";
import Home from "@arcgis/core/widgets/Home";
import type Point from "@arcgis/core/geometry/Point";
import { getState } from "../../config/states";
import { useTheme, type Theme } from "../../context/ThemeContext";
import type { LostPlace } from "../../types/lost";
import { createLostPlacesLayer, createRemovedListingsLayer } from "./lostMapLayers";

export interface LostMapProps {
  /** Filtered places to draw. */
  places: LostPlace[];
  /** Also draw every National Register listing marked Removed (NPS). */
  showRemoved: boolean;
  /** Zoom to this state ("" = whole country). */
  selectedState: string;
  /** Zoom to and open this place. */
  selectedId?: string;
  /** Called when a lost place (not a cluster) is clicked. */
  onSelect: (id: string) => void;
  /** Called with the NPS layer's load result. */
  onRemovedLayerStatus?: (ok: boolean) => void;
  ariaLabel: string;
}

const BASEMAP: Record<Theme, string> = { light: "gray-vector", dark: "dark-gray-vector" };
const US_VIEW = { center: [-98.5, 39.5] as [number, number], zoom: 3 };

/**
 * Renders the Lost America map.
 * @param props See LostMapProps.
 */
export default function LostMap({ places, showRemoved, selectedState, selectedId, onSelect, onRemovedLayerStatus, ariaLabel }: LostMapProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const lostLayerRef = useRef<FeatureLayer | null>(null);
  const removedLayerRef = useRef<FeatureLayer | null>(null);
  const [viewReady, setViewReady] = useState(false);
  const [mapError, setMapError] = useState<string>();
  const callbacks = useRef({ onSelect, onRemovedLayerStatus });
  callbacks.current = { onSelect, onRemovedLayerStatus };

  /* 1. Create the map once. */
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new ArcGISMap({ basemap: Basemap.fromId(BASEMAP[theme]) ?? undefined });
    const view = new MapView({
      container: containerRef.current,
      map,
      ...US_VIEW,
      constraints: { minZoom: 2, snapToZoom: false },
      popup: { dockEnabled: true, dockOptions: { buttonEnabled: false, breakpoint: false, position: "bottom-right" } },
    });
    viewRef.current = view;

    view.ui.add(new Home({ view }), "top-left");
    view.ui.add(new Search({ view, popupEnabled: false, resultGraphicEnabled: true }), { position: "top-right", index: 0 });
    view.ui.add(new Expand({ view, content: new Legend({ view }), expandTooltip: "Legend", mode: "floating" }), "bottom-left");

    /*
     * LEARNING NOTE: clicking a cluster opens its summary popup; clicking a
     * single point selects it. Cluster graphics are marked `isAggregate`.
     */
    const clickHandle = view.on("click", async (event) => {
      const layer = lostLayerRef.current;
      if (!layer) return;
      const hit = await view.hitTest(event, { include: [layer] });
      const graphic = hit.results.flatMap((r) => ("graphic" in r && r.graphic ? [r.graphic] : []))[0];
      if (graphic && !graphic.isAggregate && graphic.attributes?.lostId) callbacks.current.onSelect(String(graphic.attributes.lostId));
    });

    view.when(
      () => setViewReady(true),
      (err: Error) => setMapError(err?.message ?? "The map could not start."),
    );
    return () => {
      clickHandle.remove();
      view.destroy();
      viewRef.current = null;
      lostLayerRef.current = null;
      removedLayerRef.current = null;
      setViewReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 2. Theme: basemap and the theme-colored NPS layer. */
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const bm = Basemap.fromId(BASEMAP[theme]);
    if (bm) view.map.basemap = bm;
    if (removedLayerRef.current) view.map.remove(removedLayerRef.current);
    const removed = createRemovedListingsLayer(theme);
    removed.visible = showRemoved;
    view.map.add(removed, 0); // below the curated places
    removedLayerRef.current = removed;
    removed.when(
      () => callbacks.current.onRemovedLayerStatus?.(true),
      () => callbacks.current.onRemovedLayerStatus?.(false),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, viewReady]);

  /* 3. Curated places: rebuild when the filtered list or theme changes. */
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (lostLayerRef.current) view.map.remove(lostLayerRef.current);
    const layer = createLostPlacesLayer(places, theme);
    view.map.add(layer);
    lostLayerRef.current = layer;
  }, [places, theme, viewReady]);

  /* 4. NPS removed-listings toggle. */
  useEffect(() => {
    if (removedLayerRef.current) removedLayerRef.current.visible = showRemoved;
  }, [showRemoved, viewReady, theme]);

  /* 5. State filter: zoom to the state (or back to the country). */
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !viewReady) return;
    const s = getState(selectedState);
    view.goTo(s ? { center: s.center, zoom: s.zoom } : US_VIEW).catch(() => undefined);
  }, [selectedState, viewReady]);

  /* 6. Selected place: zoom in and open its popup. */
  useEffect(() => {
    const view = viewRef.current;
    const layer = lostLayerRef.current;
    if (!view || !layer || !selectedId || !viewReady) return;
    layer
      .queryFeatures({ where: `lostId = '${selectedId.replace(/'/g, "''")}'`, returnGeometry: true, outFields: ["*"] })
      .then((res) => {
        const g = res.features[0];
        if (!g?.geometry) return;
        view
          .goTo({ target: g.geometry, zoom: Math.max(view.zoom, 13) })
          .then(() => view.openPopup({ features: [g], location: g.geometry as Point }))
          .catch(() => undefined);
      })
      .catch(() => undefined);
  }, [selectedId, viewReady]);

  return (
    <div className="heritage-map lost-map">
      <div ref={containerRef} className="heritage-map__view" role="application" aria-label={ariaLabel} />
      {mapError && (
        <div className="heritage-map__error" role="alert">
          <strong>The map could not load.</strong> {mapError} The list beside the map still works.
        </div>
      )}
    </div>
  );
}
