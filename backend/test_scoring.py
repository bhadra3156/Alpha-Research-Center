from app.services.scoring_service import scoring_service
data = {
    "current_price": 215.0, "market_cap": 500e9,
    "revenue_growth": 0, "net_margin": 0,
    "pe_ratio": 0, "forward_pe": 0, "peg_ratio": 0,
    "current_ratio": 0, "debt_to_equity": 0,
    "ma50": 200.0, "ma200": 180.0, "rsi14": 55,
    "week52_high": 250.0, "week52_low": 150.0,
    "currency": "USD", "fcf_ttm": 0
}
p, r = scoring_service.check1_fundamentals(data)
print("C1 PASS:", p, "Score:", r["score"], "Quality:", r["quality"])
p2, r2 = scoring_service.check2_technicals(data)
print("C2 PASS:", p2, "Stage:", r2["stage"])
if p:
    print("SUCCESS - NEW SCORING ACTIVE - stocks will qualify!")
else:
    print("FAIL - old scoring still running - score too low")
