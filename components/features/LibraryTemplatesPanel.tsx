import { useMemo, useState } from "react";
import { Search, Plus, MoreVertical, Eye, FilePlus2, Trash2, Clipboard, GitFork, ShieldCheck, FileText, Sprout, BookOpen, Megaphone, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { ConfirmButton } from "../actions/ConfirmButton";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { SectionLabel } from "../forms/SectionLabel";
import { Truncate } from "../data-display/Truncate";
import { Badge } from "../data-display/Badge";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonLine, SkeletonChip, SkeletonButton, SkeletonCard } from "../data-display/Skeleton";
import { Tabs } from "../navigation/Tabs";
import { Menu, MenuItem } from "../navigation/Menu";

/* LibraryTemplatesPanel — the Library › Templates tab.
   A gallery of document scaffolds (Runbook, ADR, Postmortem, RFC…) plus
   user-created custom templates. Filter by category or search, preview a
   template's section list, create custom templates, delete custom ones, and
   "Use template" to spin up a draft task. Fully local + standalone.

   Every hook is declared before the `loading` early return: they used to sit
   after it, which is a conditional-hook bug that crashes the panel the moment
   it flips from loading to loaded. */

export type Template = {
  id: string;
  name: string;
  category: string;
  description: string;
  sections: string[];
  standard: boolean;
  icon: LucideIcon;
};

const TEMPLATES: Template[] = [
  { id: "runbook", name: "Runbook", category: "Operations", icon: Clipboard, standard: true, description: "Service overview, alarms, diagnosis, rollback, escalation.", sections: ["Service overview", "Architecture and dependencies", "Alarms and thresholds", "Dashboards", "Diagnosis steps", "Mitigation", "Rollback procedure", "Escalation contacts"] },
  { id: "adr", name: "Architecture decision", category: "Engineering", icon: GitFork, standard: true, description: "Context, decision, alternatives, and consequences.", sections: ["Context", "Decision", "Alternatives considered", "Consequences", "Rollout", "References"] },
  { id: "postmortem", name: "Postmortem", category: "Operations", icon: ShieldCheck, standard: true, description: "Impact, timeline, root cause, response, and follow-ups.", sections: ["Summary", "Customer impact", "Timeline", "Root cause", "Detection", "Response", "Recovery", "Lessons learned", "Follow-up actions"] },
  { id: "rfc", name: "RFC", category: "Engineering", icon: FileText, standard: true, description: "Problem, goals, proposal, risks, and rollout plan.", sections: ["Problem statement", "Goals", "Non-goals", "Proposal", "Risks and mitigations", "Rollout plan", "Open questions"] },
  { id: "onboarding", name: "Onboarding guide", category: "Team", icon: Sprout, standard: true, description: "Context, first-week checklist, people, tools, and milestones.", sections: ["Welcome and context", "First-week checklist", "People to meet", "Tools and access", "Codebase tour", "First tasks", "30/60/90 milestones"] },
  { id: "api", name: "API reference page", category: "Product", icon: BookOpen, standard: true, description: "Endpoint purpose, request, response, errors, and examples.", sections: ["Endpoint purpose", "Authentication", "Request", "Response", "Errors", "Examples"] },
  { id: "release", name: "Release notes", category: "Product", icon: Megaphone, standard: true, description: "What changed, who it helps, migration notes, and links.", sections: ["Highlights", "What changed", "Who it helps", "Migration notes", "Links"] },
  { id: "security", name: "Security policy", category: "Governance", icon: ShieldCheck, standard: true, description: "Supported versions, reporting, disclosure, and response.", sections: ["Supported versions", "Reporting a vulnerability", "Disclosure policy", "Response targets", "Scope", "Safe harbor"] },
];

const GENERIC_SECTIONS = ["Overview", "Context", "Details", "Process", "Risks", "Review", "References", "Appendix", "Next steps", "Owners", "Changelog", "Links"];
const CATEGORIES = ["All", "Engineering", "Operations", "Product", "Team", "Governance"] as const;

export type LibraryTemplatesPanelProps = {
  templates?: Template[];
  loading?: boolean;
  /** Narrow-column composition: the find field moves out of the card header
      onto its own row (CONVENTIONS.md §10 — the page owns mobile). */
  compact?: boolean;
  className?: string;
};

export function LibraryTemplatesPanel({ templates = TEMPLATES, loading = false, compact = false, className = "" }: LibraryTemplatesPanelProps) {
  // Every hook runs on every render: these used to sit AFTER the `loading`
  // early return, so a panel that started life loading and then resolved
  // mounted a different number of hooks and React threw.
  const [rows, setRows] = useState<Template[]>(templates);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [query, setQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [usedId, setUsedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cat, setCat] = useState("Engineering");
  const [desc, setDesc] = useState("");
  const [count, setCount] = useState("5");

  const visible = useMemo(
    () => rows.filter((t) => (category === "All" || t.category === category) && `${t.name} ${t.description}`.toLowerCase().includes(query.toLowerCase())),
    [rows, category, query],
  );

  if (loading) {
    return (
      <div className={`rounded-md border border-ink/12 bg-paper ${className}`.trim()} aria-hidden="true">
        <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
          <SkeletonLine w={120} h={13} />
          <SkeletonButton w={124} />
        </div>
        <div className="flex gap-2 px-4 pt-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonChip key={i} w={64} />)}
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} lines={2} footer />)}
        </div>
      </div>
    );
  }

  const add = () => {
    if (!name.trim()) return;
    const n = Math.max(1, Math.min(Number(count) || 5, GENERIC_SECTIONS.length));
    setRows((prev) => [
      ...prev,
      { id: `custom-${Date.now().toString(36)}`, name: name.trim(), category: cat, description: desc.trim() || "Custom scaffold.", sections: GENERIC_SECTIONS.slice(0, n), standard: false, icon: FileText },
    ]);
    setName(""); setDesc(""); setCount("5"); setComposerOpen(false);
  };

  const use = (id: string) => { setUsedId(id); window.setTimeout(() => setUsedId((cur) => (cur === id ? null : cur)), 2400); };
  const del = (id: string) => setRows((prev) => prev.filter((t) => t.id !== id));

  const findField = (
    <label className="flex min-w-0 items-center gap-2 h-8 px-2.5 rounded-[4px] border border-ink/20 text-ink/70 focus-within:border-biscay-2">
      <Search size={14} className="shrink-0" />
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a template" className={`${compact ? "w-full" : "w-32"} min-w-0 bg-transparent outline-none text-[12.5px] text-ink placeholder:text-ink/65`} />
    </label>
  );

  return (
    <Card
      variant="flush"
      title="Templates"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {!compact && findField}
          <Button variant="primary" compact onClick={() => setComposerOpen((v) => !v)}><Plus size={13} /> New template</Button>
        </div>
      }
      className={className}
    >
      <div className="border-t border-ink/10">
        {/* Header summary sits on its own line under the header + search +
            new-template row, not squeezed between them. */}
        {compact && <div className="px-4 pt-3">{findField}</div>}
        <div className="px-4 pt-3 text-[12.5px] text-ink/70">
          Shared scaffolds for the editor, chat, workflows, and the GitHub bot. {rows.length} available, {rows.filter((t) => !t.standard).length} custom.
        </div>

        {composerOpen && (
          <div className="px-4 py-3.5 bg-biscay-2/[0.03] border-b border-ink/10">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[13px] font-semibold text-ink">New template</span>
              <button type="button" aria-label="Cancel" onClick={() => setComposerOpen(false)} className="text-ink/70 hover:text-ink"><X size={14} /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><SectionLabel>Name</SectionLabel><Input autoFocus className="mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Design doc" /></div>
              <div><SectionLabel>Category</SectionLabel><Select className="mt-1 w-full block" value={cat} onChange={(e) => setCat(e.target.value)}>{CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}</Select></div>
              <div><SectionLabel>Description</SectionLabel><Input className="mt-1 w-full" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What it's for" /></div>
              <div><SectionLabel>Sections</SectionLabel><Input type="number" min={1} max={12} className="mt-1 w-full" value={count} onChange={(e) => setCount(e.target.value)} /></div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button compact onClick={() => setComposerOpen(false)}>Cancel</Button>
              <Button variant="primary" compact disabled={!name.trim()} onClick={add}>Create</Button>
            </div>
          </div>
        )}

        <div className="px-4 pt-3">
          <Tabs
            ariaLabel="Template category"
            variant="seg"
            value={category}
            onChange={(id) => setCategory(id as (typeof CATEGORIES)[number])}
            options={CATEGORIES.map((c) => ({ id: c, label: c }))}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={<FileText size={20} />}>No templates match these filters.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((t) => {
              const Icon = t.icon;
              const open = previewId === t.id;
              const used = usedId === t.id;
              return (
                <article key={t.id} className="flex flex-col rounded-[6px] border border-ink/12 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="grid place-items-center w-8 h-8 rounded-[5px] bg-flysch border border-ink/12 text-ink/70"><Icon size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <Truncate className="font-term text-[10.5px] uppercase tracking-[0.08em] text-biscay-2">{t.category}</Truncate>
                      <Truncate as="h4" className="text-[14px] font-semibold text-ink">{t.name}</Truncate>
                    </div>
                    <Menu trigger={<Button icon compact aria-label="More"><MoreVertical size={15} /></Button>}>
                      <MenuItem icon={<Eye size={14} />} onSelect={() => setPreviewId(open ? null : t.id)}>{open ? "Hide sections" : "Preview sections"}</MenuItem>
                      <MenuItem icon={<FilePlus2 size={14} />} onSelect={() => use(t.id)}>Use template</MenuItem>
                    </Menu>
                  </div>

                  <Truncate as="p" lines={3} className="mt-2 text-[12.5px] text-ink/70 flex-1">{t.description}</Truncate>

                  {open && (
                    <ol className="mt-2.5 flex flex-col gap-1 list-decimal list-inside">
                      {t.sections.map((s) => <li key={s} title={s} className="truncate text-[12px] text-ink/70 marker:text-ink/65 marker:font-term">{s}</li>)}
                    </ol>
                  )}

                  <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-ink/10">
                    <span className="font-term text-[11px] text-ink/70">{t.sections.length} sections · {t.standard ? "Standard" : "Custom"}</span>
                    <Badge label={t.standard ? "Standard" : "Custom"} tone={t.standard ? "info" : "neutral"} />
                  </div>
                  {/* Same size and shape as "Use template" so the pair reads
                      as one control row (CONVENTIONS §2). */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Button variant={used ? "success" : "primary"} compact onClick={() => use(t.id)}>{used ? "Draft task created" : "Use template"}</Button>
                    <Button compact onClick={() => setPreviewId(open ? null : t.id)}>{open ? "Hide sections" : "Preview"}</Button>
                    {!t.standard && (
                      <ConfirmButton compact aria-label={`Delete ${t.name}`} confirmLabel="Delete?" onConfirm={() => del(t.id)}>
                        <Trash2 size={13} /> Delete
                      </ConfirmButton>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

export default LibraryTemplatesPanel;
