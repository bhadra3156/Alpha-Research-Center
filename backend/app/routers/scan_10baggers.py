# ─────────────────────────────────────────────────────────────────────────────
# AlphaResearch — 10-Baggers Scanner v4 (FMP-Powered)
# Scans ENTIRE US market via Financial Modeling Prep API
# Real market cap, real sector data, real financial metrics
# No hand-picked universe — pure data-driven discovery
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
FMP_BASE = "https://financialmodelingprep.com/api/v3"

# Market cap range
MKTCAP_MIN = 500_000_000     # $500M floor
MKTCAP_MAX = 10_000_000_000  # $10B ceiling


# ─── FMP Data Fetching ────────────────────────────────────────────────────────
def fmp_screener() -> List[Dict]:
    """
    ONE API call to FMP Stock Screener.
    Filters the entire US market (~5000 stocks) down to candidates.
    Returns stocks with: symbol, companyName, marketCap, sector, industry,
    price, volume, beta, exchange, country.
    """
    url = f"{FMP_BASE}/stock-screener"
    params = {
        "marketCapMoreThan": MKTCAP_MIN,
        "marketCapLowerThan": MKTCAP_MAX,
        "priceMoreThan": 5,
        "volumeMoreThan": 100000,
        "exchange": "NYSE,NASDAQ",
        "country": "US",
        "isActivelyTrading": True,
        "isEtf": False,
        "isFund": False,
        "limit": 1000,
        "apikey": FMP_KEY,
    }
    try:
        resp = requests.get(url, params=params, timeout=30)
        if resp.status_code != 200:
            print(f"[10-BAGGERS] FMP screener error: {resp.status_code} {resp.text[:200]}")
            return []
        data = resp.json()
        if isinstance(data, list):
            return data
        print(f"[10-BAGGERS] FMP unexpected response: {str(data)[:200]}")
        return []
    except Exception as e:
        print(f"[10-BAGGERS] FMP screener exception: {e}")
        return []


def fmp_batch_profiles(symbols: List[str]) -> Dict[str, Dict]:
    """
    Batch profile fetch — up to 50 tickers per call.
    Returns richer data: price, changes, changesPercentage, mktCap, sector, etc.
    """
    profiles = {}
    # Split into batches of 50
    for i in range(0, len(symbols), 50):
        batch = symbols[i:i+50]
        tickers_str = ",".join(batch)
        url = f"{FMP_BASE}/profile/{tickers_str}"
        try:
            resp = requests.get(url, params={"apikey": FMP_KEY}, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    for item in data:
                        sym = item.get("symbol", "")
                        if sym:
                            profiles[sym] = item
        except Exception as e:
            print(f"[10-BAGGERS] FMP profile batch error: {e}")
    return profiles


def fmp_batch_ratios(symbols: List[str]) -> Dict[str, Dict]:
    """
    Fetch TTM financial ratios for multiple stocks.
    Returns: grossProfitMargin, netProfitMargin, debtEquityRatio, PE, etc.
    One call per stock (FMP doesn't support batch ratios).
    Limited to top 50 to conserve API calls.
    """
    ratios = {}
    for sym in symbols[:50]:  # Cap at 50 to stay within free tier
        try:
            url = f"{FMP_BASE}/ratios-ttm/{sym}"
            resp = requests.get(url, params={"apikey": FMP_KEY}, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    ratios[sym] = data[0]
        except Exception as e:
            pass
    return ratios


def fmp_batch_growth(symbols: List[str]) -> Dict[str, Dict]:
    """
    Fetch revenue/income growth for multiple stocks.
    One call per stock. Limited to top 50.
    """
    growth = {}
    for sym in symbols[:50]:
        try:
            url = f"{FMP_BASE}/income-statement-growth/{sym}"
            resp = requests.get(url, params={"apikey": FMP_KEY, "period": "annual", "limit": 1}, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    growth[sym] = data[0]
        except Exception as e:
            pass
    return growth


# ─── Scoring ──────────────────────────────────────────────────────────────────
def score_stock(screener_data: Dict, profile: Dict, ratios: Dict, growth: Dict) -> int:
    """
    Multi-bagger conviction scoring using real FMP data.
    Score 1-10 based on growth, quality, and runway.
    """
    score = 1

    mktcap = screener_data.get("marketCap", 0) or profile.get("mktCap", 0) or 0

    # ── Revenue Growth (max +3) ──────────────────────────────────────────
    rev_growth = growth.get("growthRevenue", 0) or 0
    if rev_growth > 0.30:
        score += 3
    elif rev_growth > 0.15:
        score += 2
    elif rev_growth > 0.05:
        score += 1

    # ── Gross Margin (max +2) ────────────────────────────────────────────
    gross_margin = ratios.get("grossProfitMarginTTM", 0) or 0
    if gross_margin > 0.60:
        score += 2
    elif gross_margin > 0.40:
        score += 1.5
    elif gross_margin > 0.25:
        score += 1

    # ── Net Margin (max +1) ──────────────────────────────────────────────
    net_margin = ratios.get("netProfitMarginTTM", 0) or 0
    if net_margin > 0.15:
        score += 1
    elif net_margin > 0.05:
        score += 0.5

    # ── Market Cap Runway (max +2) ───────────────────────────────────────
    if mktcap < 2e9:
        score += 2   # Maximum 10x runway
    elif mktcap < 5e9:
        score += 1.5
    elif mktcap < 8e9:
        score += 1

    # ── Low Debt (max +1) ────────────────────────────────────────────────
    dte = ratios.get("debtEquityRatioTTM", 999) or 999
    if dte < 0.3:
        score += 1
    elif dte < 0.8:
        score += 0.5

    return min(max(int(round(score)), 1), 10)


# ─── Scanner Endpoint ────────────────────────────────────────────────────────
@router.post("/", response_model=ScanResponse)
async def run_10bagger_scan(request: ScanRequest):
    """
    10-Bagger Scanner v4 — FMP-Powered
    Scans the ENTIRE US market via Financial Modeling Prep API.
    1. Screener filters ~5000 stocks → ~200-400 in $500M-$10B range (1 API call)
    2. Batch profiles for company data (4-8 API calls)
    3. Growth + ratios for top candidates (up to 100 API calls)
    4. Score and rank by multi-bagger potential
    """
    start = time.time()
    scan_id = str(uuid.uuid4())

    if not FMP_KEY:
        print("[10-BAGGERS] ERROR: FMP_API_KEY not set")
        return ScanResponse(
            scan_id=scan_id,
            scan_date=datetime.now().isoformat(),
            market="US",
            stocks_scanned=0,
            qualifying_count=0,
            qualifying_stocks=[],
            scan_duration_ms=0,
        )

    # ── Step 1: Screener ─────────────────────────────────────────────────
    print(f"[10-BAGGERS v4] Step 1: FMP Screener ($500M-$10B, NYSE/NASDAQ)...")
    screener_results = fmp_screener()
    print(f"[10-BAGGERS v4] Screener returned {len(screener_results)} stocks")

    if not screener_results:
        return ScanResponse(
            scan_id=scan_id,
            scan_date=datetime.now().isoformat(),
            market="US",
            stocks_scanned=0,
            qualifying_count=0,
            qualifying_stocks=[],
            scan_duration_ms=round((time.time() - start) * 1000, 1),
        )

    # Build lookup by symbol
    screener_map = {s["symbol"]: s for s in screener_results if s.get("symbol")}
    all_symbols = list(screener_map.keys())

    # ── Step 2: Batch Profiles ───────────────────────────────────────────
    print(f"[10-BAGGERS v4] Step 2: Fetching profiles for {len(all_symbols)} stocks...")
    profiles = fmp_batch_profiles(all_symbols)
    print(f"[10-BAGGERS v4] Got {len(profiles)} profiles")

    # ── Step 3: Growth + Ratios for top candidates ───────────────────────
    # Sort by smallest market cap first (most runway) and take top 50
    sorted_symbols = sorted(all_symbols, key=lambda s: screener_map[s].get("marketCap", 0))
    top_symbols = sorted_symbols[:50]

    print(f"[10-BAGGERS v4] Step 3: Fetching growth + ratios for top {len(top_symbols)} stocks...")
    growth_data = fmp_batch_growth(top_symbols)
    ratios_data = fmp_batch_ratios(top_symbols)
    print(f"[10-BAGGERS v4] Got {len(growth_data)} growth records, {len(ratios_data)} ratio records")

    # ── Step 4: Score and Build Results ───────────────────────────────────
    qualifying: List[QualifyingStock] = []

    for sym in all_symbols:
        scr = screener_map[sym]
        prof = profiles.get(sym, {})
        gro = growth_data.get(sym, {})
        rat = ratios_data.get(sym, {})

        mktcap = scr.get("marketCap", 0) or prof.get("mktCap", 0) or 0
        price = prof.get("price", 0) or scr.get("price", 0) or 0
        if price == 0:
            continue

        change_pct = prof.get("changesPercentage", 0) or 0
        sector = scr.get("sector", "") or prof.get("sector", "") or ""
        company = scr.get("companyName", "") or prof.get("companyName", "") or sym
        volume = scr.get("volume", 0) or prof.get("volAvg", 0) or 0

        # Score
        conviction = score_stock(scr, prof, rat, gro)

        # Revenue growth (display)
        rev_growth = gro.get("growthRevenue", 0) or 0
        gross_margin = rat.get("grossProfitMarginTTM", 0) or 0
        net_margin = rat.get("netProfitMarginTTM", 0) or 0
        pe_ratio = rat.get("peRatioTTM", 0) or 0
        dte = rat.get("debtEquityRatioTTM", 0) or 0

        # Data quality
        has_growth = sym in growth_data
        has_ratios = sym in ratios_data
        if has_growth and has_ratios:
            dq = "HIGH"
        elif has_growth or has_ratios:
            dq = "MEDIUM"
        else:
            dq = "LOW"

        # Trend label from profile data
        w52_range = prof.get("range", "")
        beta = scr.get("beta", 0) or prof.get("beta", 0) or 0

        if change_pct > 5:
            stage = "Strong Momentum"
        elif change_pct > 0:
            stage = "Positive Trend"
        elif change_pct > -5:
            stage = "Consolidating"
        else:
            stage = "Pullback"

        # Entry zone
        entry_zone = f"${price*0.95:.2f} - ${price*1.02:.2f}" if price > 0 else "N/A"

        # Fundamental verdict
        if rev_growth > 0.20 and gross_margin > 0.40:
            verdict = "HIGH Growth — Strong unit economics"
        elif rev_growth > 0.10:
            verdict = "MEDIUM Growth — Expanding revenue"
        elif gross_margin > 0.40:
            verdict = "MEDIUM Quality — Good margins"
        else:
            verdict = "LOW — Early stage or data limited"

        qualifying.append(QualifyingStock(
            ticker=sym,
            company_name=company,
            market="US",
            price=price,
            market_cap=mktcap,
            change_pct=change_pct,
            check1_pass=True,
            check2_pass=True,
            check3_pass=True,
            fundamental_verdict=verdict,
            technical_stage=stage,
            smart_money_trigger="N/A",
            conviction_score=conviction,
            data_quality=dq,
            entry_zone=entry_zone,
            rsi14=0,
            ma50=0,
            ma200=0,
            golden_cross=False,
            week52_high=0,
            week52_low=0,
            range_pct=0,
            revenue_growth=rev_growth,
            net_margin=net_margin,
            pe_ratio=pe_ratio,
            sector=sector,
        ))

    # Sort by conviction (highest first)
    qualifying.sort(key=lambda x: x.conviction_score, reverse=True)

    duration = (time.time() - start) * 1000
    print(f"[10-BAGGERS v4] COMPLETE: {len(screener_results)} screened | {len(qualifying)} qualified | {duration/1000:.1f}s | API calls: ~{2 + len(profiles)//50 + len(growth_data) + len(ratios_data)}")

    return ScanResponse(
        scan_id=scan_id,
        scan_date=datetime.now().isoformat(),
        market="US",
        stocks_scanned=len(screener_results),
        qualifying_count=len(qualifying),
        qualifying_stocks=qualifying,
        scan_duration_ms=round(duration, 1),
    )