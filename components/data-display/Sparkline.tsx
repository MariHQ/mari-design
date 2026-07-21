const COLOR: Record<"ok" | "attention" | "blocked" | "info" | "neutral", string> = {
  ok: "#2C6E49",
  attention: "#A05E1C",
  blocked: "#B23A1E",
  info: "#1E6FA8",
  neutral: "#10263B99",
};

/* Small inline trend line for compact readouts (answers served/week, source
   pulse). Tone follows the same 5-tone scale as Badge/Chip/Stat. */
export function Sparkline({ values, width = 92, height = 26, tone = "ok" }: {
  values: number[];
  width?: number;
  height?: number;
  tone?: keyof typeof COLOR;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (width - 4) + 2},${height - 3 - (v / max) * (height - 8)}`);
  return (
    <svg width={width} height={height} aria-hidden style={{ display: "block" }}>
      <polyline points={pts.join(" ")} fill="none" stroke={COLOR[tone]} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
