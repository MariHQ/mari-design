import type { PageModule, PageProps } from "./types";
import { PageFrame, navFor } from "./PageFrame";
import { Shield, ShieldCheck } from "lucide-react";
import { FactsVerificationAudit, type Fact } from "../features/FactsVerificationAudit";
import { ImpactPanelFeature } from "../features/ImpactPanelFeature";
import { PageHeader } from "../layout/PageHeader";
import { Tabs } from "../navigation/Tabs";
import { Button } from "../actions/Button";
import { Card } from "../layout/Card";
import { Table } from "../data-display/Table";
import { Chip, StatusChip } from "../data-display/Chip";
import { EmptyState } from "../data-display/EmptyState";
import { Spinner } from "../data-display/Spinner";
import { Alert } from "../feedback/Alert";
import { fmtDate } from "../tokens/format";

/* Facts (pages/facts.md). Every claim the team relies on, verified and owned —
   a status-filtered table (claim / owner / status / verified) with per-row
   impact analysis and a toggled client-side verification audit. The prerender
   canvas walks the status filters, the impact expansion, the create-review-task
   lifecycle, content-volume variants, and the loading / error / empty edges. */

const STATES = [
  { id: "default", label: "Default — all facts + audit" },
  { id: "verified", label: "Filter · Verified" },
  { id: "review", label: "Filter · Needs review" },
  { id: "contradicted", label: "Filter · Contradicted" },
  { id: "stale", label: "Filter · Stale candidates" },
  { id: "impact", label: "Fact expanded — run impact" },
  { id: "impact-analyzed", label: "Fact expanded — impact resolved" },
  { id: "task-creating", label: "Create review task — creating" },
  { id: "task-done", label: "Create review task — done" },
  { id: "task-error", label: "Create review task — error" },
  { id: "single", label: "Single fact" },
  { id: "many", label: "Many facts" },
  { id: "empty", label: "No facts yet" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "API offline" },
] as const;

const FILTERS = [
  { id: "all", label: "All", count: 12 },
  { id: "verified", label: "Verified", count: 6 },
  { id: "review", label: "Needs review", count: 2 },
  { id: "contradicted", label: "Contradicted", count: 1 },
  { id: "stale", label: "Stale", count: 2 },
];

const FACTS: Fact[] = [
  { id: 1, claim: "Free tier includes 3 connected sources.", source: "Pricing page", owner: "Aki K.", status: "Verified", verified: "2026-07-18" },
  { id: 2, claim: "SSO is available on the Team plan and above.", source: "Sales deck", owner: "Dana R.", status: "Verified", verified: "2026-07-02" },
  { id: 3, claim: "Data is encrypted at rest with AES-256.", source: "Security whitepaper", owner: "Priya S.", status: "Verified", verified: "2026-05-30" },
  { id: 4, claim: "The scheduler polls twice a minute.", source: "Flows docs", owner: "Aki K.", status: "Verified", verified: "2026-04-11" },
  { id: 5, claim: "Uploaded PDFs are OCR'd on ingest.", source: "Sources docs", owner: "Dana R.", status: "Verified", verified: "2026-02-20" },
  { id: 6, claim: "Data is retained for 90 days on the free tier.", source: "Legal FAQ", owner: "Priya S.", status: "Verified", verified: "2026-06-14" },
  { id: 7, claim: "Support SLA is 1 business day.", source: "Support page", owner: "Aki K.", status: "Needs review", verified: null },
  { id: 8, claim: "Beta regions include eu-west and us-east.", source: "Roadmap", owner: "Priya S.", status: "Needs review", verified: null },
  { id: 9, claim: "The API rate limit is 1000 requests/min.", source: "Old changelog", owner: "Dana R.", status: "Contradicted", verified: "2026-01-08" },
];

const MANY: Fact[] = [
  ...FACTS,
  { id: 10, claim: "Webhooks retry three times with backoff.", source: "Integrations docs", owner: "Aki K.", status: "Verified", verified: "2026-06-30" },
  { id: 11, claim: "Custom domains require a paid plan.", source: "Billing page", owner: "Dana R.", status: "Verified", verified: "2026-05-11" },
  { id: 12, claim: "Search covers up to 50k documents per workspace.", source: "Limits table", owner: "Priya S.", status: "Verified", verified: "2026-03-22" },
];

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
      <Table head={["Claim", "Owner", "Status", "Verified"]} minW={640}>
        {facts.map((f) => (
          <tr key={f.id} className="border-b border-ink/[0.06] last:border-0">
            <td className="px-4 py-3 align-top">
              <b className="text-[13px] font-medium text-ink">{f.claim}</b>
              <div className="mt-0.5 font-term text-[11px] text-ink/45">{f.source}</div>
            </td>
            <td className="px-4 py-3 align-top text-[12.5px] text-ink/70">{f.owner}</td>
            <td className="px-4 py-3 align-top">{factChip(f.status)}</td>
            <td className="px-4 py-3 align-top text-[12.5px] text-ink/70">{f.verified ? fmtDate(f.verified) : "—"}</td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

/* Frozen create-review-task lifecycle — mirrors FactsVerificationAudit's stale
   row so each mutation phase (creating / done / error) is capturable. */
function ReviewTaskAudit({ phase }: { phase: "creating" | "done" | "error" }) {
  return (
    <Card
      icon={<ShieldCheck size={17} className="text-moss" />}
      title="Verification audit"
      hint="1 verified more than 60 days ago — stale candidate."
      variant="flush"
    >
      <Table head={["Status", "Claim", "Verified", ""]} minW={640}>
        <tr className="border-b border-ink/[0.06] last:border-0">
          <td className="px-4 py-3 align-top"><Chip label="Stale candidate" tone="attention" dot /></td>
          <td className="px-4 py-3 align-top">
            <b className="text-[13px] font-medium text-ink">Uploaded PDFs are OCR'd on ingest.</b>
            <div className="mt-0.5 font-term text-[11px] text-ink/45">Sources docs · Dana R.</div>
          </td>
          <td className="px-4 py-3 align-top text-[12.5px] text-ink/70">Feb 20, 2026 <span className="text-ink/45">· 148d ago</span></td>
          <td className="px-4 py-3 align-top text-right">
            {phase === "error" ? (
              <span className="font-term text-[11.5px] text-espelette">Couldn’t reach Mari.</span>
            ) : (
              <Button compact disabled>{phase === "done" ? "Task created" : "Creating…"}</Button>
            )}
          </td>
        </tr>
      </Table>
    </Card>
  );
}

function Body({ state }: { state: string }) {
  if (state === "loading") {
    return <div className="grid place-items-center py-24"><Spinner size="md" label="Loading facts" /></div>;
  }
  if (state === "error") {
    return (
      <div className="mt-6">
        <EmptyState title="API offline">The facts service is temporarily unavailable. Retrying…</EmptyState>
      </div>
    );
  }
  if (state === "empty") {
    return (
      <div className="mt-6">
        <EmptyState title="No facts yet">
          Capture a claim or run “Scan for facts” to start building your verified knowledge base.
        </EmptyState>
      </div>
    );
  }
  if (state === "verified") {
    return (
      <div className="mt-5 space-y-4">
        <Tabs ariaLabel="Filter facts" options={FILTERS} value="verified" onChange={() => {}} />
        <FactsTable facts={FACTS.filter((f) => f.status === "Verified")} />
      </div>
    );
  }
  if (state === "review") {
    return (
      <div className="mt-5 space-y-4">
        <Tabs ariaLabel="Filter facts" options={FILTERS} value="review" onChange={() => {}} />
        <FactsTable facts={FACTS.filter((f) => f.status === "Needs review")} />
      </div>
    );
  }
  if (state === "contradicted") {
    return (
      <div className="mt-5 space-y-4">
        <Tabs ariaLabel="Filter facts" options={FILTERS} value="contradicted" onChange={() => {}} />
        <Alert tone="blocked" title="1 fact is contradicted by a newer source">
          A more recent document conflicts with this claim. Re-verify or supersede it.
        </Alert>
        <FactsTable facts={FACTS.filter((f) => f.status === "Contradicted")} />
      </div>
    );
  }
  if (state === "stale") {
    return (
      <div className="mt-5 space-y-4">
        <Tabs ariaLabel="Filter facts" options={FILTERS} value="stale" onChange={() => {}} />
        <FactsVerificationAudit />
      </div>
    );
  }
  if (state === "impact") {
    return (
      <div className="mt-5 space-y-4">
        <Tabs ariaLabel="Filter facts" options={FILTERS} value="verified" onChange={() => {}} />
        <Card variant="plain" title="Free tier includes 3 connected sources." eyebrow="Verified fact — expanded">
          <ImpactPanelFeature />
        </Card>
      </div>
    );
  }
  if (state === "impact-analyzed") {
    return (
      <div className="mt-5 space-y-4">
        <Tabs ariaLabel="Filter facts" options={FILTERS} value="verified" onChange={() => {}} />
        <Card variant="plain" title="Free tier includes 3 connected sources." eyebrow="Verified fact — expanded">
          <ImpactPanelFeature analyzed />
        </Card>
      </div>
    );
  }
  if (state === "task-creating" || state === "task-done" || state === "task-error") {
    const phase = state === "task-creating" ? "creating" : state === "task-done" ? "done" : "error";
    return (
      <div className="mt-5 space-y-4">
        <Tabs ariaLabel="Filter facts" options={FILTERS} value="stale" onChange={() => {}} />
        <ReviewTaskAudit phase={phase} />
      </div>
    );
  }
  if (state === "single") {
    return (
      <div className="mt-5 space-y-4">
        <Tabs ariaLabel="Filter facts" options={FILTERS} value="all" onChange={() => {}} />
        <FactsTable facts={[FACTS[0]]} />
      </div>
    );
  }
  if (state === "many") {
    return (
      <div className="mt-5 space-y-4">
        <Tabs ariaLabel="Filter facts" options={FILTERS} value="all" onChange={() => {}} />
        <FactsTable facts={MANY} />
      </div>
    );
  }
  return (
    <div className="mt-5 space-y-4">
      <Tabs ariaLabel="Filter facts" options={FILTERS} value="all" onChange={() => {}} />
      <FactsTable facts={FACTS} />
      <FactsVerificationAudit />
    </div>
  );
}

function FactsPage({ state = "default", mobile = false }: PageProps) {
  return (
    <PageFrame active={navFor("facts")} title="Facts" mobile={mobile}>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <PageHeader
          icon={<span className="text-moss"><Shield size={26} /></span>}
          title="Facts"
          description="Every claim the team relies on — verified, owned, and traced to its impact across the corpus."
          actions={
            <>
              <Button variant="link">Scan for facts</Button>
              <Button variant="default">Audit documents</Button>
              <Button variant="primary">New fact</Button>
            </>
          }
        />
        <Body state={state} />
      </div>
    </PageFrame>
  );
}

export const page: PageModule = {
  id: "facts",
  title: "Facts",
  route: "/facts",
  component: FactsPage,
  states: STATES.map((s) => ({ ...s })),
};
