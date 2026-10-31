# public/data

This folder holds pre-computed analysis results that the app loads at startup.

| File | Created by | Used for |
|---|---|---|
| `analysis-results.json` | `npm run analyze` | National GIS results for the Dashboard, Map and Story. If present, it replaces the bundled reference set. |

The file is **not** committed by default because it must be generated against the live
ArcGIS services (about 15–30 minutes for all ~2,600 National Historic Landmarks).

```bash
npm run analyze                    # every National Historic Landmark in the U.S.
npm run analyze -- --state FL      # just Florida, merged into the existing file
```

When the file is missing, the app falls back to the curated reference set in
`src/data/referenceLandmarks.ts` and labels every screen accordingly.
