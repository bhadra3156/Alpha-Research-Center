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
        stop_str = f"${sl}" if sl else "NONE"
        target_str = f"${tp}" if tp else "NONE"
        holdings_text += f"- {h.get('ticker')}: {h.get('shares')} shares @ ${float(h.get('entry_price',0)):.2f} | Cost: ${cost:,.0f} ({pct:.1f}%) | Stop: {stop_str} | Target: {target_str} | Notes: {h.get('notes','N/A')}\n"
    
    prompt = f"""You are a senior hedge fund portfolio manager with 45 years of experience at Goldman Sachs and Citadel. Today is 26 May 2026.

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

Write like a Goldman Sachs research note. Be specific with numbers and prices. Direct and institutional. No disclaimers."""

    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    groq_key = os.getenv("GROQ_API_KEY", "")

    # Try Claude with web search first
    if anthropic_key:
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": anthropic_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "claude-sonnet-4-5",
                        "max_tokens": 4000,
                        "tools": [{"type": "web_search_20250305", "name": "web_search"}],
                        "messages": [{"role": "user", "content": prompt}]
                    }
                )
                data = response.json()
                if "error" not in data:
                    parts = [b.get("text","") for b in data.get("content",[]) if b.get("type")=="text"]
                    analysis = "\n".join(parts) if parts else ""
                    if analysis:
                        return {"analysis": analysis, "status": "ok", "model": "claude-with-search"}
                else:
                    print(f"Claude API error: {data.get('error')}")
        except Exception as e:
            print(f"Claude failed: {e}")

    # Fallback: Groq LLaMA 3.3 70B (free, fast, detailed)
    if groq_key:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "max_tokens": 4000,
                        "temperature": 0.3,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a senior hedge fund portfolio manager with 45 years of experience at Goldman Sachs and Citadel. Provide institutional-grade portfolio analysis with specific verdicts, price targets, stop losses, and rebalancing recommendations. Be specific, direct, and professional. No disclaimers."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ]
                    }
                )
                data = response.json()
                analysis = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if analysis:
                    return {"analysis": analysis, "status": "ok", "model": "groq-llama-70b"}
        except Exception as e:
            print(f"Groq failed: {e}")

    return {"analysis": "Analysis unavailable - AI services failed. Please try again.", "status": "error"}