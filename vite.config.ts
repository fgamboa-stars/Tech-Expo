/**
 * ============================================================================
 * File:        vite.config.ts
 * Purpose:     Build configuration for Vite (dev server + production bundler).
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial configuration for Heritage at Risk v1.0
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * `base: "./"` makes every asset URL relative, so the built `dist/` folder
 * works no matter where it is hosted (GitHub Pages sub-folder, Netlify,
 * an expo laptop opened from disk via `npm run preview`). The app uses
 * hash-based routing (#/map, #/dashboard) for the same reason: no server
 * rewrite rules are needed.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    // The ArcGIS SDK is large; it is split into many lazy chunks automatically.
    // Raise the warning limit so the build output stays readable.
    chunkSizeWarningLimit: 4000,
    target: "es2022",
  },
});
