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


# AlphaResearch — Institutional Minimalist Theme

**Version:** 1.1
**Impact level:** ZERO content changes. Two files touched.
**Rollback:** One command.

---

## What this changes

| File | Change |
|---|---|
| `app/globals.css` | Replaced with extended minimalist theme. All class names already in use (`.card`, `.badge-*`, `.metric-*`) preserved. |
| `tailwind.config.ts` | Replaced with neutralized config. All color keys (`navy`, `gold`, `steel`) preserved but collapsed to the minimalist palette. Gradients and glows neutralized to flat. |

## What this does NOT change

- ❌ No `.tsx` files
- ❌ No components (`Navbar.tsx` and friends untouched)
- ❌ No Python backend
- ❌ No Supabase schemas
- ❌ No routes, no logic, no data flow
- ❌ No `package.json`, no `next.config.ts`, no `tsconfig.json`

---

## Visual changes you will see

### Before → After

| Element | Before | After |
|---|---|---|
| Page background | Navy gradient (`#060820 → #1a1f6e`) | Flat near-black (`#0a0a0b`) |
| Cards | Gradient + shadow + glow | Flat surface + subtle border |
| Gold accents | Heavy glow shadow | Clean amber, used only on primary CTAs |
| Borders | Multiple competing tones | One consistent border tone |
| Animations | 4 active (scan-line, pulse-gold, etc) | 2 (pulse for LIVE dot, fade-in) |
| Tables | Inconsistent row styling | Uniform `.table-cell` rhythm |
| Typography | Mixed weights/sizes | Inter for prose, JetBrains Mono for all numbers |

### Page-by-page

- **Dashboard (Command Center):** Looks almost identical — it was already the cleanest. Subtle improvement in card border consistency.
- **Analyzer:** Loses the navy gradient wash. Background goes flat near-black. Cleaner.
- **Watchlist:** Score cards lose gradient/glow. Table rows have uniform 1px subtle borders. Higher signal-to-noise.
- **Portfolio:** Loses the navy gradient. Position rows become tighter and more readable.
- **Journal:** Cards flatten. Filter pills stay functional but lose heavy borders.

### Color discipline (new rule)

| Color | Usage |
|---|---|
| Amber (`#f59e0b`) | Primary CTAs only + the brand `α` mark + smart-money badge |
| Emerald (`#10b981`) | PASS verdicts, positive deltas only |
| Red (`#ef4444`) | FAIL verdicts, negative deltas only |
| Blue (`#3b82f6`) | Stage indicators only |
| Purple (`#a855f7`) | Smart money / 13F signals only |
| Everything else | Greyscale (`#fafafa` → `#52525b`) |

No decorative color. Color = data signal.

---

## Install

From your project root in PowerShell:

```powershell
# Drop both new files + the installer into your project root, then:
.\install-minimalist-theme.ps1
```

The installer:
1. Backs up your existing `globals.css` and `tailwind.config.ts` to `.theme-backup-<timestamp>\`
2. Installs the new files
3. Clears `.next` cache
4. Prints next steps + rollback command

## Verify

```powershell
npm run dev
# Open http://localhost:3000/dashboard — should look essentially the same, slightly cleaner
# Open http://localhost:3000/analyzer  — navy gradient gone, flat dark background
# Open http://localhost:3000/portfolio — same
```

## Deploy

```powershell
git add -A
git commit -m "feat(ui): institutional minimalist theme — flat surfaces, unified palette"
git push
```

Vercel will auto-deploy.

## Rollback

If anything looks wrong, the installer prints the exact rollback command. It's:

```powershell
Copy-Item .theme-backup-<timestamp>\globals.css.bak  app\globals.css       -Force
Copy-Item .theme-backup-<timestamp>\tailwind.config.ts.bak  tailwind.config.ts -Force
Remove-Item .next -Recurse -Force
npm run dev
```

---

## Why this approach works

Your existing components reference class names like `.card`, `.badge-pass`, `.badge-stage`, `.metric-number`, `bg-navy-900`, `bg-gold-500`. The new files redefine **what those names look like** without changing **the names themselves**. Every component keeps compiling. Every page keeps rendering. They just look cleaner.

This is the minimum-impact path. Once you're happy, you can incrementally refactor components to use the new semantic tokens (`bg-surface`, `border-default`, `text-ink-primary`) — but you don't have to.