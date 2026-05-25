import sys
sys.path.insert(0, ".")
from app.services.data_fetcher import data_fetcher

# Clear the in-memory cache
import app.services.data_fetcher as df_module
df_module._cache.clear()
df_module._cache_time.clear()
print("Cache cleared!")
print(f"Cache size now: {len(df_module._cache)}")

# Test one stock live
print("Fetching NVDA live...")
data = data_fetcher.get_stock_data("NVDA")
print(f"Price: {data['current_price']}")
print(f"MA50: {data['ma50']}")
print(f"MA200: {data['ma200']}")
print(f"RSI: {data['rsi14']}")
