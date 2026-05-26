from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import scan, analyze, watchlist, portfolio, journal, alerts
import uvicorn

app = FastAPI(
    title="AlphaResearch API",
    description="Institutional Equity Intelligence Engine — 3-Check System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router,      prefix="/scan",      tags=["Scan"])
app.include_router(analyze.router,   prefix="/analyze",   tags=["Analysis"])
app.include_router(watchlist.router, prefix="/watchlist", tags=["Watchlist"])
app.include_router(portfolio.router, prefix="/portfolio", tags=["Portfolio"])
app.include_router(journal.router,   prefix="/journal",   tags=["Journal"])
app.include_router(alerts.router,    prefix="/alerts",    tags=["Alerts"])

@app.get("/")
async def root():
    return {"status": "AlphaResearch API Online", "version": "1.0.0", "checks": 3}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "AlphaResearch Backend"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

@app.get('/health')
def health_check():
    return {'status': 'ok', 'service': 'AlphaResearch Backend'}



@app.post("/analyze/portfolio")
async def analyze_portfolio(request: dict):
    holdings = request.get("holdings", "")
    total = request.get("total", 0)
    count = request.get("count", 0)
    
    try:
        from app.services.narrative_ai import narrative_ai
        prompt = f"""You are a senior hedge fund portfolio manager with 45 years of experience. Analyze this portfolio professionally.

PORTFOLIO HOLDINGS:
{holdings}

Total Deployed: ${total:,.0f} across {count} positions

Provide:
1. SWOT ANALYSIS (Strengths, Weaknesses, Opportunities, Threats)
2. POSITION VERDICTS (HOLD/BUY MORE/REDUCE/SELL for each)
3. RISK ASSESSMENT (concentration, sector, correlation)
4. TOP RECOMMENDATION (single most important action)

Be direct and institutional. No disclaimers."""

        analysis = await narrative_ai.generate_narrative(prompt)
        return {"analysis": analysis, "status": "ok"}
    except Exception as e:
        return {"analysis": f"Analysis unavailable: {str(e)}", "status": "error"}

from app.routers.portfolio_analysis import router as portfolio_router
app.include_router(portfolio_router)

from app.routers.portfolio_analysis import router as portfolio_router
app.include_router(portfolio_router)
