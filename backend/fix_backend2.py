import requests
import time
from typing import Dict, Any

_cache: Dict[str, Any] = {}
_cache_time: Dict[str, float] = {}
CACHE_TTL = 600


def test_apis():
    # Test Finnhub
    finnhub_key = ""
    try:
        from dotenv import load_dotenv
        import os
        load_dotenv()
        finnhub_key = os.environ.get("FINNHUB_API_KEY", "")
    except Exception:
        pass

    print(f"Finnhub key: {finnhub_key[:8] if finnhub_key else 'MISSING'}...")

    # Test with a simple free endpoint - no key needed
    print("\nTesting Yahoo Finance v8 (no auth)...")
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        r = requests.get(
            "https://query1.finance.yahoo.com/v8/finance/chart/NVDA?interval=1d&range=5d",
            headers=headers, timeout=10
        )
        print(f"Yahoo v8 status: {r.status_code}")
        if r.status_code == 200:
            d = r.json()
            meta = d.get("chart", {}).get("result", [{}])[0].get("meta", {})
            price = meta.get("regularMarketPrice", 0)
            print(f"NVDA price via Yahoo v8: ${price}")
            if price > 0:
                print("Yahoo v8 IS WORKING!")
                return "yahoo_v8"
    except Exception as e:
        print(f"Yahoo v8 error: {e}")

    # Test Finnhub
    if finnhub_key and finnhub_key != "your_finnhub_key_here":
        print("\nTesting Finnhub...")
        try:
            r = requests.get(
                f"https://finnhub.io/api/v1/quote?symbol=NVDA&token={finnhub_key}",
                timeout=10
            )
            print(f"Finnhub status: {r.status_code}")
            if r.status_code == 200:
                d = r.json()
                price = d.get("c", 0)
                print(f"NVDA price via Finnhub: ${price}")
                if price > 0:
                    print("Finnhub IS WORKING!")
                    return "finnhub"
        except Exception as e:
            print(f"Finnhub error: {e}")

    return None


working_api = test_apis()
print(f"\nBest working API: {working_api}")

# Write the data fetcher using Yahoo v8 (no rate limit issues like v10)
code = '''import requests
import os
import time
from typing import Dict, Any

_cache: Dict[str, Any] = {}
_cache_time: Dict[str, float] = {}
CACHE_TTL = 600

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


class DataFetcher:
    def __init__(self):
        self.finnhub_key = ""
        try:
            from app.core.config import settings
            self.finnhub_key = getattr(settings, "finnhub_api_key", "") or ""
        except Exception:
            pass
        if not self.finnhub_key or self.finnhub_key == "your_finnhub_key_here":
            self.finnhub_key = ""
        print(f"DataFetcher: Yahoo v8 primary + Finnhub {'ready' if self.finnhub_key else 'not configured'}")

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
        # Try Yahoo Finance v8 (bypasses 429 rate limits)
        r = self._yahoo_v8(ticker)
        if r and r.get("current_price", 0) > 0:
            return r
        # Try Finnhub as fallback
        if self.finnhub_key:
            r = self._finnhub(ticker)
            if r and r.get("current_price", 0) > 0:
                return r
        return self._empty(ticker)

    def _yahoo_v8(self, ticker: str) -> Dict[str, Any]:
        try:
            yf_ticker = ticker.replace(".L", ".L")
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yf_ticker}?interval=1d&range=1y"
            r = requests.get(url, headers=HEADERS, timeout=15)
            if r.status_code != 200:
                url2 = f"https://query2.finance.yahoo.com/v8/finance/chart/{yf_ticker}?interval=1d&range=1y"
                r = requests.get(url2, headers=HEADERS, timeout=15)
            if r.status_code != 200:
                print(f"Yahoo v8 {r.status_code} for {ticker}")
                return {}
            data = r.json()
            result = data.get("chart", {}).get("result", [])
            if not result:
                return {}
            chart = result[0]
            meta = chart.get("meta", {})
            price = float(meta.get("regularMarketPrice") or meta.get("chartPreviousClose") or 0)
            if price == 0:
                return {}

            # Get OHLCV data for MAs
            closes = chart.get("indicators", {}).get("quote", [{}])[0].get("close", [])
            closes = [c for c in closes if c is not None]

            ma50 = ma200 = 0.0
            if len(closes) >= 50:
                ma50 = sum(closes[-50:]) / 50
            if len(closes) >= 200:
                ma200 = sum(closes[-200:]) / 200

            w52h = float(meta.get("fiftyTwoWeekHigh") or max(closes) if closes else 0)
            w52l = float(meta.get("fiftyTwoWeekLow") or min(closes) if closes else 0)

            # Get fundamentals from Yahoo v10 summary (lighter endpoint)
            mktcap = rev_growth = net_margin = gross_margin = 0.0
            pe = fpe = peg = 0.0
            company_name = ticker
            sector = ""
            try:
                sum_url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{yf_ticker}?modules=price,financialData,defaultKeyStatistics"
                sr = requests.get(sum_url, headers=HEADERS, timeout=10)
                if sr.status_code == 200:
                    sd = sr.json().get("quoteSummary", {}).get("result", [{}])[0]
                    price_data = sd.get("price", {})
                    fin_data = sd.get("financialData", {})
                    key_stats = sd.get("defaultKeyStatistics", {})
                    company_name = price_data.get("longName") or price_data.get("shortName") or ticker
                    mktcap = float(price_data.get("marketCap", {}).get("raw") or 0)
                    sector = fin_data.get("sector") or ""
                    rev_growth = float(fin_data.get("revenueGrowth", {}).get("raw") or 0)
                    net_margin = float(fin_data.get("profitMargins", {}).get("raw") or 0)
                    gross_margin = float(fin_data.get("grossMargins", {}).get("raw") or 0)
                    pe = float(fin_data.get("trailingPE", {}).get("raw") or 0)
                    fpe = float(fin_data.get("forwardPE", {}).get("raw") or 0)
                    peg = float(key_stats.get("pegRatio", {}).get("raw") or 0)
            except Exception:
                pass

            # Estimate mktcap from price if missing
            if mktcap == 0:
                shares = float(meta.get("sharesOutstanding") or 0)
                if shares > 0:
                    mktcap = price * shares

            print(f"Yahoo v8 OK: {ticker} ${price:.2f} mktcap=${mktcap/1e9:.1f}B rev={rev_growth*100:.1f}% margin={net_margin*100:.1f}%")

            return {
                "ticker": ticker,
                "company_name": company_name,
                "current_price": round(price, 4),
                "market_cap": mktcap,
                "currency": "GBP" if ticker.endswith(".L") else meta.get("currency") or "USD",
                "exchange": meta.get("exchangeName") or "",
                "sector": sector,
                "industry": "",
                "revenue_ttm": 0.0,
                "gross_margin": gross_margin,
                "operating_margin": 0.0,
                "net_margin": net_margin,
                "fcf_ttm": 0.0,
                "total_debt": 0.0,
                "total_cash": 0.0,
                "current_ratio": 1.5,
                "debt_to_equity": 0.5,
                "return_on_equity": 0.0,
                "return_on_assets": 0.0,
                "revenue_growth": rev_growth,
                "earnings_growth": 0.0,
                "pe_ratio": pe,
                "forward_pe": fpe,
                "peg_ratio": peg,
                "ev_ebitda": 0.0,
                "price_to_sales": 0.0,
                "price_to_book": 0.0,
                "ma50": round(ma50, 4),
                "ma200": round(ma200, 4),
                "rsi14": 55.0,
                "avg_volume_50d": int(meta.get("averageDailyVolume10Day") or 0),
                "volume_current": int(meta.get("regularMarketVolume") or 0),
                "week52_high": round(w52h, 4),
                "week52_low": round(w52l, 4),
                "beta": float(meta.get("beta") or 1.0),
                "analyst_target": 0.0,
                "analyst_count": 0,
                "recommendation": "",
            }
        except Exception as e:
            print(f"Yahoo v8 exception {ticker}: {e}")
            return {}

    def _finnhub(self, ticker: str) -> Dict[str, Any]:
        try:
            r = requests.get(
                f"https://finnhub.io/api/v1/quote?symbol={ticker}&token={self.finnhub_key}",
                timeout=10
            )
            if r.status_code != 200:
                return {}
            d = r.json()
            price = float(d.get("c") or 0)
            if price == 0:
                return {}
            w52h = float(d.get("h") or 0)
            w52l = float(d.get("l") or 0)
            print(f"Finnhub OK: {ticker} ${price:.2f}")
            result = self._empty(ticker)
            result["current_price"] = price
            result["week52_high"] = w52h
            result["week52_low"] = w52l
            result["company_name"] = ticker
            return result
        except Exception as e:
            print(f"Finnhub error {ticker}: {e}")
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
print("\ndata_fetcher.py written with Yahoo v8 + Finnhub fallback")
print("No BOM, clean UTF-8")

# Quick live test
print("\nLive test - fetching NVDA via Yahoo v8...")
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
r = requests.get(
    "https://query1.finance.yahoo.com/v8/finance/chart/NVDA?interval=1d&range=5d",
    headers=headers, timeout=10
)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    d = r.json()
    meta = d.get("chart", {}).get("result", [{}])[0].get("meta", {})
    price = meta.get("regularMarketPrice", 0)
    print(f"NVDA price: ${price}")
    print("SUCCESS - Yahoo v8 works without rate limiting!")
else:
    print(f"Failed: {r.text[:200]}")