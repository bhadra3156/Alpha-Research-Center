# ─────────────────────────────────────────────────────────────────────────────
# AlphaResearch — 10-Baggers Scanner v6 (FINAL)
# Uses yfinance .info directly — handles Yahoo auth internally
# Returns REAL: market cap, revenue growth, margins, PE, sector
# No data_fetcher (broken for fundamentals), no FMP (paid only)
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter
from app.models.schemas import ScanRequest, ScanResponse, QualifyingStock
import yfinance as yf
import uuid
import time
import asyncio
from datetime import datetime
from typing import List, Dict, Optional

router = APIRouter()

# ─── Market Cap Gate ──────────────────────────────────────────────────────────
MKTCAP_MIN = 500_000_000     # $500M floor
MKTCAP_MAX = 15_000_000_000  # $15B ceiling

# ─── Universe ────────────────────────────────────────────────────────────────
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


# ─── Single Stock Fetch via yfinance .info ────────────────────────────────────
def get_stock_info(ticker: str) -> Optional[Dict]:
    """
    Uses yfinance .info which handles Yahoo auth (crumb/cookie) internally.
    ONE call per stock. Returns everything we need.
    """
    try:
        t = yf.Ticker(ticker)
        info = t.info

        if not info or not isinstance(info, dict):
            print(f"[10B] SKIP {ticker}: no info returned")
            return None

        price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
        if price == 0:
            print(f"[10B] SKIP {ticker}: price=0")
            return None

        mktcap = info.get("marketCap") or 0
        rev_growth = info.get("revenueGrowth") or 0           # decimal: 0.25 = 25%
        gross_margins = info.get("grossMargins") or 0          # decimal
        profit_margins = info.get("profitMargins") or 0        # decimal
        pe = info.get("trailingPE") or info.get("forwardPE") or 0
        eps = info.get("trailingEps") or 0
        total_revenue = info.get("totalRevenue") or 0
        free_cashflow = info.get("freeCashflow") or 0
        debt_to_equity = info.get("debtToEquity") or 0
        sector = info.get("sector") or ""
        industry = info.get("industry") or ""
        name = info.get("shortName") or info.get("longName") or ticker
        ma50 = info.get("fiftyDayAverage") or 0
        ma200 = info.get("twoHundredDayAverage") or 0
        w52h = info.get("fiftyTwoWeekHigh") or 0
        w52l = info.get("fiftyTwoWeekLow") or 0
        beta = info.get("beta") or 0
        vol = info.get("averageVolume") or 0
        chg_pct = info.get("regularMarketChangePercent") or 0

        print(f"[10B] OK {ticker}: ${price:.2f} mktcap=${mktcap/1e9:.1f}B rev={rev_growth*100:.0f}% margin={profit_margins*100:.0f}% PE={pe:.0f} sector={sector[:15]}")

        return {
            "ticker": ticker,
            "name": name,
            "price": price,
            "marketCap": mktcap,
            "revenueGrowth": rev_growth,
            "grossMargins": gross_margins,
            "profitMargins": profit_margins,
            "pe": pe,
            "eps": eps,
            "totalRevenue": total_revenue,
            "freeCashflow": free_cashflow,
            "debtToEquity": debt_to_equity,
            "sector": sector,
            "industry": industry,
            "ma50": ma50,
            "ma200": ma200,
            "w52h": w52h,
            "w52l": w52l,
            "beta": beta,
            "volume": vol,
            "changePct": chg_pct,
        }
    except Exception as e:
        print(f"[10B] ERROR {ticker}: {e}")
        return None


# ─── Scoring ──────────────────────────────────────────────────────────────────
def score_stock(d: Dict) -> int:
    score = 1
    rev = d.get("revenueGrowth", 0) or 0
    gm = d.get("grossMargins", 0) or 0
    pm = d.get("profitMargins", 0) or 0
    mktcap = d.get("marketCap", 0) or 0
    pe = d.get("pe", 0) or 0
    fcf = d.get("freeCashflow", 0) or 0
    dte = d.get("debtToEquity", 0) or 0
    price = d.get("price", 0) or 0
    ma50 = d.get("ma50", 0) or 0
    ma200 = d.get("ma200", 0) or 0

    # Revenue growth (max +3)
    if rev > 0.30: score += 3
    elif rev > 0.15: score += 2
    elif rev > 0.05: score += 1

    # Gross margins (max +1)
    if gm > 0.50: score += 1
    elif gm > 0.30: score += 0.5

    # Market cap runway (max +2)
    if 0 < mktcap < 3e9: score += 2
    elif mktcap < 7e9: score += 1

    # Trend: above MA50 + MA200 (max +1)
    if ma50 > 0 and ma200 > 0 and price > ma50 > ma200:
        score += 1

    # Profitable (max +1)
    if pm > 0.05: score += 1

    # FCF positive (max +0.5)
    if fcf > 0: score += 0.5

    return min(max(int(round(score)), 1), 10)


# ─── Scanner Endpoint ────────────────────────────────────────────────────────
@router.post("/", response_model=ScanResponse)
async def run_10bagger_scan(request: ScanRequest):
    start = time.time()
    scan_id = str(uuid.uuid4())

    symbols = list(TENBAGGER_UNIVERSE)
    print(f"[10B v6] Starting scan of {len(symbols)} stocks via yfinance .info")

    results: List[Dict] = []
    sem = asyncio.Semaphore(4)  # Low concurrency to avoid Yahoo rate limits

    async def fetch_one(ticker: str):
        async with sem:
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, get_stock_info, ticker)
            if data:
                results.append(data)

    # Process in batches of 20 with small delays
    for i in range(0, len(symbols), 20):
        batch = symbols[i:i+20]
        tasks = [fetch_one(t) for t in batch]
        await asyncio.gather(*tasks)
        if i + 20 < len(symbols):
            await asyncio.sleep(0.5)  # Brief pause between batches

    print(f"[10B v6] Got data for {len(results)} stocks")

    # Filter by market cap and build qualifying list
    qualifying: List[QualifyingStock] = []
    rejected = 0

    for d in results:
        mktcap = d.get("marketCap", 0) or 0
        price = d.get("price", 0) or 0

        # Market cap gate (skip if unknown)
        if mktcap > 0 and (mktcap < MKTCAP_MIN or mktcap > MKTCAP_MAX):
            rejected += 1
            continue

        conviction = score_stock(d)

        # Build display fields
        ma50 = d.get("ma50", 0) or 0
        ma200 = d.get("ma200", 0) or 0
        golden_cross = ma50 > ma200 if ma50 > 0 and ma200 > 0 else False

        if ma50 > 0 and ma200 > 0:
            if price > ma50 > ma200: stage = "Uptrend"
            elif price > ma200: stage = "Recovery"
            elif price > ma50: stage = "Bounce"
            else: stage = "Downtrend"
        else:
            stage = "N/A"

        rev = (d.get("revenueGrowth", 0) or 0)
        pm = (d.get("profitMargins", 0) or 0)
        gm = (d.get("grossMargins", 0) or 0)
        pe = d.get("pe", 0) or 0

        if rev > 0.20 and gm > 0.40:
            verdict = f"HIGH Growth +{rev*100:.0f}% · GM {gm*100:.0f}%"
        elif rev > 0.10:
            verdict = f"Growth +{rev*100:.0f}%"
        elif pm > 0.10:
            verdict = f"Profitable · Margin {pm*100:.0f}%"
        else:
            verdict = "Early stage"

        dq = "HIGH" if mktcap > 5e9 else ("MEDIUM" if mktcap > 2e9 else "LOW")

        entry_zone = f"${price*0.95:.2f} - ${price*1.02:.2f}" if price > 5 else "N/A"

        qualifying.append(QualifyingStock(
            ticker=d["ticker"],
            company_name=d["name"],
            market="US",
            price=price,
            market_cap=mktcap,
            change_pct=d.get("changePct", 0) or 0,
            check1_pass=rev > 0.05 or pm > 0,
            check2_pass=price > ma50 if ma50 > 0 else True,
            check3_pass=True,
            fundamental_verdict=verdict,
            technical_stage=stage,
            smart_money_trigger="N/A",
            conviction_score=conviction,
            data_quality=dq,
            entry_zone=entry_zone,
            rsi14=50,
            ma50=ma50,
            ma200=ma200,
            golden_cross=golden_cross,
            week52_high=d.get("w52h", 0) or 0,
            week52_low=d.get("w52l", 0) or 0,
            range_pct=0,
            revenue_growth=rev,
            net_margin=pm,
            pe_ratio=pe,
            sector=d.get("sector", ""),
        ))

    qualifying.sort(key=lambda x: x.conviction_score, reverse=True)
    duration = (time.time() - start) * 1000

    print(f"[10B v6] DONE: {len(results)} fetched | {rejected} rejected (mktcap) | {len(qualifying)} QUALIFIED | {duration/1000:.1f}s")

    return ScanResponse(
        scan_id=scan_id,
        scan_date=datetime.now().isoformat(),
        market="US",
        stocks_scanned=len(results),
        qualifying_count=len(qualifying),
        qualifying_stocks=qualifying,
        scan_duration_ms=round(duration, 1),
    )