from app.services.data_fetcher import data_fetcher
from app.services.scoring_service import scoring_service

print("Testing NVDA...")
data = data_fetcher.get_stock_data("NVDA")
print(f"Price: {data['current_price']}")
print(f"Market cap: {data['market_cap']}")
print(f"Rev growth: {data['revenue_growth']}")
print(f"Net margin: {data['net_margin']}")
print(f"MA50: {data['ma50']}")
print(f"MA200: {data['ma200']}")
print(f"RSI: {data['rsi14']}")
print(f"52W High: {data['week52_high']}")
print(f"52W Low: {data['week52_low']}")

c1p, c1 = scoring_service.check1_fundamentals(data)
print(f"\nCHECK 1: {'PASS' if c1p else 'FAIL'} score={c1['score']} quality={c1['quality']}")
for k,v in c1['details'].items():
    print(f"  {k}: {'P' if v['pass'] else 'F'} | {v['value']} | {v['note']}")

c2p, c2 = scoring_service.check2_technicals(data)
print(f"\nCHECK 2: {'PASS' if c2p else 'FAIL'} stage={c2['stage']}")
print(f"  above50={c2['above_50']} above200={c2['above_200']} range={c2['range_pct']}%")
