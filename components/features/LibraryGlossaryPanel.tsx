import { useState } from "react";
import { GlossaryPanel as GlossaryPanelUI, type GlossaryEntry } from "../data-display/GlossaryPanel";
import { SkeletonLine, SkeletonText, SkeletonButton } from "../data-display/Skeleton";
import { fmtDate } from "../tokens/format";

/* LibraryGlossaryPanel — the Library › Glossary tab.
   A shared glossary of term → definition pairs Mari uses when writing and
   reviewing. Composes the library's GlossaryPanel primitive with inline
   add / edit / delete wired to local state, and ships realistic demo terms
   so it renders standalone with no props. */

type Term = {
  id: string;
  term: string;
  definition: string;
  owner: string;
  updated: string;
};

const DEMO_TERMS: Term[] = [
  { id: "t1", term: "Canonical", definition: "The current source of truth for a topic — evidence is preferred from it and conflicting docs defer to it.", owner: "Priya Nair", updated: "2026-07-14" },
  { id: "t2", term: "Decision chunk", definition: "A thread-sized slice of a Slack conversation that captures a single decision, participants, and outcome.", owner: "Marcus Vale", updated: "2026-07-09" },
  { id: "t3", term: "Evidence policy", definition: "The rule that governs whether facts extracted from a document are trusted, flagged, or ignored.", owner: "Priya Nair", updated: "2026-06-28" },
  { id: "t4", term: "Freshness", definition: "How recently a source was verified against reality; drives the fresh-% corpus stat and stale flags.", owner: "Dana Osei", updated: "2026-07-02" },
  { id: "t5", term: "Zero tolerance", definition: "A rule behavior that treats any match as a hard block rather than an advisory finding.", owner: "Marcus Vale", updated: "2026-05-31" },
];

export type LibraryGlossaryPanelProps = {
  terms?: Term[];
  loading?: boolean;
  className?: string;
};

export function LibraryGlossaryPanel({ terms = DEMO_TERMS, loading = false, className }: LibraryGlossaryPanelProps) {
  const [rows, setRows] = useState<Term[]>(terms);

  if (loading) {
    return (
      <div className={className}>
        <div className="rounded-md border border-ink/12 bg-paper" aria-hidden="true">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <div className="space-y-2">
              <SkeletonLine w={100} h={13} />
              <SkeletonLine w={220} h={9} />
            </div>
            <SkeletonButton w={96} />
          </div>
          <div className="divide-y divide-ink/[0.08] px-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2 py-3.5">
                <SkeletonLine w="28%" h={12} />
                <SkeletonText lines={2} lastWidth="70%" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const entries: GlossaryEntry[] = rows.map((r) => ({
    id: r.id,
    term: r.term,
    definition: r.definition,
    meta: `${r.owner} · updated ${fmtDate(r.updated)}`,
  }));

  const add = (term: string, definition: string) =>
    setRows((prev) => [
      ...prev,
      { id: `t${Date.now().toString(36)}`, term, definition, owner: "You", updated: new Date().toISOString().slice(0, 10) },
    ]);

  const edit = (id: string, term: string, definition: string) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, term, definition, owner: "You", updated: new Date().toISOString().slice(0, 10) } : r)),
    );

  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  return (
    <div className={className}>
      <GlossaryPanelUI
        entries={entries}
        onAdd={add}
        onEdit={edit}
        onDelete={remove}
        title="Glossary"
        hint="Shared definitions Mari uses when writing and reviewing"
      />
    </div>
  );
}

export default LibraryGlossaryPanel;
