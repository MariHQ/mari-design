import { useMemo, useState } from "react";
import { Search, Sparkles, Plus, Pencil, X } from "lucide-react";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { SectionLabel } from "../forms/SectionLabel";
import { Stat } from "../data-display/Stat";
import { Chip } from "../data-display/Chip";
import { TagChip } from "../data-display/TagChip";
import { Progress } from "../data-display/Progress";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonLine, SkeletonChip, SkeletonButton, SkeletonStat } from "../data-display/Skeleton";

/* LibraryTagsPanel — the Library › Tags tab (default tab).
   The single source of truth for the project's tag vocabulary: one
   vocabulary drives ranking (search weight), evidence policy, publishing,
   audits and workflows. Admins create / edit / delete tags, tune per-tag
   search weight inline, and run a live coverage analysis. Fully local +
   standalone here. */

type Tone = "ok" | "attention" | "blocked" | "info" | "neutral";

type TagDef = {
  id: string;
  name: string;
  description: string;
  tone: Tone;
  evidence: string;
  weight: number;
  usage: number;
  behaviors: string[];
  standard: boolean;
};

const COLORS: { id: Tone; label: string }[] = [
  { id: "info", label: "Dusty blue" },
  { id: "ok", label: "Moss" },
  { id: "attention", label: "Ochre" },
  { id: "blocked", label: "Brick" },
  { id: "neutral", label: "Ink" },
];

const DEMO_TAGS: TagDef[] = [
  { id: "canonical", name: "Canonical", tone: "ok", evidence: "Preferred evidence", weight: 1.6, usage: 142, behaviors: ["Ranks first", "Trusted for facts"], standard: true, description: "The current source of truth." },
  { id: "verified", name: "Verified", tone: "info", evidence: "Trusted evidence", weight: 1.3, usage: 98, behaviors: ["Facts extracted are trusted"], standard: true, description: "Facts extracted from it are trusted." },
  { id: "customer-facing", name: "Customer-facing", tone: "info", evidence: "Surface in audits", weight: 1.0, usage: 61, behaviors: ["Published surfaces", "Audit coverage"], standard: true, description: "Approved for external and published surfaces." },
  { id: "needs-review", name: "Needs review", tone: "attention", evidence: "Flagged, not evidence", weight: 0.6, usage: 27, behaviors: ["Routed to a person"], standard: true, description: "Flagged for a person to make a judgment." },
  { id: "stale", name: "Stale", tone: "attention", evidence: "Flagged, not evidence", weight: 0.4, usage: 19, behaviors: ["Excluded from evidence"], standard: true, description: "Known to be out of date and ready for review." },
  { id: "deprecated", name: "Deprecated", tone: "blocked", evidence: "Not evidence", weight: 0.2, usage: 8, behaviors: ["Superseded"], standard: true, description: "Superseded by a newer document." },
  { id: "runbook", name: "Runbook", tone: "info", evidence: "Normal evidence", weight: 1.1, usage: 34, behaviors: ["Ops workflows"], standard: false, description: "Operational runbooks and on-call docs." },
];

const TOTAL_DOCS = 420;

export type LibraryTagsPanelProps = {
  tags?: TagDef[];
  loading?: boolean;
  className?: string;
};

export function LibraryTagsPanel({ tags = DEMO_TAGS, loading = false, className = "" }: LibraryTagsPanelProps) {
  const [rows, setRows] = useState<TagDef[]>(tags);
  const [query, setQuery] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftTone, setDraftTone] = useState<Tone>("info");
  const [draftWeight, setDraftWeight] = useState("1");
  const [weightEditId, setWeightEditId] = useState<string | null>(null);
  const [weightVal, setWeightVal] = useState("");

  const visible = useMemo(
    () => rows.filter((t) => `${t.name} ${t.description} ${t.behaviors.join(" ")}`.toLowerCase().includes(query.toLowerCase())),
    [rows, query],
  );

  const tagged = rows.reduce((s, t) => s + t.usage, 0);
  const coverage = Math.min(100, Math.round((tagged / (TOTAL_DOCS * 1.4)) * 100));
  const needCuration = rows.filter((t) => t.id === "needs-review" || t.id === "stale").reduce((s, t) => s + t.usage, 0);
  const rankingRules = rows.filter((t) => t.weight !== 1).length;

  const openComposer = (t?: TagDef) => {
    if (t) { setEditId(t.id); setDraftName(t.name); setDraftDesc(t.description); setDraftTone(t.tone); setDraftWeight(String(t.weight)); }
    else { setEditId(null); setDraftName(""); setDraftDesc(""); setDraftTone("info"); setDraftWeight("1"); }
    setComposerOpen(true);
  };

  const saveTag = () => {
    if (!draftName.trim()) return;
    const weight = Number(draftWeight) || 1;
    if (editId) {
      setRows((prev) => prev.map((t) => (t.id === editId ? { ...t, name: draftName.trim(), description: draftDesc.trim() || "Custom team label.", tone: draftTone, weight } : t)));
    } else {
      const id = draftName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      setRows((prev) => [...prev, { id: id || `tag-${Date.now().toString(36)}`, name: draftName.trim(), description: draftDesc.trim() || "Custom team label.", tone: draftTone, evidence: "Normal evidence", weight, usage: 0, behaviors: ["Custom label"], standard: false }]);
    }
    setComposerOpen(false);
  };

  const commitWeight = (id: string) => {
    const v = Number(weightVal);
    if (Number.isFinite(v) && v >= 0) setRows((prev) => prev.map((t) => (t.id === id ? { ...t, weight: v } : t)));
    setWeightEditId(null);
  };

  const del = (id: string) => setRows((prev) => prev.filter((t) => t.id !== id));

  const maxUsage = Math.max(1, ...rows.map((t) => t.usage));
  const untagged = Math.max(0, TOTAL_DOCS - Math.round(tagged / 1.4));

  if (loading) {
    return (
      <div className={`flex flex-col gap-4 ${className}`.trim()} aria-hidden="true">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
        </div>
        <div className="rounded-md border border-ink/12 bg-paper">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <SkeletonLine w={120} h={13} />
            <div className="flex gap-2"><SkeletonButton w={120} /><SkeletonButton w={88} /></div>
          </div>
          <div className="divide-y divide-ink/10">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid items-start gap-3 px-4 py-3.5 md:grid-cols-[1.4fr_1.2fr_1fr_auto]">
                <div className="space-y-2">
                  <SkeletonChip w={92} />
                  <SkeletonLine w="80%" h={9} />
                </div>
                <div className="flex flex-wrap gap-1.5"><SkeletonChip w={64} /><SkeletonChip w={52} /></div>
                <div className="space-y-2">
                  <SkeletonLine w="55%" h={9} />
                  <SkeletonChip w={72} />
                </div>
                <div className="flex justify-end gap-1.5"><SkeletonButton w={30} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`.trim()}>
      {/* Stats strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Tag health">
        <Stat value={rows.length} label="Active definitions" />
        <Stat value={`${coverage}%`} label="Documents tagged" tone="ok" sub={`${tagged.toLocaleString()} tags applied`} />
        <Stat value={needCuration} label="Need curation" tone="attention" />
        <Stat value={rankingRules} label="Ranking rules" tone="info" sub="weight ≠ 1.0" />
      </div>

      <Card
        variant="flush"
        title="Tag definitions"
        hint={`${rows.length} tags`}
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 h-8 px-2.5 rounded-[4px] border border-ink/20 text-ink/50 focus-within:border-biscay-2">
              <Search size={14} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter tags" className="w-32 bg-transparent outline-none text-[12.5px] text-ink placeholder:text-ink/40" />
            </label>
            <Button compact onClick={() => setAnalyzing((v) => !v)}><Sparkles size={13} /> Analyze documents</Button>
            <Button variant="primary" compact onClick={() => openComposer()}><Plus size={13} /> New tag</Button>
          </div>
        }
      >
        <div className="border-t border-ink/10">
          {/* Analyze panel */}
          {analyzing && (
            <div className="px-4 py-3.5 bg-ink/[0.015] border-b border-ink/10">
              <div className="flex items-center justify-between mb-3">
                <span className="font-term text-[11px] uppercase tracking-[0.08em] text-ink/55">Corpus coverage · {TOTAL_DOCS} documents indexed</span>
                <Button variant="link" onClick={() => setAnalyzing(false)}>Close</Button>
              </div>
              <div className="flex flex-col gap-2.5">
                {[...rows].sort((a, b) => b.usage - a.usage).map((t) => (
                  <div key={t.id} className="grid grid-cols-[10rem_1fr_5.5rem] items-center gap-3">
                    <TagChip tag={t.id} label={t.name} tone={t.tone} />
                    <Progress value={Math.round((t.usage / maxUsage) * 100)} tone={t.tone === "neutral" ? "info" : t.tone} />
                    <span className="font-term text-[11px] text-ink/55 text-right">{t.usage} docs · {Math.round((t.usage / TOTAL_DOCS) * 100)}%</span>
                  </div>
                ))}
                <div className="grid grid-cols-[10rem_1fr_5.5rem] items-center gap-3">
                  <span className="text-[12.5px] text-ink/55">Untagged</span>
                  <Progress value={Math.round((untagged / TOTAL_DOCS) * 100)} tone="attention" />
                  <span className="font-term text-[11px] text-ink/55 text-right">{untagged} docs</span>
                </div>
              </div>
              <div className="mt-3 font-term text-[11px] text-moss">{coverage}% of the corpus carries at least one project tag.</div>
            </div>
          )}

          {/* Composer */}
          {composerOpen && (
            <div className="px-4 py-3.5 bg-biscay-2/[0.03] border-b border-ink/10">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[13px] font-semibold text-ink">{editId ? "Edit tag" : "New tag"}</span>
                <button type="button" aria-label="Cancel" onClick={() => setComposerOpen(false)} className="text-ink/50 hover:text-ink"><X size={14} /></button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><SectionLabel>Tag name</SectionLabel><Input autoFocus className="mt-1 w-full" value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Runbook" /></div>
                <div><SectionLabel>Description</SectionLabel><Input className="mt-1 w-full" value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} placeholder="What it means" /></div>
                <div><SectionLabel>Color</SectionLabel><Select className="mt-1 w-full block" value={draftTone} onChange={(e) => setDraftTone(e.target.value as Tone)}>{COLORS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></div>
                <div><SectionLabel>Search weight</SectionLabel><Input type="number" step={0.05} min={0} className="mt-1 w-full" value={draftWeight} onChange={(e) => setDraftWeight(e.target.value)} /></div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button compact onClick={() => setComposerOpen(false)}>Cancel</Button>
                <Button variant="primary" compact disabled={!draftName.trim()} onClick={saveTag}>{editId ? "Save" : "Create"}</Button>
              </div>
            </div>
          )}

          {/* Definition list */}
          {visible.length === 0 ? (
            <EmptyState icon={<Search size={20} />}>No tags match this search.</EmptyState>
          ) : (
            <div className="divide-y divide-ink/10">
              {visible.map((t) => (
                <article key={t.id} className="grid gap-3 px-4 py-3.5 md:grid-cols-[1.4fr_1.2fr_1fr_auto] items-start">
                  <div>
                    <TagChip tag={t.id} label={t.name} tone={t.tone} />
                    <p className="mt-1 text-[12.5px] text-ink/65">{t.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.behaviors.map((b) => <Chip key={b} label={b} tone="neutral" />)}
                  </div>
                  <div>
                    <div className="font-term text-[11px] text-ink/50">{t.evidence}</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      {weightEditId === t.id ? (
                        <Input
                          type="number" step={0.05} min={0} autoFocus className="w-20 h-7"
                          value={weightVal}
                          onChange={(e) => setWeightVal(e.target.value)}
                          onBlur={() => commitWeight(t.id)}
                          onKeyDown={(e) => { if (e.key === "Enter") commitWeight(t.id); if (e.key === "Escape") setWeightEditId(null); }}
                        />
                      ) : (
                        <button type="button" onClick={() => { setWeightEditId(t.id); setWeightVal(String(t.weight)); }} className="font-term text-[12px] text-ink/80 rounded-[3px] border border-ink/15 px-1.5 py-0.5 hover:border-ink/40">
                          ×{t.weight.toFixed(2)}
                        </button>
                      )}
                      <span className="font-term text-[11px] text-ink/45">{t.usage} docs</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Button icon compact aria-label={`Edit ${t.name}`} onClick={() => openComposer(t)}><Pencil size={13} /></Button>
                    {!t.standard && (
                      <ConfirmButton compact aria-label={`Delete ${t.name}`} confirmLabel="Delete?" onConfirm={() => del(t.id)} title="Documents keep the raw tag but lose its behaviors.">
                        Delete
                      </ConfirmButton>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default LibraryTagsPanel;
