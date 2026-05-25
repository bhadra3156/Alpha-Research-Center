import Link from "next/link";

export default function LandingPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #060820 0%, #0d1145 50%, #060820 100%)" }}>
      <div style={{ textAlign: "center", maxWidth: "600px", padding: "0 24px" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "900", background: "linear-gradient(135deg, #f59e0b, #d97706)", margin: "0 auto 32px", color: "#060820" }}>a</div>
        <h1 style={{ fontSize: "48px", fontWeight: "900", marginBottom: "12px", color: "#f1f5f9" }}><span style={{ color: "#f59e0b" }}>Alpha</span>Research</h1>
        <p style={{ color: "#94a3b8", fontSize: "18px", marginBottom: "8px" }}>Institutional Equity Intelligence Engine</p>
        <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "40px" }}>US and UK Markets · 3-Check System · Smart Money Tracking</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "40px" }}>
          {[{ check: "01", name: "Fundamentals", desc: "Quality + Valuation" }, { check: "02", name: "Technical", desc: "Stage 1 or Stage 2" }, { check: "03", name: "Smart Money", desc: "13F · Form 4 · STOCK Act" }].map((item) => (
            <div key={item.check} style={{ background: "linear-gradient(145deg, #0f172a, #1e293b)", border: "1px solid #1e293b", borderRadius: "12px", padding: "16px" }}>
              <div style={{ color: "#f59e0b", fontSize: "11px", fontWeight: "700", marginBottom: "4px" }}>CHECK {item.check}</div>
              <div style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "600" }}>{item.name}</div>
              <div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <Link href="/dashboard" style={{ display: "inline-block", padding: "16px 40px", borderRadius: "12px", fontWeight: "700", fontSize: "18px", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#060820", textDecoration: "none" }}>Enter AlphaResearch</Link>
        <p style={{ marginTop: "24px", color: "#334155", fontSize: "12px" }}>For institutional and professional use only · Not financial advice</p>
      </div>
    </main>
  );
}
