import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Card } from "../layout/Card";
import { IconRing } from "../data-display/IconRing";
import { ErrorMessage } from "../feedback/ErrorMessage";
import { SkeletonLine, SkeletonCircle } from "../data-display/Skeleton";
import { SourceMark } from "../icons/marks";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { Button } from "../actions/Button";
import { fmtDate } from "../tokens/format";
import { focusRing } from "../tokens/focusRing";
import { Scrollable } from "../data-display/Scrollable";

/* Overview — Recent docs ──────────────────────────────────────────────────
   The most recently touched documents. A real table, not a bare list, so it
   carries sortable column headers and the same px-4 column rhythm as every
   other table in the console (CONVENTIONS.md §3). "Browse" expands the table
   to the full set rather than sitting inert (§2).
   Source: web/src/pages/Overview.tsx (recentQ, .card.lineage block). */

export type RecentDoc = {
  id: number;
  source: string;
  title: string;
  date: string;
};

/** Human-readable source names, so the column sorts and reads consistently. */
const SOURCE_NAME: Record<string, string> = {
  notion: "Notion",
  github: "GitHub",
  granola: "Granola",
  gdocs: "Google Drive",
  slack: "Slack",
  linear: "Linear",
};

const DEMO_DOCS: RecentDoc[] = [
  { id: 101, source: "notion", title: "Pricing FAQ: Growth tier proration", date: "2026-07-20" },
  { id: 102, source: "github", title: "auth/README: Okta SAML walkthrough", date: "2026-07-19" },
  { id: 103, source: "granola", title: "Incident retro: Jul 14, 2026 latency", date: "2026-07-15" },
  { id: 104, source: "gdocs", title: "Billing runbook: proration and credits", date: "2026-07-14" },
  { id: 105, source: "notion", title: "Onboarding space: self-serve SSO", date: "2026-07-11" },
  { id: 106, source: "linear", title: "On-call guide: escalation ladder", date: "2026-07-08" },
];

/** Collapsed height of the table, in rows, and the expanded page size. */
const PREVIEW_ROWS = 3;
const EXPANDED_ROWS = 25;

export type OverviewRecentDocsProps = {
  docs?: RecentDoc[];
  loading?: boolean;
  offline?: boolean;
  onOpen?: (id: number) => void;
  onBrowse?: () => void;
  /** Wires the error banner's Retry control. Omitted = no button. */
  onRetry?: () => void;
  /** Start with the full document list showing. */
  defaultExpanded?: boolean;
  className?: string;
};

export function OverviewRecentDocs({
  docs = DEMO_DOCS, loading = false, offline = false, onOpen, onBrowse, onRetry,
  defaultExpanded = false, className = "",
}: OverviewRecentDocsProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const { sort, onSort, sorted } = useSort(docs, {
    title: (d) => d.title,
    source: (d) => SOURCE_NAME[d.source] ?? d.source,
    updated: (d) => d.date,
  });

  const hidden = Math.max(0, docs.length - PREVIEW_ROWS);
  /* Expanding must not mean "render 400 rows and grow the card past the fold":
     it renders one page, inside a height-capped scroll region (§20). */
  const rows = expanded ? sorted.slice(0, EXPANDED_ROWS) : sorted.slice(0, PREVIEW_ROWS);

  const browse = () => {
    setExpanded((v) => !v);
    onBrowse?.();
  };

  return (
    <Card
      className={className}
      variant="flush"
      icon={<IconRing><FileText size={16} /></IconRing>}
      title="Recent docs"
      /* A table's action button lives in the top right (§3). */
      actions={
        !loading && !offline && hidden > 0 ? (
          <Button compact onClick={browse} aria-expanded={expanded}>
            {expanded
              ? <><ChevronUp size={14} /> Show fewer</>
              : <><ChevronDown size={14} /> Browse all {docs.length}</>}
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <div className="divide-y divide-ink/10 px-4 pb-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2.5 py-3">
              <SkeletonCircle size={17} />
              <span className="flex-1"><SkeletonLine w={["68%", "80%", "58%"][i]} h={11} /></span>
              <SkeletonLine w={44} h={9} />
            </div>
          ))}
        </div>
      ) : offline ? (
        /* §8: failure copy comes from the catalog, never a bespoke string. */
        <div className="px-4 pb-4"><ErrorMessage id="server.unavailable" onAction={onRetry} /></div>
      ) : (
        <>
        {/* Count strip above the list, below the card's action bar (§13). */}
        {docs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 px-4 pb-2.5">
            <span className="font-term text-[11.5px] text-ink/65">
              {rows.length < docs.length
                ? `Showing ${rows.length} of ${docs.length.toLocaleString()} documents`
                : `Showing all ${docs.length.toLocaleString()} document${docs.length === 1 ? "" : "s"}`}
            </span>
          </div>
        )}
        <Scrollable axis="both" style={{ maxHeight: rows.length > 8 ? 420 : undefined }}>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {/* w-full + max-w-0 lets the document column absorb the leftover
                    width and truncate, instead of stretching the table past the
                    card and pushing Source and Updated out of view. The min-w
                    floor keeps it from collapsing to nothing in a narrow card. */}
                <SortHeader label="Document" sortKey="title" sort={sort} onSort={onSort} className="w-full min-w-[200px] max-w-0" />
                <SortHeader label="Source" sortKey="source" sort={sort} onSort={onSort} align="center" className="whitespace-nowrap" />
                <SortHeader label="Updated" sortKey="updated" sort={sort} onSort={onSort} align="right" className="whitespace-nowrap" />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-ink/10 last:border-0 hover:bg-ink/[0.02]">
                  <td className={`${tdPad} w-full min-w-[200px] max-w-0`}>
                    <button
                      type="button"
                      onClick={() => onOpen?.(d.id)}
                      className={`block min-w-0 max-w-full truncate text-left text-[13px] text-ink/85 hover:text-biscay-2 hover:underline underline-offset-[3px] ${focusRing}`}
                    >
                      {d.title}
                    </button>
                  </td>
                  <td className={`${tdPad} text-center align-middle`}>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-ink/70">
                      <SourceMark provider={d.source} size={17} />
                      {SOURCE_NAME[d.source] ?? d.source}
                    </span>
                  </td>
                  <td className={`${tdPad} text-right font-term text-[11px] whitespace-nowrap text-ink/65`}>
                    {fmtDate(d.date)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className={`${tdPad} text-[13px] text-ink/70`} colSpan={3}>No documents yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Scrollable>
        </>
      )}
    </Card>
  );
}
