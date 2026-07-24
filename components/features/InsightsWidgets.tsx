import { useState, type ReactNode } from "react";
import { Search, Sparkles, BookOpen, Clock, MessageSquare, FileCheck, Wrench } from "lucide-react";
import { Button } from "../actions/Button";
import { Card } from "../layout/Card";
import { Stat } from "../data-display/Stat";
import { IconRing } from "../data-display/IconRing";
import { GradeChip } from "../data-display/GradeChip";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { EmptyState } from "../data-display/EmptyState";
import { Truncate } from "../data-display/Truncate";
import { ActivityFeed, type ActivityItem } from "../data-display/ActivityFeed";
import { Skeleton, SkeletonLine, SkeletonStat, SkeletonCard } from "../data-display/Skeleton";
import { Scrollable } from "../data-display/Scrollable";
import { PageHeader } from "../layout/PageHeader";
import { SourceMark } from "../icons/marks";
import { fmtDate } from "../tokens/format";

/* Insights widgets — the four non-chart widgets on Insights: a headline stat
   strip, an LLM-readability grade table, a glossary-health review list with
   optimistic accept/dismiss, and a recent audit-activity feed. Composes Stat +
   IconRing, a sortable readability table (SortHeader/useSort, no minimum width
   so it can use the wider grid column), Card + Button, and ActivityFeed.
   Standalone. */

type StatTone = "ok" | "attention" | "blocked" | "info";

const DEMO_STATS: { key: string; value: number; label: string; tone: StatTone; icon: ReactNode }[] = [
  { key: "searches", value: 4820, label: "Searches", tone: "ok", icon: <Search size={16} /> },
  { key: "answers", value: 1394, label: "Answers served", tone: "info", icon: <MessageSquare size={16} /> },
  { key: "drift", value: 37, label: "Drift caught", tone: "blocked", icon: <Sparkles size={16} /> },
  { key: "fixed", value: 212, label: "Docs fixed", tone: "attention", icon: <Wrench size={16} /> },
];

const RING_OF: Record<StatTone, "ok" | "attention" | "blocked" | "info"> = {
  ok: "ok", attention: "attention", blocked: "blocked", info: "info",
};

export type ReadRow = { id: number; title: string; source: string; grade: string; note: string };
const DEMO_READABILITY: ReadRow[] = [
  { id: 1, title: "API authentication", source: "github", grade: "A", note: "Clear, concise, well-structured." },
  { id: 2, title: "Billing & invoices", source: "gdocs", grade: "B", note: "Two long paragraphs could be split." },
  { id: 3, title: "Rate limits", source: "github", grade: "C", note: "Dense; heavy passive voice." },
  { id: 4, title: "Onboarding checklist", source: "notion", grade: "A", note: "" },
  { id: 5, title: "Incident runbook", source: "slack", grade: "B", note: "Jargon without definitions." },
];

export type GlossRow = { id: number; term: string; variants: string[]; definition: string };
const DEMO_GLOSSARY: GlossRow[] = [
  { id: 1, term: "Flow", variants: ["workflow", "automation"], definition: "An automation that watches knowledge and does editorial work." },
  { id: 2, term: "Drift", variants: ["staleness", "doc rot"], definition: "When a document falls out of sync with accepted facts." },
  { id: -3, term: "Canonical", variants: ["source of truth"], definition: "The version Mari treats as authoritative." },
];

const DEMO_ACTIVITY: ActivityItem[] = [
  { id: "a1", actor: "Aki K.", action: "accepted glossary term “Drift”", time: "May 11, 4:12 PM", icon: <BookOpen size={12} /> },
  { id: "a2", actor: "Priya S.", action: "fixed 3 readability findings", time: "May 11, 2:03 PM", icon: <FileCheck size={12} /> },
  { id: "a3", actor: "Mari", action: "scored 42 documents", time: "May 11, 9:20 AM", icon: <Sparkles size={12} /> },
  { id: "a4", actor: "Dana R.", action: "dismissed a coverage finding", time: "May 10, 5:41 PM" },
];

const td = `${tdPad} text-[13px] text-ink/75 border-b border-ink/[0.06] align-middle`;

export type InsightsWidgetsProps = {
  stats?: typeof DEMO_STATS;
  readability?: ReadRow[];
  glossary?: GlossRow[];
  activity?: ActivityItem[];
  since?: string;
  /** Render a content-shaped skeleton silhouette instead of the widgets. */
  loading?: boolean;
  className?: string;
};

export function InsightsWidgets({
  stats = DEMO_STATS, readability = DEMO_READABILITY, glossary = DEMO_GLOSSARY,
  activity = DEMO_ACTIVITY, since = "2026-01-01", loading = false, className = "",
}: InsightsWidgetsProps) {
  const [scoring, setScoring] = useState(false);
  const [harvesting, setHarvesting] = useState(false);
  const [hidden, setHidden] = useState<number[]>([]);

  const readSort = useSort(readability, {
    title: (r) => r.title,
    source: (r) => r.source,
    grade: (r) => r.grade,
    note: (r) => r.note,
  });

  const candidates = glossary.filter((c) => !hidden.includes(c.id));

  const resolve = (c: GlossRow) => setHidden((h) => [...h, c.id]);

  if (loading) {
    return (
      <div className={`flex flex-col gap-5 ${className}`} aria-hidden="true">
        {/* Percentage, not 340px: a fixed skeleton line overran a phone column. */}
        <div className="space-y-2"><Skeleton width={120} height={20} /><SkeletonLine w="88%" h={11} /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
        </div>
        {/* Readability is a five-column table, so it gets the wider column. */}
      <div className="grid items-start gap-5 lg:grid-cols-[1.7fr_1fr] [&>*]:min-w-0">
          <SkeletonCard lines={6} /><SkeletonCard lines={5} />
        </div>
        <SkeletonCard lines={4} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      <PageHeader eyebrow="Insights" title="Insights" description={`Usage, quality, and coverage, counting since ${fmtDate(since)}.`} />

      {/* 1. Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Stat
            key={s.key}
            value={s.value.toLocaleString("en-US")}
            label={s.label}
            tone={s.tone}
            icon={<IconRing tone={RING_OF[s.tone]}>{s.icon}</IconRing>}
          />
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1.7fr_1fr] [&>*]:min-w-0">
        {/* 2. LLM readability */}
        <Card
          icon={<IconRing tone="info"><Search size={15} /></IconRing>}
          title="LLM readability"
          actions={<Button compact disabled={scoring} onClick={() => { setScoring(true); setTimeout(() => setScoring(false), 900); }}>{scoring ? "Scoring…" : "Score docs"}</Button>}
          variant="flush"
        >
          {readability.length === 0 ? (
            <EmptyState icon={<Search size={24} />} title="Nothing scored yet">Score your documents to see readability grades.</EmptyState>
          ) : (
            <Scrollable>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <SortHeader label="Document" sortKey="title" sort={readSort.sort} onSort={readSort.onSort} />
                    <SortHeader label="Source" sortKey="source" sort={readSort.sort} onSort={readSort.onSort} />
                    <SortHeader label="Grade" sortKey="grade" sort={readSort.sort} onSort={readSort.onSort} align="center" />
                    <SortHeader label="Note" sortKey="note" sort={readSort.sort} onSort={readSort.onSort} />
                  </tr>
                </thead>
                <tbody>
                  {readSort.sorted.map((r) => (
                    <tr key={r.id} className="hover:bg-flysch/50">
                      <td className={`${td} max-w-[260px] truncate font-medium text-ink`}>{r.title}</td>
                      <td className={`${td} whitespace-nowrap`}><span className="inline-flex items-center gap-1.5"><SourceMark provider={r.source} size={15} /> <span className="capitalize">{r.source}</span></span></td>
                      <td className={`${td} text-center`}><GradeChip grade={r.grade} /></td>
                      <td className={`${td} max-w-[300px] truncate text-ink/70`}>{r.note || "No notes"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Scrollable>
          )}
          <p className="px-4 py-3 text-[12px] text-ink/70">Deterministic A to C grades from the local model. Re-run scoring after big edits.</p>
        </Card>

        {/* 3. Glossary health */}
        <Card
          icon={<IconRing tone="ok"><BookOpen size={15} /></IconRing>}
          title="Glossary health"
          actions={<Button compact disabled={harvesting} onClick={() => { setHarvesting(true); setTimeout(() => setHarvesting(false), 900); }}>{harvesting ? "Harvesting…" : "Harvest terms"}</Button>}
        >
          {harvesting && (
            <div className="mb-3 flex items-center gap-2 font-term text-[12px] text-ink/70">
              <Sparkles size={13} className="text-biscay-2" /> Scanning documents for candidate terms…
            </div>
          )}
          {candidates.length === 0 && !harvesting ? (
            <EmptyState icon={<BookOpen size={24} />} title="All clear">No inconsistencies pending. Harvest to re-check.</EmptyState>
          ) : (
            <ul className="flex flex-col divide-y divide-ink/10">
              {candidates.map((c) => (
                <li key={c.id} className="flex items-start gap-3 py-3 first:pt-0">
                  {/* Glossary terms are user data and can be a single opaque
                      token; wrapping them drove the card 615px past its
                      column, so they ellipsise with the value on hover (§12). */}
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-baseline gap-x-2">
                      <Truncate className="text-[13.5px] font-semibold text-ink">{c.term}</Truncate>
                    </div>
                    <Truncate as="p" lines={2} className="mt-0.5 text-[12.5px] leading-snug text-ink/70">{c.definition}</Truncate>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button variant="success" compact onClick={() => resolve(c)}>Accept</Button>
                    <Button compact onClick={() => resolve(c)}>Dismiss</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* 4. Recent audit activity */}
      <Card
        icon={<IconRing tone="ink"><Clock size={15} /></IconRing>}
        title="Recent audit activity"
        hint={`Last ${activity.length} events`}
      >
        {activity.length === 0 ? (
          <EmptyState icon={<Clock size={24} />} title="Nothing logged yet">Actions on Insights will show up here.</EmptyState>
        ) : (
          <ActivityFeed items={activity.filter((a) => !String(a.action).startsWith("__")).slice(0, 8)} />
        )}
      </Card>
    </div>
  );
}
