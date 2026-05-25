from fastapi import APIRouter
from app.models.schemas import ScanRequest, ScanResponse, QualifyingStock
from app.services.data_fetcher import data_fetcher
from app.services.scoring_service import scoring_service
import uuid
import time
import asyncio
from datetime import datetime
from typing import List

router = APIRouter()

US_UNIVERSE = [
    "NVDA","AMD","MSFT","GOOGL","META","AMZN","AVGO","ANET","VRT","SMCI",
    "ARM","MRVL","LRCX","KLAC","AMAT","ASML","TSM","INTC","QCOM","TXN",
    "CRM","ORCL","SAP","NOW","ADBE","INTU","CDNS","SNPS","ANSS","PTC",
    "WDAY","VEEV","ZS","CRWD","PANW","FTNT","NET","OKTA","DDOG","SNOW",
    "EQIX","DLR","AMT","CEG","VST","ETN","PWR","CARR","TT","GEV",
    "LLY","NVO","ABBV","JNJ","MRK","PFE","BMY","AMGN","GILD","REGN",
    "ISRG","BSX","MDT","SYK","EW","DXCM","IDXX","IQV","A","TMO",
    "GS","MS","JPM","BAC","WFC","BLK","SCHW","V","MA","AXP",
    "COF","SPGI","MCO","ICE","CME","CBOE","MSCI","FDS","COIN","PYPL",
    "XOM","CVX","COP","EOG","SLB","NEE","DUK","SO","AEP","EXC",
    "GE","CAT","DE","HON","RTX","LMT","NOC","GD","URI","PCAR",
    "EMR","ROK","PH","ITW","IR","XYL","AAPL","TSLA","NKE","SBUX",
    "MCD","CMG","LULU","COST","TGT","WMT","HD","LOW","TJX","ROST",
    "PG","KO","PEP","MDLZ","CL","BIIB","VRTX","MRNA","ILMN","EXAS",
    "PLD","PSA","O","WELL","EXR","NFLX","SPOT","DIS","CMCSA","CHTR",
    "LIN","APD","SHW","PPG","ECL","ALB","FCX","NEM","GOLD","WPM",
    "MSTR","SQ","AFRM","SOFI","HOOD","UBER","LYFT","ABNB","BKNG","EXPE",
    "ZM","DOCU","TWLO","U","RBLX","COIN","APP","PLTR","AI","PATH",
]

US_UNIVERSE = list(dict.fromkeys(US_UNIVERSE))


@router.post("/", response_model=ScanResponse)
async def run_scan(request: ScanRequest):
    start = time.time()
    scan_id = str(uuid.uuid4())

    if request.tickers:
        tickers = [(t, "UK" if t.endswith(".L") else "US") for t in request.tickers]
    elif request.market == "US":
        tickers = [(t, "US") for t in US_UNIVERSE]
    else:
        tickers = [(t, "US") for t in US_UNIVERSE]

    print(f"Scan start: {len(tickers)} stocks")
    qualifying: List[QualifyingStock] = []
    scanned = 0
    sem = asyncio.Semaphore(8)

    async def scan_one(ticker: str, market: str):
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
                if not (c1_pass and c2_pass):
                    return None
                conviction = scoring_service.calculate_conviction(c1, c2, c3)
                print(f"QUALIFIED: {ticker} ${data['current_price']:.2f} conv={conviction} {c2.get('stage','')[:14]}")
                return QualifyingStock(
                    ticker=ticker,
                    company_name=data["company_name"],
                    market=market,
                    price=data["current_price"],
                    market_cap=data["market_cap"],
                    change_pct=data.get("change_pct", 0.0),
                    check1_pass=c1_pass,
                    check2_pass=c2_pass,
                    check3_pass=c3_pass,
                    fundamental_verdict=f"PASS - {c1.get('quality','MED')} Quality",
                    technical_stage=c2.get("stage", "Unknown"),
                    smart_money_trigger=c3.get("primary_signal", {}).get("type", "Institutional"),
                    conviction_score=conviction,
                    data_quality="HIGH" if data["market_cap"] > 10e9 else "MEDIUM",
                    entry_zone=c2.get("entry_zone", "N/A"),
                    rsi14=float(data.get("rsi14", 50)),
                    ma50=float(data.get("ma50", 0)),
                    ma200=float(data.get("ma200", 0)),
                    golden_cross=bool(c2.get("golden_cross", False)),
                    week52_high=float(data.get("week52_high", 0)),
                    week52_low=float(data.get("week52_low", 0)),
                    range_pct=float(c2.get("range_pct", 0)),
                    revenue_growth=float(data.get("revenue_growth", 0)),
                    net_margin=float(data.get("net_margin", 0)),
                    pe_ratio=float(data.get("pe_ratio", 0)),
                    sector=str(data.get("sector", "")),
                )
            except Exception as e:
                print(f"Error {ticker}: {e}")
                return None

    tasks = [scan_one(t, m) for t, m in tickers]
    results = await asyncio.gather(*tasks)
    qualifying = [r for r in results if r is not None]
    duration = (time.time() - start) * 1000
    print(f"Done: {scanned} scanned, {len(qualifying)} qualified in {duration/1000:.1f}s")

    return ScanResponse(
        scan_id=scan_id,
        scan_date=datetime.now().isoformat(),
        market=request.market,
        stocks_scanned=scanned,
        qualifying_count=len(qualifying),
        qualifying_stocks=sorted(qualifying, key=lambda x: x.conviction_score, reverse=True),
        scan_duration_ms=round(duration, 1),
    )
