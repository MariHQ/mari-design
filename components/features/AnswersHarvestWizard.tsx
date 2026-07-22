import { useState, type ReactNode } from "react";
import { MessagesSquare, FileText, Sparkles, CheckCircle2, Circle } from "lucide-react";
import { Drawer } from "../layout/Drawer";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Textarea } from "../forms/Textarea";
import { Stepper } from "../data-display/Stepper";
import { Chip } from "../data-display/Chip";
import { Spinner } from "../data-display/Spinner";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonButton } from "../data-display/Skeleton";
import { focusRing } from "../tokens/focusRing";

/* AnswersHarvestWizard — the LLM-driven "question harvest" wizard opened from
   the Answers header. Scans picked knowledge sources for Q/A candidates, lets
   the user edit and accept/skip each, then imports the accepted set as draft
   answers. Four-step drawer: Sources → Scan → Review → Import. Standalone:
   the trigger button opens the drawer and the scan/import are simulated. */

type SourceId = "slack" | "docs" | "chat";
const SOURCES: { id: SourceId; label: string; description: string; icon: ReactNode }[] = [
  { id: "slack", label: "Slack", description: "Threads and decision chunks across connected channels.", icon: <MessagesSquare size={18} /> },
  { id: "docs", label: "Docs & repos", description: "Google Docs, Notion pages, and GitHub READMEs.", icon: <FileText size={18} /> },
  { id: "chat", label: "Ask-Mari history", description: "Questions people already asked the assistant.", icon: <Sparkles size={18} /> },
];

type ImportStatus = "pending" | "saving" | "done";
type Candidate = {
  question: string;
  draft: string;
  sourceLabel: string;
  confidence: number;
  accepted: boolean;
  status?: ImportStatus;
};

const SCAN_RESULTS: Omit<Candidate, "accepted">[] = [
  { question: "How long do sessions last before they expire?", draft: "Sessions are 30-day rolling tokens. Signing in on a new device revokes the oldest session once you pass the device cap.", sourceLabel: "Google Docs", confidence: 0.88 },
  { question: "What happens when the settlement queue backs up?", draft: "Drain the queue before restarting workers, and escalate to #payments-oncall if depth exceeds 10,000.", sourceLabel: "Notion", confidence: 0.79 },
  { question: "Is the v1 export API still supported?", draft: "v1 export is deprecated in favor of the streaming endpoint. It stays read-only for one quarter, then is removed.", sourceLabel: "Slack", confidence: 0.62 },
  { question: "How do webhook retries work now?", draft: "Delivery retries use exponential backoff on 5xx from the gateway, capped at 5 attempts with a metric per retry.", sourceLabel: "GitHub", confidence: 0.41 },
];

function confLevel(c: number) { return c >= 0.75 ? "high" : c >= 0.45 ? "med" : "low"; }
const CONF_TONE: Record<string, string> = { high: "ok", med: "attention", low: "neutral" };

function SourcePickerItem({ icon, label, description, checked, onChange }: { icon: ReactNode; label: string; description: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={`flex items-start gap-3 rounded-[5px] border px-3.5 py-3 cursor-pointer transition-colors ${checked ? "border-biscay-2/60 bg-biscay-2/[0.04] ring-1 ring-biscay-2/40" : "border-ink/15 hover:border-ink/30"} ${focusRing}`}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <span className={`grid place-items-center w-9 h-9 rounded-[5px] shrink-0 ${checked ? "bg-biscay text-white" : "bg-flysch text-ink/70 border border-ink/12"}`}>{icon}</span>
      <span className="min-w-0">
        <b className="block text-[13.5px] font-semibold text-ink">{label}</b>
        <span className="text-[12.5px] text-ink/65">{description}</span>
      </span>
    </label>
  );
}

export type AnswersHarvestWizardProps = {
  defaultOpen?: boolean;
  loading?: boolean;
  className?: string;
};

export function AnswersHarvestWizard({ defaultOpen = false, loading = false, className = "" }: AnswersHarvestWizardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Set<SourceId>>(new Set(["slack", "docs", "chat"]));
  const [scanning, setScanning] = useState(false);
  const [scanEmpty, setScanEmpty] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const acceptedCount = candidates.filter((c) => c.accepted).length;

  const reset = () => {
    setStep(0); setScanning(false); setScanEmpty(false); setCandidates([]); setImporting(false); setImportedCount(0);
    setPicked(new Set(["slack", "docs", "chat"]));
  };

  const close = () => { if (importing) return; setOpen(false); reset(); };

  const togglePick = (id: SourceId) => setPicked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const scan = () => {
    setStep(1); setScanning(true); setScanEmpty(false);
    window.setTimeout(() => {
      setScanning(false);
      setCandidates(SCAN_RESULTS.map((c) => ({ ...c, accepted: true })));
      setStep(2);
    }, 1400);
  };

  const setAccepted = (i: number, v: boolean) => setCandidates((prev) => prev.map((c, idx) => (idx === i ? { ...c, accepted: v } : c)));
  const editDraft = (i: number, text: string) => setCandidates((prev) => prev.map((c, idx) => (idx === i ? { ...c, draft: text } : c)));
  const acceptHigh = () => setCandidates((prev) => prev.map((c) => ({ ...c, accepted: confLevel(c.confidence) === "high" })));

  const doImport = async () => {
    if (importing || acceptedCount === 0) return;
    setStep(3); setImporting(true);
    setCandidates((prev) => prev.map((c) => (c.accepted ? { ...c, status: "pending" } : c)));
    let done = 0;
    const indices = candidates.map((c, i) => (c.accepted ? i : -1)).filter((i) => i >= 0);
    for (const i of indices) {
      setCandidates((prev) => prev.map((c, idx) => (idx === i ? { ...c, status: "saving" } : c)));
      await new Promise((r) => window.setTimeout(r, 550));
      done += 1;
      setCandidates((prev) => prev.map((c, idx) => (idx === i ? { ...c, status: "done" } : c)));
    }
    setImportedCount(done);
    setImporting(false);
  };

  const footer = (() => {
    if (step === 0) return (
      <>
        <span className="flex-1" />
        <Button variant="primary" disabled={picked.size === 0} onClick={scan}>Scan {picked.size} source{picked.size === 1 ? "" : "s"}</Button>
      </>
    );
    if (step === 1) return <Button disabled={scanning} onClick={() => setStep(0)}>Back to sources</Button>;
    if (step === 2) return (
      <>
        <Button onClick={() => setStep(0)}>Back</Button>
        <span className="flex-1" />
        <Button variant="primary" disabled={acceptedCount === 0} onClick={doImport}>Import {acceptedCount} draft{acceptedCount === 1 ? "" : "s"}</Button>
      </>
    );
    return (
      <>
        <span className="flex-1" />
        <Button variant="primary" disabled={importing} onClick={close}>{importing ? "Saving…" : "Done"}</Button>
      </>
    );
  })();

  if (loading) {
    return (
      <div className={className} aria-hidden="true">
        <SkeletonButton w={150} />
      </div>
    );
  }

  return (
    <div className={className}>
      <Button variant="primary" onClick={() => setOpen(true)}>Harvest questions</Button>

      <Drawer open={open} onClose={close} title="Harvest questions" footer={footer} closable={!importing}>
        <div className="flex flex-col gap-5">
          <Stepper labels={["Sources", "Scan", "Review", "Import"]} current={step} />

          {step === 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-ink/70">Pick the sources Mari should scan for question and answer candidates. Nothing is saved until you import.</p>
              {SOURCES.map((s) => (
                <SourcePickerItem key={s.id} icon={s.icon} label={s.label} description={s.description} checked={picked.has(s.id)} onChange={() => togglePick(s.id)} />
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="py-6">
              {scanning ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <Spinner size="md" label="Scanning" />
                  <div className="text-[13px] text-ink/70">Scanning {[...picked].join(", ")}…</div>
                  <div className="font-term text-[11.5px] text-ink/65">Clustering threads · extracting question/answer pairs</div>
                </div>
              ) : scanEmpty ? (
                <EmptyState title="Nothing new found" action={<Button compact onClick={scan}>Scan again</Button>}>No fresh question candidates in the selected sources.</EmptyState>
              ) : null}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-term text-[12px] text-ink/65">{acceptedCount} of {candidates.length} accepted</span>
                <Button compact onClick={acceptHigh}>Accept all high confidence</Button>
              </div>
              {candidates.map((c, i) => {
                const lvl = confLevel(c.confidence);
                return (
                  <Card key={i} className={c.accepted ? "" : "opacity-60"}>
                    <h3 className="text-[13.5px] font-semibold text-ink">{c.question}</h3>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Chip label={c.sourceLabel} tone="neutral" />
                      <Chip label={`${Math.round(c.confidence * 100)}% confident`} tone={CONF_TONE[lvl]} dot />
                    </div>
                    <Textarea short className="mt-2.5" value={c.draft} onChange={(e) => editDraft(i, e.target.value)} />
                    <div className="mt-2.5 flex items-center gap-2">
                      {c.accepted ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-moss"><CheckCircle2 size={15} /> Accepted</span>
                          <span className="flex-1" />
                          <Button compact onClick={() => setAccepted(i, false)}>Skip</Button>
                        </>
                      ) : (
                        <>
                          <span className="text-[12.5px] text-ink/65">Skipped</span>
                          <span className="flex-1" />
                          <Button variant="success" compact onClick={() => setAccepted(i, true)}>Accept</Button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-ink/70">
                {importing
                  ? `Saving ${acceptedCount} draft answer${acceptedCount === 1 ? "" : "s"}…`
                  : `Imported ${importedCount} draft answer${importedCount === 1 ? "" : "s"}. They're queued in the Drafts filter for approval.`}
              </p>
              <ul className="flex flex-col gap-2">
                {candidates.filter((c) => c.status).map((c, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-[13px] text-ink/80">
                    {c.status === "done" ? <CheckCircle2 size={16} className="text-moss shrink-0" />
                      : c.status === "saving" ? <Spinner size="sm" />
                      : <Circle size={14} className="text-ink/30 shrink-0" />}
                    <span className="min-w-0 flex-1 truncate">{c.question}</span>
                    <span className="font-term text-[11px] text-ink/65 shrink-0">{c.status === "done" ? "draft saved" : c.status === "saving" ? "saving…" : "queued"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}

export default AnswersHarvestWizard;
