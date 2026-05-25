interface VerdictBadgeProps {
  pass: boolean;
  label?: string;
}

export function VerdictBadge({ pass, label }: VerdictBadgeProps) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700",
      background: pass ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
      color: pass ? "#10b981" : "#ef4444",
      border: "1px solid " + (pass ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"),
    }}>
      {pass ? "✅" : "❌"} {label || (pass ? "PASS" : "FAIL")}
    </span>
  );
}

interface StageBadgeProps {
  stage: string;
}
export function StageBadge({ stage }: StageBadgeProps) {
  const isStage2 = stage.includes("Stage 2");
  const isStage1 = stage.includes("Stage 1");
  const color  = isStage2 ? "#10b981" : isStage1 ? "#60a5fa" : "#ef4444";
  const bg     = isStage2 ? "rgba(16,185,129,0.15)" : isStage1 ? "rgba(59,130,246,0.15)" : "rgba(239,68,68,0.15)";
  const border = isStage2 ? "rgba(16,185,129,0.3)"  : isStage1 ? "rgba(59,130,246,0.3)"  : "rgba(239,68,68,0.3)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600",
      background: bg, color, border: "1px solid " + border,
    }}>
      📈 {stage}
    </span>
  );
}

interface ConvictionMeterProps {
  score: number;
}
export function ConvictionMeter({ score }: ConvictionMeterProps) {
  const color = score >= 8 ? "#10b981" : score >= 6 ? "#f59e0b" : "#ef4444";
  const label = score >= 9 ? "Maximum" : score >= 8 ? "Very High" : score >= 7 ? "High" : score >= 6 ? "Above Avg" : "Moderate";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontWeight: "800", fontSize: "16px", color, fontFamily: "monospace" }}>{score}</span>
      <div style={{ flex: 1, minWidth: "60px" }}>
        <div style={{ height: "4px", background: "#1e293b", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: (score * 10) + "%", background: "linear-gradient(90deg, #10b981, " + color + ")", borderRadius: "2px" }}></div>
        </div>
        <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>{label}</div>
      </div>
    </div>
  );
}

interface DataQualityFlagProps {
  quality: string;
}
export function DataQualityFlag({ quality }: DataQualityFlagProps) {
  const color = quality === "HIGH" ? "#10b981" : quality === "MEDIUM" ? "#f59e0b" : "#ef4444";
  return (
    <span style={{ fontSize: "10px", fontWeight: "700", color }}>
      {quality === "HIGH" ? "● HIGH" : quality === "MEDIUM" ? "● MED" : "● LOW"}
    </span>
  );
}