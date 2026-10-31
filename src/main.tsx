/**
 * ============================================================================
 * File:        src/main.tsx
 * Purpose:     Entry point: mounts the React app into index.html's #root.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial entry point (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — application startup:
 *  1. The browser loads index.html, which applies the saved theme and the
 *     ArcGIS widget stylesheet before anything renders.
 *  2. Vite's bundle runs this file, which imports the global CSS and renders <App/>.
 *  3. <App/> sets up ThemeProvider and AnalysisProvider; AnalysisProvider
 *     immediately shows the bundled reference set and, in the background,
 *     looks for public/data/analysis-results.json.
 *  4. The router reads the URL hash and shows the matching page.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./styles/components.css";

const root = document.getElementById("root");
if (!root) throw new Error("index.html is missing <div id=\"root\">");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
