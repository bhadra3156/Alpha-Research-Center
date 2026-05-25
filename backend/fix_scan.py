code = '''from fastapi import APIRouter
from app.models.schemas import ScanRequest, ScanResponse, QualifyingStock
from app.services.data_fetcher import data_fetcher
from app.services.scoring_service import scoring_service
import uuid
import time
from datetime import datetime
from typing import List

router = APIRouter()

DEFAULT_US = ["NVDA","MSFT","GOOGL","META","AVGO","V","MA","LLY","GS","CEG","AMD","AMZN","ANET","VRT","ORCL"]
DEFAULT_UK = ["BA.L","RR.L","HSBA.L","BARC.L","NG.L"]


@router.post("/", response_model=ScanResponse)
async def run_scan(request: ScanRequest):
    start = time.time()
    scan_id = str(uuid.uuid4())

    if request.tickers:
        tickers = [(t, "UK" if t.endswith(".L") else "US") for t in request.tickers]
    elif request.market == "US":
        tickers = [(t, "US") for t in DEFAULT_US]
    elif request.market == "UK":
        tickers = [(t, "UK") for t in DEFAULT_UK]
    else:
        tickers = [(t, "US") for t in DEFAULT_US] + [(t, "UK") for t in DEFAULT_UK]

    qualifying: List[QualifyingStock] = []
    scanned = 0

    for ticker, market in tickers:
        try:
            data = data_fetcher.get_stock_data(ticker)

            if data["current_price"] == 0:
                print(f"SKIP {ticker} - no price")
                continue

            scanned += 1

            # CHECK 1 - Fundamentals
            c1_pass, c1 = scoring_service.check1_fundamentals(data)

            # CHECK 2 - Technical Phase
            c2_pass, c2 = scoring_service.check2_technicals(data)

            # CHECK 3 - Smart Money (advisory only)
            c3_pass, c3 = scoring_service.check3_smart_money(ticker, market)

            print(f"{ticker}: C1={'PASS' if c1_pass else 'FAIL'}({c1.get('score',0)}) C2={'PASS' if c2_pass else 'FAIL'}({c2.get('stage','?')[:12]}) price={data['current_price']:.2f}")

            # QUALIFY ON C1 + C2 ONLY (2-check system)
            if not c1_pass:
                print(f"  -> REJECTED: C1 FAIL")
                continue
            if not c2_pass:
                print(f"  -> REJECTED: C2 FAIL ({c2.get('stage')})")
                continue

            conviction = scoring_service.calculate_conviction(c1, c2, c3)
            currency = "£" if market == "UK" else "$"

            qualifying.append(QualifyingStock(
                ticker=ticker,
                company_name=data["company_name"],
                market=market,
                price=data["current_price"],
                market_cap=data["market_cap"],
                check1_pass=c1_pass,
                check2_pass=c2_pass,
                check3_pass=c3_pass,
                fundamental_verdict=f"PASS - {c1.get('quality','MED')} Quality",
                technical_stage=c2.get("stage", "Unknown"),
                smart_money_trigger=c3.get("primary_signal", {}).get("type", "Institutional"),
                conviction_score=conviction,
                data_quality="HIGH" if data["market_cap"] > 1e9 else "MEDIUM",
                entry_zone=c2.get("entry_zone", "N/A"),
            ))
            print(f"  -> QUALIFIED! Conviction={conviction}")

        except Exception as e:
            print(f"Scan error {ticker}: {e}")
            continue

    duration = (time.time() - start) * 1000
    print(f"Scan complete: {scanned} scanned, {len(qualifying)} qualified in {duration:.0f}ms")

    return ScanResponse(
        scan_id=scan_id,
        scan_date=datetime.now().isoformat(),
        market=request.market,
        stocks_scanned=scanned,
        qualifying_count=len(qualifying),
        qualifying_stocks=sorted(qualifying, key=lambda x: x.conviction_score, reverse=True),
        scan_duration_ms=round(duration, 1),
    )
'''

with open("app/routers/scan.py", "w", encoding="utf-8") as f:
    f.write(code)

print("scan.py written - 2-CHECK SYSTEM ACTIVE")

with open("app/routers/scan.py", "rb") as f:
    first3 = f.read(3)
print(f"First bytes: {first3} - clean: {first3 == b'fro'}")