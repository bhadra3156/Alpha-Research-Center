interface ConvictionMeterProps {
  score: number;
}

export default function ConvictionMeter({ score }: ConvictionMeterProps) {
  const color =
    score >= 8 ? "bg-emerald-400" :
    score >= 6 ? "bg-amber-400" :
                 "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={`w-1.5 h-3 rounded-sm ${i < score ? color : "bg-[#27272a]"}`}
          />
        ))}
      </div>
      <span className="text-[11px] font-bold text-[#fafafa] tabular-nums">
        {score}<span className="text-[#52525b] font-normal">/10</span>
      </span>
    </div>
  );
}
