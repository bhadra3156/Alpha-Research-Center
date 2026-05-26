# This script patches the dashboard to add "Add to Watchlist" button
# Run from: C:\Websites Project\Alpha Research Center

import sys
import os

filepath = "frontend/app/(auth)/dashboard/page.tsx"

try:
    with open(filepath, "r", encoding="utf-8-sig") as f:
        content = f.read()
    print(f"Read {len(content)} chars")
except Exception as e:
    print(f"Error reading: {e}")
    sys.exit(1)

# 1. Add addToWatchlist function after the runScan function
# Find a good insertion point - after the SortArrow component
insert_after = "const SortArrow = ({col}:{col:string}) => <span style={{color:sortBy===col?gold:\"#334155\"}}>{sortBy===col?(sortDir===\"desc\"?\" ↓\":\" ↑\"):\" ·\"}</span>;"

watchlist_fn = """
  const addToWatchlist = (s: Stock) => {
    try {
      const existing = JSON.parse(localStorage.getItem("alpha_watchlist_v3") || "[]");
      if (existing.find((i: any) => i.ticker === s.ticker)) {
        alert(s.ticker + " is already in your watchlist!");
        return;
      }
      const item = {
        id: Date.now().toString(),
        ticker: s.ticker,
        market: s.market || "US",
        sector: s.sector || "",
        theme: "",
        notes: s.technical_stage + " | Conv: " + s.conviction_score + "/10 | Entry: " + s.entry_zone,
        added: new Date().toISOString().split("T")[0],
        score: s.conviction_score,
        c1_pass: s.check1_pass,
        c2_pass: s.check2_pass,
        stage: s.technical_stage,
        rsi: s.rsi14 || 0,
        entry_zone: s.entry_zone || "",
        graduated: false
      };
      localStorage.setItem("alpha_watchlist_v3", JSON.stringify([...existing, item]));
      alert("✅ " + s.ticker + " added to watchlist!");
    } catch(e) {
      alert("Failed to add to watchlist");
    }
  };
"""

if "addToWatchlist" not in content:
    if insert_after in content:
        content = content.replace(insert_after, insert_after + watchlist_fn)
        print("✅ Added addToWatchlist function")
    else:
        # Find alternative insertion point
        alt = "const avgConv ="
        if alt in content:
            content = content.replace(alt, watchlist_fn + "\n  " + alt)
            print("✅ Added addToWatchlist function (alt location)")
        else:
            print("❌ Could not find insertion point for function")
else:
    print("✅ addToWatchlist already exists")

# 2. Add watchlist button next to the Analyze button
# Find the Analyze button in the table
old_action = """                          <button
                            onClick={() => router.push("/analyzer?ticker="+s.ticker+"&market="+s.market)}
                            style={{padding:"5px 10px",borderRadius:"6px",fontSize:"10px",fontWeight:"700",cursor:"pointer",
                              border:"1px solid rgba(245,158,11,0.3)",background:"rgba(245,158,11,0.1)",color:gold,whiteSpace:"nowrap"}}>
                            🔬 Analyze
                          </button>"""

new_action = """                          <div style={{display:"flex",gap:"4px",flexDirection:"column"}}>
                            <button
                              onClick={() => router.push("/analyzer?ticker="+s.ticker+"&market="+s.market)}
                              style={{padding:"4px 8px",borderRadius:"5px",fontSize:"9px",fontWeight:"700",cursor:"pointer",
                                border:"1px solid rgba(245,158,11,0.3)",background:"rgba(245,158,11,0.1)",color:gold,whiteSpace:"nowrap"}}>
                              🔬 Analyze
                            </button>
                            <button
                              onClick={() => addToWatchlist(s)}
                              style={{padding:"4px 8px",borderRadius:"5px",fontSize:"9px",fontWeight:"700",cursor:"pointer",
                                border:"1px solid rgba(16,185,129,0.3)",background:"rgba(16,185,129,0.1)",color:"#10b981",whiteSpace:"nowrap"}}>
                              👁️ Watch
                            </button>
                          </div>"""

if "👁️ Watch" not in content:
    if old_action in content:
        content = content.replace(old_action, new_action)
        print("✅ Added Watch button to table")
    else:
        # Try simpler replacement
        old2 = '🔬 Analyze\n                          </button>'
        new2 = '🔬 Analyze\n                            </button>\n                            <button\n                              onClick={() => addToWatchlist(s)}\n                              style={{padding:"4px 8px",borderRadius:"5px",fontSize:"9px",fontWeight:"700",cursor:"pointer",border:"1px solid rgba(16,185,129,0.3)",background:"rgba(16,185,129,0.1)",color:"#10b981",whiteSpace:"nowrap"}}>\n                              👁️ Watch\n                            </button>'
        if old2 in content:
            content = content.replace(old2, new2, 1)
            print("✅ Added Watch button (simple method)")
        else:
            print("❌ Could not find Analyze button to add Watch next to it")
            # Show what's near the analyze button
            idx = content.find("🔬 Analyze")
            if idx > 0:
                print("Found at:", content[idx-200:idx+200])
else:
    print("✅ Watch button already exists")

# Write back
with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print(f"\nWritten {len(content)} chars")
print("Done!")