/**
 * ============================================================================
 * File:        src/components/map/HeritageMap.tsx
 * Purpose:     The interactive map (ArcGIS Maps SDK for JavaScript). Draws
 *              landmarks colored by risk, hazard overlays and state
 *              boundaries; supports search, legend, filtering, clicking a
 *              state and zooming to a landmark.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial map component (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — React + ArcGIS:
 * ArcGIS objects (Map, MapView, layers) are long-lived and mutable; React
 * components re-render often. So we create the MapView ONCE in a mount effect,
 * keep the ArcGIS objects in refs, and use small effects to push prop changes
 * into them (visibility, filters, data, theme). The cleanup function calls
 * view.destroy() so nothing leaks when you leave the page.
 */
import { useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config";
import ArcGISMap from "@arcgis/core/Map";
import Basemap from "@arcgis/core/Basemap";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Graphic from "@arcgis/core/Graphic";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import Legend from "@arcgis/core/widgets/Legend";
import Expand from "@arcgis/core/widgets/Expand";
import Search from "@arcgis/core/widgets/Search";
import Home from "@arcgis/core/widgets/Home";
import type Layer from "@arcgis/core/layers/Layer";
import type Point from "@arcgis/core/geometry/Point";
import { ARCGIS_API_KEY } from "../../config/appConfig";
import { FIELDS } from "../../config/layers";
import { SELECTION_COLOR } from "../../config/palette";
import { getState } from "../../config/states";
import { useTheme, type Theme } from "../../context/ThemeContext";
import type { RiskAssessment, RiskClass } from "../../types/analysis";
import { RISK_CLASSES } from "../../types/analysis";
import type { HazardId } from "../../types/hazard";
import { createHazardLayers, createLandmarkLayer, createNrhpLayer, createStatesLayer, type MapLayerId } from "./mapLayers";

if (ARCGIS_API_KEY) esriConfig.apiKey = ARCGIS_API_KEY;

/** Load status of each layer, reported to the layer panel. */
export type LayerStatus = "loading" | "ready" | "error";

export interface HeritageMapProps {
  /** Assessments to draw as points. */
  assessments: RiskAssessment[];
  /** Which layers are visible. */
  layerVisibility: Partial<Record<MapLayerId, boolean>>;
  /** Risk classes to show (others are filtered out). */
  classFilter?: RiskClass[];
  /** Only show landmarks with this elevated hazard ("" = all). */
  hazardFilter?: HazardId | "";
  /** Highlight and zoom to this state. */
  selectedState?: string;
  /** Zoom to and open this landmark's popup. */
  focusLandmarkId?: string;
  /** Called when the user clicks a state (and not a landmark). */
  onStateClick?: (abbr: string) => void;
  /** Called when the user clicks a landmark. */
  onLandmarkClick?: (id: string) => void;
  /** Called when a layer finishes loading or fails. */
  onLayerStatus?: (id: MapLayerId, status: LayerStatus) => void;
  /** Show the search widget. */
  showSearch?: boolean;
  /** Accessible description of the map. */
  ariaLabel: string;
  className?: string;
}

const BASEMAP: Record<Theme, string> = { light: "gray-vector", dark: "dark-gray-vector" };
const US_CENTER: [number, number] = [-98.5, 39.5];

/**
 * Renders the ArcGIS map and keeps it in sync with props.
 * @param props See HeritageMapProps.
 */
export default function HeritageMap(props: HeritageMapProps) {
  const {
    assessments,
    layerVisibility,
    classFilter = RISK_CLASSES,
    hazardFilter = "",
    selectedState,
    focusLandmarkId,
    onStateClick,
    onLandmarkClick,
    onLayerStatus,
    showSearch = true,
    ariaLabel,
    className,
  } = props;
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const landmarkLayerRef = useRef<FeatureLayer | null>(null);
  const statesLayerRef = useRef<FeatureLayer | null>(null);
  const selectionLayerRef = useRef<GraphicsLayer | null>(null);
  const layersByIdRef = useRef<Map<string, Layer>>(new Map());
  const builtThemeRef = useRef<Theme | null>(null);
  const [viewReady, setViewReady] = useState(false);
  const [mapError, setMapError] = useState<string>();

  // Keep latest callbacks in refs so the click handler (registered once) sees current props.
  const callbacks = useRef({ onStateClick, onLandmarkClick, onLayerStatus });
  callbacks.current = { onStateClick, onLandmarkClick, onLayerStatus };

  /* ---------------- 1. Create the map once ---------------- */
  useEffect(() => {
    if (!containerRef.current) return;
    const statesLayer = createStatesLayer(theme);
    const nrhpLayer = createNrhpLayer();
    const hazardLayers = createHazardLayers(theme);
    const selectionLayer = new GraphicsLayer({ id: "selection", title: "Selected state", listMode: "hide" });

    const map = new ArcGISMap({
      basemap: Basemap.fromId(BASEMAP[theme]) ?? undefined,
      // Draw order: hazards at the bottom, then boundaries, context points, selection.
      layers: [...hazardLayers, statesLayer, nrhpLayer, selectionLayer],
    });

    const view = new MapView({
      container: containerRef.current,
      map,
      center: US_CENTER,
      zoom: 3,
      constraints: { minZoom: 2, snapToZoom: false },
      popup: { dockEnabled: true, dockOptions: { buttonEnabled: false, breakpoint: false, position: "bottom-right" } },
    });
    viewRef.current = view;
    statesLayerRef.current = statesLayer;
    builtThemeRef.current = theme;
    selectionLayerRef.current = selectionLayer;
    for (const l of [...hazardLayers, statesLayer, nrhpLayer]) layersByIdRef.current.set(l.id, l);

    // Report each layer's load status so the panel can flag unavailable services.
    for (const l of [...hazardLayers, statesLayer, nrhpLayer]) {
      callbacks.current.onLayerStatus?.(l.id as MapLayerId, "loading");
      l.when(
        () => callbacks.current.onLayerStatus?.(l.id as MapLayerId, "ready"),
        () => callbacks.current.onLayerStatus?.(l.id as MapLayerId, "error"),
      );
    }

    // Widgets: Home button, search, and a collapsible legend.
    view.ui.add(new Home({ view }), "top-left");
    if (showSearch) {
      view.ui.add(new Search({ view, popupEnabled: false, resultGraphicEnabled: true }), { position: "top-right", index: 0 });
    }
    const legend = new Expand({ view, content: new Legend({ view }), expandTooltip: "Legend", expanded: false, mode: "floating" });
    view.ui.add(legend, "bottom-left");

    /*
     * LEARNING NOTE — hit testing:
     * view.hitTest(event) returns every graphic under the mouse. We check the
     * landmark layer first (points sit on top of states); if no landmark was
     * hit, the click selects the state underneath.
     */
    const clickHandle = view.on("click", async (event) => {
      // Read layers from refs: the states layer is rebuilt when the theme changes.
      const currentStates = statesLayerRef.current;
      const include = [landmarkLayerRef.current, currentStates].filter(Boolean) as FeatureLayer[];
      const hit = await view.hitTest(event, { include });
      const graphics = hit.results.flatMap((r) => ("graphic" in r && r.graphic ? [r.graphic] : []));
      const landmark = graphics.find((g) => g.layer === landmarkLayerRef.current);
      if (landmark) {
        callbacks.current.onLandmarkClick?.(String(landmark.attributes.lmId));
        return;
      }
      const state = graphics.find((g) => g.layer === currentStates);
      if (state) callbacks.current.onStateClick?.(String(state.attributes[FIELDS.states.abbr]));
    });

    view.when(
      () => setViewReady(true),
      (err: Error) => setMapError(err?.message ?? "The map could not start."),
    );

    return () => {
      clickHandle.remove();
      view.destroy();
      viewRef.current = null;
      landmarkLayerRef.current = null;
      layersByIdRef.current.clear();
      setViewReady(false);
    };
    // The map is created once; later effects push changes into it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- 2. Theme: basemap + boundary colors ---------------- */
  useEffect(() => {
    const view = viewRef.current;
    if (!view || builtThemeRef.current === theme) return; // already built for this theme
    builtThemeRef.current = theme;
    const bm = Basemap.fromId(BASEMAP[theme]);
    if (bm) view.map.basemap = bm;
    const old = statesLayerRef.current;
    if (old) {
      const fresh = createStatesLayer(theme);
      fresh.visible = old.visible;
      const index = view.map.layers.indexOf(old);
      view.map.remove(old);
      view.map.add(fresh, index);
      statesLayerRef.current = fresh;
      layersByIdRef.current.set("states", fresh);
      fresh.when(
        () => callbacks.current.onLayerStatus?.("states", "ready"),
        () => callbacks.current.onLayerStatus?.("states", "error"),
      );
    }
  }, [theme]);

  /* ---------------- 3. Landmarks: rebuild when data or theme changes ---------------- */
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const previous = landmarkLayerRef.current;
    if (previous) view.map.remove(previous);
    const layer = createLandmarkLayer(assessments, theme);
    layer.visible = layerVisibility.landmarks !== false;
    view.map.add(layer, view.map.layers.length - 1); // just below the selection outline
    landmarkLayerRef.current = layer;
    layersByIdRef.current.set("landmarks", layer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessments, theme, viewReady]);

  /* ---------------- 4. Layer visibility ---------------- */
  useEffect(() => {
    for (const [id, visible] of Object.entries(layerVisibility)) {
      const layer = layersByIdRef.current.get(id);
      if (layer && visible !== undefined) layer.visible = visible;
    }
  }, [layerVisibility, viewReady, assessments, theme]);

  /* ---------------- 5. Filters (client-side, no re-query) ---------------- */
  useEffect(() => {
    const view = viewRef.current;
    const layer = landmarkLayerRef.current;
    if (!view || !layer) return;
    /*
     * LEARNING NOTE:
     * A FeatureFilter hides features in the LayerView (what is drawn) using
     * a SQL where-clause, without touching the data. It is instant because
     * the browser already has every point.
     */
    const clauses: string[] = [];
    if (classFilter.length < RISK_CLASSES.length) {
      clauses.push(classFilter.length ? `riskClass IN (${classFilter.map((c) => `'${c}'`).join(",")})` : "1=0");
    }
    if (hazardFilter) clauses.push(`hazards LIKE '%|${hazardFilter}|%'`);
    const where = clauses.join(" AND ");
    let cancelled = false;
    view.whenLayerView(layer).then((lv) => {
      if (!cancelled) lv.filter = where ? new FeatureFilter({ where }) : (null as unknown as FeatureFilter);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [classFilter, hazardFilter, assessments, theme, viewReady]);

  /* ---------------- 6. Selected state: outline + zoom ---------------- */
  useEffect(() => {
    const view = viewRef.current;
    const selection = selectionLayerRef.current;
    const statesLayer = statesLayerRef.current;
    if (!view || !selection || !viewReady) return;
    selection.removeAll();
    if (!selectedState) {
      view.goTo({ center: US_CENTER, zoom: 3 }).catch(() => undefined);
      return;
    }
    let cancelled = false;
    const fallback = () => {
      const s = getState(selectedState);
      if (s) view.goTo({ center: s.center, zoom: s.zoom }).catch(() => undefined);
    };
    if (!statesLayer) return fallback();
    statesLayer
      .queryFeatures({ where: `${FIELDS.states.abbr} = '${selectedState}'`, returnGeometry: true, outSpatialReference: view.spatialReference })
      .then((res) => {
        if (cancelled) return;
        const feature = res.features[0];
        if (!feature?.geometry) return fallback();
        selection.add(
          new Graphic({
            geometry: feature.geometry,
            symbol: new SimpleFillSymbol({ color: [0, 0, 0, 0], outline: { color: SELECTION_COLOR[theme], width: 2.5 } }),
          }),
        );
        const extent = feature.geometry.extent;
        // Alaska crosses the antimeridian; its extent spans the globe, so use the preset view.
        if (selectedState === "AK" || !extent) return fallback();
        view.goTo(extent.clone().expand(1.15)).catch(() => undefined);
      })
      .catch(fallback);
    return () => {
      cancelled = true;
    };
  }, [selectedState, viewReady, theme]);

  /* ---------------- 7. Focus a landmark (from a list click) ---------------- */
  useEffect(() => {
    const view = viewRef.current;
    const layer = landmarkLayerRef.current;
    if (!view || !layer || !focusLandmarkId || !viewReady) return;
    layer
      .queryFeatures({ where: `lmId = '${focusLandmarkId.replace(/'/g, "''")}'`, returnGeometry: true, outFields: ["*"] })
      .then((res) => {
        const g = res.features[0];
        if (!g?.geometry) return;
        view.goTo({ target: g.geometry, zoom: Math.max(view.zoom, 11) }).catch(() => undefined);
        view.openPopup({ features: [g], location: g.geometry as Point });
      })
      .catch(() => undefined);
  }, [focusLandmarkId, viewReady, assessments]);

  return (
    <div className={`heritage-map ${className ?? ""}`}>
      <div ref={containerRef} className="heritage-map__view" role="application" aria-label={ariaLabel} />
      {mapError && (
        <div className="heritage-map__error" role="alert">
          <strong>The map could not load.</strong> {mapError} Check your internet connection; the findings and lists still work offline.
        </div>
      )}
    </div>
  );
}
