/**
 * ============================================================================
 * File:        src/components/lost/lostMapLayers.ts
 * Purpose:     ArcGIS layer factories for Lost America: the clustered layer
 *              of curated lost places (styled by cause of loss), the
 *              clustered NPS layer of listings removed from the National
 *              Register, and the popup content for each lost place.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial layer factory (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — clustering:
 * When many points overlap (New York alone has four lost landmarks within
 * a few miles), the map groups them into one circle labeled with a count.
 * `FeatureReductionCluster` does this automatically on the client and
 * re-groups as you zoom. Each cluster takes the color/shape of its most
 * common cause, because it inherits the layer's renderer.
 */
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import TextSymbol from "@arcgis/core/symbols/TextSymbol";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import FeatureReductionCluster from "@arcgis/core/layers/support/FeatureReductionCluster";
import LabelClass from "@arcgis/core/layers/support/LabelClass";
import { FIELDS, NRHP_POINTS_URL } from "../../config/layers";
import { LOSS_CAUSE_CONFIG, lossCause, npGalleryUrl } from "../../config/lostCauses";
import { LOSS_COLORS, MAP_SURFACE } from "../../config/palette";
import { stateName } from "../../config/states";
import type { Theme } from "../../context/ThemeContext";
import { fetchArchiveImage } from "../../analysis/archiveImages";
import { REMOVED_WHERE } from "../../analysis/lostSource";
import type { LostPlace } from "../../types/lost";

/** Escapes text for safe insertion into popup HTML. */
function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Renders an archive link as HTML (or plain text when it has no URL). */
function linkHtml(label: string, url?: string): string {
  return url ? `<a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(label)}</a>` : esc(label);
}

/**
 * Builds the popup body for a lost place.
 *
 * LEARNING NOTE — popup generation:
 * The SDK calls this function when a point is clicked. We return the
 * element immediately with all text fields, plus an empty image slot; the
 * historic photo is fetched in the background and dropped into the slot
 * when (and if) it arrives. The popup never waits on a slow image server.
 *
 * @param p The lost place.
 * @returns HTML element for the ArcGIS popup.
 */
export function lostPopupContent(p: LostPlace): HTMLElement {
  const div = document.createElement("div");
  div.className = "har-popup lost-popup";
  const rows: [string, string][] = [
    ["City", `${esc(p.city)}, ${esc(stateName(p.state))}`],
    ["Built", esc(p.builtLabel ?? (p.yearBuilt !== null ? String(p.yearBuilt) : "Unknown"))],
    ["Lost", esc(p.yearLost !== null ? String(p.yearLost) : "Unknown")],
    ["Cause", `${esc(lossCause(p.cause).label)} — ${esc(p.causeDetail)}`],
    ["Today", esc(p.today)],
    ["Archive", linkHtml(p.archive.label, p.archive.url)],
  ];
  if (p.nomination) rows.push(["Nomination", linkHtml(p.nomination.label, p.nomination.url)]);
  if (p.citation) rows.push(["Source", linkHtml(p.citation.label, p.citation.url)]);
  div.innerHTML = `
    <div class="lost-popup__img" hidden></div>
    <p>${esc(p.significance)}</p>
    <table class="har-popup__table">${rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join("")}</table>
    <p class="har-popup__meta">Then vs Now for this place appears below the map.</p>`;

  if (p.wikipediaTitle) {
    fetchArchiveImage(p.wikipediaTitle).then((img) => {
      const slot = div.querySelector<HTMLDivElement>(".lost-popup__img");
      if (!img || !slot) return;
      slot.hidden = false;
      slot.innerHTML = `<img src="${esc(img.src)}" alt="Historic photo of ${esc(p.name)}" loading="lazy" /><a class="lost-popup__credit" href="${esc(img.pageUrl)}" target="_blank" rel="noreferrer">${esc(img.credit)}</a>`;
    });
  }
  return div;
}

/** Shared cluster settings (count label in the middle of each cluster). */
function clusterConfig(title: string): FeatureReductionCluster {
  return new FeatureReductionCluster({
    clusterRadius: "56px",
    clusterMinSize: "20px",
    clusterMaxSize: "44px",
    popupTemplate: new PopupTemplate({
      title,
      content: "{cluster_count} lost places are grouped here. Zoom in or use the list to see each one.",
    }),
    labelingInfo: [
      new LabelClass({
        deconflictionStrategy: "none",
        labelExpressionInfo: { expression: "Text($feature.cluster_count, '#,###')" },
        labelPlacement: "center-center",
        symbol: new TextSymbol({
          color: "#ffffff",
          haloColor: [0, 0, 0, 0.45],
          haloSize: 1,
          font: { weight: "bold", size: "11px", family: "sans-serif" },
        }),
      }),
    ],
  });
}

/**
 * Creates the clustered layer of curated lost places.
 *
 * @param places Places to draw (already filtered).
 * @param theme Current theme.
 * @returns A client-side FeatureLayer.
 */
export function createLostPlacesLayer(places: LostPlace[], theme: Theme): FeatureLayer {
  const byOid = new Map<number, LostPlace>();
  const graphics = places.map((p, i) => {
    byOid.set(i + 1, p);
    return new Graphic({
      geometry: new Point({ longitude: p.lon, latitude: p.lat }),
      attributes: { ObjectID: i + 1, lostId: p.id, name: p.name, state: p.state, cause: p.cause, yearLost: p.yearLost ?? -1 },
    });
  });

  const colors = LOSS_COLORS[theme];
  const renderer = new UniqueValueRenderer({
    field: "cause",
    legendOptions: { title: "Cause of loss" },
    uniqueValueInfos: LOSS_CAUSE_CONFIG.map((c) => {
      const thin = c.marker === "cross" || c.marker === "x";
      return {
        value: c.id,
        label: c.label,
        symbol: new SimpleMarkerSymbol({
          style: c.marker,
          size: thin ? 13 : 12,
          color: colors[c.id],
          // Line-only shapes (cross, x) are drawn by their outline, so it carries the color.
          outline: { color: thin ? colors[c.id] : MAP_SURFACE[theme], width: thin ? 3 : 1.5 },
        }),
      };
    }),
  });

  return new FeatureLayer({
    id: "lost-places",
    title: "Lost historic places",
    source: graphics,
    objectIdField: "ObjectID",
    geometryType: "point",
    spatialReference: { wkid: 4326 },
    fields: [
      { name: "ObjectID", alias: "ObjectID", type: "oid" },
      { name: "lostId", alias: "Id", type: "string" },
      { name: "name", alias: "Name", type: "string" },
      { name: "state", alias: "State", type: "string" },
      { name: "cause", alias: "Cause of loss", type: "string" },
      { name: "yearLost", alias: "Year lost", type: "integer" },
    ],
    outFields: ["*"],
    renderer,
    featureReduction: clusterConfig("Lost places"),
    popupTemplate: new PopupTemplate({
      title: "{name}",
      outFields: ["*"],
      content: (event: { graphic: Graphic }) => {
        const p = byOid.get(event.graphic.attributes.ObjectID as number);
        return p ? lostPopupContent(p) : "No details available.";
      },
    }),
  });
}

/**
 * Creates the clustered NPS layer of National Register listings marked
 * "Removed" — context showing how widespread loss is.
 *
 * @param theme Current theme.
 * @returns A FeatureLayer on the NPS service, filtered with REMOVED_WHERE.
 */
export function createRemovedListingsLayer(theme: Theme): FeatureLayer {
  const color = LOSS_COLORS[theme].removed;
  return new FeatureLayer({
    id: "nrhp-removed",
    title: "Removed from the National Register (NPS)",
    url: NRHP_POINTS_URL,
    definitionExpression: REMOVED_WHERE,
    outFields: ["*"],
    renderer: new UniqueValueRenderer({
      field: FIELDS.nrhp.status,
      defaultSymbol: new SimpleMarkerSymbol({ style: "x", size: 8, color, outline: { color, width: 2 } }),
      defaultLabel: "Removed listing",
    }),
    featureReduction: clusterConfig("Removed National Register listings"),
    popupTemplate: new PopupTemplate({
      title: `{${FIELDS.nrhp.name}}`,
      outFields: ["*"],
      content: (event: { graphic: Graphic }) => {
        const a = event.graphic.attributes as Record<string, unknown>;
        const ref = FIELDS.nrhp.refCandidates.map((f) => a[f]).find((v) => typeof v === "string" && /^\d{8}$/.test(v)) as string | undefined;
        const div = document.createElement("div");
        div.className = "har-popup";
        div.innerHTML = `<p>Removed from the National Register of Historic Places. Most removals follow demolition, destruction or loss of historic character; the NPS file explains the reason.</p>${
          ref ? `<p>${linkHtml("Original nomination and photos (NPS NPGallery)", npGalleryUrl(ref))}</p>` : ""
        }`;
        return div;
      },
    }),
  });
}
