import anthropic
import httpx
import json
from typing import Dict, Any
from app.core.config import settings


class NarrativeAI:
    """
    AI Narrative Generator with automatic fallback chain:
    1. Claude Sonnet (Anthropic) � primary, highest quality
    2. Groq LLaMA 3 � fast fallback, free tier
    3. Built-in template � offline fallback, always works
    """

    def __init__(self):
        # Anthropic client
        self.anthropic_client = None
        if settings.anthropic_api_key and settings.anthropic_api_key != "your_anthropic_key_here":
            try:
                self.anthropic_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
                print("NarrativeAI: Claude Sonnet ready")
            except Exception as e:
                print(f"NarrativeAI: Claude init failed � {e}")

        # Groq config
        self.groq_api_key = getattr(settings, "groq_api_key", "") or ""
        self.groq_available = bool(self.groq_api_key and self.groq_api_key != "your_groq_key_here")
        if self.groq_available:
            print("NarrativeAI: Groq LLaMA 3 ready as fallback")

        # Log active chain
        chain = []
        if self.anthropic_client: chain.append("Claude Sonnet")
        if self.groq_available:   chain.append("Groq LLaMA 3")
        chain.append("Template fallback")
        print(f"NarrativeAI fallback chain: {' ? '.join(chain)}")

    def generate_analysis(
        self,
        ticker: str,
        data: Dict[str, Any],
        c1: Dict,
        c2: Dict,
        c3: Dict,
    ) -> str:
        prompt = self._build_prompt(ticker, data, c1, c2, c3)

        # 1?? Try Claude Sonnet
        if self.anthropic_client:
            result = self._try_claude(prompt, ticker)
            if result:
                return f"[Claude Sonnet]\n\n{result}"

        # 2?? Try Groq LLaMA 3
        if self.groq_available:
            result = self._try_groq(prompt, ticker)
            if result:
                return f"[Groq LLaMA 3 � Fallback]\n\n{result}"

        # 3?? Built-in template fallback
        return self._template_fallback(ticker, data, c1, c2, c3)

    # -- CLAUDE SONNET --------------------------------------------
    def _try_claude(self, prompt: str, ticker: str) -> str | None:
        try:
            message = self.anthropic_client.messages.create(
                model=settings.claude_model,
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except Exception as e:
            print(f"NarrativeAI: Claude failed for {ticker} � {e}")
            return None

    # -- GROQ LLAMA 3 ---------------------------------------------
    def _try_groq(self, prompt: str, ticker: str) -> str | None:
        try:
            headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are AlphaResearch, an elite institutional equity analyst. "
                            "Produce concise, data-driven analysis in professional hedge fund style. "
                            "No hype. No disclaimers. Just institutional-grade insight."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 1200,
                "temperature": 0.3,
            }
            with httpx.Client(timeout=30) as client:
                res = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    print(f"NarrativeAI: Groq error {res.status_code} for {ticker}")
                    return None
        except Exception as e:
            print(f"NarrativeAI: Groq failed for {ticker} � {e}")
            return None

    # -- PROMPT BUILDER -------------------------------------------
    def _build_prompt(
        self,
        ticker: str,
        data: Dict,
        c1: Dict,
        c2: Dict,
        c3: Dict,
    ) -> str:
        rev_growth  = (data.get("revenue_growth", 0) or 0) * 100
        net_margin  = (data.get("net_margin", 0) or 0) * 100
        gross_margin = (data.get("gross_margin", 0) or 0) * 100
        fcf         = data.get("fcf_ttm", 0) or 0
        price       = data.get("current_price", 0) or 0
        mktcap      = data.get("market_cap", 0) or 0
        ma50        = data.get("ma50", 0) or 0
        ma200       = data.get("ma200", 0) or 0
        rsi         = data.get("rsi14", 50) or 50
        stage       = c2.get("stage", "Unknown")
        quality     = c1.get("quality", "MEDIUM")
        signals     = c3.get("signal_count", 0)
        entry_zone  = c2.get("entry_zone", "N/A")
        peg         = data.get("peg_ratio", 0) or 0
        fpe         = data.get("forward_pe", 0) or 0
        sector      = data.get("sector", "Unknown")

        return f"""You are AlphaResearch � an elite institutional equity intelligence engine combining 
Peter Lynch fundamentals, Stan Weinstein stage analysis, and smart money tracking.

Analyze {ticker} ({data.get('company_name', ticker)}) � {sector} sector.

FUNDAMENTAL DATA:
- Price: ${price:.2f} | Market Cap: ${mktcap/1e9:.1f}B
- Revenue Growth YoY: {rev_growth:.1f}%
- Gross Margin: {gross_margin:.1f}% | Net Margin: {net_margin:.1f}%
- Free Cash Flow: ${fcf/1e9:.2f}B
- Forward P/E: {fpe:.1f} | PEG: {peg:.2f}
- Fundamental Quality: {quality}

TECHNICAL DATA:
- Weinstein Stage: {stage}
- Price: ${price:.2f} | MA50: ${ma50:.2f} | MA200: ${ma200:.2f}
- RSI(14): {rsi:.1f} � {c2.get('rsi_note', 'Neutral')}
- Golden Cross: {'YES' if c2.get('golden_cross') else 'NO'}
- 52W Range Position: {c2.get('range_pct', 0):.0f}%
- Entry Zone: {entry_zone}

SMART MONEY:
- Signals Detected: {signals}
- Primary: {c3.get('primary_signal', {}).get('type', 'Institutional Ownership')}

3-CHECK RESULTS:
- Check 1 Fundamentals: {'PASS' if c1.get('pass') else 'FAIL'} ({quality} quality)
- Check 2 Technical: {'PASS' if c2.get('pass') else 'FAIL'} ({stage})
- Check 3 Smart Money: {'PASS' if c3.get('pass') else 'FAIL'}

Write a precise 3-paragraph institutional analysis:

PARAGRAPH 1 � Business Quality & Fundamental Thesis:
Assess revenue quality, margin profile, FCF generation, and competitive moat. 
What is the core bull thesis for this business?

PARAGRAPH 2 � Technical Setup & Timing:
Interpret the Weinstein stage, MA structure, RSI, and entry zone. 
Is this an ideal entry point or should one wait for a pullback?

PARAGRAPH 3 � Risk Factors & Execution Strategy:
Identify the top 2-3 risks. State the stop level logic and position sizing approach.
What would invalidate the bull case?

Tone: institutional, precise, no hype. Write as a senior hedge fund PM would."""

    # -- TEMPLATE FALLBACK ----------------------------------------
    def _template_fallback(
        self,
        ticker: str,
        data: Dict,
        c1: Dict,
        c2: Dict,
        c3: Dict,
    ) -> str:
        quality    = c1.get("quality", "MEDIUM")
        stage      = c2.get("stage", "Unknown")
        price      = data.get("current_price", 0) or 0
        rev_growth = (data.get("revenue_growth", 0) or 0) * 100
        net_margin = (data.get("net_margin", 0) or 0) * 100
        mktcap     = data.get("market_cap", 0) or 0
        rsi        = data.get("rsi14", 50) or 50
        entry_zone = c2.get("entry_zone", "N/A")
        signals    = c3.get("signal_count", 0)
        sector     = data.get("sector", "the sector")

        verdict_word = "constructive" if c1.get("pass") and c2.get("pass") else "cautious"
        stage_desc = "active markup phase" if "Stage 2" in stage else "base-building accumulation phase"

        para1 = (
            f"{ticker} ({data.get('company_name', ticker)}) presents a {quality.lower()}-quality "
            f"fundamental profile within the {sector} space. "
            f"Revenue growth of {rev_growth:.1f}% year-over-year and net margins of {net_margin:.1f}% "
            f"underpin the core business thesis. "
            f"At a market capitalisation of ${mktcap/1e9:.1f}B, the company {'demonstrates scale advantages' if mktcap > 50e9 else 'operates in a high-growth niche'}. "
            f"The fundamental case is {verdict_word} based on current data quality."
        )

        para2 = (
            f"From a technical perspective, {ticker} is in a {stage_desc} per Stan Weinstein's "
            f"stage analysis methodology. "
            f"Price at ${price:.2f} with RSI(14) at {rsi:.1f} indicates "
            f"{'healthy momentum without overextension' if 40 < rsi < 70 else 'elevated momentum � caution on chasing' if rsi >= 70 else 'oversold conditions � watch for reversal signals'}. "
            f"The identified entry zone of {entry_zone} represents the optimal institutional accumulation range, "
            f"offering an asymmetric risk/reward profile relative to key moving averages."
        )

        para3 = (
            f"Key risks include: (1) macro sensitivity and sector rotation away from {sector}, "
            f"(2) earnings deceleration below consensus estimates which would re-rate the multiple, "
            f"and (3) technical invalidation on a sustained close below the 200-day moving average. "
            f"Smart money confirmation: {signals} signal(s) detected. "
            f"Position sizing should reflect the {quality.lower()} fundamental quality rating � "
            f"{'3-5% of portfolio for high conviction' if quality == 'HIGH' else '1-3% for medium conviction' if quality == 'MEDIUM' else 'monitor only until quality improves'}. "
            f"Stop placement below the most recent structural support level."
        )

        ai_note = "[Template Narrative � Add ANTHROPIC_API_KEY or GROQ_API_KEY to .env for AI-generated analysis]"
        return f"{ai_note}\n\n{para1}\n\n{para2}\n\n{para3}"


narrative_ai = NarrativeAI()
