import requests

# Test if quoteSummary works now
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
r = requests.get("https://query1.finance.yahoo.com/v10/finance/quoteSummary/NVDA?modules=price,financialData", headers=headers, timeout=10)
print(f"quoteSummary status: {r.status_code}")
if r.status_code == 200:
    d = r.json()
    result = d.get("quoteSummary", {}).get("result", [{}])[0]
    price_data = result.get("price", {})
    fin_data = result.get("financialData", {})
    mc = price_data.get("marketCap", {})
    print(f"Market cap: {mc.get('fmt', 'N/A')}")
    print(f"Rev growth: {fin_data.get('revenueGrowth', {}).get('fmt', 'N/A')}")
    print(f"Net margin: {fin_data.get('profitMargins', {}).get('fmt', 'N/A')}")
    print("quoteSummary IS WORKING!")
else:
    print(f"Still blocked: {r.text[:100]}")
