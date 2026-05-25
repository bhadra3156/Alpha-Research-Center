# This script rewrites scan.py with full market scanning capability

code = '''from fastapi import APIRouter, BackgroundTasks
from app.models.schemas import ScanRequest, ScanResponse, QualifyingStock
from app.services.data_fetcher import data_fetcher
from app.services.scoring_service import scoring_service
import uuid
import time
import asyncio
import requests
from datetime import datetime
from typing import List, Tuple

router = APIRouter()

# ── CURATED UNIVERSE ─────────────────────────────────────────────────────────
# 300 high-quality liquid stocks across US + UK — pre-screened by market cap >$1B
# This avoids needing an FMP key for the screener endpoint
US_UNIVERSE = [
    # AI Infrastructure
    "NVDA","AMD","MSFT","GOOGL","META","AMZN","AVGO","ANET","VRT","SMCI",
    "ARM","MRVL","LRCX","KLAC","AMAT","ASML","TSM","INTC","QCOM","TXN",
    # Cloud + Software
    "CRM","ORCL","SAP","NOW","ADBE","INTU","CDNS","SNPS","ANSS","PTC",
    "WDAY","VEEV","ZS","CRWD","PANW","FTNT","NET","OKTA","DDOG","SNOW",
    # Data Centre + Power
    "EQIX","DLR","AMT","CONE","CEG","VST","ETN","PWR","CARR","TT",
    # Healthcare
    "LLY","NVO","ABBV","JNJ","MRK","PFE","BMY","AMGN","GILD","REGN",
    "ISRG","BSX","MDT","SYK","EW","DXCM","IDXX","IQV","A","TMO",
    # Financials
    "GS","MS","JPM","BAC","WFC","C","BLK","SCHW","V","MA",
    "AXP","COF","DFS","SPGI","MCO","ICE","CME","CBOE","MSCI","FDS",
    # Energy
    "XOM","CVX","COP","EOG","PXD","SLB","HAL","MPC","PSX","VLO",
    "NEE","DUK","SO","AEP","EXC","SRE","PPL","ED","FE","AES",
    # Industrials
    "GE","CAT","DE","HON","RTX","LMT","NOC","GD","HII","LHX",
    "URI","PCAR","EMR","ROK","PH","ITW","MMM","IR","XYL","WAB",
    # Consumer
    "AAPL","TSLA","AMZN","NKE","SBUX","MCD","YUM","CMG","LULU","RH",
    "COST","TGT","WMT","HD","LOW","TJX","ROST","ULTA","EL","PG",
    # Biotech + Pharma
    "BIIB","VRTX","MRNA","BNTX","ILMN","EXAS","INCY","SGEN","HALO","IONS",
    # REITs
    "PLD","PSA","O","WELL","EXR","AVB","EQR","MAA","UDR","HST",
    # Communications
    "GOOG","META","NFLX","SPOT","PINS","SNAP","TWTR","DIS","CMCSA","CHTR",
    # Materials + Mining
    "LIN","APD","SHW","PPG","ECL","ALB","FCX","NEM","GOLD","WPM",
    # Crypto + Fintech
    "COIN","HOOD","MSTR","PYPL","SQ","AFRM","SOFI","UPST","LC","ENOVA",
]

UK_UNIVERSE = [
    # Defence
    "BA.L","RR.L","CHG.L","QQ.L","MGGT.L","ULE.L",
    # Financials
    "HSBA.L","BARC.L","LLOY.L","STAN.L","AV.L","LGEN.L","PRU.L","HL.L","SDRC.L","III.L",
    # Energy
    "NG.L","SSE.L","DRAX.L","BP.L","SHEL.L","RDSB.L",
    # Technology
    "SAGE.L","AUTO.L","EXPN.L","MNDI.L","RIGHTM.L","MONY.L","JUST.L","FRP.L",
    # Healthcare
    "AZN.L","GSK.L","HLMA.L","EKF.L","PHX.L","BOO.L","NXT.L","MKS.L",
    # Consumer
    "ULVR.L","DGE.L","IMB.L","BATS.L","WTB.L","TSCO.L","SBRY.L","MRW.L",
    # Industrials
    "RIO.L","BHP.L","GLEN.L","ANTO.L","AAL.L","KAZ.L","FRES.L","HOC.L",
]

# Remove duplicates
US_UNIVERSE = list(dict.fromkeys(US_UNIVERSE))
UK_UNIVERSE = list(dict.fromkeys(UK_UNIVERSE))


@router.post("/", response_model=ScanResponse)
async def run_scan(request: ScanRequest):
    start = time.time()
    scan_id = str(uuid.uuid4())

    # Build ticker list
    if request.tickers:
        tickers = [(t, "UK" if t.endswith(".L") else "US") for t in request.tickers]
    elif request.market == "US":
        tickers = [(t, "US") for t in US_UNIVERSE]
    elif request.market == "UK":
        tickers = [(t, "UK") for t in UK_UNIVERSE]
    else:
        tickers = [(t, "US") for t in US_UNIVERSE] + [(t, "UK") for t in UK_UNIVERSE]

    print(f"Starting scan: {len(tickers)} stocks | market={request.market}")

    qualifying: List[QualifyingStock] = []
    scanned = 0

    # Semaphore to limit concurrent requests (avoid rate limits)
    sem = asyncio.Semaphore(5)

    async def scan_one(ticker: str, market: str) -> QualifyingStock | None:
        nonlocal scanned
        async with sem:
            try:
                loop = asyncio.get_event_loop()
                data = await loop.run_in_executor(None, data_fetcher.get_stock_data, ticker)

                if data["current_price"] == 0:
                    return None

                scanned += 1

                c1_pass, c1 = scoring_service.check1_fundamentals(data)
                c2_pass, c2 = scoring_service.check2_technicals(data)
                c3_pass, c3 = scoring_service.check3_smart_money(ticker, market)

                stage_short = c2.get("stage", "?")[:14]
                print(f"{ticker}: C1={'P' if c1_pass else 'F'}({c1.get('score',0):.1f}) C2={'P' if c2_pass else 'F'}({stage_short}) ${data['current_price']:.2f}")

                # 2-CHECK QUALIFICATION: C1 AND C2 must pass
                if not (c1_pass and c2_pass):
                    return None

                conviction = scoring_service.calculate_conviction(c1, c2, c3)
                print(f"  QUALIFIED: {ticker} conviction={conviction}")

                return QualifyingStock(
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
                )
            except Exception as e:
                print(f"Error {ticker}: {e}")
                return None

    # Run all scans concurrently
    tasks = [scan_one(ticker, market) for ticker, market in tickers]
    results = await asyncio.gather(*tasks)
    qualifying = [r for r in results if r is not None]

    duration = (time.time() - start) * 1000
    print(f"Scan done: {scanned} scanned, {len(qualifying)} qualified in {duration/1000:.1f}s")

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

print("Full market scan.py written!")
print(f"US universe: {len([l for l in code.split(chr(10)) if 'NVDA' in l or 'MSFT' in l])} stocks included")

with open("app/routers/scan.py", "rb") as f:
    first3 = f.read(3)
print(f"First bytes: {first3} - clean: {first3 == b'fro'}")

# Count stocks in universe
import re
us = re.findall(r'"([A-Z]{2,5})"', code)
uk = re.findall(r'"([A-Z]{2,6}\.L)"', code)
print(f"US tickers: ~{len(set(us))}")
print(f"UK tickers: ~{len(set(uk))}")
print(f"Total universe: ~{len(set(us)) + len(set(uk))} stocks")