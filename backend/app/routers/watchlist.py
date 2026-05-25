from fastapi import APIRouter
from app.models.schemas import WatchlistItem

router = APIRouter()

WATCHLIST = [
    {"ticker":"NVDA","company_name":"NVIDIA Corporation","market":"US","sector":"Semiconductors","theme":"AI Infrastructure"},
    {"ticker":"AMD", "company_name":"Advanced Micro Devices","market":"US","sector":"Semiconductors","theme":"AI Infrastructure"},
    {"ticker":"MSFT","company_name":"Microsoft Corporation","market":"US","sector":"Software","theme":"AI Infrastructure"},
    {"ticker":"GOOGL","company_name":"Alphabet Inc","market":"US","sector":"Internet","theme":"AI Infrastructure"},
    {"ticker":"META","company_name":"Meta Platforms","market":"US","sector":"Social Media","theme":"AI Infrastructure"},
    {"ticker":"AVGO","company_name":"Broadcom Inc","market":"US","sector":"Semiconductors","theme":"AI Infrastructure"},
    {"ticker":"LLY", "company_name":"Eli Lilly","market":"US","sector":"Pharma","theme":"Healthcare"},
    {"ticker":"V",   "company_name":"Visa Inc","market":"US","sector":"Payments","theme":"Financials"},
    {"ticker":"BA.L","company_name":"BAE Systems","market":"UK","sector":"Defence","theme":"UK Defence"},
    {"ticker":"RR.L","company_name":"Rolls-Royce Holdings","market":"UK","sector":"Aerospace","theme":"UK Defence"},
]

@router.get("/")
async def get_watchlist(): return WATCHLIST

@router.post("/")
async def add_to_watchlist(item: WatchlistItem):
    WATCHLIST.append(item.dict())
    return {"status": "added", "ticker": item.ticker}

@router.delete("/{ticker}")
async def remove_from_watchlist(ticker: str):
    global WATCHLIST
    WATCHLIST = [w for w in WATCHLIST if w["ticker"] != ticker.upper()]
    return {"status": "removed", "ticker": ticker}