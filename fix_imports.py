import os
import re

# The inline navigation component to replace imports
nav_inline = '''
function Navigation() {
  return (
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"rgba(6,8,32,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(245,158,11,0.2)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",height:"56px"}}>
      <a href="/dashboard" style={{display:"flex",alignItems:"center",gap:"10px",textDecoration:"none"}}>
        <div style={{width:"32px",height:"32px",borderRadius:"8px",background:"linear-gradient(135deg,#f59e0b,#d97706)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"900",fontSize:"16px",color:"#060820"}}>a</div>
        <span style={{fontWeight:"800",fontSize:"16px",color:"#f1f5f9"}}>Alpha<span style={{color:"#f59e0b"}}>Research</span></span>
      </a>
      <div style={{display:"flex",gap:"4px"}}>
        {[["dashboard","Dashboard"],["analyzer","Analyzer"],["watchlist","Watchlist"],["portfolio","Portfolio"],["journal","Journal"]].map(([href,label])=>(
          <a key={href} href={"/"+href} style={{display:"flex",alignItems:"center",padding:"6px 14px",borderRadius:"8px",textDecoration:"none",fontSize:"13px",color:"#94a3b8"}}>
            {label}
          </a>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",color:"#10b981"}}>
        <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#10b981"}}></div>
        <span>LIVE</span>
      </div>
    </nav>
  );
}
'''

badge_inline = '''
function VerdictBadge({pass, label}:{pass:boolean,label?:string}) {
  return <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"3px 10px",borderRadius:"20px",fontSize:"11px",fontWeight:"700",background:pass?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.15)",color:pass?"#10b981":"#ef4444",border:"1px solid "+(pass?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)")}}>{pass?"?":"?"} {label||(pass?"PASS":"FAIL")}</span>;
}
function StageBadge({stage}:{stage:string}) {
  const c=stage.includes("Stage 2")?"#10b981":stage.includes("Stage 1")?"#60a5fa":"#ef4444";
  return <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"3px 10px",borderRadius:"20px",fontSize:"11px",fontWeight:"600",background:c+"26",color:c,border:"1px solid "+c+"4d"}}>?? {stage}</span>;
}
function ConvictionMeter({score}:{score:number}) {
  const c=score>=8?"#10b981":score>=6?"#f59e0b":"#ef4444";
  return <div style={{display:"flex",alignItems:"center",gap:"8px"}}><span style={{fontWeight:"800",fontSize:"16px",color:c,fontFamily:"monospace"}}>{score}</span><div style={{flex:1,minWidth:"60px"}}><div style={{height:"4px",background:"#1e293b",borderRadius:"2px",overflow:"hidden"}}><div style={{height:"100%",width:score*10+"%",background:"linear-gradient(90deg,#10b981,"+c+")",borderRadius:"2px"}}></div></div></div></div>;
}
function DataQualityFlag({quality}:{quality:string}) {
  const c=quality==="HIGH"?"#10b981":quality==="MEDIUM"?"#f59e0b":"#ef4444";
  return <span style={{fontSize:"10px",fontWeight:"700",color:c}}>{quality==="HIGH"?"? HIGH":quality==="MEDIUM"?"? MED":"? LOW"}</span>;
}
'''

pages = [
    "frontend/app/(auth)/dashboard/page.tsx",
    "frontend/app/(auth)/analyzer/page.tsx",
    "frontend/app/(auth)/watchlist/page.tsx",
    "frontend/app/(auth)/portfolio/page.tsx",
    "frontend/app/(auth)/journal/page.tsx",
]

for page in pages:
    if not os.path.exists(page):
        print(f"SKIP: {page}")
        continue
    
    with open(page, "r", encoding="utf-8-sig") as f:  # utf-8-sig strips BOM
        content = f.read()
    
    # Remove Navigation import
    content = re.sub(r'import Navigation from ["\'].*Navigation["\'];?\n?', '', content)
    # Remove VerdictBadge import  
    content = re.sub(r'import \{[^}]+\} from ["\'].*VerdictBadge["\'];?\n?', '', content)
    
    # Add inline components after "use client"
    if '"use client"' in content or "'use client'" in content:
        # Insert after use client line
        if "Navigation" in content:
            content = content.replace('"use client";', '"use client";\n' + nav_inline, 1)
        if "VerdictBadge" in content or "StageBadge" in content:
            content = content.replace('"use client";', '"use client";\n' + badge_inline, 1)
    
    with open(page, "w", encoding="utf-8") as f:  # write without BOM
        f.write(content)
    print(f"FIXED: {page}")

print("All pages fixed - no external imports!")
