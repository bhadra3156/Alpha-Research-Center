# AlphaResearch — Institutional Equity Intelligence Engine

Elite 3-Check equity screening system for US & UK markets.

## Stack
- **Frontend**: Next.js 15 + Tailwind CSS + shadcn/ui ? Vercel
- **Backend**: FastAPI Python 3.12 ? Render
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude Sonnet (analysis) + Groq (batch scoring)

## The 3-Check Rule
Every qualifying stock must pass:
1. ? CHECK 1 — Fundamental Quality
2. ? CHECK 2 — Technical Phase (Stage 1 or Stage 2 only)
3. ? CHECK 3 — Smart Money Confirmation

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Build Phases
- Phase 1: Project scaffold ?
- Phase 2: Supabase schema
- Phase 3: Data fetcher
- Phase 4: Scoring engine
- Phase 5: Smart money services
- Phase 6: Scan router
- Phase 7: AI narrative
- Phase 8: Frontend dashboard
- Phase 9: Analyzer page
- Phase 10: Portfolio + journal
- Phase 11: Automation
- Phase 12: Deployment
