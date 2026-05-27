# AlphaResearch — Phase 1: Dashboard Rebuild

## What This Delivers
The institutional-grade Dashboard page — the command center of the entire platform.

## Files Included

### NEW FILES (copy into your project)
```
frontend/
├── lib/
│   ├── types.ts              # Shared TypeScript types (all pages use these)
│   └── api.ts                # Typed API client to Render backend
├── components/
│   └── shared/
│       └── ui-primitives.tsx  # Reusable: KpiCard, ConvictionBar, CheckBadge, StageTag, etc.
└── app/
    └── dashboard/
        └── page.tsx           # ⭐ The rebuilt Dashboard page
```

### EXISTING FILES (DO NOT REPLACE — already working)
```
frontend/
├── components/layout/
│   ├── Layout.tsx             # Keep as-is
│   └── Navbar.tsx             # Keep as-is (your uploaded version with usePathname)
├── lib/utils.ts               # Keep as-is (has cn() + formatters)
├── app/layout.tsx             # Keep as-is (root layout)
├── app/globals.css            # Keep as-is
└── tailwind.config.ts         # Keep as-is
```

## What Changed vs Old Dashboard

| Before | After |
|--------|-------|
| Mock data only (7 hardcoded stocks) | Live scan hitting real backend API |
| No API integration | Full typed api.ts client |
| Navbar duplicated in every page | Uses shared Layout.tsx + Navbar.tsx |
| Inline component definitions | Shared ui-primitives.tsx |
| No sorting | Column-header click sorting |
| No conviction color-coding spec | Green 9-10 / Amber 7-8 / Blue 5-6 / Red 1-4 |
| No data quality badges | HIGH / MEDIUM / LOW per spec |
| No table footer legend | Bloomberg-spec conviction + DQ legend |
| No 3-Check pass/fail display | Per-row Check badges + StageTag |
| No RSI color-coding | >70 red / >50 amber / <50 green |
| ~500 unformatted lines | Clean, typed, production-grade |

## Deployment Steps

1. Open PowerShell in your project root
2. Run: `.\DEPLOY_PHASE1.ps1` (creates directories)
3. Copy the 4 new files into the paths shown above
4. Run: `cd frontend && npm run dev`
5. Open: http://localhost:3000/dashboard
6. Click "Run 3-Check Scan" — wait ~30s if Render is cold-starting
7. You should see qualifying stocks populate the Bloomberg-spec table

## Known Dependencies
- Backend must be running on Render (or locally at localhost:8000)
- First scan after deploy takes ~30-60s (Render cold start + 170 tickers)
- Subsequent scans are faster due to Yahoo Finance data caching (10min TTL)

## Next Phases
- Phase 2: Analyzer page (single-stock deep analysis with narrative)
- Phase 3: Watchlist page (with Supabase persistence)
- Phase 4: Portfolio page (with Supabase persistence)
- Phase 5: Journal page (already Supabase-backed, needs UI upgrade)