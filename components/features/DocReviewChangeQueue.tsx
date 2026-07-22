// DocReview change queue — the review-before-apply panel. Proposed edits render
// as a word-level diff (original struck, proposed bolded, shared context between);
// accepting rewrites the document body, rejecting dismisses. Ported from
// mari-cloud/web/src/pages/docreview/ChangeQueue.tsx + the accept/reject/apply
// logic in index.tsx. The word diff is hand-rolled (no library has a change view).
//
// Renders standalone: baked-in body text + proposed changes, fully interactive.

import { useMemo, useState } from "react";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Chip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { Tabs } from "../navigation/Tabs";

/* ————— ported diff helpers ————— */

const cleanText = (s: string) => s.replace(/^[…\s]+/, "").replace(/[…\s]+$/, "").trim();

function diffChange(orig: string, repl: string) {
  const a = orig.split(" ");
  const b = repl.split(" ");
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  return {
    pre: a.slice(0, pre).join(" "),
    delA: a.slice(pre, a.length - suf).join(" "),
    delB: b.slice(pre, b.length - suf).join(" "),
    suf: suf ? a.slice(a.length - suf).join(" ") : "",
  };
}

type ChangeState = "pending" | "accepted" | "rejected";
type Change = { id: number; original: string; proposed: string; rule: string; state: ChangeState };
type ChangeTab = "review" | "all";

/* ————— demo data ————— */

const DEMO_BODY =
  "The new authentication service replaces the legacy session store with stateless JWT tokens. " +
  "It is expected to reduce login latency by roughly 40% and remove the shared-session bottleneck. " +
  "Tokens are signed with RS256 and rotated every 24 hours. " +
  "We will roll out the change in three phases across the fleet.";

const DEMO_CHANGES: Change[] = [
  { id: 1, original: "It is expected to reduce login latency by roughly 40%", proposed: "It reduces measured login latency by 22%", rule: "Fact check — align with staging measurement", state: "pending" },
  { id: 2, original: "roll out the change in three phases across the fleet", proposed: "roll out the change in three phases", rule: "Tighten — cut vague scope", state: "pending" },
  { id: 3, original: "replaces the legacy session store", proposed: "supersedes the legacy session store", rule: "Sharpen — stronger verb", state: "pending" },
  { id: 4, original: "remove the shared-session bottleneck", proposed: "eliminate the shared-session bottleneck", rule: "Sharpen — stronger verb", state: "accepted" },
  { id: 5, original: "signed with RS256 and rotated every 24 hours", proposed: "signed with RS256, rotated daily", rule: "Deslop — reduce wordiness", state: "rejected" },
];

export function DocReviewChangeQueue({
  changes: initialChanges = DEMO_CHANGES,
  body = DEMO_BODY,
}: {
  changes?: Change[];
  body?: string;
}) {
  const [tab, setTab] = useState<ChangeTab>("review");
  const [changes, setChanges] = useState<Change[]>(initialChanges);
  const [bodyText, setBodyText] = useState(body);

  const pending = changes.filter((c) => c.state === "pending");
  const visible = tab === "review" ? pending : changes;

  const isApplied = (c: Change) => c.state === "pending" && !bodyText.includes(cleanText(c.original));

  const applyLocal = (orig: string, repl: string) => {
    const o = cleanText(orig);
    if (!o) return;
    setBodyText((t) => t.split(o).join(cleanText(repl)));
  };

  const accept = (c: Change) => {
    setChanges((cs) => cs.map((x) => (x.id === c.id ? { ...x, state: "accepted" } : x)));
    applyLocal(c.original, c.proposed);
  };
  const reject = (c: Change) =>
    setChanges((cs) => cs.map((x) => (x.id === c.id ? { ...x, state: "rejected" } : x)));
  const acceptAll = () => {
    pending.forEach((c) => applyLocal(c.original, c.proposed));
    setChanges((cs) => cs.map((c) => (c.state === "pending" ? { ...c, state: "accepted" } : c)));
  };

  return (
    <Card variant="flush" className="max-w-[720px]">
      <div className="px-4 pt-4">
        <Tabs<ChangeTab>
          value={tab}
          onChange={setTab}
          ariaLabel="Proposed changes"
          variant="underline"
          options={[
            { id: "review", label: "Review before apply" },
            { id: "all", label: "All changes", count: changes.length },
          ]}
        />
      </div>

      {visible.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_150px] gap-3 px-4 pt-3 pb-1.5 border-b border-ink/10">
          <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/45">Original</span>
          <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/45">⇄ Proposed</span>
          <span />
        </div>
      )}

      <div>
        {visible.map((c) => {
          const d = diffChange(cleanText(c.original), cleanText(c.proposed));
          const applied = isApplied(c);
          return (
            <div
              key={c.id}
              className={`grid grid-cols-[1fr_1fr_150px] gap-3 px-4 py-3 border-b border-ink/8 ${c.state === "rejected" ? "opacity-50" : ""}`}
            >
              <div className="font-term text-[12.5px] leading-[1.55] text-ink/70">
                {d.pre && <>{d.pre} </>}
                {d.delA && <s className="text-espelette/80 decoration-espelette/60">{d.delA}</s>}
                {d.suf && <> {d.suf}</>}
              </div>
              <div className={`font-term text-[12.5px] leading-[1.55] ${c.state === "accepted" ? "text-moss" : "text-ink/70"}`}>
                {d.pre && <>{d.pre} </>}
                {d.delB && <b className="text-moss">{d.delB}</b>}
                {d.suf && <> {d.suf}</>}
              </div>
              <div className="flex flex-col items-start gap-1.5">
                <span className="text-[11px] leading-tight text-ink/45">
                  Motivated by:<br /><b className="text-ink/70">{c.rule}</b>
                </span>
                {c.state === "pending" ? (
                  applied ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-ink/45">already applied</span>
                      <Button compact onClick={() => reject(c)}>Dismiss</Button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <Button compact variant="success" onClick={() => accept(c)}>Accept</Button>
                      <Button compact variant="danger" onClick={() => reject(c)}>Reject</Button>
                    </div>
                  )
                ) : (
                  <Chip
                    label={c.state === "accepted" ? "Accepted" : "Rejected"}
                    tone={c.state === "accepted" ? "ok" : "blocked"}
                    dot
                  />
                )}
              </div>
            </div>
          );
        })}
        {visible.length === 0 && (
          <EmptyState>No pending changes — run a refinement or switch to “All changes”.</EmptyState>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-[11px] text-ink/50">Showing {visible.length} of {changes.length} changes</span>
        <Button onClick={acceptAll} disabled={pending.length === 0}>
          Accept all {pending.length || ""} changes
        </Button>
      </div>
    </Card>
  );
}
