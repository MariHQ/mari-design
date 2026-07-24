import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Shield, ShieldCheck } from "lucide-react";
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

/** One status filter tab, with the count the workspace actually holds. */
export type FactFilter = { id: string; label: string; count: number };

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

function FactsTable({ facts }: { facts: Fact[] }) {
  if (facts.length === 0) {
    return <EmptyState title="No facts in this view">Nothing matches the current filter.</EmptyState>;
  }
  return (
    <Card variant="flush">
      {/* No clickable item in a row, so status is the last column (§3). */}
      <Table head={["Claim", "Owner", "Verified", "Status"]} minW={640}>
        {facts.map((f) => (
          <tr key={f.id} className="border-b border-ink/[0.06] last:border-0">
            <td className="px-4 py-3 align-top">
              <b className="block break-words text-[13px] font-medium text-ink">{f.claim}</b>
              <div className="mt-0.5 break-words font-term text-[11px] text-ink/65">{f.source}</div>
            </td>
            <td className="px-4 py-3 align-top text-[12.5px] text-ink/70 break-words">{f.owner}</td>
            <td className="px-4 py-3 align-top text-[12.5px] text-ink/70 whitespace-nowrap">{f.verified ? fmtDate(f.verified) : ""}</td>
            <td className="px-4 py-3 align-top">{factChip(f.status)}</td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

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

function Body({ data, error }: { data: FactsData; error: string | null }) {
  if (error) {
    return (
      <div className="mt-6">
        <EmptyState title="API offline">{error}</EmptyState>
      </div>
    );
  }
  if (isEmpty(data)) {
    return (
      <div className="mt-6">
        <EmptyState title="No facts yet">
          Capture a claim or run “Scan for facts” to start building your verified knowledge base.
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="mt-6 flex flex-col gap-5">
      <Tabs ariaLabel="Filter facts" options={data.filters} value={data.filter} onChange={() => {}} />
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
        data.facts.length > 0 && <FactsTable facts={data.facts} />
      )}
      {data.taskAudit && <ReviewTaskAudit task={data.taskAudit} />}
      {data.audit && <FactsVerificationAudit facts={data.audit} />}
    </div>
  );
}

function FactsPage({ data, loading = false, error = null, chrome, mobile = false }: PageProps<FactsData>) {
  if (loading) {
    return (
      <PageFrame chrome={chrome} active={navFor("facts")} title="Facts" mobile={mobile}>
        <SkeletonPage variant="table" />
      </PageFrame>
    );
  }
  const actions = (
    <>
      <Button variant="link">Scan for facts</Button>
      <Button variant="default">Audit documents</Button>
      <Button variant="primary">New fact</Button>
    </>
  );
  return (
    <PageFrame active={navFor("facts")} title="Facts" mobile={mobile}>
      <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
        <PageHeader
          icon={<span className="text-moss"><Shield size={26} /></span>}
          eyebrow="Verification"
          title="Facts"
          description="Every claim the team relies on: verified, owned, and traced to its impact across the corpus."
          actions={mobile ? undefined : actions}
        />
        {mobile && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
        <Body data={data} error={error} />
      </div>
    </PageFrame>
  );
}

export const page: PageModule<FactsData> = {
  id: "facts",
  title: "Facts",
  route: "/facts",
  component: FactsPage,
  states: STATES.map((s) => ({ ...s })),
};
