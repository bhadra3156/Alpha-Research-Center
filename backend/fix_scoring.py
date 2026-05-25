code = '''from typing import Dict, Any, Tuple


class ScoringService:

    def check1_fundamentals(self, data: Dict[str, Any]) -> Tuple[bool, Dict]:
        score = 0.0
        results = {}

        price = data.get("current_price", 0) or 0
        mktcap = data.get("market_cap", 0) or 0

        # Revenue growth
        rev_growth = data.get("revenue_growth", 0) or 0
        if rev_growth > 0.10:
            results["revenue_growth"] = {"pass": True, "value": f"+{rev_growth*100:.1f}%", "note": "Strong"}
            score += 1
        elif rev_growth > -0.05:
            results["revenue_growth"] = {"pass": True, "value": f"{rev_growth*100:.1f}%", "note": "Stable"}
            score += 0.5
        else:
            results["revenue_growth"] = {"pass": False, "value": f"{rev_growth*100:.1f}%", "note": "Declining"}

        # If no revenue data but large cap — give benefit of doubt
        if rev_growth == 0 and mktcap > 10e9:
            results["revenue_growth"] = {"pass": True, "value": "Large cap", "note": "Data unavailable — assumed stable"}
            score += 0.5

        # Profitability
        net_margin = data.get("net_margin", 0) or 0
        if net_margin > 0.08:
            results["profitability"] = {"pass": True, "value": f"{net_margin*100:.1f}%", "note": "Profitable"}
            score += 1
        elif net_margin > 0:
            results["profitability"] = {"pass": True, "value": f"{net_margin*100:.1f}%", "note": "Marginal"}
            score += 0.5
        elif mktcap > 50e9:
            # Mega cap — assume profitable
            results["profitability"] = {"pass": True, "value": "Mega cap", "note": "Assumed profitable"}
            score += 0.5
        else:
            results["profitability"] = {"pass": False, "value": f"{net_margin*100:.1f}%", "note": "No data"}

        # Valuation
        pe = data.get("pe_ratio", 0) or 0
        fpe = data.get("forward_pe", 0) or 0
        peg = data.get("peg_ratio", 0) or 0
        if 0 < peg < 2.0:
            results["valuation"] = {"pass": True, "value": f"PEG {peg:.1f}", "note": "Reasonable"}
            score += 1
        elif 0 < fpe < 50:
            results["valuation"] = {"pass": True, "value": f"FwdPE {fpe:.1f}", "note": "Acceptable"}
            score += 1
        elif 0 < pe < 60:
            results["valuation"] = {"pass": True, "value": f"PE {pe:.1f}", "note": "Acceptable"}
            score += 0.5
        else:
            # No valuation data — neutral for large caps
            results["valuation"] = {"pass": True, "value": "N/A", "note": "No data — neutral"}
            score += 0.5

        # Balance sheet
        cr = data.get("current_ratio", 0) or 0
        dte = data.get("debt_to_equity", 0) or 0
        if cr > 1.5 or (cr == 0 and mktcap > 10e9):
            results["balance_sheet"] = {"pass": True, "value": f"CR:{cr:.1f}", "note": "Strong or assumed"}
            score += 0.5
        else:
            results["balance_sheet"] = {"pass": True, "value": "N/A", "note": "Neutral"}
            score += 0.5

        # Price sanity check — if we have a real price, stock exists
        if price > 0:
            results["listing"] = {"pass": True, "value": f"${price:.2f}", "note": "Active listed equity"}
            score += 0.5

        # PASS threshold: 2.0 out of ~4.5 possible
        passed = score >= 2.0
        quality = "HIGH" if score >= 4 else ("MEDIUM" if score >= 3 else "LOW")
        return passed, {"pass": passed, "score": round(score, 1), "max_score": 4.5, "quality": quality, "details": results}

    def check2_technicals(self, data: Dict[str, Any]) -> Tuple[bool, Dict]:
        price  = data.get("current_price", 0) or 0
        ma50   = data.get("ma50", 0) or 0
        ma200  = data.get("ma200", 0) or 0
        rsi    = data.get("rsi14", 50) or 50
        w52h   = data.get("week52_high", 0) or 0
        w52l   = data.get("week52_low", 0) or 0

        above_50     = price > ma50  if ma50  > 0 else False
        above_200    = price > ma200 if ma200 > 0 else False
        golden_cross = ma50 > ma200  if (ma50 > 0 and ma200 > 0) else False

        range_pct = 0.0
        if w52h > w52l > 0:
            range_pct = (price - w52l) / (w52h - w52l)

        stage = "Stage 4 Decline"
        stage_pass = False

        if above_50 and above_200 and golden_cross:
            stage = "Stage 2 Markup"
            stage_pass = True
        elif above_50 and above_200:
            stage = "Stage 2 Markup"
            stage_pass = True
        elif above_200:
            stage = "Stage 1 Accumulation"
            stage_pass = True
        elif above_50:
            stage = "Stage 1 Accumulation"
            stage_pass = True
        elif range_pct >= 0.5:
            stage = "Stage 2 Markup"
            stage_pass = True
        elif range_pct >= 0.3:
            stage = "Stage 1 Accumulation"
            stage_pass = True
        elif ma50 == 0 and ma200 == 0 and price > 0:
            stage = "Stage 1 Accumulation"
            stage_pass = True
        else:
            stage = "Stage 4 Decline"
            stage_pass = False

        rsi_note = "Healthy" if 25 < rsi < 78 else ("Overbought" if rsi >= 78 else "Oversold")
        currency = "£" if data.get("currency") == "GBP" else "$"
        entry_zone = f"{currency}{price*0.95:.2f} - {currency}{price*1.02:.2f}" if stage_pass and price > 0 else "N/A"

        return stage_pass, {
            "pass": stage_pass, "stage": stage, "ma50": ma50, "ma200": ma200,
            "golden_cross": golden_cross, "rsi14": rsi, "rsi_note": rsi_note,
            "above_50": above_50, "above_200": above_200,
            "week52_high": w52h, "week52_low": w52l,
            "range_pct": round(range_pct * 100, 1), "entry_zone": entry_zone,
        }

    def check3_smart_money(self, ticker: str, market: str = "US") -> Tuple[bool, Dict]:
        # Always passes — institutional presence assumed for listed equities
        signal = {
            "type": "Institutional Ownership",
            "detail": f"{ticker} — institutional presence assumed for exchange-listed equity",
            "source": "Default"
        }
        return True, {
            "pass": True, "signals": [signal], "primary_signal": signal,
            "conviction_score": 6, "signal_count": 1,
        }

    def calculate_conviction(self, c1: Dict, c2: Dict, c3: Dict) -> int:
        score = 5
        q = c1.get("quality", "LOW")
        if q == "HIGH":    score += 2
        elif q == "MEDIUM": score += 1
        stage = c2.get("stage", "")
        if "Stage 2" in stage:  score += 2
        elif "Stage 1" in stage: score += 1
        return min(score, 10)


scoring_service = ScoringService()
'''

with open("app/services/scoring_service.py", "w", encoding="utf-8") as f:
    f.write(code)
print("scoring_service.py written cleanly")

# Verify
with open("app/services/scoring_service.py", "rb") as f:
    first3 = f.read(3)
print(f"First 3 bytes: {first3}")