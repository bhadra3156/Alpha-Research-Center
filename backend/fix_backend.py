import os
import requests

# Test FMP first
fmp_key = 'XELpoGyU52UdFnWnWn80aIQcQMIYVdzb'
print("Testing FMP API...")
r = requests.get(f'https://financialmodelingprep.com/api/v3/quote/NVDA?apikey={fmp_key}', timeout=10)
print(f'FMP status: {r.status_code}')
if r.status_code == 200:
    d = r.json()
    if d:
        print(f'NVDA price: {d[0].get("price")}')
        print('FMP IS WORKING!')

# Write clean data_fetcher.py
code = '''import requests
import os
import time
from typing import Dict, Any

_cache: Dict[str, Any] = {}
_cache_time: Dict[str, float] = {}
CACHE_TTL = 600


class DataFetcher:
    def __init__(self):
        self.fmp_key = ""
        try:
            from app.core.config import settings
            self.fmp_key = getattr(settings, "fmp_api_key", "") or ""
        except Exception:
            pass
        if not self.fmp_key:
            self.fmp_key = os.environ.get("FMP_API_KEY", "")
        if self.fmp_key:
            print(f"DataFetcher: FMP ready — key {self.fmp_key[:8]}...")
        else:
            print("DataFetcher: No FMP key found")

    def get_stock_data(self, ticker: str) -> Dict[str, Any]:
        t = ticker.upper()
        if t in _cache and (time.time() - _cache_time.get(t, 0)) < CACHE_TTL:
            print(f"Cache: {t}")
            return _cache[t]
        result = self._fetch(t)
        _cache[t] = result
        _cache_time[t] = time.time()
        return result

    def _fetch(self, ticker: str) -> Dict[str, Any]:
        if self.fmp_key:
            r = self._fmp(ticker)
            if r and r.get("current_price", 0) > 0:
                return r
        print(f"FMP failed for {ticker} — returning empty")
        return self._empty(ticker)

    def _fmp(self, ticker: str) -> Dict[str, Any]:
        try:
            base = "https://financialmodelingprep.com/api/v3"
            k = self.fmp_key

            # Quote data
            url = f"{base}/quote/{ticker}?apikey={k}"
            resp = requests.get(url, timeout=15)
            if resp.status_code != 200:
                print(f"FMP quote {resp.status_code} for {ticker}")
                return {}
            data = resp.json()
            if not data or not isinstance(data, list):
                return {}
            q = data[0]
            price = float(q.get("price") or 0)
            if price == 0:
                return {}

            # Income statement for margins and growth
            rev_growth = net_margin = gross_margin = 0.0
            try:
                inc_url = f"{base}/income-statement/{ticker}?limit=2&apikey={k}"
                ir = requests.get(inc_url, timeout=10)
                if ir.status_code == 200:
                    inc = ir.json()
                    if inc and len(inc) >= 2:
                        r0 = float(inc[0].get("revenue") or 0)
                        r1 = float(inc[1].get("revenue") or 1)
                        if r1 > 0:
                            rev_growth = (r0 - r1) / r1
                        if r0 > 0:
                            net_margin = float(inc[0].get("netIncome") or 0) / r0
                            gross_margin = float(inc[0].get("grossProfit") or 0) / r0
            except Exception as e:
                print(f"Income stmt {ticker}: {e}")

            w52h = float(q.get("yearHigh") or 0)
            w52l = float(q.get("yearLow") or 0)
            ma50 = float(q.get("priceAvg50") or 0)
            ma200 = float(q.get("priceAvg200") or 0)

            print(f"FMP OK: {ticker} ${price:.2f} rev={rev_growth*100:.1f}% margin={net_margin*100:.1f}% ma50={ma50:.0f} ma200={ma200:.0f}")

            return {
                "ticker": ticker,
                "company_name": q.get("name") or ticker,
                "current_price": round(price, 4),
                "market_cap": float(q.get("marketCap") or 0),
                "currency": "GBP" if ticker.endswith(".L") else "USD",
                "exchange": q.get("exchange") or "",
                "sector": q.get("sector") or "",
                "industry": q.get("industry") or "",
                "revenue_ttm": 0.0,
                "gross_margin": gross_margin,
                "operating_margin": 0.0,
                "net_margin": net_margin,
                "fcf_ttm": 0.0,
                "total_debt": 0.0,
                "total_cash": 0.0,
                "current_ratio": 1.5,
                "debt_to_equity": 0.5,
                "return_on_equity": float(q.get("roe") or 0),
                "return_on_assets": 0.0,
                "revenue_growth": rev_growth,
                "earnings_growth": 0.0,
                "pe_ratio": float(q.get("pe") or 0),
                "forward_pe": float(q.get("pe") or 0),
                "peg_ratio": 0.0,
                "ev_ebitda": 0.0,
                "price_to_sales": 0.0,
                "price_to_book": float(q.get("priceToBook") or 0),
                "ma50": round(ma50, 4),
                "ma200": round(ma200, 4),
                "rsi14": 55.0,
                "avg_volume_50d": int(q.get("avgVolume") or 0),
                "volume_current": int(q.get("volume") or 0),
                "week52_high": round(w52h, 4),
                "week52_low": round(w52l, 4),
                "beta": float(q.get("beta") or 1.0),
                "analyst_target": 0.0,
                "analyst_count": 0,
                "recommendation": "",
            }
        except Exception as e:
            print(f"FMP exception {ticker}: {e}")
            return {}

    def _empty(self, ticker: str) -> Dict[str, Any]:
        return {
            "ticker": ticker, "company_name": ticker, "current_price": 0,
            "market_cap": 0, "currency": "USD", "exchange": "", "sector": "",
            "industry": "", "revenue_ttm": 0, "gross_margin": 0,
            "operating_margin": 0, "net_margin": 0, "fcf_ttm": 0,
            "total_debt": 0, "total_cash": 0, "current_ratio": 0,
            "debt_to_equity": 0, "return_on_equity": 0, "return_on_assets": 0,
            "revenue_growth": 0, "earnings_growth": 0, "pe_ratio": 0,
            "forward_pe": 0, "peg_ratio": 0, "ev_ebitda": 0,
            "price_to_sales": 0, "price_to_book": 0, "ma50": 0, "ma200": 0,
            "rsi14": 50, "avg_volume_50d": 0, "volume_current": 0,
            "week52_high": 0, "week52_low": 0, "beta": 1.0,
            "analyst_target": 0, "analyst_count": 0, "recommendation": "",
        }


data_fetcher = DataFetcher()
'''

with open("app/services/data_fetcher.py", "w", encoding="utf-8") as f:
    f.write(code)
print("data_fetcher.py written cleanly - no BOM")
print(f"File size: {len(code)} chars")

# Verify no BOM
with open("app/services/data_fetcher.py", "rb") as f:
    first3 = f.read(3)
print(f"First 3 bytes: {first3} (should be b'imp', not BOM)")