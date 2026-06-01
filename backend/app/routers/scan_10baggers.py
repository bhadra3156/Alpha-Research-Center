# ─────────────────────────────────────────────────────────────────────────────
# AlphaResearch — 10-Baggers Scanner v7 (WORKING)
# Uses the PROVEN data_fetcher (same as Dashboard — confirmed working)
# Scores on technical setup: MA50, MA200, RSI, trend, momentum
# No Yahoo .info calls (blocked from cloud servers)
# No FMP (screener is paid-only)
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter
from app.models.schemas import ScanRequest, ScanResponse, QualifyingStock
from app.services.data_fetcher import data_fetcher
import uuid
import time
import asyncio
from datetime import datetime
from typing import List

router = APIRouter()

# ─── Small/Mid-Cap Universe ──────────────────────────────────────────────────
TENBAGGER_UNIVERSE = [
    # Tech / Software
    "DOCN","BRZE","SEMR","JAMF","DV","INTA","QTWO","ALRM","GENI",
    "CFLT","ASAN","MNDY","SMAR","ZI","PAYO","FLYW","VERX","CWAN","RELY",
    "ACIW","PRGS","INST","SQSP","CARG","PUBM","MGNI","CRTO","FRSH",
    "DUOL","TOST",
    # Cybersecurity
    "TENB","VRNS","QLYS","RPD","NSSC",
    # Healthcare / Biotech
    "GDRX","HIMS","INSP","TMDX","CERT","SDGR","NVCR","PGNY","GKOS",
    "NVST","RVMD","PCVX","KRYS","HALO","AXSM","CORT","SUPN","GMED",
    "OMCL","PRCT","TGTX","NARI",
    # Industrials / Defence
    "KTOS","RKLB","ATKR","ROAD","PRIM","GMS","STRL","SPXC","ESAB","APOG",
    "WFRD","XPEL","UFPT","CSWI","MATX","POWL","TDW","SKYW","BWXT",
    "AZEK","AAON","LNTH",
    # Consumer / Retail
    "SHAK","BROS","SG","WRBY","YETI","CAVA","ELF","CELH","ONON","BIRK",
    "WING","TXRH","DKS",
    # Energy
    "GPOR","CNX","AROC","AMRC","BE","CEIX","ARCH","SM","MTDR","RRC",
    # Fintech
    "UPST","LC","STEP","SOFI","AFRM","HOOD","VIRT","MKTX","ESNT","NMIH",
    # AI / Semiconductors
    "SOUN","IREN","AMBA","CEVA","AEHR","ONTO","ACLS","RMBS","DIOD",
    "ALGM","WOLF","SLAB","SITM","POWI",
]

TENBAGGER_UNIVERSE = list(dict.fromkeys(TENBAGGER_UNIVERSE))


# ─── Technical Setup Scoring ──────────────────────────────────────────────────
def score_technical_setup(data: dict) -> int:
    """
    Score 1-10 based on technical setup quality.
    Uses data from the proven data_fetcher (price, MAs, RSI, 52W range).
    """
    score = 1
    price = data.get("current_price", 0) or 0
    ma50 = data.get("ma50", 0) or 0
    ma200 = data.get("ma200", 0) or 0
    rsi = data.get("rsi14", 50) or 50
    w52h = data.get("week52_high", 0) or 0
    w52l = data.get("week52_low", 0) or 0

    if price <= 0:
        return 1

    # Price above MA50 (+2) — short-term uptrend
    if ma50 > 0 and price > ma50:
        score += 2

    # Price above MA200 (+1.5) — long-term uptrend
    if ma200 > 0 and price > ma200:
        score += 1.5

    # Golden cross: MA50 > MA200 (+1) — bullish structure
    if ma50 > 0 and ma200 > 0 and ma50 > ma200:
        score += 1

    # RSI sweet spot: 40-65 (+1) — not overbought, has room to run
    if 40 <= rsi <= 65:
        score += 1
    elif 30 <= rsi < 40:
        score += 0.5  # Oversold, potential bounce

    # 52-week momentum: within 20% of high (+1)
    if w52h > 0 and w52l > 0 and w52h != w52l:
        pct_from_high = (w52h - price) / w52h
        if pct_from_high < 0.10:
            score += 1.5  # Near 52W high — strong momentum
        elif pct_from_high < 0.20:
            score += 1     # Within 20% of high

    # Price above $10 (+0.5) — institutional quality
    if price >= 10:
        score += 0.5

    return min(max(int(round(score)), 1), 10)


# ─── Trend Classification ────────────────────────────────────────────────────
def classify_trend(price, ma50, ma200):
    if ma50 > 0 and ma200 > 0:
        if price > ma50 and ma50 > ma200:
            return "Strong Uptrend", "text-emerald-400"
        elif price > ma50 and price > ma200:
            return "Uptrend", "text-emerald-400"
        elif price > ma200:
            return "Recovery", "text-amber-400"
        elif price > ma50:
            return "Bounce", "text-amber-400"
        else:
            return "Downtrend", "text-rose-400"
    elif ma50 > 0:
        return ("Above MA50", "text-amber-400") if price > ma50 else ("Below MA50", "text-rose-400")
    return "N/A", "text-gray-400"


# ─── Scanner Endpoint ────────────────────────────────────────────────────────
@router.post("/", response_model=ScanResponse)
async def run_10bagger_scan(request: ScanRequest):
    start = time.time()
    scan_id = str(uuid.uuid4())

    symbols = list(TENBAGGER_UNIVERSE)
    print(f"[10B v7] Scanning {len(symbols)} stocks via data_fetcher (proven)")

    qualifying = []
    scanned = 0
    sem = asyncio.Semaphore(8)

    async def scan_one(ticker: str):
        nonlocal scanned
        async with sem:
            try:
                loop = asyncio.get_event_loop()
                data = await loop.run_in_executor(None, data_fetcher.get_stock_data, ticker)

                price = data.get("current_price", 0) or 0
                if price == 0:
                    return

                scanned += 1
                conviction = score_technical_setup(data)

                ma50 = float(data.get("ma50", 0) or 0)
                ma200 = float(data.get("ma200", 0) or 0)
                rsi = float(data.get("rsi14", 50) or 50)
                w52h = float(data.get("week52_high", 0) or 0)
                w52l = float(data.get("week52_low", 0) or 0)
                chg = float(data.get("change_pct", 0) or 0)
                company = data.get("company_name", ticker)
                sector = data.get("sector", "") or ""
                golden_cross = ma50 > ma200 if ma50 > 0 and ma200 > 0 else False

                trend_label, _ = classify_trend(price, ma50, ma200)

                # 52W range position
                range_pct = 0
                if w52h > 0 and w52l > 0 and w52h != w52l:
                    range_pct = ((price - w52l) / (w52h - w52l)) * 100

                # Entry zone
                entry_zone = f"${price*0.95:.2f} - ${price*1.02:.2f}" if price >= 5 else "N/A"

                # Verdict based on technical setup
                if conviction >= 8:
                    verdict = "Strong setup — Uptrend + Momentum"
                elif conviction >= 6:
                    verdict = "Good setup — Above key MAs"
                elif conviction >= 4:
                    verdict = "Mixed — Partial trend confirmation"
                else:
                    verdict = "Weak — Below key MAs"

                # Data quality (simple since we don't have market cap)
                dq = "HIGH" if ma50 > 0 and ma200 > 0 and w52h > 0 else "MEDIUM"

                qualifying.append(QualifyingStock(
                    ticker=ticker,
                    company_name=company,
                    market="US",
                    price=price,
                    market_cap=0,
                    change_pct=chg,
                    check1_pass=conviction >= 6,
                    check2_pass=price > ma50 if ma50 > 0 else False,
                    check3_pass=True,
                    fundamental_verdict=verdict,
                    technical_stage=trend_label,
                    smart_money_trigger="N/A",
                    conviction_score=conviction,
                    data_quality=dq,
                    entry_zone=entry_zone,
                    rsi14=rsi,
                    ma50=ma50,
                    ma200=ma200,
                    golden_cross=golden_cross,
                    week52_high=w52h,
                    week52_low=w52l,
                    range_pct=round(range_pct, 1),
                    revenue_growth=0,
                    net_margin=0,
                    pe_ratio=0,
                    sector=sector,
                ))
            except Exception as e:
                print(f"[10B] Error {ticker}: {e}")

    tasks = [scan_one(t) for t in symbols]
    await asyncio.gather(*tasks)

    qualifying.sort(key=lambda x: x.conviction_score, reverse=True)
    duration = (time.time() - start) * 1000

    print(f"[10B v7] DONE: {scanned} scanned | {len(qualifying)} qualified | {duration/1000:.1f}s")

    return ScanResponse(
        scan_id=scan_id,
        scan_date=datetime.now().isoformat(),
        market="US",
        stocks_scanned=scanned,
        qualifying_count=len(qualifying),
        qualifying_stocks=qualifying,
        scan_duration_ms=round(duration, 1),
    )
    @router.get("/test-finviz")
async def test_finviz():
    """Quick test: can Render fetch from Finviz?"""
    try:
        from finvizfinance.quote import finvizfinance as fvz
        stock = fvz("AAPL")
        data = stock.ticker_fundament()
        print(f"[FINVIZ TEST] AAPL data: {data}")
        return {"status": "ok", "ticker": "AAPL", "data": data}
    except Exception as e:
        print(f"[FINVIZ TEST] FAILED: {e}")
        return {"status": "error", "error": str(e)}