import { type ReactNode, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Input } from "../forms/Input";
import { EmptyState } from "./EmptyState";

/* GlossaryPanel — an editable term → definition list. Ported from the
   console's library GlossaryPanel, decoupled from GraphQL: edit/add/delete
   are surfaced as callbacks. Inline-edit and add-row UI state is managed
   locally; the data itself is owned by the caller. Editing affordances only
   appear for the handlers you pass. */

export type GlossaryEntry = {
  id: string;
  term: string;
  definition: string;
  /** Optional trailing meta line (e.g. "Alex · updated Jul 9"). */
  meta?: ReactNode;
};

export type GlossaryPanelProps = {
  entries: GlossaryEntry[];
  onAdd?: (term: string, definition: string) => void;
  onEdit?: (id: string, term: string, definition: string) => void;
  onDelete?: (id: string) => void;
  title?: ReactNode;
  hint?: ReactNode;
  className?: string;
};

export function GlossaryPanel({
  entries, onAdd, onEdit, onDelete, title = "Glossary", hint, className,
}: GlossaryPanelProps) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editTerm, setEditTerm] = useState("");
  const [editDef, setEditDef] = useState("");
  const [newTerm, setNewTerm] = useState("");
  const [newDef, setNewDef] = useState("");

  const startEdit = (e: GlossaryEntry) => { setEditId(e.id); setEditTerm(e.term); setEditDef(e.definition); };
  const saveEdit = () => {
    if (editId && editTerm.trim() && editDef.trim()) onEdit?.(editId, editTerm.trim(), editDef.trim());
    setEditId(null);
  };
  const add = () => {
    if (newTerm.trim() && newDef.trim()) { onAdd?.(newTerm.trim(), newDef.trim()); setNewTerm(""); setNewDef(""); }
  };

  return (
    <Card variant="flush" title={title} hint={hint} className={className}>
      <div className="divide-y divide-ink/10 border-t border-ink/10">
        {entries.length === 0 && (
          <div className="px-4 py-3">
            <EmptyState>No terms yet{onAdd ? " — add the first one below." : "."}</EmptyState>
          </div>
        )}

        {entries.map((e) =>
          editId === e.id ? (
            <div key={e.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <Input className="w-40 shrink-0" value={editTerm} onChange={(ev) => setEditTerm(ev.target.value)} placeholder="Term" />
              <Input className="flex-1 min-w-[12rem]" value={editDef} onChange={(ev) => setEditDef(ev.target.value)} placeholder="Definition" />
              <Button variant="primary" compact onClick={saveEdit} disabled={!editTerm.trim() || !editDef.trim()}>Save</Button>
              <Button compact onClick={() => setEditId(null)}>Cancel</Button>
            </div>
          ) : (
            <div key={e.id} className="flex items-start gap-4 px-4 py-3">
              <div className="w-40 shrink-0 text-[13.5px] font-semibold text-ink break-words">{e.term}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] text-ink/80 break-words">{e.definition}</div>
                {e.meta && <div className="mt-0.5 font-term text-[11px] text-ink/50">{e.meta}</div>}
              </div>
              {(onEdit || onDelete) && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {onEdit && (
                    <Button icon compact aria-label={`Edit ${e.term}`} title="Edit term" onClick={() => startEdit(e)}>
                      <Pencil size={13} />
                    </Button>
                  )}
                  {onDelete && (
                    <ConfirmButton compact aria-label={`Delete ${e.term}`} title="Delete term" confirmLabel="Delete?" onConfirm={() => onDelete(e.id)}>
                      <Trash2 size={13} />
                    </ConfirmButton>
                  )}
                </div>
              )}
            </div>
          ),
        )}

        {onAdd && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-ink/[0.015]">
            <Input className="w-40 shrink-0" placeholder="New term" value={newTerm} onChange={(e) => setNewTerm(e.target.value)} />
            <Input className="flex-1 min-w-[12rem]" placeholder="What it means, in one sentence." value={newDef} onChange={(e) => setNewDef(e.target.value)} />
            <Button variant="primary" compact onClick={add} disabled={!newTerm.trim() || !newDef.trim()}>
              <Plus size={13} /> Add
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
