// DocReview outline + revision panels — the left rail: a live document outline
// derived from heading blocks (auto-numbered, skipping headings that carry their
// own number), and a revision-history list. Ported from
// mari-cloud/web/src/pages/docreview/OutlinePanel.tsx + the outline derivation in
// index.tsx. Renders standalone from a baked-in document body + revisions; the
// jump handler is optional (defaults to highlighting the clicked outline item).

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { parseMarkdown } from "../data-display/markdown";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Avatar } from "../data-display/Avatar";
import { Chip } from "../data-display/Chip";
import { SkeletonLine, SkeletonCircle } from "../data-display/Skeleton";

/* ————— ported helpers ————— */

const blockText = (html: string): string => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").replace(/ /g, " ").trim();
};
const hasOwnNumbering = (s: string) => /^\s*\d+(\.\d+)*[.)]?(\s|$)/.test(s);
const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

type OutlineItem = { id: number; n: string; t: string; sub: boolean };
type Rev = { id: number; actor: string; verb: string; at: string };

/* ————— demo data ————— */

const DEMO_MD = `# Authentication Service Migration

## Overview
intro

## 2. Rollout phases
body

### Canary
body

### Ramp
body

## Risks
body`;

/* Every timestamp carries its year (CONVENTIONS.md §5) — the list used to mix
   "2h ago" and "Jul 18, 11:03 AM", so two rows could not be compared. */
const DEMO_REVS: Rev[] = [
  { id: 1, actor: "Aki Kim", verb: "edited Overview", at: "Jul 21, 2026, 2:40 PM" },
  { id: 2, actor: "Lena Shah", verb: "ran Tighten", at: "Jul 20, 2026, 4:12 PM" },
  { id: 3, actor: "Maya Chen", verb: "accepted 3 changes", at: "Jul 18, 2026, 11:03 AM" },
  { id: 4, actor: "Aki Kim", verb: "ran fact check", at: "Jul 17, 2026, 9:40 AM" },
  { id: 5, actor: "Sam Ortiz", verb: "created the document", at: "Jul 15, 2026, 2:15 PM" },
  { id: 6, actor: "Lena Shah", verb: "imported from docs", at: "Jul 15, 2026, 2:14 PM" },
];

export function DocReviewOutlinePanel({
  body = DEMO_MD,
  revisions = DEMO_REVS,
  onJump,
  loading = false,
}: {
  body?: string;
  revisions?: Rev[];
  onJump?: (id: number) => void;
  loading?: boolean;
}) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const outline = useMemo<OutlineItem[]>(() => {
    const blocks = parseMarkdown(body);
    const items: OutlineItem[] = [];
    let h2 = 0, h3 = 0;
    for (const b of blocks) {
      if (b.type !== "h2" && b.type !== "h3") continue;
      const text = blockText(b.html);
      if (b.type === "h2") {
        h2++; h3 = 0;
        items.push({ id: b.id, n: hasOwnNumbering(text) ? "" : `${h2}.`, t: text, sub: false });
      } else {
        h3++;
        items.push({ id: b.id, n: hasOwnNumbering(text) ? "" : `${h2}.${h3}`, t: text, sub: true });
      }
    }
    return items;
  }, [body]);

  const jump = (id: number) => { setActiveId(id); onJump?.(id); };
  const visibleRevs = showAll ? revisions : revisions.slice(0, 4);

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-4" aria-hidden="true">
        <Card title="Document outline">
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonLine key={i} w={`${88 - (i % 3) * 16}%`} h={11} className={i % 2 ? "ml-4" : ""} />
            ))}
          </div>
        </Card>
        <Card title="Revision history">
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-2.5">
                <SkeletonCircle size={26} />
                <div className="flex-1 space-y-1.5"><SkeletonLine w="55%" h={11} /><SkeletonLine w="75%" h={9} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <Card title="Document outline">
        <div className="space-y-0.5">
          {outline.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => jump(o.id)}
              className={`flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-[13px] transition-colors ${
                o.sub ? "pl-6" : ""
              } ${activeId === o.id ? "bg-biscay-2/[0.08] text-ink" : "text-ink/70 hover:bg-flysch hover:text-ink"}`}
            >
              {/* A square bar, not a dot: a circle reads as "choose me"
                  (CONVENTIONS.md §6). */}
              {!o.sub && <span className="inline-block h-2.5 w-[3px] shrink-0 rounded-[1px] bg-clay" />}
              {o.n && <span className="shrink-0 font-term text-[11px] text-ink/65">{o.n}</span>}
              <span className="min-w-0 truncate">{o.t}</span>
            </button>
          ))}
          {outline.length === 0 && (
            <div className="text-[12.5px] text-ink/70">No headings yet. Add a section with the H1 menu.</div>
          )}
        </div>
      </Card>

      <Card title="Revision history">
        <div className="space-y-3">
          {visibleRevs.map((r, i) => (
            <div key={r.id} className="flex items-start gap-2.5">
              <Avatar initials={initialsOf(r.actor)} />
              <span className="min-w-0 flex-1">
                {/* The name truncates and the chip stays put: a long name used
                    to shove "Current" onto its own ragged line. */}
                <span className="flex items-center gap-1.5 text-[13px] text-ink">
                  <span className="min-w-0 truncate">{r.actor}</span>
                  {i === 0 && <span className="shrink-0"><Chip label="Current" tone="ok" dot pulse /></span>}
                </span>
                <span className="mt-0.5 block break-words text-[11px] text-ink/70">{r.verb} · {r.at}</span>
              </span>
            </div>
          ))}
          {visibleRevs.length === 0 && (
            <div className="text-[12.5px] text-ink/70">No revisions yet. Edits show up here as soon as they are saved.</div>
          )}
        </div>
        {revisions.length > 4 && (
          <div className="mt-3">
            <Button variant="link" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show fewer revisions" : `View all ${revisions.length} revisions`} <ArrowRight size={12} />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
