import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Input } from "../forms/Input";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonLine, SkeletonText, SkeletonButton } from "../data-display/Skeleton";
import { fmtDate } from "../tokens/format";

/* LibraryGlossaryPanel — the Library › Glossary tab.
   A shared glossary of term → definition pairs Mari uses when writing and
   reviewing, with inline add / edit / delete wired to local state, so it
   renders standalone with no props.

   The list is local rather than data-display/GlossaryPanel: there, Edit was a
   36px icon button sitting next to a 28px compact Delete, so two controls that
   do the same kind of thing were visibly different heights. Both are
   `<Button compact>` here, labelled, on one baseline, with Delete going
   through <ConfirmButton> (CONVENTIONS §2). */

export type Term = {
  id: string;
  term: string;
  definition: string;
  owner: string;
  updated: string;
};

const DEMO_TERMS: Term[] = [
  { id: "t1", term: "Canonical", definition: "The current source of truth for a topic; evidence is preferred from it and conflicting docs defer to it.", owner: "Priya Nair", updated: "2026-07-14" },
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

const today = () => new Date().toISOString().slice(0, 10);

export function LibraryGlossaryPanel({ terms = DEMO_TERMS, loading = false, className }: LibraryGlossaryPanelProps) {
  const [rows, setRows] = useState<Term[]>(terms);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTerm, setEditTerm] = useState("");
  const [editDef, setEditDef] = useState("");
  const [newTerm, setNewTerm] = useState("");
  const [newDef, setNewDef] = useState("");

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

  const startEdit = (t: Term) => { setEditId(t.id); setEditTerm(t.term); setEditDef(t.definition); };

  const saveEdit = () => {
    if (editId && editTerm.trim() && editDef.trim()) {
      setRows((prev) => prev.map((r) => (r.id === editId
        ? { ...r, term: editTerm.trim(), definition: editDef.trim(), owner: "You", updated: today() }
        : r)));
    }
    setEditId(null);
  };

  const add = () => {
    if (!newTerm.trim() || !newDef.trim()) return;
    setRows((prev) => [
      ...prev,
      { id: `t${Date.now().toString(36)}`, term: newTerm.trim(), definition: newDef.trim(), owner: "You", updated: today() },
    ]);
    setNewTerm(""); setNewDef("");
  };

  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  return (
    <Card
      variant="flush"
      title="Glossary"
      hint="Shared definitions Mari uses when writing and reviewing"
      className={className}
    >
      <div className="divide-y divide-ink/10 border-t border-ink/10">
        {rows.length === 0 && (
          <div className="px-4 py-3">
            <EmptyState>No terms yet. Add the first one below.</EmptyState>
          </div>
        )}

        {rows.map((t) =>
          editId === t.id ? (
            <div key={t.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <Input className="w-40 shrink-0" value={editTerm} onChange={(e) => setEditTerm(e.target.value)} placeholder="Term" />
              <Input className="min-w-[12rem] flex-1" value={editDef} onChange={(e) => setEditDef(e.target.value)} placeholder="Definition" />
              <Button variant="primary" compact onClick={saveEdit} disabled={!editTerm.trim() || !editDef.trim()}>Save</Button>
              <Button compact onClick={() => setEditId(null)}>Cancel</Button>
            </div>
          ) : (
            <div key={t.id} className="flex items-start gap-4 px-4 py-3">
              <div className="w-40 shrink-0 break-words text-[13.5px] font-semibold text-ink">{t.term}</div>
              <div className="min-w-0 flex-1">
                <div className="break-words text-[13.5px] text-ink/80">{t.definition}</div>
                <div className="mt-0.5 break-words font-term text-[11px] text-ink/65">
                  {t.owner} · updated {fmtDate(t.updated)}
                </div>
              </div>
              {/* Same size, same shape, same baseline. */}
              <div className="flex shrink-0 items-center gap-1.5">
                <Button compact aria-label={`Edit ${t.term}`} onClick={() => startEdit(t)}>
                  <Pencil size={13} /> Edit
                </Button>
                <ConfirmButton compact aria-label={`Delete ${t.term}`} confirmLabel="Delete?" onConfirm={() => remove(t.id)}>
                  <Trash2 size={13} /> Delete
                </ConfirmButton>
              </div>
            </div>
          ),
        )}

        <div className="flex flex-wrap items-center gap-2 bg-ink/[0.015] px-4 py-3">
          <Input className="w-40 shrink-0" placeholder="New term" value={newTerm} onChange={(e) => setNewTerm(e.target.value)} />
          <Input className="min-w-[12rem] flex-1" placeholder="What it means, in one sentence." value={newDef} onChange={(e) => setNewDef(e.target.value)} />
          <Button variant="primary" compact onClick={add} disabled={!newTerm.trim() || !newDef.trim()}>
            <Plus size={13} /> Add
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default LibraryGlossaryPanel;
