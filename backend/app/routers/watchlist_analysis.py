from fastapi import APIRouter
import httpx
import os

router = APIRouter()

@router.post("/analyze/watchlist")
async def analyze_watchlist(request: dict):
    stocks = request.get("stocks", [])
    if not stocks:
        return {"analysis": "No stocks provided", "status": "error"}

    stocks_text = ""
    for s in stocks:
        stocks_text += f"- {s.get('ticker')} | Market: {s.get('market','US')} | Sector: {s.get('sector','N/A')} | Theme: {s.get('theme','N/A')} | Notes: {s.get('notes','N/A')}\n"

    prompt = f"""You are an elite institutional research analyst combining Peter Lynch's fundamental framework with Stan Weinstein's Wyckoff phase analysis. Today is 26 May 2026.

The user is CONSIDERING buying these stocks. They have NOT bought them yet. Your job is to help them decide: BUY, WATCH, or AVOID each one.

WATCHLIST ({len(stocks)} stocks under consideration):
{stocks_text}

For EACH stock provide a complete research note:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[TICKER] — [Company Name] — [Exchange]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LYNCH CLASSIFICATION: Fast Grower / Stalwart / Slow Grower / Cyclical / Turnaround / Asset Play

BUSINESS STORY:
- What does the company do?
- What is the investment narrative?
- Is the story simple and understandable?
- Moat: switching costs / network effects / cost advantages?

FUNDAMENTAL ANALYSIS:
- Current price and 52-week range
- Revenue growth (recent trend)
- Earnings growth + EPS quality
- Free Cash Flow generation
- Balance sheet health (debt/equity, cash position)
- ROIC vs WACC (value creation?)
- PEG Ratio: P/E divided by growth rate
  * PEG < 1.0 = ATTRACTIVE (green flag)
  * PEG 1.0-2.0 = FAIR VALUE
  * PEG > 2.0 = EXPENSIVE (red flag)
- Analyst consensus and 12-month price target

WYCKOFF PHASE ANALYSIS:
- Current phase: Accumulation / Markup / Distribution / Markdown
- Price vs 50-day MA and 200-day MA
- Volume trend (smart money accumulating or distributing?)
- RSI level and momentum direction
- MACD signal
- Key support level (where to buy)
- Key resistance level (overhead supply)
- Is this a good entry point right now?

SYNTHESIS VERDICT:
✅ PASS — BUY/ACCUMULATE: Strong fundamentals + Accumulation or early Markup phase
⚠️ WATCH — HOLD OFF: Good story but wrong technical phase, or technicals good but fundamentals weak
❌ AVOID: Weak fundamentals + Distribution or Markdown phase

ENTRY STRATEGY:
- Ideal entry price zone
- Stop loss level
- Position size suggestion (% of portfolio)
- 12-month price target
- Risk/reward ratio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After all individual analyses, provide:

WATCHLIST SUMMARY TABLE:
| Ticker | Lynch Category | Wyckoff Phase | PEG | Verdict | Entry Zone | Target | R/R |

TOP 3 HIGHEST CONVICTION BUYS (with reasoning)

STOCKS TO AVOID RIGHT NOW (with specific reason)

STOCKS TO WATCH FOR BETTER ENTRY (with trigger conditions)

SECTOR/THEME OBSERVATIONS

Write with Goldman Sachs precision. Use real current data. Be specific with prices and numbers. Direct institutional tone."""

    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    groq_key = os.getenv("GROQ_API_KEY", "")

    # Try Claude with web search first (best quality)
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
                    parts = [b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"]
                    analysis = "\n".join(parts) if parts else ""
                    if analysis:
                        return {"analysis": analysis, "status": "ok", "model": "claude-with-search"}
                else:
                    print(f"Claude error: {data.get('error')}")
        except Exception as e:
            print(f"Claude failed: {e}")

    # Fallback: Groq LLaMA 3.3 70B
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
                        "temperature": 0.2,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a senior portfolio manager at Goldman Sachs combining Peter Lynch fundamental analysis with Wyckoff technical phase analysis. Provide institutional-grade BUY/WATCH/AVOID verdicts with specific price targets, PEG ratios, and entry strategies."
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

    return {"analysis": "Analysis unavailable. Please try again in a moment.", "status": "error"}