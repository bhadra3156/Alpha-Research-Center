# ─────────────────────────────────────────────────────────────────────────────
# AlphaResearch — 10-Baggers Scanner v5 (FMP Quote-Based)
# Uses FMP batch quote endpoint (free tier) for REAL data:
# market cap, PE, MA50, MA200, 52W range, volume
# Then filters by market cap and scores by quality
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter
from app.models.schemas import ScanRequest, ScanResponse, QualifyingStock
import os
import requests
import uuid
import time
from datetime import datetime
from typing import List, Dict

router = APIRouter()

# ─── Config ───────────────────────────────────────────────────────────────────
FMP_KEY = os.getenv("FMP_API_KEY", "")

# Market cap range
MKTCAP_MIN = 500_000_000     # $500M floor
MKTCAP_MAX = 10_000_000_000  # $10B ceiling

# ─── Universe ────────────────────────────────────────────────────────────────
# Curated small/mid-cap candidates across sectors
# FMP quote endpoint gives us REAL data for each
# ─────────────────────────────────────────────────────────────────────────────
TENBAGGER_UNIVERSE = [
    # Tech / Software
    "DOCN","BRZE","SEMR","BIGC","JAMF","DV","INTA","QTWO","ALRM","GENI",
    "CFLT","ASAN","MNDY","SMAR","ZI","PAYO","FLYW","VERX","CWAN","RELY",
    "ACIW","PRGS","BMBL","INST","SQSP","CARG","PUBM","MGNI","CRTO","FRSH",
    "APP","DUOL","TOST","HUBS",
    # Cybersecurity
    "TENB","VRNS","QLYS","RPD","NSSC","RDWR","FSLY","EVBG",
    # Healthcare / Biotech
    "GDRX","HIMS","INSP","TMDX","CERT","SDGR","RXRX","NVCR","PGNY","GKOS",
    "NVST","RVMD","PCVX","KRYS","IMVT","ACLX","HALO","AXSM","CORT","SUPN",
    "GMED","OMCL","PRCT","TGTX","NARI","EXAS","VEEV","DXCM","PODD",
    # Industrials / Defence
    "KTOS","RKLB","ATKR","ROAD","PRIM","GMS","STRL","SPXC","ESAB","APOG",
    "WFRD","XPEL","UFPT","CSWI","MATX","POWL","TDW","SKYW","JOBY","ASTS",
    "BWXT","CW","AZEK","AAON","LNTH","PIPR",
    # Consumer / Retail
    "SHAK","BROS","SG","DNUT","WRBY","FIGS","YETI","HELE","CAVA","ELF",
    "CELH","ONON","BIRK","WING","TXRH","PTLO","JACK","PLAY","DKS",
    # Energy
    "GPOR","CNX","AROC","AMRC","BE","CHPT","RUN","NOVA","CEIX","ARCH",
    "TALO","SM","MTDR","PTEN","RRC",
    # Fintech
    "UPST","LC","STEP","TREE","COOP","OPEN","ACVA","SOFI","AFRM","HOOD",
    "VIRT","MKTX","ESNT","NMIH",
    # AI / Semiconductors
    "BBAI","SOUN","IREN","AMBA","CEVA","AEHR","ONTO","ACLS","RMBS","DIOD",
    "ALGM","WOLF","SLAB","SITM","POWI","MPWR","PLTR","AI","PATH","SNOW",
    "NET","CRWD","DDOG","ZS",
]

TENBAGGER_UNIVERSE = list(dict.fromkeys(TENBAGGER_UNIVERSE))


# ─── FMP Batch Quote Fetch ────────────────────────────────────────────────────
def fmp_batch_quote(symbols: List[str]) -> Dict[str, Dict]:
    """
    Fetch real-time quotes from FMP for multiple tickers.
    Returns: price, marketCap, changesPercentage, pe, eps, yearHigh, yearLow,
    priceAvg50, priceAvg200, volume, avgVolume, exchange, name, etc.
    Batch: up to 50 tickers per call.
    """
    quotes = {}

    for i in range(0, len(symbols), 50):
        batch = symbols[i:i+50]
        tickers_str = ",".join(batch)

        # Try stable API first, then v3 fallback
        urls = [
            f"https://financialmodelingprep.com/stable/batch-quote?symbols={tickers_str}&apikey={FMP_KEY}",
            f"https://financialmodelingprep.com/api/v3/quote/{tickers_str}?apikey={FMP_KEY}",
        ]

        for url in urls:
            try:
                resp = requests.get(url, timeout=30)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list) and len(data) > 0:
                        for item in data:
                            sym = item.get("symbol", "")
                            if sym:
                                quotes[sym] = item
                        print(f"[10-BAGGERS] FMP quote batch: got {len(data)} quotes from {url[:60]}...")
                        break  # Success, skip fallback URL
                    else:
                        print(f"[10-BAGGERS] FMP quote empty response from {url[:60]}")
                else:
                    print(f"[10-BAGGERS] FMP quote {resp.status_code} from {url[:60]}")
            except Exception as e:
                print(f"[10-BAGGERS] FMP quote error: {e}")

    return quotes


# ─── Scoring ──────────────────────────────────────────────────────────────────
def score_stock(q: Dict) -> int:
    """
    Score 1-10 based on FMP quote data.
    Uses: marketCap, pe, changesPercentage, priceAvg50, priceAvg200, volume
    """
    score = 1
    price = q.get("price", 0) or 0
    mktcap = q.get("marketCap", 0) or 0
    pe = q.get("pe", 0) or 0
    eps = q.get("eps", 0) or 0
    chg = q.get("changesPercentage", 0) or 0
    ma50 = q.get("priceAvg50", 0) or 0
    ma200 = q.get("priceAvg200", 0) or 0
    volume = q.get("volume", 0) or q.get("avgVolume", 0) or 0
    year_high = q.get("yearHigh", 0) or 0
    year_low = q.get("yearLow", 0) or 0

    # Market cap runway (smaller = more 10x potential) — max +3
    if 0 < mktcap < 2e9:
        score += 3
    elif mktcap < 5e9:
        score += 2
    elif mktcap < 8e9:
        score += 1

    # Price above MA50 (uptrend) — max +1
    if ma50 > 0 and price > ma50:
        score += 1

    # Price above MA200 (long-term uptrend) — max +1
    if ma200 > 0 and price > ma200:
        score += 1

    # Golden cross (MA50 > MA200) — max +1
    if ma50 > 0 and ma200 > 0 and ma50 > ma200:
        score += 1

    # Positive earnings (profitable) — max +1
    if eps > 0:
        score += 1

    # Reasonable PE (not over-valued) — max +1
    if pe > 0 and pe < 50:
        score += 1

    # 52-week range position (closer to high = momentum) — max +1
    if year_high > 0 and year_low > 0 and year_high != year_low:
        range_pct = (price - year_low) / (year_high - year_low)
        if range_pct > 0.6:
            score += 1

    return min(max(score, 1), 10)


# ─── Scanner Endpoint ────────────────────────────────────────────────────────
@router.post("/", response_model=ScanResponse)
async def run_10bagger_scan(request: ScanRequest):
    """
    10-Bagger Scanner v5 — FMP Quote-Based
    1. Batch quotes from FMP for ~150 stocks (3 API calls)
    2. Filter by market cap $500M-$10B
    3. Score by quality + momentum + runway
    4. Return sorted results with REAL data
    """
    start = time.time()
    scan_id = str(uuid.uuid4())

    if not FMP_KEY:
        print("[10-BAGGERS] ERROR: FMP_API_KEY not set!")
        return ScanResponse(
            scan_id=scan_id, scan_date=datetime.now().isoformat(),
            market="US", stocks_scanned=0, qualifying_count=0,
            qualifying_stocks=[], scan_duration_ms=0,
        )

    symbols = list(TENBAGGER_UNIVERSE)
    print(f"[10-BAGGERS v5] Fetching FMP quotes for {len(symbols)} stocks...")

    # ── Step 1: Get real quotes ──────────────────────────────────────────
    quotes = fmp_batch_quote(symbols)
    print(f"[10-BAGGERS v5] Got {len(quotes)} quotes with real data")

    if not quotes:
        print("[10-BAGGERS v5] No quotes returned — FMP API may be down or key invalid")
        return ScanResponse(
            scan_id=scan_id, scan_date=datetime.now().isoformat(),
            market="US", stocks_scanned=0, qualifying_count=0,
            qualifying_stocks=[], scan_duration_ms=round((time.time()-start)*1000, 1),
        )

    # ── Step 2: Filter by market cap and build results ───────────────────
    qualifying: List[QualifyingStock] = []
    total_scanned = len(quotes)
    rejected_mktcap = 0

    for sym, q in quotes.items():
        price = q.get("price", 0) or 0
        mktcap = q.get("marketCap", 0) or 0

        if price <= 0:
            continue

        # Market cap filter (skip if unknown)
        if mktcap > 0 and (mktcap < MKTCAP_MIN or mktcap > MKTCAP_MAX):
            rejected_mktcap += 1
            continue

        # Score
        conviction = score_stock(q)

        # Extract data
        company = q.get("name", "") or sym
        chg_pct = q.get("changesPercentage", 0) or 0
        ma50 = q.get("priceAvg50", 0) or 0
        ma200 = q.get("priceAvg200", 0) or 0
        pe = q.get("pe", 0) or 0
        eps = q.get("eps", 0) or 0
        vol = q.get("avgVolume", 0) or q.get("volume", 0) or 0
        year_high = q.get("yearHigh", 0) or 0
        year_low = q.get("yearLow", 0) or 0
        exchange = q.get("exchange", "") or ""

        # Trend label
        golden_cross = ma50 > ma200 if ma50 > 0 and ma200 > 0 else False
        if ma50 > 0 and ma200 > 0:
            if price > ma50 > ma200:
                stage = "Uptrend — Above MA50 & MA200"
            elif price > ma200:
                stage = "Recovery — Above MA200"
            elif price > ma50:
                stage = "Bouncing — Above MA50"
            else:
                stage = "Downtrend — Below MAs"
        else:
            stage = "N/A"

        # Data quality
        if mktcap > 3e9 and pe > 0:
            dq = "HIGH"
        elif mktcap > 1e9:
            dq = "MEDIUM"
        else:
            dq = "LOW"

        # Fundamental verdict
        if eps > 0 and pe > 0 and pe < 40:
            verdict = f"Profitable · PE {pe:.0f} · EPS ${eps:.2f}"
        elif eps > 0:
            verdict = f"Profitable · EPS ${eps:.2f}"
        else:
            verdict = "Pre-profitable · Growth phase"

        # Entry zone
        entry_zone = f"${price*0.95:.2f} - ${price*1.02:.2f}" if price > 5 else "N/A"

        # RSI estimate from 52-week range position
        rsi_est = 50.0
        if year_high > 0 and year_low > 0 and year_high != year_low:
            rsi_est = ((price - year_low) / (year_high - year_low)) * 100
            rsi_est = max(10, min(90, rsi_est))

        qualifying.append(QualifyingStock(
            ticker=sym,
            company_name=company,
            market="US",
            price=price,
            market_cap=mktcap,
            change_pct=chg_pct,
            check1_pass=eps > 0,       # Profitable = fundamental pass
            check2_pass=price > ma50 if ma50 > 0 else True,  # Above MA50 = technical pass
            check3_pass=True,
            fundamental_verdict=verdict,
            technical_stage=stage,
            smart_money_trigger="N/A",
            conviction_score=conviction,
            data_quality=dq,
            entry_zone=entry_zone,
            rsi14=rsi_est,
            ma50=ma50,
            ma200=ma200,
            golden_cross=golden_cross,
            week52_high=year_high,
            week52_low=year_low,
            range_pct=0,
            revenue_growth=0,
            net_margin=0,
            pe_ratio=pe,
            sector=exchange,  # Using exchange as sector since quote doesn't return sector
        ))

    # Sort by conviction
    qualifying.sort(key=lambda x: x.conviction_score, reverse=True)

    duration = (time.time() - start) * 1000
    print(f"[10-BAGGERS v5] COMPLETE: {total_scanned} quoted | {rejected_mktcap} rejected (mktcap) | {len(qualifying)} QUALIFIED | {duration/1000:.1f}s")

    return ScanResponse(
        scan_id=scan_id,
        scan_date=datetime.now().isoformat(),
        market="US",
        stocks_scanned=total_scanned,
        qualifying_count=len(qualifying),
        qualifying_stocks=qualifying,
        scan_duration_ms=round(duration, 1),
    )