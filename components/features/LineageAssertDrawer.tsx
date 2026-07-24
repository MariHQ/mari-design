import { useMemo, useState } from "react";
import { Sparkles, Send, Globe, ChevronDown } from "lucide-react";
import { focusRing } from "../tokens/focusRing";
import { Button } from "../actions/Button";
import { CardActions, CardBody, CardMeta, CardSection, CardTitleBlock } from "../layout/CardShell";
import { Input } from "../forms/Input";
import { Chip } from "../data-display/Chip";
import { AvatarGroup } from "../data-display/AvatarGroup";
import { Truncate } from "../data-display/Truncate";
import { FieldError } from "../feedback/ErrorMessage";
import { SkeletonCircle, SkeletonLine, SkeletonText, SkeletonList, Skeleton } from "../data-display/Skeleton";
import {
  LgDrawerShell, LG_DRAWER_W_WIDE, SEVERITY_META, SOURCE_LABELS, LgSourceChip, LgAuthor, LgOwners,
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

/** Impacted-document rows drawn per page. */
const DOC_PAGE = 10;

const BUCKETS: { key: Severity; label: string }[] = [
  { key: "update-required", label: "Direct contradiction" },
  { key: "review", label: "Needs update" },
  { key: "minor", label: "Mentions" },
];

export type LineageAssertDrawerProps = {
  /** What running the analysis yields. Required: the drawer never invents an
      impact set. `analyzed` decides whether it is already on screen. */
  result: ImpactResult;
  /** Start with the analysis already resolved (false = pre-analysis state). */
  analyzed: boolean;
  /** The claim the drawer starts with, before an analysis has run. */
  claim: string;
  /** Top owners of the impacted documents. */
  owners: { name: string; role: string }[];
  /** Initials for the owner avatar stack. */
  people: string[];
  /** Run the analysis for real and hand back what came out. Long-running: the
      Analyze button says so. May throw; the drawer shows the message. Omitted
      = the drawer resolves to `result`, which is what the canvas renders. */
  onAnalyze?: (claim: string) => ImpactResult | Promise<ImpactResult>;
  onClose?: () => void;
  /** Render a content-shaped skeleton silhouette instead of the drawer body. */
  loading?: boolean;
  className?: string;
};

export function LineageAssertDrawer({
  result: outcome, analyzed, claim: initialClaim, owners, people,
  onAnalyze, onClose, loading = false, className = "",
}: LineageAssertDrawerProps) {
  const initial = analyzed ? outcome : null;
  const [claim, setClaim] = useState(initial?.claim ?? initialClaim);
  const [result, setResult] = useState<ImpactResult | null>(initial);
  const [running, setRunning] = useState(false);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(initial ? "just now" : null);
  const [filter, setFilter] = useState<Severity | null>(null);
  const [taskState, setTaskState] = useState<"idle" | "creating" | "done">("idle");
  const [failed, setFailed] = useState<string | null>(null);
  const [exported, setExported] = useState(false);
  const [docPage, setDocPage] = useState(1);

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { "update-required": 0, review: 0, minor: 0 };
    for (const d of result?.docs ?? []) c[d.severity]++;
    return c;
  }, [result]);
  const needUpdates = counts["update-required"] + counts.review;
  const taskCount = result?.docs.length ?? 0;

  const analyze = async () => {
    if (!claim.trim() || running) return;
    setRunning(true);
    setFailed(null);
    setTaskState("idle");
    setFilter(null);
    try {
      // Mari reads the whole graph, so this is genuinely slow and the button
      // says "Analyzing…" the entire time.
      const next = onAnalyze
        ? await onAnalyze(claim.trim())
        : await new Promise<ImpactResult>((r) => setTimeout(() => r(outcome), 1400));
      setResult(next);
      setAnalyzedAt("just now");
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "The analysis could not run.");
    } finally {
      setRunning(false);
    }
  };

  const createTasks = () => {
    if (!result || taskState !== "idle") return;
    setTaskState("creating");
    setTimeout(() => setTaskState("done"), 1200);
  };

  const state: "running" | "completed" | "ready" = running ? "running" : result ? "completed" : "ready";
  const stateWord = state === "running" ? "Running" : state === "completed" ? "Completed" : "Ready";
  const stateSub = state === "running" ? "Mari is reading the graph…" : state === "completed" ? `Analyzed ${analyzedAt}` : "Type an assertion to analyze";

  const matching = result?.docs.filter((d) => !filter || d.severity === filter) ?? [];
  /* An analysis over a real graph returns dozens of documents. Page them: the
     drawer stays one readable panel instead of an endless scroll. */
  const shown = matching.slice(0, DOC_PAGE * docPage);
  const hiddenDocs = matching.length - shown.length;

  const taskLabel =
    taskState === "creating" ? "Creating tasks…" : taskState === "done" ? `Created ${taskCount} tasks ✓` : `Create ${taskCount} tasks`;

  if (loading) {
    return (
      <LgDrawerShell
        className={className}
        onClose={onClose}
        width={LG_DRAWER_W_WIDE}
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
      width={LG_DRAWER_W_WIDE}
      icon={<Sparkles size={19} className="text-biscay-2" />}
      title="Impact analysis"
      summary="What does changing this touch?"
      footer={
        /* CONVENTIONS §2: primary bottom LEFT, secondary on the same line to
           its right. */
        <div className="flex w-full flex-col gap-2">
          <CardActions
            className="pt-0"
            primary={
              <Button variant="primary" onClick={createTasks} disabled={!result || taskState !== "idle"}>
                {taskLabel}
              </Button>
            }
            secondary={
              <Button onClick={() => setExported(true)}>
                <Send size={13} /> {exported ? "Report exported" : "Export report"}
              </Button>
            }
          />
          <span className="inline-flex items-center gap-1.5 font-term text-[11px] text-ink/65">
            <Globe size={12} /> All reachable documents
          </span>
        </div>
      }
    >
      <CardBody>
        {/* Slot 3: the card's own search/assertion bar. */}
        <div className="flex items-center gap-2">
          <Input
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void analyze(); }}
            placeholder="Free tier ends September 1"
            className="flex-1"
            aria-label="Assertion to analyze"
          />
          <Button onClick={() => void analyze()} disabled={running || !claim.trim()} className={running ? "text-clay" : ""}>
            <Sparkles size={14} /> {running ? "Analyzing…" : "Analyze"}
          </Button>
        </div>
        {failed && <FieldError>{failed}</FieldError>}

        {/* Slots 4 + 5: the claim under analysis and what came back. */}
        <CardTitleBlock
          className="[overflow-wrap:anywhere]"
          title={result?.claim ?? claim ?? "No assertion yet"}
          summary={result?.summary ?? "Type an assertion and run the analysis to see what it touches."}
        />
        <CardMeta
          source={<Chip label="All reachable documents" tone="neutral" icon={<Globe size={11} />} />}
          status={
            <Chip
              label={stateWord}
              tone={state === "running" ? "attention" : state === "completed" ? "ok" : "neutral"}
              dot
              pulse={state === "running"}
            />
          }
          date={stateSub}
          author={<LgAuthor name="Mari" />}
        />

        <CardSection label="Documents that need updates" count={needUpdates}>
          <div className="space-y-1.5">
            {BUCKETS.map((b) => {
              const active = filter === b.key;
              return (
                <button
                  key={b.key}
                  type="button"
                  disabled={!result}
                  onClick={() => { setFilter((f) => (f === b.key ? null : b.key)); setDocPage(1); }}
                  title={result ? undefined : "Run the analysis first"}
                  aria-pressed={active}
                  /* Disabled reads as a legible grey, never a 45% ghost (§6). */
                  className={`flex w-full items-center gap-2.5 rounded-[4px] border px-3 py-2 text-left transition-colors disabled:opacity-100 disabled:border-ink/10 disabled:bg-flysch/60 disabled:text-ink/60 ${
                    active ? "border-biscay-2 bg-biscay-2/[0.08] ring-1 ring-biscay-2" : "border-ink/12 hover:border-ink/25"
                  } ${focusRing}`}
                >
                  {/* Square marker, not a radio-looking circle (§6). */}
                  <span
                    className="grid h-4 w-4 shrink-0 place-items-center rounded-[2px] font-term text-[10px] font-bold text-white"
                    style={{ backgroundColor: SEVERITY_META[b.key].color }}
                    aria-hidden
                  >
                    !
                  </span>
                  <span className="text-[16px] font-bold text-ink">{counts[b.key]}</span>
                  <span className="text-[13px] text-ink/75">{b.label}</span>
                  <ChevronDown size={14} className={`ml-auto text-ink/65 transition-transform ${active ? "rotate-180" : ""}`} />
                </button>
              );
            })}
          </div>
        </CardSection>

        <CardSection
          label={filter ? `${SEVERITY_META[filter].label} documents` : "Impacted documents"}
          count={matching.length}
          action={filter
            ? <button type="button" onClick={() => { setFilter(null); setDocPage(1); }} className={`font-term text-[11px] text-biscay-2 hover:underline ${focusRing}`}>Clear filter</button>
            : undefined}
        >
          {shown.length === 0 ? (
            <p className="text-[12.5px] text-ink/70">
              {result ? "No documents in this bucket. Clear the filter to show all." : "Nothing analyzed yet."}
            </p>
          ) : (
            <>
              {shown.map((d, i) => (
                <div key={i} className="border-b border-ink/10 py-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <Truncate className="min-w-0 flex-1 text-[13px] font-medium text-ink">{d.title}</Truncate>
                    <span className="shrink-0"><Chip label={SEVERITY_META[d.severity].label} tone={SEVERITY_META[d.severity].tone} dot /></span>
                  </div>
                  <div className="mt-1 flex items-start gap-2">
                    <LgSourceChip source={d.source} />
                    <Truncate lines={2} className="min-w-0 flex-1 font-term text-[11px] leading-[1.6] text-ink/70">{d.reason}</Truncate>
                  </div>
                </div>
              ))}
              <div className="mt-2.5 flex items-center gap-3">
                {hiddenDocs > 0 && (
                  <Button compact onClick={() => setDocPage((p) => p + 1)}>
                    Show {Math.min(hiddenDocs, DOC_PAGE)} more
                  </Button>
                )}
                <span className="font-term text-[11px] text-ink/65">
                  Showing {shown.length} of {matching.length} documents
                </span>
              </div>
            </>
          )}
        </CardSection>

        {result && (
          <CardSection label="Owners" count={people.length} action={<AvatarGroup people={people.map((initials) => ({ initials }))} max={4} />}>
            <LgOwners owners={owners} />
          </CardSection>
        )}
      </CardBody>
    </LgDrawerShell>
  );
}
