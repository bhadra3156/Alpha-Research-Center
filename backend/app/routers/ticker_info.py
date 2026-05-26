from fastapi import APIRouter
import httpx
import os
import json

router = APIRouter()

# Known ticker mappings for instant response (no API needed)
TICKER_MAP = {
    "NVDA":{"sector":"Technology","theme":"AI Infrastructure","notes":"GPU leader, AI infrastructure backbone, data centre growth"},
    "AMD":{"sector":"Technology","theme":"Semiconductors","notes":"CPU/GPU challenger, AI accelerator growth story"},
    "MSFT":{"sector":"Technology","theme":"Cloud","notes":"Azure cloud + Copilot AI, enterprise software dominant"},
    "GOOGL":{"sector":"Technology","theme":"AI Infrastructure","notes":"Search monopoly + Google Cloud + Gemini AI"},
    "META":{"sector":"Technology","theme":"AI Infrastructure","notes":"Social media + AI investments + metaverse"},
    "AMZN":{"sector":"Technology","theme":"Cloud","notes":"AWS cloud leader + e-commerce + AI services"},
    "AAPL":{"sector":"Technology","theme":"Growth","notes":"Consumer tech ecosystem, services growth, India expansion"},
    "TSLA":{"sector":"Consumer","theme":"EV","notes":"EV leader + energy storage + autonomous driving optionality"},
    "AVGO":{"sector":"Technology","theme":"AI Infrastructure","notes":"AI networking chips + VMware cloud software"},
    "ANET":{"sector":"Technology","theme":"AI Infrastructure","notes":"Data centre networking, hyperscaler customer base"},
    "VRT":{"sector":"Industrials","theme":"AI Infrastructure","notes":"Data centre cooling systems, AI infrastructure beneficiary"},
    "MRVL":{"sector":"Technology","theme":"Semiconductors","notes":"Custom AI chips + data centre networking"},
    "CRWD":{"sector":"Technology","theme":"Cloud","notes":"Cybersecurity platform, AI-powered threat detection"},
    "PANW":{"sector":"Technology","theme":"Cloud","notes":"Cybersecurity consolidation play, platformisation thesis"},
    "PLTR":{"sector":"Technology","theme":"AI Infrastructure","notes":"AI data analytics, government + enterprise contracts"},
    "APP":{"sector":"Technology","theme":"AI Infrastructure","notes":"Mobile app monetisation + AI advertising platform"},
    "MSTR":{"sector":"Technology","theme":"Crypto","notes":"Bitcoin treasury company, leveraged BTC exposure"},
    "COIN":{"sector":"Financials","theme":"Crypto","notes":"Crypto exchange, regulatory risk, BTC cycle play"},
    "NVO":{"sector":"Healthcare","theme":"Healthcare AI","notes":"GLP-1 leader Ozempic/Wegovy, obesity secular tailwind"},
    "LLY":{"sector":"Healthcare","theme":"Healthcare AI","notes":"GLP-1 + Alzheimers pipeline, pharma growth leader"},
    "ORCL":{"sector":"Technology","theme":"Cloud","notes":"AI infrastructure pivot, cloud database, +243% AI revenue"},
    "CRM":{"sector":"Technology","theme":"Cloud","notes":"CRM leader + AI Agentforce, enterprise cloud"},
    "NOW":{"sector":"Technology","theme":"Cloud","notes":"IT workflow automation + AI integration"},
    "DDOG":{"sector":"Technology","theme":"Cloud","notes":"Cloud monitoring + observability, AI DevOps"},
    "NET":{"sector":"Technology","theme":"Cloud","notes":"Edge cloud + cybersecurity + AI networking"},
    "SNOW":{"sector":"Technology","theme":"Cloud","notes":"Cloud data platform, AI workload migration"},
    "CRWV":{"sector":"Technology","theme":"AI Infrastructure","notes":"GPU cloud infrastructure, AI training/inference"},
    "ARM":{"sector":"Technology","theme":"Semiconductors","notes":"Chip architecture licensor, mobile + AI edge chips"},
    "TSM":{"sector":"Technology","theme":"Semiconductors","notes":"World largest chip foundry, NVDA/AAPL supplier"},
    "ASML":{"sector":"Technology","theme":"Semiconductors","notes":"EUV lithography monopoly, semiconductor supply chain"},
    "BYDDY":{"sector":"Consumer","theme":"EV","notes":"Chinese EV leader, global expansion, BYD ADR"},
    "XPEV":{"sector":"Consumer","theme":"EV","notes":"Chinese EV manufacturer, AI driving technology"},
    "NIO":{"sector":"Consumer","theme":"EV","notes":"Chinese premium EV, battery swap network"},
    "RIVN":{"sector":"Consumer","theme":"EV","notes":"EV truck maker, Amazon partnership, commercial fleet"},
    "GS":{"sector":"Financials","theme":"Growth","notes":"Investment banking + trading + wealth management"},
    "JPM":{"sector":"Financials","theme":"Growth","notes":"Largest US bank, diversified financial services"},
    "V":{"sector":"Financials","theme":"Growth","notes":"Payment network duopoly, high margin, global expansion"},
    "MA":{"sector":"Financials","theme":"Growth","notes":"Payment network duopoly, fintech ecosystem"},
    "NEE":{"sector":"Utilities","theme":"Energy Transition","notes":"Largest US renewable energy utility, solar + wind"},
    "CEG":{"sector":"Utilities","theme":"Energy Transition","notes":"Nuclear energy + data centre power contracts"},
    "ETN":{"sector":"Industrials","theme":"AI Infrastructure","notes":"Electrical systems, data centre power infrastructure"},
    "PWR":{"sector":"Industrials","theme":"AI Infrastructure","notes":"Electrical construction, grid + data centre buildout"},
    "BAE":{"sector":"Industrials","theme":"Defence","notes":"UK defence prime, NATO spending beneficiary"},
    "LMT":{"sector":"Industrials","theme":"Defence","notes":"US defence prime, F-35 + missile systems"},
    "RTX":{"sector":"Industrials","theme":"Defence","notes":"Aerospace + defence, jet engines + missiles"},
    "EQIX":{"sector":"Real Estate","theme":"AI Infrastructure","notes":"Data centre REIT, global colocation network"},
    "DLR":{"sector":"Real Estate","theme":"AI Infrastructure","notes":"Data centre REIT, hyperscaler tenant base"},
}

@router.post("/analyze/ticker-info")
async def get_ticker_info(request: dict):
    ticker = request.get("ticker","").upper().strip()
    market = request.get("market","US")
    
    if not ticker:
        return {"sector":"","theme":"","notes":""}
    
    # Check known map first (instant)
    if ticker in TICKER_MAP:
        info = TICKER_MAP[ticker]
        return {"sector":info["sector"], "theme":info["theme"], "notes":info["notes"], "source":"known"}
    
    # Try Claude for unknown tickers
    api_key = os.getenv("ANTHROPIC_API_KEY","")
    groq_key = os.getenv("GROQ_API_KEY","")
    
    prompt = f"""For the stock ticker {ticker} ({market} market), provide ONLY a JSON response with these 3 fields:
{{
  "sector": "one of: Technology/Healthcare/Financials/Energy/Industrials/Consumer/Real Estate/Materials/Utilities/Communication/AI Infrastructure",
  "theme": "one of: AI Infrastructure/Defence/Energy Transition/Healthcare AI/Crypto/EV/Semiconductors/Cloud/Biotech/Value/Growth/Dividend",
  "notes": "one sentence max: what the company does and why it is interesting to investors"
}}
Respond with ONLY the JSON, no other text."""

    # Try Groq first (faster)
    if groq_key:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization":f"Bearer {groq_key}","Content-Type":"application/json"},
                    json={"model":"llama-3.1-8b-instant","max_tokens":200,"temperature":0.1,
                          "messages":[{"role":"user","content":prompt}]}
                )
                data = response.json()
                text = data.get("choices",[{}])[0].get("message",{}).get("content","")
                if text:
                    # Clean JSON
                    start = text.find("{")
                    end = text.rfind("}") + 1
                    if start >= 0 and end > start:
                        info = json.loads(text[start:end])
                        return {"sector":info.get("sector",""),"theme":info.get("theme",""),"notes":info.get("notes",""),"source":"ai"}
        except Exception as e:
            print(f"Groq ticker-info failed: {e}")
    
    return {"sector":"","theme":"","notes":"","source":"unknown"}