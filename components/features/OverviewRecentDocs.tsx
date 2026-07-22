import { Maximize2 } from "lucide-react";
import { Card } from "../layout/Card";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonLine, SkeletonCircle } from "../data-display/Skeleton";
import { SourceMark } from "../icons/marks";
import { Button } from "../actions/Button";
import { fmtDate } from "../tokens/format";
import { focusRing } from "../tokens/focusRing";

/* Overview — Recent docs ──────────────────────────────────────────────────
   A compact list of the three most recent documents, each a link into the doc
   reader, with source mark and date. Local <DocListRow> (single-line doc link:
   leading source mark, truncating title, trailing date).
   Source: web/src/pages/Overview.tsx (recentQ, .card.lineage block). */

export type RecentDoc = {
  id: number;
  source: string;
  title: string;
  date: string;
};

function DocListRow({ doc, onOpen }: { doc: RecentDoc; onOpen: (id: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(doc.id)}
      className={`flex w-full items-center gap-2.5 py-2.5 text-left hover:bg-ink/[0.02] ${focusRing}`}
    >
      <SourceMark provider={doc.source} size={17} />
      <span className="min-w-0 flex-1 truncate text-[13px] text-ink/85">{doc.title}</span>
      <span className="font-term text-[11px] text-ink/50 whitespace-nowrap">{fmtDate(doc.date)}</span>
    </button>
  );
}

const DEMO_DOCS: RecentDoc[] = [
  { id: 101, source: "notion", title: "Pricing FAQ — Growth tier proration", date: "2026-07-20" },
  { id: 102, source: "github", title: "auth/README — Okta SAML walkthrough", date: "2026-07-19" },
  { id: 103, source: "granola", title: "Incident retro — Jul 14 latency", date: "2026-07-15" },
];

export type OverviewRecentDocsProps = {
  docs?: RecentDoc[];
  loading?: boolean;
  offline?: boolean;
  onOpen?: (id: number) => void;
  onBrowse?: () => void;
  className?: string;
};

export function OverviewRecentDocs({
  docs = DEMO_DOCS, loading = false, offline = false, onOpen, onBrowse, className = "",
}: OverviewRecentDocsProps) {
  const rows = docs.slice(0, 3);
  return (
    <Card
      className={className}
      title="Recent docs"
      actions={
        <Button compact variant="link" onClick={onBrowse} className="text-[12.5px]">
          <Maximize2 size={14} /> Browse
        </Button>
      }
    >
      {loading ? (
        <div className="divide-y divide-ink/10" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2.5 py-2.5">
              <SkeletonCircle size={17} />
              <span className="flex-1"><SkeletonLine w={["68%", "80%", "58%"][i]} h={11} /></span>
              <SkeletonLine w={44} h={9} />
            </div>
          ))}
        </div>
      ) : offline ? (
        <EmptyState>API offline — recent docs unavailable.</EmptyState>
      ) : rows.length === 0 ? (
        <p className="py-4 text-[13px] text-ink/55">No documents yet.</p>
      ) : (
        <div className="divide-y divide-ink/10">
          {rows.map((d) => (
            <DocListRow key={d.id} doc={d} onOpen={onOpen ?? (() => {})} />
          ))}
        </div>
      )}
    </Card>
  );
}
