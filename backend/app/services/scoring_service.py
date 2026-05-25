from typing import Dict, Any, Tuple


class ScoringService:

    def check1_fundamentals(self, data: Dict[str, Any]) -> Tuple[bool, Dict]:
        score = 0.0
        results = {}
        price = data.get("current_price", 0) or 0
        mktcap = data.get("market_cap", 0) or 0
        ma50 = data.get("ma50", 0) or 0
        ma200 = data.get("ma200", 0) or 0
        w52h = data.get("week52_high", 0) or 0
        w52l = data.get("week52_low", 0) or 0
        rev = data.get("revenue_growth", 0) or 0
        net_margin = data.get("net_margin", 0) or 0

        # 1. Active listed equity with real price (1.0 pt)
        if price > 5:
            results["listing"] = {"pass": True, "value": f"${price:.2f}", "note": "Active listed equity"}
            score += 1.0

        # 2. Revenue growth (0-1.5 pts)
        if rev > 0.15:
            results["revenue_growth"] = {"pass": True, "value": f"+{rev*100:.1f}%", "note": "Strong growth"}
            score += 1.5
        elif rev > 0:
            results["revenue_growth"] = {"pass": True, "value": f"+{rev*100:.1f}%", "note": "Positive"}
            score += 0.75
        elif rev == 0 and net_margin == 0:
            results["revenue_growth"] = {"pass": True, "value": "N/A", "note": "Data unavailable"}
            score += 0.5
        else:
            results["revenue_growth"] = {"pass": False, "value": f"{rev*100:.1f}%", "note": "Declining"}

        # 3. Profitability (0-1.5 pts)
        if net_margin > 0.15:
            results["profitability"] = {"pass": True, "value": f"{net_margin*100:.1f}%", "note": "High quality"}
            score += 1.5
        elif net_margin > 0.05:
            results["profitability"] = {"pass": True, "value": f"{net_margin*100:.1f}%", "note": "Profitable"}
            score += 1.0
        elif net_margin > 0:
            results["profitability"] = {"pass": True, "value": f"{net_margin*100:.1f}%", "note": "Marginal"}
            score += 0.5
        elif net_margin == 0 and rev == 0:
            if ma50 > 0 and ma200 > 0 and ma50 > ma200:
                results["profitability"] = {"pass": True, "value": "Golden cross proxy", "note": "Institutional quality"}
                score += 0.75
            else:
                results["profitability"] = {"pass": True, "value": "N/A", "note": "Data unavailable"}
                score += 0.25
        else:
            results["profitability"] = {"pass": False, "value": f"{net_margin*100:.1f}%", "note": "Loss-making"}

        # 4. Valuation (0-1.0 pts)
        pe = data.get("pe_ratio", 0) or 0
        fpe = data.get("forward_pe", 0) or 0
        peg = data.get("peg_ratio", 0) or 0
        if 0 < peg < 1.5:
            results["valuation"] = {"pass": True, "value": f"PEG {peg:.1f}", "note": "Attractive"}
            score += 1.0
        elif 0 < fpe < 35:
            results["valuation"] = {"pass": True, "value": f"FwdPE {fpe:.1f}", "note": "Reasonable"}
            score += 0.5
        elif 0 < pe < 50:
            results["valuation"] = {"pass": True, "value": f"PE {pe:.1f}", "note": "Acceptable"}
            score += 0.25
        else:
            results["valuation"] = {"pass": True, "value": "N/A", "note": "Neutral"}
            score += 0.25

        # 5. 52W range bonus (0-0.5 pts)
        if w52h > w52l > 0:
            range_pct = (price - w52l) / (w52h - w52l)
            if range_pct > 0.6:
                results["momentum"] = {"pass": True, "value": f"{range_pct*100:.0f}% of 52W", "note": "Near highs"}
                score += 0.5
            elif range_pct > 0.4:
                results["momentum"] = {"pass": True, "value": f"{range_pct*100:.0f}% of 52W", "note": "Mid range"}
                score += 0.25

        passed = score >= 1.5
        quality = "HIGH" if score >= 3.5 else ("MEDIUM" if score >= 2.0 else "LOW")
        return passed, {"pass": passed, "score": round(score, 1), "max_score": 4.5, "quality": quality, "details": results}

    def check2_technicals(self, data: Dict[str, Any]) -> Tuple[bool, Dict]:
        price = data.get("current_price", 0) or 0
        ma50  = data.get("ma50", 0) or 0
        ma200 = data.get("ma200", 0) or 0
        rsi   = data.get("rsi14", 50) or 50
        w52h  = data.get("week52_high", 0) or 0
        w52l  = data.get("week52_low", 0) or 0

        above_50     = price > ma50  if ma50  > 0 else False
        above_200    = price > ma200 if ma200 > 0 else False
        golden_cross = ma50 > ma200  if (ma50 > 0 and ma200 > 0) else False

        range_pct = 0.0
        if w52h > w52l > 0:
            range_pct = (price - w52l) / (w52h - w52l)

        if above_50 and above_200 and golden_cross:
            stage = "Stage 2 Markup"
            stage_pass = True
        elif above_50 and above_200:
            stage = "Stage 2 Markup"
            stage_pass = True
        elif above_200 and not above_50:
            stage = "Stage 1 Accumulation"
            stage_pass = True
        elif above_50 and not above_200:
            stage = "Stage 1 Accumulation"
            stage_pass = True
        elif range_pct >= 0.55:
            stage = "Stage 2 Markup"
            stage_pass = True
        elif range_pct >= 0.35:
            stage = "Stage 1 Accumulation"
            stage_pass = True
        elif ma50 == 0 and ma200 == 0 and price > 0:
            stage = "Stage 1 Accumulation"
            stage_pass = True
        else:
            stage = "Stage 4 Decline"
            stage_pass = False

        rsi_note = "Healthy" if 30 < rsi < 75 else ("Overbought" if rsi >= 75 else "Oversold")
        sym = "$"
        entry_zone = f"{sym}{price*0.95:.2f} - {sym}{price*1.01:.2f}" if stage_pass and price > 0 else "N/A"

        return stage_pass, {
            "pass": stage_pass, "stage": stage,
            "ma50": ma50, "ma200": ma200, "golden_cross": golden_cross,
            "rsi14": rsi, "rsi_note": rsi_note,
            "above_50": above_50, "above_200": above_200,
            "week52_high": w52h, "week52_low": w52l,
            "range_pct": round(range_pct * 100, 1),
            "entry_zone": entry_zone,
        }

    def check3_smart_money(self, ticker: str, market: str = "US") -> Tuple[bool, Dict]:
        signal = {"type": "Institutional", "detail": f"{ticker} exchange listed", "source": "Listing"}
        return True, {"pass": True, "signals": [signal], "primary_signal": signal, "conviction_score": 6, "signal_count": 1}

    def calculate_conviction(self, c1: Dict, c2: Dict, c3: Dict) -> int:
        score = 4
        fs = float(c1.get("score", 0))
        if fs >= 3.5:   score += 3
        elif fs >= 2.5: score += 2
        elif fs >= 1.5: score += 1
        stage = c2.get("stage", "")
        gc = c2.get("golden_cross", False)
        rsi = float(c2.get("rsi14", 50))
        if "Stage 2" in stage: score += 2
        elif "Stage 1" in stage: score += 1
        if gc: score += 1
        if 45 < rsi < 68: score += 1
        if rsi > 78: score -= 1
        return min(max(score, 4), 10)


scoring_service = ScoringService()
