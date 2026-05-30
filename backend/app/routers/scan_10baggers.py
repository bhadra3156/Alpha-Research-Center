# ─────────────────────────────────────────────────────────────────────────────
# AlphaResearch — 10-Baggers Scanner v2
# Multi-bagger discovery engine: $500M–$7B market cap sweet spot
# 2-Check system: Growth Fundamentals + 89-Day MA Trend Filter
# No Check 3 — institutional/insider data not required
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter
from app.models.schemas import ScanRequest, ScanResponse, QualifyingStock
import yfinance as yf
import uuid
import time
import asyncio
import numpy as np
from datetime import datetime
from typing import List, Dict, Tuple, Optional

router = APIRouter()

# ─── Market Cap Gate ──────────────────────────────────────────────────────────
MKTCAP_MIN = 500_000_000      # $500M floor
MKTCAP_MAX = 7_000_000_000    # $7B ceiling

# ─── Small-Cap Universe ──────────────────────────────────────────────────────
# Curated Russell 2000 / early mid-cap names across sectors
# All NYSE / NASDAQ — no OTC or penny stocks
# Market cap gate enforced at scan time
# ─────────────────────────────────────────────────────────────────────────────

TENBAGGER_UNIVERSE = [
    # ── Technology / Software ─────────────────────────────────────────────
    "DOCN", "BRZE", "SEMR", "BIGC", "JAMF", "DV", "INTA", "QTWO",
    "ALRM", "GENI", "CFLT", "ASAN", "MNDY", "SMAR", "ZI", "PAYO",
    "FLYW", "VERX", "CWAN", "RELY", "ACIW", "PRGS", "BMBL", "INST",
    "VCYT", "SMWB", "WEAV", "FRSH", "SQSP", "CARG", "ENFN", "VNET",
    "YOU", "TASK", "ATER", "PUBM", "MGNI", "CRTO", "LPSN", "MTTR",

    # ── Cybersecurity / Infrastructure ────────────────────────────────────
    "TENB", "VRNS", "QLYS", "RPD", "NSSC", "RDWR", "SRAD", "FSLY",
    "EVBG", "SCWX",

    # ── Healthcare / Biotech / MedTech ────────────────────────────────────
    "GDRX", "HIMS", "INSP", "TMDX", "CERT", "SDGR", "RXRX", "NVCR",
    "PGNY", "GKOS", "NVST", "RVMD", "PCVX", "KRYS", "IMVT", "ACLX",
    "HALO", "AXSM", "CORT", "SUPN", "GMED", "OMCL", "ICUI", "PRCT",
    "TGTX", "CRNX", "TVTX", "RCKT", "DAWN", "VERA", "SAVA", "NARI",

    # ── Industrials / Defence / Aerospace ─────────────────────────────────
    "KTOS", "RKLB", "ATKR", "ROAD", "PRIM", "GMS", "STRL", "SPXC",
    "ESAB", "APOG", "WFRD", "XPEL", "UFPT", "CSWI", "MATX", "POWL",
    "TDW", "SKYW", "JOBY", "ASTS", "RDW", "BWXT", "CW", "HAYW",
    "AZEK", "GATE", "ROCK", "AAON", "LNTH", "PIPR",

    # ── Consumer / Retail / DTC ───────────────────────────────────────────
    "SHAK", "BROS", "SG", "DNUT", "WRBY", "FIGS", "YETI", "HELE",
    "CAVA", "ELF", "CELH", "ONON", "BIRK", "DUOL", "TOST",
    "LULU", "DKS", "WING", "TXRH", "DSGX", "PTLO", "JACK", "PLAY",

    # ── Energy / Clean Tech / Resources ───────────────────────────────────
    "GPOR", "CNX", "AROC", "AMRC", "STEM", "ENVX", "BE", "CHPT",
    "RUN", "NOVA", "CALX", "SEDG", "SHLS", "GTES", "CEIX", "ARCH",
    "TALO", "SM", "MTDR", "PTEN", "RRC", "EXE",

    # ── Financials / Fintech ──────────────────────────────────────────────
    "UPST", "LC", "STEP", "TREE", "COOP", "OPEN", "ACVA", "SOFI",
    "AFRM", "LPRO", "ESNT", "NMIH", "CACC", "IBKR", "HOOD", "VIRT",
    "PIPR", "MKTX", "CBSH", "GBCI", "BANR", "FIBK",

    # ── AI / Robotics / Frontier Tech ─────────────────────────────────────
    "BBAI", "SOUN", "IREN", "PRCT", "RCAT", "LUNR", "AMBA", "CEVA",
    "AEHR", "ONTO", "ACLS", "RMBS", "DIOD", "ALGM", "WOLF", "SLAB",
    "SITM", "POWI", "MPWR",
]

# Deduplicate
TENBAGGER_UNIVERSE = list(dict.fromkeys(TENBAGGER_UNIVERSE))


# ─── Custom Data Fetcher for Small-Caps ───────────────────────────────────────
def fetch_stock_data(ticker: str) -> Optional[Dict]:
    """
    Fetch comprehensive stock data using yfinance.
    Returns None if data is unavailable.
    """
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}

        price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
        if price == 0:
            return None

        mktcap = info.get("marketCap") or 0
        if mktcap == 0:
            return None

        # ── Historical data for 89-day MA ────────────────────────────────
        hist = t.history(period="6mo", interval="1d")
        ma89 = None
        if hist is not None and len(hist) >= 89:
            ma89 = float(hist["Close"].rolling(window=89).mean().iloc[-1])

        # ── Weekly close check ───────────────────────────────────────────
        hist_weekly = t.history(period="6mo", interval="1wk")
        weekly_close = None
        if hist_weekly is not None and len(hist_weekly) >= 1:
            weekly_close = float(hist_weekly["Close"].iloc[-1])

        # ── RSI calculation (14-day) ─────────────────────────────────────
        rsi = 50.0
        if hist is not None and len(hist) >= 15:
            delta = hist["Close"].diff()
            gain = delta.where(delta > 0, 0).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain.iloc[-1] / loss.iloc[-1] if loss.iloc[-1] != 0 else 100
            rsi = float(100 - (100 / (1 + rs)))

        # ── MA50 and MA200 for display ───────────────────────────────────
        ma50 = float(hist["Close"].rolling(50).mean().iloc[-1]) if hist is not None and len(hist) >= 50 else 0
        ma200 = float(hist["Close"].rolling(200).mean().iloc[-1]) if hist is not None and len(hist) >= 200 else 0

        return {
            "ticker": ticker,
            "company_name": info.get("shortName") or info.get("longName") or ticker,
            "current_price": price,
            "market_cap": mktcap,
            "sector": info.get("sector") or "",
            "industry": info.get("industry") or "",
            "change_pct": info.get("regularMarketChangePercent") or 0,
            # Fundamentals
            "revenue_growth": info.get("revenueGrowth") or 0,       # decimal (0.25 = 25%)
            "gross_margins": info.get("grossMargins") or 0,          # decimal
            "net_margin": (info.get("profitMargins") or info.get("netIncomeToCommon", 0) / max(info.get("totalRevenue", 1), 1)) if info.get("profitMargins") else 0,
            "total_revenue": info.get("totalRevenue") or 0,
            "free_cashflow": info.get("freeCashflow") or 0,
            "debt_to_equity": info.get("debtToEquity") or 0,        # percentage (e.g. 50 = 50%)
            "pe_ratio": info.get("forwardPE") or info.get("trailingPE") or 0,
            # Technicals
            "ma89": ma89,
            "weekly_close": weekly_close or price,
            "ma50": ma50,
            "ma200": ma200,
            "rsi14": rsi,
            "week52_high": info.get("fiftyTwoWeekHigh") or 0,
            "week52_low": info.get("fiftyTwoWeekLow") or 0,
        }
    except Exception as e:
        print(f"[10-BAGGERS] Data fetch error {ticker}: {e}")
        return None


# ─── Check 1: Growth Fundamentals (Small-Cap Optimized) ───────────────────────
def check_fundamentals(data: Dict) -> Tuple[bool, Dict]:
    """
    Small-cap fundamental scoring — growth over profitability.
    Score out of 5.0. Pass threshold: >= 2.0
    """
    score = 0.0
    details = {}

    rev_growth = (data.get("revenue_growth") or 0) * 100   # convert to %
    gross_margin = (data.get("gross_margins") or 0) * 100
    net_margin = (data.get("net_margin") or 0) * 100
    revenue = data.get("total_revenue") or 0
    fcf = data.get("free_cashflow") or 0
    dte = data.get("debt_to_equity") or 0

    # Revenue Growth (most important for multi-baggers)
    if rev_growth > 30:
        score += 1.5
        details["revenue_growth"] = {"value": f"+{rev_growth:.0f}%", "note": "Explosive growth"}
    elif rev_growth > 15:
        score += 1.0
        details["revenue_growth"] = {"value": f"+{rev_growth:.0f}%", "note": "Strong growth"}
    elif rev_growth > 5:
        score += 0.5
        details["revenue_growth"] = {"value": f"+{rev_growth:.0f}%", "note": "Moderate growth"}
    else:
        details["revenue_growth"] = {"value": f"{rev_growth:.0f}%", "note": "Slow/negative"}

    # Gross Margins (proves unit economics)
    if gross_margin > 60:
        score += 1.0
        details["gross_margins"] = {"value": f"{gross_margin:.0f}%", "note": "Excellent unit economics"}
    elif gross_margin > 40:
        score += 0.75
        details["gross_margins"] = {"value": f"{gross_margin:.0f}%", "note": "Good unit economics"}
    elif gross_margin > 20:
        score += 0.25
        details["gross_margins"] = {"value": f"{gross_margin:.0f}%", "note": "Acceptable"}
    else:
        details["gross_margins"] = {"value": f"{gross_margin:.0f}%", "note": "Low margins"}

    # Revenue Scale (not a startup)
    if revenue > 500e6:
        score += 0.5
        details["revenue_scale"] = {"value": f"${revenue/1e6:.0f}M", "note": "Proven scale"}
    elif revenue > 100e6:
        score += 0.25
        details["revenue_scale"] = {"value": f"${revenue/1e6:.0f}M", "note": "Growing revenue base"}
    else:
        details["revenue_scale"] = {"value": f"${revenue/1e6:.0f}M", "note": "Early stage"}

    # Low Debt (small-caps die from debt)
    if dte < 30:
        score += 0.5
        details["debt"] = {"value": f"{dte:.0f}%", "note": "Low debt — strong balance sheet"}
    elif dte < 80:
        score += 0.25
        details["debt"] = {"value": f"{dte:.0f}%", "note": "Manageable debt"}
    else:
        details["debt"] = {"value": f"{dte:.0f}%", "note": "High leverage — risk"}

    # Positive FCF (bonus, not required)
    if fcf > 0:
        score += 0.5
        details["fcf"] = {"value": f"${fcf/1e6:.0f}M", "note": "Cash flow positive"}
    else:
        details["fcf"] = {"value": "Negative", "note": "Burning cash — watch runway"}

    # Positive Net Margin (bonus, not required)
    if net_margin > 10:
        score += 0.5
        details["profitability"] = {"value": f"{net_margin:.0f}%", "note": "Profitable"}
    elif net_margin > 0:
        score += 0.25
        details["profitability"] = {"value": f"{net_margin:.0f}%", "note": "Marginally profitable"}
    else:
        details["profitability"] = {"value": f"{net_margin:.0f}%", "note": "Pre-profitable (growth phase)"}

    # Quality classification
    if score >= 3.5:
        quality = "HIGH"
    elif score >= 2.5:
        quality = "MEDIUM"
    else:
        quality = "LOW"

    passed = score >= 2.0
    return passed, {
        "pass": passed,
        "score": round(score, 1),
        "max_score": 4.75,
        "quality": quality,
        "details": details,
    }


# ─── Check 2: 89-Day MA Trend Filter ─────────────────────────────────────────
def check_technical(data: Dict) -> Tuple[bool, Dict]:
    """
    Simple trend filter: weekly close must be above 89-day SMA.
    If MA data unavailable, we pass (benefit of the doubt for newer IPOs).
    """
    ma89 = data.get("ma89")
    price = data.get("weekly_close") or data.get("current_price") or 0
    rsi = data.get("rsi14") or 50
    ma50 = data.get("ma50") or 0
    ma200 = data.get("ma200") or 0

    if ma89 is None or ma89 == 0:
        # No MA data — pass by default (newer stock, limited history)
        return True, {
            "pass": True,
            "stage": "Data Limited — Trend Unconfirmed",
            "ma89": 0,
            "price_vs_ma89": "N/A",
            "rsi14": rsi,
            "ma50": ma50,
            "ma200": ma200,
            "golden_cross": ma50 > ma200 if ma50 > 0 and ma200 > 0 else False,
            "week52_high": data.get("week52_high", 0),
            "week52_low": data.get("week52_low", 0),
            "entry_zone": f"${price*0.95:.2f} - ${price*1.02:.2f}" if price > 0 else "N/A",
        }

    above_ma89 = price > ma89
    pct_above = ((price - ma89) / ma89 * 100) if ma89 > 0 else 0

    if above_ma89:
        if pct_above > 20:
            stage = "Stage 2 Markup — Extended"
        elif pct_above > 5:
            stage = "Stage 2 Markup — Healthy"
        else:
            stage = "Stage 2 Markup — Early"
    else:
        if pct_above > -5:
            stage = "Testing 89-Day MA — Watch"
        else:
            stage = "Below 89-Day MA — Avoid"

    golden_cross = ma50 > ma200 if ma50 > 0 and ma200 > 0 else False
    w52h = data.get("week52_high", 0)
    w52l = data.get("week52_low", 0)
    entry_zone = f"${price*0.95:.2f} - ${price*1.02:.2f}" if above_ma89 and price > 0 else "N/A"

    return above_ma89, {
        "pass": above_ma89,
        "stage": stage,
        "ma89": round(ma89, 2),
        "price_vs_ma89": f"{pct_above:+.1f}%",
        "rsi14": rsi,
        "ma50": ma50,
        "ma200": ma200,
        "golden_cross": golden_cross,
        "week52_high": w52h,
        "week52_low": w52l,
        "entry_zone": entry_zone,
    }


# ─── Conviction Scoring (Growth Small-Cap Optimized) ─────────────────────────
def calculate_conviction(fund: Dict, tech: Dict, mktcap: float) -> int:
    """
    Conviction 1–10 for small-cap multi-bagger candidates.
    Weights: Fundamentals 40%, Technicals 30%, Quality 30%
    """
    score = 1  # Start from 1, not 4

    # Fundamentals (max +4)
    fs = fund.get("score", 0)
    if fs >= 4.0:
        score += 4
    elif fs >= 3.0:
        score += 3
    elif fs >= 2.5:
        score += 2
    elif fs >= 2.0:
        score += 1

    # Technicals (max +3)
    if tech.get("pass"):
        score += 2
        pct = tech.get("price_vs_ma89", "0")
        try:
            pct_val = float(str(pct).replace("%", "").replace("+", ""))
            if 3 < pct_val < 25:
                score += 1  # Healthy distance above MA89 (not too extended)
        except:
            pass

    # Golden cross bonus
    if tech.get("golden_cross"):
        score += 1

    # Market cap sweet spot bonus (smaller = more runway)
    if mktcap < 2e9:
        score += 1  # Maximum runway for 10x

    # RSI healthy range bonus
    rsi = tech.get("rsi14", 50)
    if 40 < rsi < 65:
        score += 1  # Not overbought, not oversold

    return min(max(score, 1), 10)


# ─── Scanner Endpoint ────────────────────────────────────────────────────────
@router.post("/", response_model=ScanResponse)
async def run_10bagger_scan(request: ScanRequest):
    """
    10-Bagger Scanner v2
    - $500M–$7B market cap gate (hard filter)
    - Check 1: Growth fundamentals (score >= 2.0/5.0)
    - Check 2: Price above 89-day MA on weekly close
    - No Check 3
    """
    start = time.time()
    scan_id = str(uuid.uuid4())

    if request.tickers:
        tickers = [(t, "US") for t in request.tickers]
    else:
        tickers = [(t, "US") for t in TENBAGGER_UNIVERSE]

    print(f"[10-BAGGERS v2] Scan start: {len(tickers)} stocks")
    qualifying: List[QualifyingStock] = []
    scanned = 0
    rejected_mktcap = 0
    rejected_fundamentals = 0
    rejected_technical = 0
    sem = asyncio.Semaphore(6)  # slightly lower concurrency for heavier data fetch

    async def scan_one(ticker: str, market: str):
        nonlocal scanned, rejected_mktcap, rejected_fundamentals, rejected_technical
        async with sem:
            try:
                loop = asyncio.get_event_loop()
                data = await loop.run_in_executor(None, fetch_stock_data, ticker)
                if data is None:
                    return None

                scanned += 1
                mktcap = data["market_cap"]

                # ── MARKET CAP GATE ──────────────────────────────────────
                if mktcap < MKTCAP_MIN or mktcap > MKTCAP_MAX:
                    rejected_mktcap += 1
                    return None

                # ── CHECK 1: Growth Fundamentals ─────────────────────────
                c1_pass, c1 = check_fundamentals(data)
                if not c1_pass:
                    rejected_fundamentals += 1
                    return None

                # ── CHECK 2: 89-Day MA Trend Filter ──────────────────────
                c2_pass, c2 = check_technical(data)
                if not c2_pass:
                    rejected_technical += 1
                    return None

                # ── CONVICTION SCORING ───────────────────────────────────
                conviction = calculate_conviction(c1, c2, mktcap)

                # ── Data quality for small-caps ──────────────────────────
                if mktcap > 3e9:
                    dq = "HIGH"
                elif mktcap > 1.5e9:
                    dq = "MEDIUM"
                else:
                    dq = "LOW"

                print(f"[10-BAGGERS] ✓ {ticker} ${data['current_price']:.2f} mktcap=${mktcap/1e9:.2f}B fund={c1['score']}/4.75 conv={conviction} {c2['stage'][:25]}")

                return QualifyingStock(
                    ticker=ticker,
                    company_name=data["company_name"],
                    market=market,
                    price=data["current_price"],
                    market_cap=mktcap,
                    change_pct=data.get("change_pct", 0.0),
                    check1_pass=c1_pass,
                    check2_pass=c2_pass,
                    check3_pass=True,  # No Check 3 — always true
                    fundamental_verdict=f"{c1['quality']} Quality — {c1['score']}/4.75",
                    technical_stage=c2.get("stage", "Unknown"),
                    smart_money_trigger="N/A",
                    conviction_score=conviction,
                    data_quality=dq,
                    entry_zone=c2.get("entry_zone", "N/A"),
                    rsi14=float(c2.get("rsi14", 50)),
                    ma50=float(c2.get("ma50", 0)),
                    ma200=float(c2.get("ma200", 0)),
                    golden_cross=bool(c2.get("golden_cross", False)),
                    week52_high=float(c2.get("week52_high", 0)),
                    week52_low=float(c2.get("week52_low", 0)),
                    range_pct=0,
                    revenue_growth=float(data.get("revenue_growth", 0)),
                    net_margin=float(data.get("net_margin", 0)),
                    pe_ratio=float(data.get("pe_ratio", 0)),
                    sector=str(data.get("sector", "")),
                )
            except Exception as e:
                print(f"[10-BAGGERS] Error {ticker}: {e}")
                return None

    tasks = [scan_one(t, "US") for t, _ in tickers]
    results = await asyncio.gather(*tasks)
    qualifying = [r for r in results if r is not None]
    duration = (time.time() - start) * 1000

    print(f"[10-BAGGERS v2] Complete: {scanned} scanned | {rejected_mktcap} rejected (mktcap) | {rejected_fundamentals} rejected (fundamentals) | {rejected_technical} rejected (technical) | {len(qualifying)} QUALIFIED | {duration/1000:.1f}s")

    return ScanResponse(
        scan_id=scan_id,
        scan_date=datetime.now().isoformat(),
        market="US",
        stocks_scanned=scanned,
        qualifying_count=len(qualifying),
        qualifying_stocks=sorted(qualifying, key=lambda x: x.conviction_score, reverse=True),
        scan_duration_ms=round(duration, 1),
    )