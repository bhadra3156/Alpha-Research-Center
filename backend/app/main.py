from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import scan, analyze, watchlist, portfolio, journal, alerts
from app.routers.portfolio_analysis import router as portfolio_router
import uvicorn

app = FastAPI(
    title="AlphaResearch API",
    description="Institutional Equity Intelligence Engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router,       prefix="/scan",       tags=["Scan"])
app.include_router(analyze.router,    prefix="/analyze",    tags=["Analysis"])
app.include_router(watchlist.router,  prefix="/watchlist",  tags=["Watchlist"])
app.include_router(portfolio.router,  prefix="/portfolio",  tags=["Portfolio"])
app.include_router(journal.router,    prefix="/journal",    tags=["Journal"])
app.include_router(alerts.router,     prefix="/alerts",     tags=["Alerts"])
app.include_router(portfolio_router)

@app.get("/")
async def root():
    return {"status": "AlphaResearch API Online", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "AlphaResearch Backend"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
