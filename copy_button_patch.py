import os

# The CopyButton as a standalone function (no React import needed since we use useState)
COPY_BTN_TSX = '''
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };
  return (
    <button onClick={handleCopy}
      title="Copy to clipboard"
      style={{
        padding:"5px 12px", borderRadius:"7px", fontSize:"11px", fontWeight:"600",
        cursor:"pointer", display:"flex", alignItems:"center", gap:"5px",
        border:"1px solid rgba(148,163,184,0.25)",
        background: copied ? "rgba(16,185,129,0.15)" : "rgba(148,163,184,0.08)",
        color: copied ? "#10b981" : "#94a3b8",
        transition:"all 0.2s"
      }}>
      {copied ? (
        <><span>✓</span><span>Copied!</span></>
      ) : (
        <><span style={{fontSize:"13px"}}>⧉</span><span>Copy</span></>
      )}
    </button>
  );
}
'''

pages = [
    "frontend/app/(auth)/portfolio/page.tsx",
    "frontend/app/(auth)/watchlist/page.tsx",
    "frontend/app/(auth)/dashboard/page.tsx",
]

for filepath in pages:
    if not os.path.exists(filepath):
        print(f"SKIP: {filepath}")
        continue

    with open(filepath, "r", encoding="utf-8-sig") as f:
        content = f.read()

    changed = False

    # Step 1: Add React import if not present
    if 'import React from "react"' not in content and "import React" not in content:
        content = content.replace('"use client";', '"use client";\nimport React from "react";')
        changed = True
        print(f"  Added React import to {filepath}")

    # Step 2: Add CopyButton component after Navigation function
    if "function CopyButton" not in content:
        insert_after = "}\n\ninterface "
        if insert_after in content:
            content = content.replace(insert_after, "}\n" + COPY_BTN_TSX + "\ninterface ", 1)
            changed = True
            print(f"  ✅ Added CopyButton component to {filepath}")
        else:
            # Try after export default
            insert_after2 = "export default function"
            idx = content.find(insert_after2)
            if idx > 0:
                # Find previous function end
                nav_end = content.rfind("}\n\n", 0, idx)
                if nav_end > 0:
                    content = content[:nav_end+2] + COPY_BTN_TSX + "\n" + content[nav_end+2:]
                    changed = True
                    print(f"  ✅ Added CopyButton (alt) to {filepath}")

    # Step 3: Add copy button to analysis result panels
    # Pattern 1: portfolio/watchlist - "✕ Close" button
    old_close_1 = '''              <button onClick={()=>setAnalysis(null)}
                style={{padding:"4px 10px",borderRadius:"6px",fontSize:"11px",cursor:"pointer",border:"1px solid #1e293b",background:"transparent",color:"#475569"}}>
                ✕ Close
              </button>'''

    new_close_1 = '''              <div style={{display:"flex",gap:"6px"}}>
                <CopyButton text={analysis||""}/>
                <button onClick={()=>setAnalysis(null)}
                  style={{padding:"4px 10px",borderRadius:"6px",fontSize:"11px",cursor:"pointer",border:"1px solid #1e293b",background:"transparent",color:"#475569"}}>
                  ✕ Close
                </button>
              </div>'''

    if old_close_1 in content and "CopyButton text={analysis" not in content:
        content = content.replace(old_close_1, new_close_1)
        changed = True
        print(f"  ✅ Added copy button to analysis panel in {filepath}")

    # Pattern 2: shorter close button variant
    old_close_2 = '''<button onClick={()=>setAnalysis(null)}
                style={{padding:"4px 10px",borderRadius:"6px",fontSize:"11px",cursor:"pointer",border:"1px solid #1e293b",background:"transparent",color:"#475569"}}>
                ✕</button>'''

    new_close_2 = '''<div style={{display:"flex",gap:"6px"}}>
                <CopyButton text={analysis||""}/>
                <button onClick={()=>setAnalysis(null)}
                  style={{padding:"4px 10px",borderRadius:"6px",fontSize:"11px",cursor:"pointer",border:"1px solid #1e293b",background:"transparent",color:"#475569"}}>
                  ✕</button>
              </div>'''

    if old_close_2 in content and "CopyButton text={analysis" not in content:
        content = content.replace(old_close_2, new_close_2)
        changed = True
        print(f"  ✅ Added copy button (v2) to {filepath}")

    # Step 4: For dashboard - add copy to scan results table header
    if "dashboard" in filepath and "CopyButton text=" not in content:
        old_table_header = '''              <span style={{fontSize:"11px",color:"#334155"}}>
              {result ? new Date(result.scan_date).toLocaleString() : ""}
            </span>'''
        new_table_header = '''              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                {result && <CopyButton text={result.qualifying_stocks.map(s=>s.ticker+" $"+s.price.toFixed(2)+" "+s.technical_stage+" Conv:"+s.conviction_score+"/10 Entry:"+s.entry_zone).join("\\n")}/>}
                <span style={{fontSize:"11px",color:"#334155"}}>
                  {result ? new Date(result.scan_date).toLocaleString() : ""}
                </span>
              </div>'''
        if old_table_header in content:
            content = content.replace(old_table_header, new_table_header)
            changed = True
            print(f"  ✅ Added copy to scan results in {filepath}")

    if changed:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  💾 Saved {filepath}")
    else:
        print(f"  ℹ️ No changes needed for {filepath}")

print("\n✅ All done!")