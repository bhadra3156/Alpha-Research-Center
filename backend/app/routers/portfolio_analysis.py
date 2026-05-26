from fastapi import APIRouter
import httpx
import os

router = APIRouter()

@router.post("/analyze/portfolio-deep")
async def analyze_portfolio_deep(request: dict):
    holdings = request.get("holdings", [])
    if not holdings:
        return {"analysis": "No holdings provided", "status": "error"}
    
    total = sum(float(h.get("entry_price", 0)) * float(h.get("shares", 0)) for h in holdings)
    
    holdings_text = ""
    for h in holdings:
        cost = float(h.get("entry_price", 0)) * float(h.get("shares", 0))
        pct = (cost / total * 100) if total > 0 else 0
        sl = h.get("stop_level", 0)
        tp = h.get("target_price", 0)
        holdings_text += f"- {h.get('ticker')}: {h.get('shares')} shares @ ${float(h.get('entry_price',0)):.2f} | Cost: ${cost:,.0f} ({pct:.1f}%) | Stop: {'$'+str(sl) if sl else 'NONE'} | Target: {'$'+str(tp) if tp else 'NONE'} | Notes: {h.get('notes','N/A')}\n"
    
    prompt = f"""You are a senior hedge fund portfolio manager with 45 years of experience. Today is 26 May 2026.

Conduct a comprehensive institutional portfolio review. Research each position using current market data.

PORTFOLIO ({len(holdings)} positions, ${total:,.0f} total):
{holdings_text}

For EACH position provide:
1. Current price vs entry (unrealised P&L %)
2. Recent news and fundamental developments  
3. Technical trend (bullish/bearish/neutral)
4. Analyst consensus and 12-month price target
5. Key risks
6. VERDICT: STRONG BUY MORE / ADD / HOLD / REDUCE / SELL + suggested % weight

Then provide:
PORTFOLIO SWOT ANALYSIS
CONCENTRATION RISK (flag any position >15%)
STOP LOSS recommendations for each position
REBALANCING PLAN (priority order with specific actions)
CASH RECOMMENDATION (how much to hold)
6-MONTH OUTLOOK

Write like a Goldman Sachs research note. Be specific with numbers and prices. Direct and institutional."""

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"analysis": "ANTHROPIC_API_KEY not set in environment", "status": "error"}
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "claude-sonnet-4-5-20251101",
                    "max_tokens": 4000,
                    "tools": [{"type": "web_search_20250305", "name": "web_search"}],
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            data = response.json()
            parts = [b.get("text","") for b in data.get("content",[]) if b.get("type")=="text"]
            analysis = "\n".join(parts) if parts else "Analysis unavailable"
            return {"analysis": analysis, "status": "ok"}
    except Exception as e:
        return {"analysis": f"Error: {str(e)}", "status": "error"}

