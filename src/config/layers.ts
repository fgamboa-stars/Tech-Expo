/**
 * ============================================================================
 * File:        src/config/layers.ts
 * Purpose:     Single source of truth for every GIS service the app uses:
 *              landmark points, state boundaries, and climate-hazard layers.
 *              Both the map (what you SEE) and the analysis engine (what we
 *              MEASURE) read from this file, so they never disagree.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial service catalog (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * Every layer here is an ArcGIS REST service. A REST service is just a URL
 * that answers questions over HTTP, for example:
 *   .../FeatureServer/0/query?where=1=1&f=json        -> returns features
 *   .../ImageServer/identify?geometry=...&f=json      -> returns a pixel value
 *   .../MapServer/identify?geometry=...&f=json        -> returns what is under a point
 * The ArcGIS Maps SDK uses these same URLs to draw layers on the map. Our
 * analysis engine calls them directly with `fetch` so it can also run from
 * the command line (scripts/run-analysis.ts) without a browser.
 *
 * All services below are public and need no login. To swap one, set the
 * matching VITE_* variable in .env.local (see .env.example).
 */
import { readEnv } from "./appConfig";
import type { HazardId } from "../types/hazard";

/** National Register of Historic Places points, published by the National Park Service. */
export const NRHP_POINTS_URL =
  readEnv("VITE_NRHP_URL") ??
  "https://mapservices.nps.gov/arcgis/rest/services/cultural_resources/nrhp_locations/MapServer/0";

/** Generalized U.S. state boundaries from ArcGIS Living Atlas (fields: STATE_ABBR, STATE_NAME). */
export const STATES_URL =
  readEnv("VITE_STATES_URL") ??
  "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_States_Generalized_Boundaries/FeatureServer/0";

/** FEMA National Flood Hazard Layer flood zones, as served by ArcGIS Living Atlas ("USA Flood Hazard Areas"). */
export const FEMA_FLOOD_URL =
  readEnv("VITE_FEMA_FLOOD_URL") ??
  "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Flood_Hazard_Reduced_Set_gdb/FeatureServer/0";

/** FEMA National Risk Index at census-tract level (coastal flooding, wildfire, community resilience ratings). */
export const NRI_TRACTS_URL =
  readEnv("VITE_NRI_TRACTS_URL") ??
  "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Census_Tracts/FeatureServer/0";

/** USDA Forest Service Wildfire Hazard Potential 2023, classified 1–7 (270 m raster). */
export const WHP_URL =
  readEnv("VITE_WHP_URL") ??
  "https://apps.fs.usda.gov/fsgisx01/rest/services/RDW_Wildfire/RMRS_WildfireHazardPotential_Classified_2023/ImageServer";

/** NOAA Office for Coastal Management sea-level-rise inundation services; `{ft}` is replaced with 1, 2, 3 … */
export const SLR_BASE_URL =
  readEnv("VITE_SLR_BASE_URL") ?? "https://coast.noaa.gov/arcgis/rest/services/dc_slr/slr_{ft}ft/MapServer";

/**
 * Builds the URL of one NOAA sea-level-rise scenario service.
 * @param feet Sea-level rise above today's high tide (MHHW), in whole feet (1–10).
 * @returns The MapServer URL for that scenario.
 */
export function slrServiceUrl(feet: number): string {
  return SLR_BASE_URL.replace("{ft}", String(feet));
}

/**
 * LEARNING NOTE — why 1 ft and 2 ft?
 * NOAA's 2022 Sea Level Rise Technical Report projects 10–12 inches of rise
 * along U.S. coasts between 2020 and 2050 (more on the Gulf Coast, less on
 * the West Coast). So:
 *   - a landmark that floods at +1 ft is likely to be underwater at high tide by 2050;
 *   - a landmark that floods only at +2 ft is exposed under higher-end 2050
 *     scenarios or regional hot spots (e.g. the Gulf Coast's 14–18 inches).
 */
export const SLR_LIKELY_FEET = 1;
export const SLR_POSSIBLE_FEET = 2;

/** Describes one hazard: how it is shown on the map and where its data lives. */
export interface HazardLayerConfig {
  id: HazardId;
  /** Short label used in chips, chart axes and legends. */
  label: string;
  /** One-line plain-language description for the layer panel. */
  description: string;
  /** Agency that publishes the data. */
  publisher: string;
  /** Service URL the analysis queries. */
  analysisUrl: string;
  /** Service URL drawn on the map (can differ, e.g. a lighter visualization layer). */
  mapUrl: string;
  /** ArcGIS layer type used to draw it. */
  mapLayerType: "feature" | "imagery" | "map-image";
  /** Visible on the map when the app opens. */
  defaultVisible: boolean;
  /** Default opacity on the map. */
  opacity: number;
  /** Note shown in the layer panel when a layer only draws at some scales. */
  scaleNote?: string;
}

/**
 * The four hazards analyzed by the Risk Analysis Engine, in display order.
 * The order also fixes each hazard's chart color (see styles/global.css),
 * so a hazard keeps its color everywhere in the app.
 */
export const HAZARD_LAYERS: HazardLayerConfig[] = [
  {
    id: "flood",
    label: "FEMA flood zone",
    description: "Areas FEMA maps as having a 1% (100-year) or 0.2% (500-year) annual chance of flooding.",
    publisher: "FEMA National Flood Hazard Layer via ArcGIS Living Atlas",
    analysisUrl: FEMA_FLOOD_URL,
    mapUrl: FEMA_FLOOD_URL,
    mapLayerType: "feature",
    defaultVisible: false,
    opacity: 0.55,
    scaleNote: "Draws when zoomed in to city scale (1:1,000,000 or closer).",
  },
  {
    id: "slr",
    label: "Sea-level rise",
    description: "Land NOAA projects to be inundated at high tide with 2 ft of sea-level rise.",
    publisher: "NOAA Office for Coastal Management, Sea Level Rise Viewer",
    analysisUrl: slrServiceUrl(SLR_POSSIBLE_FEET),
    mapUrl: slrServiceUrl(SLR_POSSIBLE_FEET),
    mapLayerType: "map-image",
    defaultVisible: false,
    opacity: 0.7,
    scaleNote: "Coastal areas of the contiguous U.S., Hawaii and territories.",
  },
  {
    id: "wildfire",
    label: "Wildfire hazard",
    description: "Relative potential for wildfire that would be hard to contain (USDA Forest Service, 2023).",
    publisher: "USDA Forest Service, Wildfire Hazard Potential 2023",
    analysisUrl: WHP_URL,
    mapUrl: WHP_URL,
    mapLayerType: "imagery",
    defaultVisible: true,
    opacity: 0.45,
  },
  {
    id: "coastal",
    label: "Coastal flood risk",
    description: "FEMA National Risk Index coastal-flooding risk rating for each census tract.",
    publisher: "FEMA National Risk Index",
    analysisUrl: NRI_TRACTS_URL,
    mapUrl: NRI_TRACTS_URL,
    mapLayerType: "feature",
    defaultVisible: false,
    opacity: 0.5,
  },
];

/** Looks up a hazard's configuration by id. */
export function hazardConfig(id: HazardId): HazardLayerConfig {
  const found = HAZARD_LAYERS.find((h) => h.id === id);
  if (!found) throw new Error(`Unknown hazard id: ${id}`);
  return found;
}

/**
 * Field names the analysis reads from each service.
 *
 * LEARNING NOTE:
 * Keeping field names in config (not scattered through code) means that if
 * an agency renames a field, you fix it in exactly one place.
 */
export const FIELDS = {
  nrhp: {
    name: "RESNAME",
    isNhl: "Is_NHL",
    status: "STATUS",
    /** Candidate reference-number fields; the first one present is used. */
    refCandidates: ["NRIS_Refnum", "NRIS_REFNUM", "REFNUM", "NR_PROPERTYID", "CR_ID"],
    cityCandidates: ["CITY", "City", "RESCITY"],
  },
  states: { abbr: "STATE_ABBR", name: "STATE_NAME" },
  flood: { zone: "FLD_ZONE", subtype: "ZONE_SUBTY", sfha: "SFHA_TF" },
  nri: {
    coastalRating: "CFLD_RISKR",
    wildfireRating: "WFIR_RISKR",
    riverineRating: "RFLD_RISKR",
    resilienceRating: "RESL_RATNG",
    tract: "TRACTFIPS",
  },
} as const;
