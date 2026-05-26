import os, sys

pages = [
    "frontend/app/(auth)/watchlist/page.tsx",
    "frontend/app/(auth)/portfolio/page.tsx",
    "frontend/app/(auth)/dashboard/page.tsx",
]

for p in pages:
    if not os.path.exists(p):
        print(f"MISSING: {p}")
        continue
    with open(p, "r", encoding="utf-8-sig") as f:
        content = f.read()
    
    print(f"\nFILE: {p} ({len(content)} chars)")
    
    # Find ALL occurrences of setAnalysis(null)
    idx = 0
    found = []
    while True:
        idx = content.find("setAnalysis(null)", idx)
        if idx == -1:
            break
        found.append(idx)
        idx += 1
    print(f"  setAnalysis(null) occurrences: {len(found)}")
    
    for i in found:
        snippet = content[max(0,i-150):i+100]
        print(f"  Context: {repr(snippet)}")
    
    # Find CopyButton usage
    cb_idx = content.find("<CopyButton")
    print(f"  CopyButton usage found: {cb_idx > 0}")
    
    # Find close button patterns
    for pattern in ["✕ Close", "✕</", "✕\n"]:
        idx2 = content.find(pattern)
        if idx2 > 0:
            print(f"  Close pattern '{pattern}' at {idx2}: {repr(content[idx2-50:idx2+80])}")