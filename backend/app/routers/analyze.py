from fastapi import APIRouter
from app.models.schemas import AnalysisResponse
from app.services.data_fetcher import data_fetcher
from app.services.scoring_service import scoring_service
from app.services.narrative_ai import narrative_ai
from datetime import datetime

router = APIRouter()

@router.get("/{ticker}", response_model=AnalysisResponse)
async def analyze_stock(ticker: str, market: str = "US"):
    data = data_fetcher.get_stock_data(ticker.upper())
    c1_pass, c1 = scoring_service.check1_fundamentals(data)
    c2_pass, c2 = scoring_service.check2_technicals(data)
    c3_pass, c3 = scoring_service.check3_smart_money(ticker, market)
    conviction = scoring_service.calculate_conviction(c1, c2, c3)
    all_pass = c1_pass and c2_pass and c3_pass
    verdict = "ACCUMULATE" if (all_pass and conviction >= 7) else ("HOLD" if all_pass else "AVOID")
    narrative = narrative_ai.generate_analysis(ticker, data, c1, c2, c3)
    return AnalysisResponse(
        ticker=ticker.upper(), company_name=data["company_name"],
        market=market, price=data["current_price"], market_cap=data["market_cap"],
        conviction_score=conviction, verdict=verdict, narrative=narrative,
        check1={"pass": c1_pass, **c1}, check2={"pass": c2_pass, **c2},
        check3={"pass": c3_pass, **c3},
        data_quality="HIGH" if data["market_cap"] > 1e9 else "MEDIUM",
        generated_at=datetime.now().isoformat(),
    )