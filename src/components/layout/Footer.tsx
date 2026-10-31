/**
 * ============================================================================
 * File:        src/components/layout/Footer.tsx
 * Purpose:     Site footer with data attribution.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial component (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */

/** Renders the footer. */
export default function Footer() {
  return (
    <footer className="site-footer">
      <p>
        Data: National Park Service (National Register of Historic Places), FEMA (National Flood Hazard Layer, National Risk
        Index), NOAA Office for Coastal Management (Sea Level Rise Viewer), USDA Forest Service (Wildfire Hazard Potential), Esri
        ArcGIS Living Atlas. Built with the ArcGIS Maps SDK for JavaScript and React.
      </p>
      <p>
        A screening tool for education and planning conversations — not an engineering or insurance assessment.{" "}
        <a href="#/data">How the analysis works</a>
      </p>
    </footer>
  );
}
