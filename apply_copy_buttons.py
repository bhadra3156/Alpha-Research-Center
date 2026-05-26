import os

pages_fixes = {
    "frontend/app/(auth)/watchlist/page.tsx": {
        "old": 'style={{padding:"4px 10px",borderRadius:"6px",fontSize:"11px",cursor:"pointer",border:"1px solid #1e293b",background:"transparent",color:"#475569"}}>✕</button>',
        "new": 'style={{padding:"4px 10px",borderRadius:"6px",fontSize:"11px",cursor:"pointer",border:"1px solid #1e293b",background:"transparent",color:"#475569"}}>✕</button>\n              <CopyButton text={analysis||""}/>'
    },
    "frontend/app/(auth)/portfolio/page.tsx": {
        "old": '                ✕ Close\n              </button>',
        "new": '                ✕ Close\n              </button>\n              <CopyButton text={analysis||""}/>',
    },
}

# Dashboard fix - add copy button to scan results header
dashboard_path = "frontend/app/(auth)/dashboard/page.tsx"
if os.path.exists(dashboard_path):
    with open(dashboard_path, "r", encoding="utf-8-sig") as f:
        dash = f.read()
    
    # Add copy button in the qualifying gems header
    old_dash = '{stocks.length} PASS\n                </span>'
    new_dash = '{stocks.length} PASS\n                </span>\n                <CopyButton text={stocks.map(s=>`${s.ticker} | $${s.price.toFixed(2)} | ${s.technical_stage} | Conv:${s.conviction_score}/10 | Entry:${s.entry_zone}`).join("\\n")}/>'
    
    if old_dash in dash and "<CopyButton" not in dash:
        dash = dash.replace(old_dash, new_dash)
        with open(dashboard_path, "w", encoding="utf-8") as f:
            f.write(dash)
        print(f"✅ Dashboard copy button added!")
    elif "<CopyButton" in dash:
        print(f"ℹ️ Dashboard already has CopyButton")
    else:
        print(f"❌ Dashboard pattern not found")
        # Show what we have
        idx = dash.find("PASS")
        if idx > 0:
            print(f"  PASS context: {repr(dash[idx-50:idx+100])}")

# Fix watchlist and portfolio
for filepath, fix in pages_fixes.items():
    if not os.path.exists(filepath):
        print(f"MISSING: {filepath}")
        continue
    
    with open(filepath, "r", encoding="utf-8-sig") as f:
        content = f.read()
    
    if "<CopyButton text={analysis" in content:
        print(f"ℹ️ {filepath} already has CopyButton on analysis")
        continue
        
    if fix["old"] in content:
        content = content.replace(fix["old"], fix["new"])
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ Fixed: {filepath}")
    else:
        print(f"❌ Pattern not found in {filepath}")
        # Try to find what's there
        idx = content.find("✕")
        if idx > 0:
            print(f"  Found ✕ at {idx}: {repr(content[idx-100:idx+100])}")

print("\nAll done!")