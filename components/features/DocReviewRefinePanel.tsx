// DocReview refine panel — the right rail: a grid of AI editing "skills", a scope
// selector, a findings tally, and a Run button. Running proposes edits that land
// in the change queue; nothing changes until the user accepts them. Ported from
// mari-cloud/web/src/pages/docreview/RefinePanel.tsx. Renders standalone; the
// refinement run is simulated locally with a realistic "last run" summary.

import { Fragment, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Menu, MenuRadioGroup, MenuRadioItem } from "../navigation/Menu";
import { fmtDateTime } from "../tokens/format";
import { Skeleton, SkeletonLine } from "../data-display/Skeleton";

type Skill = { name: string; sub: string; api: string };
type RefineScope = "Whole document" | "Current selection";

// Visual skill grid → API refinement skill keys (several visuals share a key).
const SKILLS: Skill[] = [
  { name: "Tighten", sub: "Remove fluff", api: "tighten" },
  { name: "Deslop", sub: "Reduce wordiness", api: "plain" },
  { name: "Clarify", sub: "Improve clarity", api: "plain" },
  { name: "Sharpen", sub: "Stronger verbs", api: "active" },
  { name: "Understate", sub: "Reduce hype", api: "inclusive" },
  { name: "Polish", sub: "Improve tone", api: "headings" },
  { name: "Critique", sub: "Overall feedback", api: "terminology" },
];

/* faded decorative brand sprig (static line-art) */
function FadedSprig() {
  return (
    <svg width={128} height={128} viewBox="0 0 128 128" fill="none" stroke="#b0a68a" strokeWidth={1.4} strokeLinecap="round" aria-hidden>
      <path d="M64 118 C64 82 64 54 64 22" />
      <path d="M64 96 C46 90 36 78 34 60 M64 96 C82 90 92 78 94 60" />
      <path d="M64 74 C50 70 42 60 40 46 M64 74 C78 70 86 60 88 46" />
      <path d="M64 54 C54 51 48 44 46 34 M64 54 C74 51 80 44 82 34" />
      <path d="M64 30 C58 26 55 20 55 14 M64 30 C70 26 73 20 73 14" />
    </svg>
  );
}

export function DocReviewRefinePanel({
  errorN = 1,
  warnN = 3,
  advisoryN = 2,
  loading = false,
}: {
  errorN?: number;
  warnN?: number;
  advisoryN?: number;
  loading?: boolean;
}) {
  const [skill, setSkill] = useState("Tighten");
  const [scope, setScope] = useState<RefineScope>("Whole document");
  const [refining, setRefining] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [hasSel] = useState(false); // no live editor selection in the standalone panel

  const needsSelection = scope === "Current selection" && !hasSel;

  const run = () => {
    if (refining || needsSelection) return;
    setRefining(true);
    setTimeout(() => {
      setRefining(false);
      const proposed = 2 + Math.floor(Math.random() * 4);
      setLastRun(`Last run: ${fmtDateTime(new Date())} (${skill}) · ${proposed} changes proposed`);
    }, 1600);
  };

  const tally: [number, string, string][] = [
    [errorN, "Error", "#B23A1E"],
    [warnN, "Warning", "#A05E1C"],
    [advisoryN, "Advisory", "#1E6FA8"],
  ];

  if (loading) {
    return (
      <Card title="Refine" className="max-w-[340px]">
        <div className="grid grid-cols-2 gap-2" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-1.5 rounded-[5px] border border-ink/15 px-2.5 py-2">
              <SkeletonLine w="55%" h={11} /><SkeletonLine w="80%" h={9} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between" aria-hidden="true">
          <SkeletonLine w={44} h={9} /><Skeleton width={130} height={28} rounded="rounded-[4px]" />
        </div>
        <div className="mt-4 space-y-1.5" aria-hidden="true">
          <SkeletonLine w={56} h={9} />
          <Skeleton height={52} rounded="rounded-[5px]" />
        </div>
        <Skeleton height={38} rounded="rounded-[4px]" className="mt-4" />
        <SkeletonLine w="90%" h={9} className="mt-2" />
      </Card>
    );
  }

  return (
    <Card title="Refine" className="relative max-w-[340px] overflow-hidden">
      <span className="pointer-events-none absolute -right-4 -top-2 opacity-[0.18]" aria-hidden><FadedSprig /></span>

      {/* skill grid */}
      <div className="grid grid-cols-2 gap-2">
        {SKILLS.map((s) => {
          const on = skill === s.name;
          return (
            <button
              key={s.name}
              type="button"
              aria-pressed={on}
              onClick={() => setSkill(s.name)}
              className={`flex flex-col items-start rounded-[5px] border px-2.5 py-2 text-left transition-colors ${
                on ? "border-biscay-2/60 bg-biscay-2/[0.06]" : "border-ink/15 bg-paper hover:border-ink/35"
              }`}
            >
              <b className="text-[13px] text-ink">{s.name}</b>
              <span className="text-[11px] text-ink/50">{s.sub}</span>
            </button>
          );
        })}
      </div>

      {/* scope */}
      <div className="mt-4 flex items-center justify-between">
        <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/45">Scope</span>
        <Menu trigger={<Button compact>{scope} <ChevronDown size={11} /></Button>}>
          <MenuRadioGroup value={scope} onValueChange={(v) => setScope(v as RefineScope)}>
            <MenuRadioItem value="Whole document">Whole document</MenuRadioItem>
            <MenuRadioItem value="Current selection">Current selection</MenuRadioItem>
          </MenuRadioGroup>
        </Menu>
      </div>

      {/* findings tally */}
      <div className="mt-4">
        <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/45">Findings</span>
        <div className="mt-1.5 flex items-stretch rounded-[5px] border border-ink/12 bg-flysch/50 px-3 py-2.5">
          {tally.map(([n, label, color], i) => (
            <Fragment key={label}>
              {i > 0 && <span className="mx-3 w-px bg-ink/12" />}
              <span className="flex flex-1 flex-col">
                <b className="font-display text-[19px]" style={{ color }}>{n}</b>
                <span className="text-[11px] text-ink/55">{label}</span>
              </span>
            </Fragment>
          ))}
        </div>
      </div>

      <Button variant="primary" block className="mt-4" onClick={run} disabled={refining || needsSelection}>
        <Sparkles size={15} /> {refining ? "Mari is editing…" : "Run refinement"}
      </Button>
      <p className="mt-2 text-[11.5px] text-ink/50">
        {refining
          ? `Running ${skill.toLowerCase()} on ${scope.toLowerCase()} — this can take up to a minute…`
          : needsSelection
            ? "Select text in the document to refine a selection — or switch scope to the whole document."
            : lastRun ?? "Proposals land in the review queue below — nothing changes until you accept."}
      </p>
    </Card>
  );
}
