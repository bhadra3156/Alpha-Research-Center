from fastapi import APIRouter
import httpx
import os

router = APIRouter()

@router.post("/analyze/portfolio-deep")
async def analyze_portfolio_deep(request: dict):
    holdings = request.get("holdings", [])
    
    if not holdings:
        return {"analysis": "No holdings provided", "status": "error"}
    
    # Build detailed portfolio summary
    total = sum(h.get("entry_price", 0) * h.get("shares", 0) for h in holdings)
    
    holdings_text = ""
    for h in holdings:
        cost = h.get("entry_price", 0) * h.get("shares", 0)
        pct = (cost / total * 100) if total > 0 else 0
        holdings_text += f"""
- {h.get("ticker")}: {h.get("shares")} shares @ ${h.get("entry_price", 0):.2f}
  Cost basis: ${cost:,.0f} ({pct:.1f}% of portfolio)
  Stop: ${h.get("stop_level", 0):.2f if h.get("stop_level") else "None set"}
  Target: ${h.get("target_price", 0):.2f if h.get("target_price") else "None set"}
  Notes: {h.get("notes", "N/A")}
"""
    
    prompt = f"""You are a senior hedge fund portfolio manager with 45 years of experience at a top-tier institution. 
You have access to current market data, analyst reports, and real-time news.

Analyze this portfolio with the depth and precision of a Goldman Sachs or Citadel portfolio review.

PORTFOLIO HOLDINGS (as of today):
{holdings_text}
Total Portfolio Value: ${total:,.0f}
Number of Positions: {len(holdings)}

For EACH position, research and provide:
1. Current price vs entry price (% gain/loss)
2. Recent fundamental developments (earnings, guidance, news)
3. Technical analysis (trend, key levels)
4. Analyst consensus and price targets
5. Key risks specific to this holding
6. VERDICT: STRONG BUY MORE / ADD / HOLD / REDUCE / SELL with % target weight

Then provide:
- PORTFOLIO SWOT ANALYSIS
- CONCENTRATION RISK assessment
- SECTOR/THEME exposure breakdown  
- CORRELATION risks
- CASH recommendation (% to hold)
- STOP LOSS levels for each position
- REBALANCING PRIORITY ORDER (what to do first, second, third)
- 6-MONTH PORTFOLIO OUTLOOK

Be specific with numbers, price targets, and actionable recommendations.
Write like a professional research note — direct, institutional, no fluff."""

    try:
        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 4000,
                    "tools": [{"type": "web_search_20250305", "name": "web_search"}],
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            
            data = response.json()
            
            # Extract text from response (handles tool use blocks)
            analysis_parts = []
            for block in data.get("content", []):
                if block.get("type") == "text":
                    analysis_parts.append(block.get("text", ""))
            
            analysis = "
".join(analysis_parts) if analysis_parts else "Analysis generation failed"
            
            return {"analysis": analysis, "status": "ok", "model": "claude-sonnet-4-with-search"}
            
    except Exception as e:
        return {"analysis": f"Error: {str(e)}", "status": "error"}
