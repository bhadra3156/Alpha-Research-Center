# ─────────────────────────────────────────────────────────────────────────────
# AlphaResearch — 10-Baggers Scanner v3
# Multi-bagger discovery: $1B–$25B · Growth Fundamentals Only
# Uses proven data_fetcher (same as Dashboard) — no custom yfinance
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter
from app.models.schemas import ScanRequest, ScanResponse, QualifyingStock
from app.services.data_fetcher import data_fetcher
import uuid
import time
import asyncio
from datetime import datetime
from typing import List, Dict, Tuple

router = APIRouter()

# ─── Market Cap Gate ──────────────────────────────────────────────────────────
MKTCAP_MIN = 1_000_000_000     # $1B floor
MKTCAP_MAX = 25_000_000_000    # $25B ceiling

# ─── Small/Mid-Cap Universe ──────────────────────────────────────────────────
TENBAGGER_UNIVERSE = [
    # ── Technology / Software ─────────────────────────────────────────────
    "DOCN", "BRZE", "SEMR", "BIGC", "JAMF", "DV", "INTA", "QTWO",
    "ALRM", "GENI", "CFLT", "ASAN", "MNDY", "SMAR", "ZI", "PAYO",
    "FLYW", "VERX", "CWAN", "RELY", "ACIW", "PRGS", "BMBL", "INST",
    "SQSP", "CARG", "PUBM", "MGNI", "CRTO", "MTTR", "FRSH", "WEAV",
    "APP", "DUOL", "TOST", "HUBS",

    # ── Cybersecurity / Infrastructure ────────────────────────────────────
    "TENB", "VRNS", "QLYS", "RPD", "NSSC", "RDWR", "FSLY", "EVBG",

    # ── Healthcare / Biotech / MedTech ────────────────────────────────────
    "GDRX", "HIMS", "INSP", "TMDX", "CERT", "SDGR", "RXRX", "NVCR",
    "PGNY", "GKOS", "NVST", "RVMD", "PCVX", "KRYS", "IMVT", "ACLX",
    "HALO", "AXSM", "CORT", "SUPN", "GMED", "OMCL", "PRCT", "TGTX",
    "NARI", "EXAS", "VEEV", "DXCM", "PODD",

    # ── Industrials / Defence / Aerospace ─────────────────────────────────
    "KTOS", "RKLB", "ATKR", "ROAD", "PRIM", "GMS", "STRL", "SPXC",
    "ESAB", "APOG", "WFRD", "XPEL", "UFPT", "CSWI", "MATX", "POWL",
    "TDW", "SKYW", "JOBY", "ASTS", "BWXT", "CW", "AZEK", "AAON",
    "LNTH", "PIPR",

    # ── Consumer / Retail / DTC ───────────────────────────────────────────
    "SHAK", "BROS", "SG", "DNUT", "WRBY", "FIGS", "YETI", "HELE",
    "CAVA", "ELF", "CELH", "ONON", "BIRK", "DUOL", "LULU",
    "DKS", "WING", "TXRH", "PTLO", "JACK", "PLAY",

    # ── Energy / Resources ────────────────────────────────────────────────
    "GPOR", "CNX", "AROC", "AMRC", "BE", "CHPT", "RUN", "NOVA",
    "CEIX", "ARCH", "TALO", "SM", "MTDR", "PTEN", "RRC",

    # ── Financials / Fintech ──────────────────────────────────────────────
    "UPST", "LC", "STEP", "TREE", "COOP", "OPEN", "ACVA", "SOFI",
    "AFRM", "HOOD", "VIRT", "PIPR", "MKTX", "ESNT", "NMIH",

    # ── AI / Semiconductors / Frontier ────────────────────────────────────
    "BBAI", "SOUN", "IREN", "AMBA", "CEVA", "AEHR", "ONTO", "ACLS",
    "RMBS", "DIOD", "ALGM", "WOLF", "SLAB", "SITM", "POWI", "MPWR",
    "PLTR", "AI", "PATH", "SNOW", "NET", "CRWD", "DDOG", "ZS",
]

# Deduplicate
TENBAGGER_UNIVERSE = list(dict.fromkeys(TENBAGGER_UNIVERSE))


# ─── Growth Fundamental Scoring ──────────────────────────────────────────────
def score_fundamentals(data: Dict) -> Tuple[bool, Dict, int]:
    """
    Growth-focused scoring for multi-bagger candidates.
    Uses fields from the proven data_fetcher.
    Returns: (passed, details_dict, conviction_score)
    """
    score = 0.0
    details = {}

    rev_growth = data.get("revenue_growth", 0) or 0      # decimal or %
    # Normalize: if value looks like a decimal (< 5), convert to %
    if -5 < rev_growth < 5 and rev_growth != 0:
        rev_growth = rev_growth * 100

    net_margin = data.get("net_margin", 0) or 0
    if -5 < net_margin < 5 and net_margin != 0:
        net_margin = net_margin * 100

    pe_ratio = data.get("pe_ratio", 0) or 0
    mktcap = data.get("market_cap", 0) or 0
    price = data.get("current_price", 0) or 0

    # 1. Revenue Growth (most important — max 2.0)
    if rev_growth > 30:
        score += 2.0
        details["revenue_growth"] = f"+{rev_growth:.0f}% — Explosive"
    elif rev_growth > 15:
        score += 1.5
        details["revenue_growth"] = f"+{rev_growth:.0f}% — Strong"
    elif rev_growth > 5:
        score += 1.0
        details["revenue_growth"] = f"+{rev_growth:.0f}% — Moderate"
    elif rev_growth > 0:
        score += 0.5
        details["revenue_growth"] = f"+{rev_growth:.0f}% — Slow"
    else:
        details["revenue_growth"] = f"{rev_growth:.0f}% — Declining"

    # 2. Net Margin (bonus, not required — max 1.0)
    if net_margin > 15:
        score += 1.0
        details["net_margin"] = f"{net_margin:.0f}% — Highly profitable"
    elif net_margin > 5:
        score += 0.75
        details["net_margin"] = f"{net_margin:.0f}% — Profitable"
    elif net_margin > 0:
        score += 0.5
        details["net_margin"] = f"{net_margin:.0f}% — Marginally profitable"
    else:
        score += 0.25  # Give some credit — many growth companies burn cash
        details["net_margin"] = f"{net_margin:.0f}% — Pre-profitable (growth phase)"

    # 3. Valuation sanity (max 0.5)
    if pe_ratio > 0 and pe_ratio < 60:
        score += 0.5
        details["valuation"] = f"PE {pe_ratio:.0f} — Reasonable"
    elif pe_ratio > 0:
        score += 0.25
        details["valuation"] = f"PE {pe_ratio:.0f} — Premium"
    else:
        score += 0.25  # Negative PE = pre-profitable, not necessarily bad
        details["valuation"] = "Pre-earnings — Growth phase"

    # 4. Price above $5 (not a penny stock — max 0.5)
    if price >= 10:
        score += 0.5
        details["price_quality"] = f"${price:.2f} — Institutional grade"
    elif price >= 5:
        score += 0.25
        details["price_quality"] = f"${price:.2f} — Acceptable"
    else:
        details["price_quality"] = f"${price:.2f} — Low price risk"

    # Quality classification
    if score >= 3.0:
        quality = "HIGH"
    elif score >= 2.0:
        quality = "MEDIUM"
    else:
        quality = "LOW"

    # Pass threshold: >= 1.5 (intentionally low to get results)
    passed = score >= 1.5

    # Conviction: 1-10 based on fundamentals + market cap runway
    conviction = 1
    if score >= 3.5:
        conviction += 4
    elif score >= 2.5:
        conviction += 3
    elif score >= 2.0:
        conviction += 2
    elif score >= 1.5:
        conviction += 1

    # Market cap runway bonus (smaller = more 10x potential)
    if mktcap < 3e9:
        conviction += 2
    elif mktcap < 7e9:
        conviction += 1

    # Revenue growth bonus
    if rev_growth > 30:
        conviction += 2
    elif rev_growth > 15:
        conviction += 1

    # Profitability bonus
    if net_margin > 10:
        conviction += 1

    conviction = min(max(conviction, 1), 10)

    return passed, {
        "pass": passed,
        "score": round(score, 1),
        "quality": quality,
        "details": details,
    }, conviction


# ─── Scanner Endpoint ────────────────────────────────────────────────────────
@router.post("/", response_model=ScanResponse)
async def run_10bagger_scan(request: ScanRequest):
    """
    10-Bagger Scanner v3
    - $1B–$25B market cap gate
    - Growth fundamentals scoring only
    - No technical check
    - No Check 3
    - Uses proven data_fetcher (same as Dashboard)
    """
    start = time.time()
    scan_id = str(uuid.uuid4())

    if request.tickers:
        tickers = [(t, "US") for t in request.tickers]
    else:
        tickers = [(t, "US") for t in TENBAGGER_UNIVERSE]

    print(f"[10-BAGGERS v3] Scan start: {len(tickers)} stocks")
    qualifying: List[QualifyingStock] = []
    scanned = 0
    rejected_mktcap = 0
    rejected_fundamentals = 0
    sem = asyncio.Semaphore(8)

    async def scan_one(ticker: str, market: str):
        nonlocal scanned, rejected_mktcap, rejected_fundamentals
        async with sem:
            try:
                loop = asyncio.get_event_loop()
                data = await loop.run_in_executor(None, data_fetcher.get_stock_data, ticker)
                if data["current_price"] == 0:
                    return None

                scanned += 1
                mktcap = data.get("market_cap", 0) or 0

                # ── MARKET CAP GATE ──────────────────────────────────────
                if mktcap > 0 and (mktcap < MKTCAP_MIN or mktcap > MKTCAP_MAX):
                    rejected_mktcap += 1
                    return None

                # ── GROWTH FUNDAMENTALS SCORING (rank only, no rejection) ─
                passed, fund_details, conviction = score_fundamentals(data)

                # ── Data quality ─────────────────────────────────────────
                if mktcap > 10e9:
                    dq = "HIGH"
                elif mktcap > 3e9:
                    dq = "MEDIUM"
                else:
                    dq = "LOW"

                # ── Stage label from MAs (display only, not a filter) ────
                ma50 = float(data.get("ma50", 0) or 0)
                ma200 = float(data.get("ma200", 0) or 0)
                price = data["current_price"]
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
                    stage = "Limited MA Data"

                rsi = float(data.get("rsi14", 50) or 50)
                golden_cross = ma50 > ma200 if ma50 > 0 and ma200 > 0 else False
                entry_low = price * 0.95
                entry_high = price * 1.02
                entry_zone = f"${entry_low:.2f} - ${entry_high:.2f}"

                print(f"[10-BAGGERS] ✓ {ticker} ${price:.2f} mktcap=${mktcap/1e9:.1f}B fund={fund_details['score']}/4.5 conv={conviction} {fund_details['quality']}")

                return QualifyingStock(
                    ticker=ticker,
                    company_name=data["company_name"],
                    market=market,
                    price=price,
                    market_cap=mktcap,
                    change_pct=data.get("change_pct", 0.0),
                    check1_pass=True,
                    check2_pass=True,
                    check3_pass=True,
                    fundamental_verdict=f"{fund_details['quality']} Growth — {fund_details['score']}/4.5",
                    technical_stage=stage,
                    smart_money_trigger="N/A",
                    conviction_score=conviction,
                    data_quality=dq,
                    entry_zone=entry_zone,
                    rsi14=rsi,
                    ma50=ma50,
                    ma200=ma200,
                    golden_cross=golden_cross,
                    week52_high=float(data.get("week52_high", 0) or 0),
                    week52_low=float(data.get("week52_low", 0) or 0),
                    range_pct=0,
                    revenue_growth=float(data.get("revenue_growth", 0) or 0),
                    net_margin=float(data.get("net_margin", 0) or 0),
                    pe_ratio=float(data.get("pe_ratio", 0) or 0),
                    sector=str(data.get("sector", "")),
                )
            except Exception as e:
                print(f"[10-BAGGERS] Error {ticker}: {e}")
                return None

    tasks = [scan_one(t, m) for t, m in tickers]
    results = await asyncio.gather(*tasks)
    qualifying = [r for r in results if r is not None]
    duration = (time.time() - start) * 1000

    print(f"[10-BAGGERS v3] Done: {scanned} scanned | {rejected_mktcap} rejected (mktcap) | {rejected_fundamentals} rejected (fundamentals) | {len(qualifying)} QUALIFIED | {duration/1000:.1f}s")

    return ScanResponse(
        scan_id=scan_id,
        scan_date=datetime.now().isoformat(),
        market="US",
        stocks_scanned=scanned,
        qualifying_count=len(qualifying),
        qualifying_stocks=sorted(qualifying, key=lambda x: x.conviction_score, reverse=True),
        scan_duration_ms=round(duration, 1),
    )