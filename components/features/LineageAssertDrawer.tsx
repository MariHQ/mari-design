import { useMemo, useState } from "react";
import { Sparkles, Send, Globe, ChevronDown, CheckCircle2 } from "lucide-react";
import { focusRing } from "../tokens/focusRing";
import { Button } from "../actions/Button";
import { Input } from "../forms/Input";
import { SectionLabel } from "../forms/SectionLabel";
import { Chip } from "../data-display/Chip";
import { AvatarGroup } from "../data-display/AvatarGroup";
import { SkeletonCircle, SkeletonLine, SkeletonText, SkeletonList, Skeleton } from "../data-display/Skeleton";
import {
  LgDrawerShell, SEVERITY_META, SOURCE_LABELS,
  type ImpactResult, type Severity,
} from "./LineageDataModel";

/* ─────────────────────────────────────────────────────────────────────────
   Lineage assert / impact-analysis drawer (feature: lineage-assert-drawer)

   An AI-assisted "what does changing this touch?" panel. You type an assertion,
   Mari analyzes it against the whole document graph, and the drawer returns a
   summary + impacted documents bucketed by severity, with bulk task creation
   and report export. Same non-modal shell. Analysis state is local here so it
   survives close/reopen in the demo.

   Note: unlike the deprecated mock, pre-analysis counts are 0/empty (honoring
   the api-client "never canned data" contract) — real numbers only appear once
   an analysis has run. This demo ships a baked-in result so the populated state
   shows in the gallery.
   ──────────────────────────────────────────────────────────────────────── */

const DEMO_RESULT: ImpactResult = {
  claim: "Free tier ends September 1",
  summary: "36 documents reference the free tier. 3 directly contradict the new end date and must be corrected before launch; 11 need a review pass; 22 mention it in passing.",
  docs: [
    { title: "Billing FAQ", source: "docsite", severity: "update-required", reason: "states the free tier is permanent" },
    { title: "Pricing policy", source: "docs", severity: "update-required", reason: "no sunset date recorded" },
    { title: "Onboarding guide", source: "notion", severity: "update-required", reason: "promises free-forever workspace" },
    { title: "Pricing deck Q3", source: "gdocs", severity: "review", reason: "tier table predates the change" },
    { title: "#pricing thread", source: "slack", severity: "review", reason: "unresolved customer question" },
    { title: "Free-tier limits", source: "docs", severity: "review", reason: "caps may need restating" },
    { title: "Sept launch brief", source: "granola", severity: "minor", reason: "mentions the date in passing" },
    { title: "Issue #91 · stale FAQ", source: "github", severity: "minor", reason: "loosely related" },
  ],
};

const BUCKETS: { key: Severity; label: string }[] = [
  { key: "update-required", label: "Direct contradiction" },
  { key: "review", label: "Needs update" },
  { key: "minor", label: "Mentions" },
];

export type LineageAssertDrawerProps = {
  /** Pre-loaded analysis result; pass null to show the pre-analysis empty state. */
  result?: ImpactResult | null;
  onClose?: () => void;
  /** Render a content-shaped skeleton silhouette instead of the drawer body. */
  loading?: boolean;
  className?: string;
};

export function LineageAssertDrawer({ result: initial = DEMO_RESULT, onClose, loading = false, className = "" }: LineageAssertDrawerProps) {
  const [claim, setClaim] = useState(initial?.claim ?? "Free tier ends September 1");
  const [result, setResult] = useState<ImpactResult | null>(initial);
  const [running, setRunning] = useState(false);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(initial ? "just now" : null);
  const [filter, setFilter] = useState<Severity | null>(null);
  const [taskState, setTaskState] = useState<"idle" | "creating" | "done">("idle");

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { "update-required": 0, review: 0, minor: 0 };
    for (const d of result?.docs ?? []) c[d.severity]++;
    return c;
  }, [result]);
  const needUpdates = counts["update-required"] + counts.review;
  const taskCount = result?.docs.length ?? 0;

  const analyze = () => {
    if (!claim.trim() || running) return;
    setRunning(true);
    setTaskState("idle");
    setFilter(null);
    setTimeout(() => {
      setResult(DEMO_RESULT);
      setAnalyzedAt("just now");
      setRunning(false);
    }, 1400);
  };

  const createTasks = () => {
    if (!result || taskState !== "idle") return;
    setTaskState("creating");
    setTimeout(() => setTaskState("done"), 1200);
  };

  const state: "running" | "completed" | "ready" = running ? "running" : result ? "completed" : "ready";
  const stateColor = state === "running" ? "#c8973a" : state === "completed" ? "#2C6E49" : "#94a3b8";
  const stateWord = state === "running" ? "Running" : state === "completed" ? "Completed" : "Ready";
  const stateSub = state === "running" ? "Mari is reading the graph…" : state === "completed" ? `Analyzed ${analyzedAt}` : "Type an assertion to analyze";

  const shown = result?.docs.filter((d) => !filter || d.severity === filter) ?? [];

  const taskLabel =
    taskState === "creating" ? "Creating tasks…" : taskState === "done" ? `Created ${taskCount} tasks ✓` : `Create ${taskCount} tasks`;

  if (loading) {
    return (
      <LgDrawerShell
        className={className}
        onClose={onClose}
        width={412}
        icon={<SkeletonCircle size={19} />}
        title={<SkeletonLine w="55%" h={14} />}
      >
        <Skeleton height={34} className="rounded-[4px]" />
        <div className="mt-3"><Skeleton height={44} className="rounded-[4px]" /></div>
        <div className="mt-3"><SkeletonText lines={2} /></div>
        <div className="mt-4 space-y-1.5">
          <Skeleton height={40} className="rounded-[4px]" />
          <Skeleton height={40} className="rounded-[4px]" />
          <Skeleton height={40} className="rounded-[4px]" />
        </div>
        <div className="mt-4"><SkeletonList rows={3} /></div>
      </LgDrawerShell>
    );
  }

  return (
    <LgDrawerShell
      className={className}
      onClose={onClose}
      width={412}
      icon={<Sparkles size={19} className="text-biscay-2" />}
      title={
        <span>
          Impact analysis
          <span className="mt-0.5 block text-[12px] font-normal text-ink/50">What does changing this touch?</span>
        </span>
      }
      footer={
        <div className="flex w-full flex-col gap-2">
          <Button variant="primary" block onClick={createTasks} disabled={!result || taskState !== "idle"}>
            {taskLabel}
          </Button>
          <div className="flex items-center gap-2">
            <Button compact><Send size={13} /> Export report</Button>
            <span className="ml-auto inline-flex items-center gap-1.5 font-term text-[11px] text-ink/45">
              <Globe size={12} /> All reachable documents
            </span>
          </div>
        </div>
      }
    >
      {/* assertion input */}
      <div className="flex items-center gap-2">
        <Input
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") analyze(); }}
          placeholder="Free tier ends September 1"
          className="flex-1"
          aria-label="Assertion to analyze"
        />
        <Button onClick={analyze} disabled={running || !claim.trim()} className={running ? "text-clay" : ""}>
          <Sparkles size={14} /> {running ? "Analyzing…" : "Analyze"}
        </Button>
      </div>

      {/* status row */}
      <div className="mt-3 flex items-center gap-2.5 rounded-[4px] border border-ink/10 bg-flysch/40 px-3 py-2">
        <CheckCircle2 size={16} style={{ color: stateColor }} />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-ink">{stateWord}</div>
          <div className="truncate font-term text-[11px] text-ink/50">{stateSub}</div>
        </div>
      </div>

      {/* summary */}
      {result && <p className="mt-3 text-[13px] leading-relaxed text-ink/75">{result.summary}</p>}

      {/* buckets */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <SectionLabel>{needUpdates} documents need updates</SectionLabel>
        </div>
        <div className="space-y-1.5">
          {BUCKETS.map((b) => {
            const active = filter === b.key;
            return (
              <button
                key={b.key}
                type="button"
                disabled={!result}
                onClick={() => setFilter((f) => (f === b.key ? null : b.key))}
                title={result ? undefined : "Run the analysis first"}
                className={`flex w-full items-center gap-2.5 rounded-[4px] border px-3 py-2 text-left transition-colors disabled:opacity-45 ${
                  active ? "border-ink/30 bg-flysch" : "border-ink/12 hover:border-ink/25"
                } ${focusRing}`}
              >
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: SEVERITY_META[b.key].color }}>!</span>
                <span className="text-[16px] font-bold text-ink">{counts[b.key]}</span>
                <span className="text-[13px] text-ink/75">{b.label}</span>
                <ChevronDown size={14} className={`ml-auto text-ink/40 transition-transform ${active ? "rotate-180" : ""}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* impact list */}
      <div className="mt-3">
        {result && shown.length === 0 ? (
          <p className="px-1 py-2 text-[12.5px] text-ink/45">No documents in this bucket — click it again to show all.</p>
        ) : (
          shown.map((d, i) => (
            <div key={i} className="border-b border-ink/8 py-2 last:border-0">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{d.title}</span>
                <Chip label={SEVERITY_META[d.severity].label} tone={SEVERITY_META[d.severity].tone} />
              </div>
              <div className="mt-0.5 font-term text-[11px] text-ink/50">{SOURCE_LABELS[d.source] ?? d.source} — {d.reason}</div>
            </div>
          ))
        )}
      </div>

      {/* top owners */}
      {result && (
        <div className="mt-4 flex items-center gap-2">
          <SectionLabel>Top owners</SectionLabel>
          <AvatarGroup
            className="ml-auto"
            people={[{ initials: "AK" }, { initials: "SL" }, { initials: "MM" }, { initials: "DR" }, { initials: "JS" }]}
            max={4}
          />
        </div>
      )}
    </LgDrawerShell>
  );
}
