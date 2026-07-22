import { useMemo, useState, type ReactNode } from "react";
import {
  Check, X, ChevronDown, Languages, Tag, User, Layers, Sparkles, RotateCw,
} from "lucide-react";
import { Button } from "../actions/Button";
import { Card } from "../layout/Card";
import { Select } from "../forms/Select";
import { Switch } from "../forms/Switch";
import { Progress } from "../data-display/Progress";
import { CountChip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { Skeleton, SkeletonLine, SkeletonCard } from "../data-display/Skeleton";
import { PageHeader } from "../layout/PageHeader";
import { card } from "../tokens/card";
import { focusRing } from "../tokens/focusRing";

/* Audit findings checklist — the core of the repo-audit page: scan findings
   grouped by kind, each a checklist row you fix or dismiss until the run
   clears. A summary strip jumps to sections; a progress header tracks
   handled/total with a Hide-handled switch; per-kind sections collapse and
   support Fix all; rows carry kind-specific fix controls. Fixes degrade to
   local overrides (offline-resilient). Renders standalone with baked findings. */

type Kind = "Localization" | "Tags" | "Authorship" | "Coverage" | "Hygiene";
type FixAction = "apply_tag" | "invite_member" | "translation_task" | "link_translation" | "ingest" | "hygiene_task";
type FindingStatus = "open" | "fixed" | "dismissed";

export type AuditFinding = {
  id: number;
  kind: Kind;
  title: string;
  detail: string;
  fixAction: FixAction;
  fixPayload?: { tag?: string; suggest?: string } | null;
  status: FindingStatus;
};

const KIND_ORDER: Kind[] = ["Localization", "Tags", "Authorship", "Coverage", "Hygiene"];
const KIND_ICON: Record<Kind, ReactNode> = {
  Localization: <Languages size={14} />, Tags: <Tag size={14} />, Authorship: <User size={14} />,
  Coverage: <Layers size={14} />, Hygiene: <Sparkles size={14} />,
};
const FIX_LABEL: Record<FixAction, string> = {
  apply_tag: "Apply tag", invite_member: "Map to member",
  translation_task: "Create translation task", link_translation: "Link as translation",
  ingest: "Index it", hygiene_task: "Create task",
};

const DEMO_MEMBERS = [{ id: 1, name: "Aki K." }, { id: 2, name: "Dana R." }, { id: 3, name: "Priya S." }];

const DEMO_FINDINGS: AuditFinding[] = [
  { id: 1, kind: "Localization", title: "onboarding.fr.md has no source translation link", detail: "French doc exists but isn't linked to its English source.", fixAction: "link_translation", status: "open" },
  { id: 2, kind: "Localization", title: "pricing.md changed — translations stale", detail: "3 locale copies are older than the source.", fixAction: "translation_task", status: "open" },
  { id: 3, kind: "Tags", title: "api-auth.md is untagged", detail: "No tags — won't surface in filtered search.", fixAction: "apply_tag", fixPayload: { tag: "reference" }, status: "open" },
  { id: 4, kind: "Tags", title: "billing.md missing 'customer-facing'", detail: "Suggested by content classifier.", fixAction: "apply_tag", fixPayload: { suggest: "customer-facing" }, status: "open" },
  { id: 5, kind: "Authorship", title: "Unknown author 'jsmith' on 6 docs", detail: "Git author not mapped to a team member.", fixAction: "invite_member", status: "open" },
  { id: 6, kind: "Coverage", title: "webhooks.md referenced but not indexed", detail: "Linked from 4 docs; never ingested.", fixAction: "ingest", status: "open" },
  { id: 7, kind: "Hygiene", title: "README.md has a broken anchor", detail: "#setup no longer exists.", fixAction: "hygiene_task", status: "fixed" },
  { id: 8, kind: "Hygiene", title: "changelog.md trailing whitespace", detail: "Cosmetic; safe to auto-fix.", fixAction: "hygiene_task", status: "dismissed" },
];

type Override = { status: "fixed"; summary: string } | { status: "dismissed" };

export type AuditFindingsChecklistProps = {
  findings?: AuditFinding[];
  members?: { id: number; name: string }[];
  provider?: string;
  repo?: string;
  ranAt?: string;
  /** Render a content-shaped skeleton while the scan runs. */
  loading?: boolean;
  className?: string;
};

export function AuditFindingsChecklist({
  findings = DEMO_FINDINGS, members = DEMO_MEMBERS,
  provider = "github", repo = "acme/product-docs", ranAt = "Jul 21, 9:04 AM",
  loading = false, className = "",
}: AuditFindingsChecklistProps) {
  const [overrides, setOverrides] = useState<Record<number, Override>>({});
  const [hideHandled, setHideHandled] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<Kind>>(new Set());
  const [pulse, setPulse] = useState<Kind | null>(null);
  const [pick, setPick] = useState<Record<number, string>>({});
  const [scanning, setScanning] = useState(false);

  const statusOf = (f: AuditFinding): FindingStatus => overrides[f.id]?.status ?? f.status;

  const byKind = useMemo(() => {
    const m = new Map<Kind, AuditFinding[]>();
    for (const k of KIND_ORDER) {
      const rows = findings.filter((f) => f.kind === k).sort((a, b) => Math.abs(a.id) - Math.abs(b.id));
      if (rows.length) m.set(k, rows);
    }
    return m;
  }, [findings]);

  const openCount = (k: Kind) => (byKind.get(k) ?? []).filter((f) => statusOf(f) === "open").length;
  const total = findings.length;
  const handled = findings.filter((f) => statusOf(f) !== "open").length;

  const fixFinding = (f: AuditFinding, memberName?: string) =>
    setOverrides((o) => ({ ...o, [f.id]: { status: "fixed", summary: memberName ? `Mapped to ${memberName}` : summaryFor(f) } }));
  const dismiss = (f: AuditFinding) => setOverrides((o) => ({ ...o, [f.id]: { status: "dismissed" } }));

  const fixAll = (k: Kind) =>
    setOverrides((o) => {
      const next = { ...o };
      for (const f of byKind.get(k) ?? []) if (statusOf(f) === "open") next[f.id] = { status: "fixed", summary: summaryFor(f) };
      return next;
    });

  const jumpTo = (k: Kind) => {
    setCollapsed((c) => { const n = new Set(c); n.delete(k); return n; });
    setPulse(k);
    setTimeout(() => setPulse(null), 1400);
  };

  const reaudit = () => { setScanning(true); setOverrides({}); setTimeout(() => setScanning(false), 700); };

  const toggle = (k: Kind) => setCollapsed((c) => { const n = new Set(c); n.has(k) ? n.delete(k) : n.add(k); return n; });

  if (loading) {
    return (
      <div className={`flex flex-col gap-5 ${className}`} aria-hidden="true">
        <div className="space-y-2">
          <SkeletonLine w={130} h={10} />
          <Skeleton width={140} height={20} />
          <SkeletonLine w={280} h={10} />
        </div>
        <div className="flex flex-wrap gap-2">
          {[110, 92, 118, 96, 104].map((w, i) => <Skeleton key={i} width={w} height={38} rounded="rounded-[6px]" />)}
        </div>
        <Skeleton height={58} className="rounded-md" />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className={className}>
        <Card variant="flush">
          <EmptyState icon={<Layers size={26} />} title="No audits yet" action={<Button variant="primary">Run first audit</Button>}>
            Run a repository audit to see findings grouped by kind.
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      <PageHeader
        eyebrow="Repository audit"
        title="Findings"
        description={`${provider} · ${repo} — last run ${ranAt}`}
        actions={<Button variant="primary" disabled={scanning} onClick={reaudit}><RotateCw size={14} className={scanning ? "animate-spin" : ""} /> {scanning ? "Scanning…" : "Re-audit"}</Button>}
      />

      {/* Summary strip */}
      <div className="flex flex-wrap gap-2">
        {[...byKind.keys()].map((k) => {
          const open = openCount(k);
          return (
            <button
              key={k} type="button" onClick={() => jumpTo(k)}
              className={`${card} inline-flex items-center gap-2 px-3 py-2 transition-colors hover:border-ink/30 ${open === 0 ? "opacity-60" : ""} ${focusRing}`}
            >
              <span className="text-ink/55">{KIND_ICON[k]}</span>
              <b className="font-term text-[15px] tabular-nums text-ink">{open}</b>
              <span className="text-[12.5px] text-ink/70">{k}</span>
            </button>
          );
        })}
      </div>

      {/* Progress header */}
      <div className={`${card} flex flex-wrap items-center gap-4 px-4 py-3`}>
        <div className="min-w-[200px] flex-1">
          <div className="mb-1.5 text-[13px] text-ink/70"><b className="text-ink">{handled}</b> of <b className="text-ink">{total}</b> handled</div>
          <Progress value={total ? (handled / total) * 100 : 0} tone={handled === total ? "ok" : "info"} />
        </div>
        <Switch checked={hideHandled} onCheckedChange={setHideHandled} label="Hide handled" />
      </div>

      {/* Grouped sections */}
      {[...byKind.entries()].map(([k, rows]) => {
        const isCollapsed = collapsed.has(k);
        const open = openCount(k);
        const visible = hideHandled ? rows.filter((f) => statusOf(f) === "open") : rows;
        return (
          <Card key={k} variant="flush" className={pulse === k ? "ring-2 ring-biscay-2/40 transition-shadow" : ""}>
            <div className="flex items-center gap-3 px-4 py-3">
              <button type="button" onClick={() => toggle(k)} aria-expanded={!isCollapsed} className={`grid h-6 w-6 place-items-center rounded-[4px] text-ink/50 hover:bg-flysch ${focusRing}`}>
                <ChevronDown size={16} className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
              </button>
              <span className="text-ink/55">{KIND_ICON[k]}</span>
              <span className="text-[14px] font-semibold text-ink">{k}</span>
              <CountChip count={open} tone={open === 0 ? "ok" : "attention"} />
              <span className="flex-1" />
              {!isCollapsed && open > 0 && <Button variant="link" onClick={() => fixAll(k)}>Fix all</Button>}
            </div>

            {!isCollapsed && (
              <div className="border-t border-ink/10">
                {visible.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-[12.5px] text-moss"><Check size={14} /> All handled — tidy.</div>
                ) : (
                  <ul className="divide-y divide-ink/10">
                    {visible.map((f) => {
                      const st = statusOf(f);
                      const ov = overrides[f.id];
                      return (
                        <li key={f.id} className="flex items-start gap-3 px-4 py-3">
                          <StatusMarker status={st} />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13.5px] font-medium text-ink">{f.title}</div>
                            <div className="mt-0.5 text-[12.5px] leading-snug text-ink/55">{f.detail}</div>
                            {st === "fixed" && <div className="mt-1 font-term text-[11.5px] text-moss">→ {ov && "summary" in ov ? ov.summary : summaryFor(f)}</div>}
                            {st === "dismissed" && <div className="mt-1 font-term text-[11.5px] text-ink/40">dismissed</div>}
                          </div>
                          {st === "open" && (
                            <div className="flex shrink-0 items-center gap-1.5">
                              {fixControl(f, members, pick[f.id] ?? "", (v) => setPick((p) => ({ ...p, [f.id]: v })), fixFinding)}
                              <button type="button" aria-label="Dismiss finding" title="Dismiss" onClick={() => dismiss(f)} className={`grid h-7 w-7 place-items-center rounded-[4px] text-ink/40 hover:bg-flysch hover:text-ink ${focusRing}`}>
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function summaryFor(f: AuditFinding): string {
  switch (f.fixAction) {
    case "apply_tag": return `Tagged '${f.fixPayload?.tag ?? f.fixPayload?.suggest ?? "tag"}'`;
    case "translation_task": return "Translation task created";
    case "link_translation": return "Linked to source translation";
    case "ingest": return "Indexed";
    case "hygiene_task": return "Task created";
    case "invite_member": return "Author mapped";
  }
}

function StatusMarker({ status }: { status: FindingStatus }) {
  if (status === "fixed") return <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-moss/50 bg-moss/[0.08] text-moss"><Check size={12} strokeWidth={2.6} /></span>;
  if (status === "dismissed") return <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink/20 bg-ink/[0.03] text-ink/40"><X size={12} /></span>;
  return <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-ink/25" aria-hidden />;
}

function fixControl(
  f: AuditFinding,
  members: { id: number; name: string }[],
  picked: string,
  onPick: (v: string) => void,
  fix: (f: AuditFinding, memberName?: string) => void,
) {
  if (f.fixAction === "apply_tag") {
    const tag = f.fixPayload?.tag ?? f.fixPayload?.suggest ?? "tag";
    return <Button compact onClick={() => fix(f)}>Apply ‘{tag}’</Button>;
  }
  if (f.fixAction === "invite_member") {
    return (
      <span className="flex items-center gap-1.5">
        <Select value={picked} onChange={(e) => onPick(e.target.value)} className="h-7 py-0 text-[12.5px]">
          <option value="">Map to member…</option>
          {members.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
        </Select>
        <Button compact disabled={!picked} onClick={() => fix(f, picked)}>Map</Button>
        <Button variant="link" onClick={() => fix(f)}>Invite as new</Button>
      </span>
    );
  }
  return <Button compact onClick={() => fix(f)}>{FIX_LABEL[f.fixAction]}</Button>;
}
