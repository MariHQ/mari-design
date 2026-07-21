const TINT: Record<1 | 2 | 3 | 4, string> = {
  1: "bg-biscay/10 text-biscay",
  2: "bg-biscay-2/10 text-biscay-2",
  3: "bg-moss/10 text-moss",
  4: "bg-clay/10 text-clay",
};

const SIZE = { sm: "w-6 h-6 text-[10px]", md: "w-8 h-8 text-[11.5px]" };

/* Initials disc, tinted from four canonical brand colors. Tint derives from
   the name when not given, so the same person is always the same color.
   Deliberately never uses espelette — that's the single hot accent per
   canvas, not a decorative tint repeated across a list of people. */
export function Avatar({ name, initials, tint, size = "md" }: {
  name: string;
  initials?: string;
  tint?: 1 | 2 | 3 | 4;
  size?: "sm" | "md";
}) {
  const init = initials ?? name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const t = tint ?? ((Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % 4) + 1) as 1 | 2 | 3 | 4;
  return (
    <span title={name} className={`inline-flex items-center justify-center rounded-full font-term font-medium shrink-0 ${SIZE[size]} ${TINT[t]}`}>
      {init || "?"}
    </span>
  );
}
