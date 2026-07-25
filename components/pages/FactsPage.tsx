import { useEffect, useRef, useState } from "react";
import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Shield, ShieldCheck, Workflow } from "lucide-react";
import { FactsVerificationAudit, type Fact } from "../features/FactsVerificationAudit";
import { ImpactPanelFeature } from "../features/ImpactPanelFeature";
import type { ImpactDoc } from "../data-display/ImpactPanel";
import { PageHeader } from "../layout/PageHeader";
import { Tabs } from "../navigation/Tabs";
import { Button } from "../actions/Button";
import { Card } from "../layout/Card";
import { Table } from "../data-display/Table";
import { Chip, StatusChip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonPage } from "../data-display/Skeletons";
import { Alert } from "../feedback/Alert";
import { FieldError } from "../feedback/ErrorMessage";
import { Drawer } from "../layout/Drawer";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Textarea } from "../forms/Textarea";
import { Progress } from "../data-display/Progress";
import type { ChipStatus } from "../data-display/Chip";
import { ScanRunCard, type ScanRun } from "../features/ScanRunCard";
import { AvatarGroup } from "../index";
import { Breadcrumb } from "../index";
import { fmtDate } from "../tokens/format";

/* Facts (pages/facts.md). Every claim the team relies on, verified and owned —
   a status-filtered table (claim / owner / status / verified) with per-row
   impact analysis and a toggled client-side verification audit.

   This page is a pure presenter. It holds no demo content: the filter tabs,
   the rows, the banner, the audit panel and the impact expansion all arrive in
   `data`, and every section renders only if the data carries it. The canvas
   supplies the same shape from `.preview/fixtures/facts.ts`. */

const STATES = [
  { id: "default", label: "Default: all facts + audit" },
  { id: "verified", label: "Filter · Verified" },
  { id: "review", label: "Filter · Needs review" },
  { id: "contradicted", label: "Filter · Contradicted" },
  { id: "stale", label: "Filter · Stale candidates" },
  { id: "impact", label: "Fact expanded: run impact" },
  { id: "impact-analyzed", label: "Fact expanded: impact resolved" },
  { id: "task-creating", label: "Create review task: creating" },
  { id: "task-done", label: "Create review task: done" },
  { id: "task-error", label: "Create review task: error" },
  { id: "single", label: "Single fact" },
  { id: "many", label: "Many facts" },
  { id: "empty", label: "No facts yet" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
  { id: "overflow", label: "Overflow · long text" },
  { id: "stress", label: "Stress · extremes" },
] as const;

/** A claim being captured. */
export type NewFact = { claim: string; source: string; owner: string };

/** A fact scan, as the page follows it: a real background run, in the same
    vocabulary the Flows page uses for every other run in the product. Mining
    the corpus takes minutes and touches the ledger, so it is a flow with steps
    and a progress reading, not something a link fires and forgets. */
export type FactScan = ScanRun;

/** What the Facts page can DO. Every handler may throw and the control that
    called it shows the message. All optional: without actions the page keeps
    the local behaviour the library ships (the canvas has no server). */
export type FactsActions = {
  /** Mark a claim verified as of today. */
  verifyFact?: (id: number) => void | Promise<void>;
  /** Capture a new claim into the ledger. */
  addFact?: (fact: NewFact) => void | Promise<void>;
  /** Start the corpus scan as a background run, and answer with the run so the
      page can follow it. Long-running: the run outlives this call. */
  scanFacts?: () => FactScan | Promise<FactScan>;
  /** Re-read a scan the page started. Polled until the run stops running;
      without it the page shows the run once and does not follow it. */
  scanProgress?: (id: string) => FactScan | Promise<FactScan>;
  /** Open a re-verification task on a stale fact. */
  createReviewTask?: (fact: Fact) => void | Promise<void>;
};

/** One status filter tab, with the count the workspace actually holds. */
export type FactFilter = {
  id: string;
  label: string;
  count: number;
  /** The `Fact.status` this tab keeps. Absent = every claim. It is here so the
      tab row can filter the rows it is sitting above without a round trip —
      the tabs used to be inert, and a status with no tab (the ledger's own
      "Needs review") could not be reached at all. */
  status?: string;
};

/** A verified fact expanded into its impact analysis. */
export type FactImpact = {
  /** Card title: the claim being traced. */
  title: string;
  claim: string;
  source: string;
  /** ISO timestamp of the last verification, rendered as an age. */
  verifiedAt: string;
  summary: string;
  docs: ImpactDoc[];
  /** The analysis has already run, so the strip is resolved on arrival. */
  analyzed: boolean;
};

/** A frozen create-review-task mutation, one phase at a time, so each phase of
    the lifecycle is a capturable state rather than a timing accident. */
export type FactTaskAudit = {
  title: string;
  hint: string;
  claim: string;
  meta: string;
  /** ISO date of the verification the row is about. */
  verified: string;
  age: string;
  statusLabel: string;
  phase: "creating" | "done" | "error";
  errorText: string;
};

/** A supporting card carrying long owner/tag content. Only the long-text
    states have one, which is why it is nullable. */
export type FactsExtras = {
  title: string;
  crumbs: string[];
  tags: string[];
  people: string[];
  avatarMax: number;
};

/** Everything the Facts page renders. */
export type FactsData = {
  filters: FactFilter[];
  /** Which filter tab is selected. */
  filter: string;
  /** The rows of the facts table. Empty = the table is not rendered at all. */
  facts: Fact[];
  /** A banner above the table (e.g. a contradiction warning). */
  banner: { title: string; body: string } | null;
  /** The verification-audit card. `null` = not shown for this view. */
  audit: Fact[] | null;
  /** A frozen create-review-task mutation, shown instead of the audit. */
  taskAudit: FactTaskAudit | null;
  /** An expanded fact's impact analysis, shown instead of the table. */
  impact: FactImpact | null;
  extras: FactsExtras | null;
};

function Extras({ extras }: { extras: FactsExtras }) {
  return (
    <Card variant="plain" title={extras.title}>
      <div className="space-y-3">
        <Breadcrumb items={extras.crumbs.map((label) => ({ label }))} />
        <div className="flex flex-wrap gap-1.5">
          {extras.tags.map((t, i) => <Chip key={i} label={t} tone="info" />)}
        </div>
        <AvatarGroup people={extras.people.map((initials) => ({ initials }))} max={extras.avatarMax} />
      </div>
    </Card>
  );
}

function factChip(status: string) {
  if (status === "Verified") return <StatusChip status="verified" />;
  if (status === "Stale") return <StatusChip status="stale" />;
  if (status === "Contradicted") return <Chip label="Contradicted" tone="blocked" dot />;
  if (status === "Draft") return <StatusChip status="draft" />;
  return <StatusChip status="needs-review" />;
}

function FactsTable({ facts, onVerify }: { facts: Fact[]; onVerify?: (id: number) => void | Promise<void> }) {
  /* Local overlay so the row visibly settles the moment it is verified, with
     or without a server behind the page (§2). With `onVerify` wired the write
     lands first and the overlay is what the reader sees until the next read. */
  const [verified, setVerified] = useState<number[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [failed, setFailed] = useState<Record<number, string>>({});

  if (facts.length === 0) {
    return <EmptyState title="No facts in this view">Nothing matches the current filter.</EmptyState>;
  }

  const verify = async (f: Fact) => {
    setBusy(f.id);
    setFailed((e) => { const n = { ...e }; delete n[f.id]; return n; });
    try {
      if (onVerify) await onVerify(f.id);
      setVerified((v) => [...v, f.id]);
    } catch (err) {
      setFailed((e) => ({ ...e, [f.id]: err instanceof Error ? err.message : "Could not verify that claim." }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card variant="flush">
      {/* Every row carries a clickable action, so status is second-to-last (§3). */}
      <Table head={["Claim", "Owner", "Verified", "Status", ""]} minW={760}>
        {facts.map((f) => {
          const isVerified = verified.includes(f.id) || f.status === "Verified";
          return (
            <tr key={f.id} className="border-b border-ink/[0.06] last:border-0">
              <td className="px-4 py-3 align-top">
                <b className="block break-words text-[13px] font-medium text-ink">{f.claim}</b>
                <div className="mt-0.5 break-words font-term text-[11px] text-ink/65">{f.source}</div>
              </td>
              <td className="px-4 py-3 align-top text-[12.5px] text-ink/70 break-words">{f.owner}</td>
              <td className="px-4 py-3 align-top text-[12.5px] text-ink/70 whitespace-nowrap">{f.verified ? fmtDate(f.verified) : ""}</td>
              <td className="px-4 py-3 align-top">{factChip(isVerified ? "Verified" : f.status)}</td>
              {/* nowrap: a long owner name pushed this column narrow enough to
                  break "Verify" across two lines. */}
              <td className="whitespace-nowrap px-4 py-3 align-top text-right">
                {/* A verified claim has nothing left to do here, and the
                    status column one cell to the left already says so — the
                    word used to be repeated in this cell, twice per row. */}
                {failed[f.id] ? (
                  <FieldError>{failed[f.id]}</FieldError>
                ) : isVerified ? null : (
                  <Button compact variant="primary" disabled={busy === f.id} onClick={() => void verify(f)}>
                    {busy === f.id ? "Verifying…" : "Verify"}
                  </Button>
                )}
              </td>
            </tr>
          );
        })}
      </Table>
    </Card>
  );
}

/* "New fact": the header's primary action opens this, so the button captures a
   claim rather than doing nothing. With no `onAdd` it still closes with the
   values it collected, which is the honest canvas behaviour. */
function NewFactDrawer({ onAdd, onClose }: {
  onAdd?: (fact: NewFact) => void | Promise<void>;
  onClose: () => void;
}) {
  const [claim, setClaim] = useState("");
  const [source, setSource] = useState("");
  const [owner, setOwner] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setFailed(null);
    try {
      await onAdd?.({ claim: claim.trim(), source: source.trim(), owner: owner.trim() });
      onClose();
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "Could not save that claim.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="New fact"
      subtitle="A claim the team relies on"
      icon={<ShieldCheck size={16} className="text-moss" />}
      footer={
        <>
          {/* Primary bottom left, secondary to its right (§2). */}
          <Button variant="primary" disabled={busy || !claim.trim() || !source.trim()} onClick={() => void submit()}>
            {busy ? "Saving…" : "Add fact"}
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </>
      }
    >
      <Field label="Claim">
        <Textarea short autoFocus value={claim} onChange={(e) => setClaim(e.target.value)}
          placeholder="Free-tier limits are enforced per workspace." className="w-full" />
      </Field>
      <Field label="Where it comes from">
        <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="pricing.md" className="w-full font-term" />
      </Field>
      <Field label="Owner">
        <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Maya Chen" className="w-full" />
      </Field>
      {failed && <FieldError>{failed}</FieldError>}
      <div className="pt-2 text-[11.5px] text-ink/65">
        A new claim starts as Needs review until someone verifies it.
      </div>
    </Drawer>
  );
}

/* The scan, while it runs. "Scan for facts" used to be a text link that slept
   for a moment and told you nothing; the work behind it is a background flow
   over the whole corpus, so the page shows the run: progress, the steps the
   engine has reached, and what it captured. */
/* Run status in the console's chip vocabulary. A finished scan "succeeded" —
   the Flows inspector calls a passed run "Approved", which is the right word
   for a run someone signs off and the wrong one for a scan nobody approves. */
/* Frozen create-review-task lifecycle — mirrors FactsVerificationAudit's stale
   row so each mutation phase (creating / done / error) is capturable. */
function ReviewTaskAudit({ task }: { task: FactTaskAudit }) {
  return (
    <Card
      icon={<ShieldCheck size={17} className="text-moss" />}
      title={task.title}
      hint={task.hint}
      variant="flush"
    >
      {/* The row carries a clickable action, so status is second-to-last (§3). */}
      <Table head={["Claim", "Verified", "Status", ""]} minW={640}>
        <tr className="border-b border-ink/[0.06] last:border-0">
          <td className="px-4 py-3 align-top">
            <b className="block break-words text-[13px] font-medium text-ink">{task.claim}</b>
            <div className="mt-0.5 font-term text-[11px] text-ink/65">{task.meta}</div>
          </td>
          <td className="px-4 py-3 align-top text-[12.5px] text-ink/70">{fmtDate(task.verified)} <span className="text-ink/65">{`· ${task.age}`}</span></td>
          <td className="px-4 py-3 align-top"><Chip label={task.statusLabel} tone="attention" dot /></td>
          <td className="px-4 py-3 align-top text-right">
            {task.phase === "error" ? (
              <span className="font-term text-[11.5px] text-espelette">{task.errorText}</span>
            ) : (
              <Button compact disabled>{task.phase === "done" ? "Task created" : "Creating…"}</Button>
            )}
          </td>
        </tr>
      </Table>
    </Card>
  );
}

/** A workspace with no facts at all. Derived from the data, so it is true in
    the real app for exactly the same reason it is true on the canvas. */
function isEmpty(d: FactsData): boolean {
  return !d.facts.length && !d.audit?.length && !d.taskAudit && !d.impact && !d.extras;
}

function Body({ data, error, actions, auditOpen, onCloseAudit, scan, onDismissScan }: {
  data: FactsData; error: string | null; actions?: FactsActions;
  auditOpen: boolean; onCloseAudit: () => void;
  scan: FactScan | null; onDismissScan: () => void;
}) {
  /* Which status tab is showing. `data.filter` seeds it and an app can still
     serve pre-filtered rows, but the row itself is a view over the rows already
     on screen — it was wired to `onChange={() => {}}`, so every tab but the one
     the data named was unreachable. */
  const [tab, setTab] = useState(data.filter);
  const selected = data.filters.find((f) => f.id === tab) ?? data.filters.find((f) => f.id === data.filter);
  const rows = selected?.status ? data.facts.filter((f) => f.status === selected.status) : data.facts;

  if (error) {
    return (
      <div className="mt-6">
        <EmptyState title="API offline">{error}</EmptyState>
      </div>
    );
  }
  if (isEmpty(data)) {
    return (
      <div className="mt-6 flex flex-col gap-5">
        {/* The scan strip belongs here too: an empty ledger is exactly where
            someone presses the button, and the run has to be visible then. */}
        {scan && <ScanRunCard run={scan} noun="claim" label="Scanning the corpus" onDismiss={onDismissScan} />}
        <EmptyState title="No facts yet">
          Capture a claim or run “Scan for facts” to start building your verified knowledge base.
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-col gap-5">
      <Tabs ariaLabel="Filter facts" options={data.filters} value={selected?.id ?? data.filter} onChange={setTab} />
      {scan && <ScanRunCard run={scan} noun="claim" label="Scanning the corpus" onDismiss={onDismissScan} />}
      {data.banner && <Alert tone="blocked" title={data.banner.title}>{data.banner.body}</Alert>}
      {data.extras && <Extras extras={data.extras} />}
      {data.impact ? (
        <Card variant="plain" title={data.impact.title} eyebrow="Verified fact: expanded">
          <ImpactPanelFeature
            claim={data.impact.claim}
            source={data.impact.source}
            verifiedAt={data.impact.verifiedAt}
            summary={data.impact.summary}
            docs={data.impact.docs}
            analyzed={data.impact.analyzed}
          />
        </Card>
      ) : (
        // The table stands down for a ledger with no rows at all; a tab that
        // filters every row out is the table's own empty state, which says so.
        data.facts.length > 0 && <FactsTable facts={rows} onVerify={actions?.verifyFact} />
      )}
      {data.taskAudit && <ReviewTaskAudit task={data.taskAudit} />}
      {/* The audit is a view of the same rows: it arrives in `data` for the
          states that are about it, and "Audit documents" opens it over the
          rows already on screen otherwise. */}
      {(data.audit ?? (auditOpen ? data.facts : null)) && (
        <FactsVerificationAudit
          facts={data.audit ?? data.facts}
          onCreateReviewTask={actions?.createReviewTask}
          onClose={data.audit ? undefined : onCloseAudit}
        />
      )}
    </div>
  );
}

/** How often the page re-reads a running scan. Slow enough that a minutes-long
    corpus scan is not a hot loop, fast enough that the bar visibly moves. */
const SCAN_POLL_MS = 1500;

function FactsPage({ data, loading = false, error = null, actions, chrome, mobile = false }: PageProps<FactsData, FactsActions>) {
  const [auditOpen, setAuditOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [scan, setScan] = useState<FactScan | null>(null);
  const [starting, setStarting] = useState(false);
  const [scanFailed, setScanFailed] = useState<string | null>(null);

  /* Follow a run that is still going. The poll is an effect (not a chain of
     timeouts inside the click) so it stops when the page unmounts and never
     outlives the run it is reading. */
  const progress = actions?.scanProgress;
  const runId = scan && (scan.status === "running" || scan.status === "pending") ? scan.id : null;
  const seen = useRef(0);
  useEffect(() => {
    if (!runId || !progress) return;
    let alive = true;
    const tick = window.setInterval(() => {
      void (async () => {
        try {
          const next = await progress(runId);
          if (alive) setScan(next);
        } catch (err) {
          if (alive) setScanFailed(err instanceof Error ? err.message : "The scan could not be read.");
        }
      })();
    }, SCAN_POLL_MS);
    return () => { alive = false; window.clearInterval(tick); };
  }, [runId, progress]);

  /* No handler (the canvas): the run still has to move, so the page advances
     its own reading of the same shape. It invents no steps and no total — only
     the progress the button's own click can honestly account for. */
  useEffect(() => {
    if (!scan || scan.id !== "local" || scan.status !== "running") return;
    const tick = window.setInterval(() => {
      setScan((s) => {
        if (!s || s.id !== "local") return s;
        const next = Math.min(100, s.progress + 20);
        return { ...s, progress: next, status: next === 100 ? "passed" : "running" };
      });
    }, 260);
    return () => window.clearInterval(tick);
  }, [scan]);

  if (loading) {
    return (
      <PageFrame chrome={chrome} active={navFor("facts")} title="Facts" mobile={mobile}>
        <SkeletonPage variant="table" />
      </PageFrame>
    );
  }

  const startScan = async () => {
    if (starting || runId) return;
    setStarting(true);
    setScanFailed(null);
    try {
      setScan(actions?.scanFacts
        ? await actions.scanFacts()
        : { id: "local", label: `Fact scan · run ${++seen.current}`, status: "running", progress: 0, steps: [], added: null });
    } catch (err) {
      setScanFailed(err instanceof Error ? err.message : "The scan could not be started.");
    } finally {
      setStarting(false);
    }
  };

  const headerActions = (
    <>
      {/* A real background run, so a real button — the text link beside two
          buttons read as a footnote and hid what it starts. */}
      <Button variant="default" disabled={starting || Boolean(runId)} onClick={() => void startScan()}>
        <Workflow size={14} /> {starting || runId ? "Scanning…" : "Scan for facts"}
      </Button>
      <Button variant="default" aria-expanded={auditOpen} onClick={() => setAuditOpen((v) => !v)}>
        {auditOpen ? "Hide audit" : "Audit documents"}
      </Button>
      <Button variant="primary" onClick={() => setAdding(true)}>New fact</Button>
    </>
  );
  return (
    <PageFrame chrome={chrome} active={navFor("facts")} title="Facts" mobile={mobile}>
      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <PageHeader
          icon={<span className="text-moss"><Shield size={26} /></span>}
          eyebrow="Verification"
          title="Facts"
          description="Every claim the team relies on: verified, owned, and traced to its impact across the corpus."
          actions={mobile ? undefined : headerActions}
        />
        {mobile && <div className="mt-4 flex flex-wrap items-center gap-2">{headerActions}</div>}
        {scanFailed && <div className="mt-3"><FieldError>{scanFailed}</FieldError></div>}
        <Body
          data={data}
          error={error}
          actions={actions}
          auditOpen={auditOpen}
          onCloseAudit={() => setAuditOpen(false)}
          scan={scan}
          onDismissScan={() => setScan(null)}
        />
      </div>
      {adding && <NewFactDrawer onAdd={actions?.addFact} onClose={() => setAdding(false)} />}
    </PageFrame>
  );
}

export const page: PageModule<FactsData, FactsActions> = {
  id: "facts",
  title: "Facts",
  route: "/facts",
  component: FactsPage,
  states: STATES.map((s) => ({ ...s })),
};
