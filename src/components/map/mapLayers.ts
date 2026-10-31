/**
 * ============================================================================
 * File:        src/components/map/mapLayers.ts
 * Purpose:     Factory functions that create every ArcGIS layer drawn on the
 *              map: analyzed landmarks, state boundaries, NRHP context
 *              points, and the four climate-hazard layers.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial layer factory (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — three ways ArcGIS draws data:
 *  - FeatureLayer: vector features (points, polygons) with attributes you can
 *    click, filter and style in the browser. Used for landmarks, states,
 *    FEMA flood zones and NRI tracts.
 *  - ImageryLayer: a raster image service whose pixels hold values (here,
 *    wildfire hazard classes). The server renders the colors.
 *  - MapImageLayer: a map service that the server draws as a picture for the
 *    current extent (NOAA's sea-level-rise maps).
 * A FeatureLayer can also be built from in-memory Graphics instead of a URL
 * ("client-side layer") — that is how our analyzed landmarks get on the map.
 */
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import ImageryLayer from "@arcgis/core/layers/ImageryLayer";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import type Layer from "@arcgis/core/layers/Layer";
import { HAZARD_LAYERS, NRHP_POINTS_URL, STATES_URL, FIELDS, type HazardLayerConfig } from "../../config/layers";
import { HAZARD_COLORS, MAP_SURFACE, RISK_COLORS } from "../../config/palette";
import { stateName } from "../../config/states";
import type { Theme } from "../../context/ThemeContext";
import type { RiskAssessment } from "../../types/analysis";
import { RISK_CLASSES } from "../../types/analysis";
import { SEVERITY_LABELS } from "../../analysis/riskScoring";
import { hazardConfig } from "../../config/layers";
import type { Severity } from "../../types/hazard";

/** Layer ids used by the layer panel and visibility state. */
export type MapLayerId = "landmarks" | "states" | "nrhp" | HazardLayerConfig["id"];

/** Escapes text for safe insertion into popup HTML. */
function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Builds the popup body for one landmark: risk class, score, and the
 * per-hazard evidence that explains WHY it is threatened.
 * @param a The landmark's assessment.
 * @returns An HTML element for the ArcGIS popup.
 */
export function landmarkPopupContent(a: RiskAssessment): HTMLElement {
  const div = document.createElement("div");
  div.className = "har-popup";
  const rows = a.exposures
    .map((e) => {
      const sev = e.severity === null ? "Not assessed" : SEVERITY_LABELS[e.severity as Severity];
      return `<tr><th scope="row">${esc(hazardConfig(e.hazard).label)}</th><td><strong>${esc(sev)}</strong><br/>${esc(e.label)}</td></tr>`;
    })
    .join("");
  div.innerHTML = `
    <p class="har-popup__class">Risk: <strong>${a.riskClass}</strong> · score ${Math.round(a.score)}/100${a.landmark.isNHL ? " · National Historic Landmark" : ""}</p>
    ${a.landmark.significance ? `<p>${esc(a.landmark.significance)}</p>` : ""}
    <table class="har-popup__table">${rows}</table>
    <p class="har-popup__why"><strong>Why:</strong> ${esc(a.reasons[0])}</p>
    <p class="har-popup__meta">${a.exposures.some((e) => e.method === "documented") ? "Evidence: published sources" : "Evidence: GIS intersection"} · <a href="#/explore/${a.landmark.state}">Open ${esc(stateName(a.landmark.state))} in State Explorer</a></p>`;
  return div;
}

/**
 * Creates the client-side layer of analyzed landmarks, colored by risk class.
 *
 * LEARNING NOTE:
 * Each assessment becomes a Graphic (geometry + attributes). Storing
 * `riskClass` and `hazards` as attributes lets the map filter points with
 * SQL-like expressions (e.g. riskClass = 'Critical') without rebuilding.
 *
 * @param assessments Assessments to draw.
 * @param theme Current theme (symbol colors differ in dark mode).
 * @returns A FeatureLayer.
 */
export function createLandmarkLayer(assessments: RiskAssessment[], theme: Theme): FeatureLayer {
  const byOid = new Map<number, RiskAssessment>();
  const graphics = assessments.map((a, i) => {
    byOid.set(i + 1, a);
    return new Graphic({
      geometry: new Point({ longitude: a.landmark.lon, latitude: a.landmark.lat }),
      attributes: {
        ObjectID: i + 1,
        lmId: a.landmark.id,
        name: a.landmark.name,
        state: a.landmark.state,
        riskClass: a.riskClass,
        score: a.score,
        hazards: `|${a.significantHazards.join("|")}|`,
        nhl: a.landmark.isNHL ? "Yes" : "No",
      },
    });
  });

  const colors = RISK_COLORS[theme];
  const size: Record<string, number> = { Low: 7, Moderate: 9, High: 11, Critical: 13 };
  const renderer = new UniqueValueRenderer({
    field: "riskClass",
    legendOptions: { title: "Risk class" },
    uniqueValueInfos: [...RISK_CLASSES].reverse().map((c) => ({
      value: c,
      label: c,
      symbol: new SimpleMarkerSymbol({
        style: "circle",
        size: size[c],
        color: colors[c],
        outline: { color: MAP_SURFACE[theme], width: 1.5 },
      }),
    })),
  });

  return new FeatureLayer({
    id: "landmarks",
    title: "Historic landmarks",
    source: graphics,
    objectIdField: "ObjectID",
    geometryType: "point",
    spatialReference: { wkid: 4326 },
    fields: [
      { name: "ObjectID", alias: "ObjectID", type: "oid" },
      { name: "lmId", alias: "Id", type: "string" },
      { name: "name", alias: "Name", type: "string" },
      { name: "state", alias: "State", type: "string" },
      { name: "riskClass", alias: "Risk class", type: "string" },
      { name: "score", alias: "Risk score", type: "double" },
      { name: "hazards", alias: "Elevated hazards", type: "string" },
      { name: "nhl", alias: "National Historic Landmark", type: "string" },
    ],
    outFields: ["*"],
    renderer,
    // Draw the most urgent points on top.
    orderBy: [{ field: "score", order: "ascending" }],
    popupTemplate: new PopupTemplate({
      title: "{name}",
      outFields: ["*"],
      content: (event: { graphic: Graphic }) => {
        const a = byOid.get(event.graphic.attributes.ObjectID as number);
        return a ? landmarkPopupContent(a) : "No details available.";
      },
    }),
  });
}

/**
 * Creates the clickable state-boundary layer (ArcGIS Living Atlas).
 * @param theme Current theme.
 */
export function createStatesLayer(theme: Theme): FeatureLayer {
  return new FeatureLayer({
    id: "states",
    title: "U.S. states",
    url: STATES_URL,
    outFields: [FIELDS.states.abbr, FIELDS.states.name],
    popupEnabled: false,
    legendEnabled: false,
    renderer: new SimpleRenderer({
      symbol: new SimpleFillSymbol({
        color: [0, 0, 0, 0],
        outline: { color: theme === "dark" ? [230, 236, 234, 0.35] : [20, 33, 43, 0.3], width: 0.75 },
      }),
    }),
  });
}

/** Creates the context layer of every NRHP-listed property (NPS). */
export function createNrhpLayer(): FeatureLayer {
  return new FeatureLayer({
    id: "nrhp",
    title: "All National Register listings (NPS)",
    url: NRHP_POINTS_URL,
    visible: false,
    // ~97,000 points: only draw when zoomed in to regional scale.
    minScale: 2_500_000,
    outFields: [FIELDS.nrhp.name, FIELDS.nrhp.isNhl],
    popupTemplate: new PopupTemplate({
      title: `{${FIELDS.nrhp.name}}`,
      content: "Listed on the National Register of Historic Places. Run the live analysis in the State Explorer to assess it.",
    }),
  });
}

/**
 * Creates the map layer for one hazard from its configuration.
 *
 * @param cfg Hazard configuration from config/layers.ts.
 * @param theme Current theme.
 * @returns An ArcGIS layer.
 */
export function createHazardLayer(cfg: HazardLayerConfig, theme: Theme): Layer {
  const common = { id: cfg.id, title: cfg.label, visible: cfg.defaultVisible, opacity: cfg.opacity };
  if (cfg.mapLayerType === "imagery") return new ImageryLayer({ ...common, url: cfg.mapUrl });
  if (cfg.mapLayerType === "map-image") return new MapImageLayer({ ...common, url: cfg.mapUrl });

  if (cfg.id === "coastal") {
    // LEARNING NOTE: we style NRI tracts ourselves so only the ratings that
    // matter for the analysis are colored; all other tracts stay transparent.
    const color = HAZARD_COLORS[theme].coastal;
    const fill = (alpha: number) => new SimpleFillSymbol({ color: hexToRgba(color, alpha), outline: { color: [0, 0, 0, 0], width: 0 } });
    return new FeatureLayer({
      ...common,
      url: cfg.mapUrl,
      outFields: [FIELDS.nri.coastalRating],
      minScale: 20_000_000,
      renderer: new UniqueValueRenderer({
        field: FIELDS.nri.coastalRating,
        legendOptions: { title: "Coastal flood risk (NRI)" },
        uniqueValueInfos: [
          { value: "Very High", label: "Very high", symbol: fill(0.85) },
          { value: "Relatively High", label: "Relatively high", symbol: fill(0.55) },
          { value: "Relatively Moderate", label: "Moderate", symbol: fill(0.3) },
        ],
      }),
    });
  }
  // FEMA flood zones keep the service's own (official) symbology.
  return new FeatureLayer({ ...common, url: cfg.mapUrl, outFields: [FIELDS.flood.zone, FIELDS.flood.subtype] });
}

/** Creates all four hazard layers in display order. */
export function createHazardLayers(theme: Theme): Layer[] {
  return HAZARD_LAYERS.map((cfg) => createHazardLayer(cfg, theme));
}

/** Converts "#rrggbb" + alpha to an [r, g, b, a] array accepted by ArcGIS colors. */
function hexToRgba(hex: string, alpha: number): number[] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}
