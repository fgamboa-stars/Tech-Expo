/**
 * ============================================================================
 * File:        src/components/lost/MiniMap.tsx
 * Purpose:     A small, single-purpose ArcGIS map centered on one location,
 *              used twice in the Then vs Now card: once as a street map
 *              ("current map location") and once as satellite imagery.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — "now" imagery:
 * The `satellite` basemap is Esri's World Imagery: recent aerial and
 * satellite photos of the whole Earth. Centering it on a lost landmark's
 * coordinates shows what occupies the site today — a parking lot, an arena,
 * a reservoir — which is the "Now" half of Then vs Now.
 */
import { useEffect, useRef } from "react";
import ArcGISMap from "@arcgis/core/Map";
import Basemap from "@arcgis/core/Basemap";
import MapView from "@arcgis/core/views/MapView";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";

export interface MiniMapProps {
  lon: number;
  lat: number;
  /** ArcGIS basemap id, e.g. "streets-vector" or "satellite". */
  basemap: string;
  zoom: number;
  ariaLabel: string;
}

/**
 * Renders a small map with a marker at the given location.
 * @param props See MiniMapProps.
 */
export default function MiniMap({ lon, lat, basemap, zoom, ariaLabel }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);

  // Create once per basemap.
  useEffect(() => {
    if (!containerRef.current) return;
    const view = new MapView({
      container: containerRef.current,
      map: new ArcGISMap({ basemap: Basemap.fromId(basemap) ?? undefined }),
      center: [lon, lat],
      zoom,
      ui: { components: ["attribution"] },
      popupEnabled: false,
      constraints: { snapToZoom: false },
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemap]);

  // Move the marker and the view when the place changes.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const point = new Point({ longitude: lon, latitude: lat });
    view.graphics.removeAll();
    view.graphics.add(
      new Graphic({
        geometry: point,
        symbol: new SimpleMarkerSymbol({ style: "circle", size: 14, color: [0, 0, 0, 0], outline: { color: [255, 255, 255, 1], width: 3 } }),
      }),
    );
    view.graphics.add(
      new Graphic({
        geometry: point,
        symbol: new SimpleMarkerSymbol({ style: "circle", size: 14, color: [0, 0, 0, 0], outline: { color: [20, 33, 43, 1], width: 1.5 } }),
      }),
    );
    view.goTo({ center: [lon, lat], zoom }, { animate: false }).catch(() => undefined);
  }, [lon, lat, zoom, basemap]);

  return <div ref={containerRef} className="mini-map" role="img" aria-label={ariaLabel} />;
}
