import { useState } from "react";
import { BookOpen, RefreshCw, Sparkles, FileText, Plus, Search, CheckCircle2, AlertTriangle } from "lucide-react";
import { card } from "../tokens/card";
import { Button } from "../actions/Button";
import { Chip } from "../data-display/Chip";
import { Spinner } from "../data-display/Spinner";
import { EmptyState } from "../data-display/EmptyState";
import { Skeleton, SkeletonLine, SkeletonChip, SkeletonButton } from "../data-display/Skeleton";

/* WelcomeGlossaryStep — the Welcome wizard's optional glossary-seeding step:
   scan the user's own docs for term candidates (grounded in real docs, nothing
   persisted by the scan), review a checklist, then upsert the accepted terms
   one at a time with a live progress count. The deterministic (non-LLM)
   fallback is flagged honestly. Local ReviewChecklist is built here; harvest /
   upsertGlossary are baked in. Standalone in the "Start" state. */

type Candidate = { term: string; definition: string; evidence: string };

const DEMO_CANDIDATES: Candidate[] = [
  { term: "Backfill", definition: "The initial full sync that ingests every historical document from a source.", evidence: "sources/ingest.md" },
  { term: "Content hash", definition: "A fingerprint of a chunk's text; unchanged chunks are skipped on re-sync.", evidence: "architecture/dedupe.md" },
  { term: "Canonical", definition: "The single source-of-truth version of a fact or document.", evidence: "glossary/status.md" },
  { term: "Embedding", definition: "A vector representation of a text chunk used for semantic retrieval.", evidence: "search/retrieval.md" },
  { term: "Flow", definition: "A scheduled or triggered pipeline that keeps knowledge fresh.", evidence: "flows/overview.md" },
];

type Mode = "start" | "scanning" | "review" | "adding";

export type WelcomeGlossaryStepProps = {
  candidates?: Candidate[];
  /** Simulate the "LLM unavailable" deterministic fallback. */
  llm?: boolean;
  loading?: boolean;
  className?: string;
};

export function WelcomeGlossaryStep({ candidates = DEMO_CANDIDATES, llm = true, loading = false, className = "" }: WelcomeGlossaryStepProps) {
  const [mode, setMode] = useState<Mode>("start");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [addResult, setAddResult] = useState<{ ok: number; failed: number } | null>(null);
  const [addedThisSession, setAddedThisSession] = useState(0);

  const scan = () => {
    setMode("scanning");
    setAddResult(null);
    window.setTimeout(() => {
      setChecked(new Set(candidates.map((c) => c.term)));
      setMode("review");
    }, 1400);
  };

  const toggle = (term: string) =>
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(term)) n.delete(term); else n.add(term);
      return n;
    });

  const addTerms = () => {
    const picked = candidates.filter((c) => checked.has(c.term));
    setProgress({ done: 0, total: picked.length });
    setMode("adding");
    let i = 0;
    const step = () => {
      i += 1;
      setProgress({ done: i, total: picked.length });
      if (i >= picked.length) {
        setAddedThisSession((n) => n + picked.length);
        setAddResult({ ok: picked.length, failed: 0 });
        setMode("start");
      } else {
        window.setTimeout(step, 350);
      }
    };
    window.setTimeout(step, 350);
  };

  if (loading) {
    return (
      <div className={`${card} p-4 ${className}`.trim()} aria-hidden="true">
        <div className="grid gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-md border border-ink/12 p-2.5">
              <Skeleton width={14} height={14} rounded="rounded-[3px]" className="mt-1" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2"><SkeletonLine w={90} h={11} /><SkeletonChip w={84} /></div>
                <SkeletonLine w="85%" h={9} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <SkeletonButton w={110} /><SkeletonButton w={96} />
        </div>
      </div>
    );
  }

  if (mode === "scanning") {
    return (
      <div className={`${card} ${className}`.trim()}>
        <div className="flex items-center justify-center gap-2 py-14 text-[13px] text-ink/65">
          <Spinner size="md" /> Reading your docs… (the LLM pass can take a minute)
        </div>
      </div>
    );
  }

  if (mode === "adding") {
    return (
      <div className={`${card} ${className}`.trim()}>
        <div className="flex items-center justify-center gap-2 py-14 text-[13px] text-ink/65">
          <Spinner size="md" /> Adding term {progress.done} of {progress.total}…
        </div>
      </div>
    );
  }

  if (mode === "review") {
    if (candidates.length === 0) {
      return (
        <div className={`${card} ${className}`.trim()}>
          <EmptyState icon={<Search size={26} />} title="Nothing new to suggest"
            action={<Button compact onClick={scan}><RefreshCw size={13} /> Scan again</Button>}>
            Everything found is already in your glossary.
          </EmptyState>
        </div>
      );
    }
    return (
      <div className={`${card} p-4 ${className}`.trim()}>
        {!llm && (
          <div className="mb-3 flex items-start gap-2 rounded-[4px] border border-clay/35 bg-clay/[0.07] px-3 py-2 text-[12.5px] text-clay">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span><b>LLM unavailable.</b> These came from a deterministic capitalized-phrase scan — review them extra carefully.</span>
          </div>
        )}
        <div className="grid gap-1.5">
          {candidates.map((c) => (
            <label key={c.term} className="flex items-start gap-2.5 p-2.5 rounded-md border border-ink/12 hover:border-ink/25 cursor-pointer">
              <input type="checkbox" className="mt-1 accent-biscay" checked={checked.has(c.term)} onChange={() => toggle(c.term)} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <b className="text-[13px] font-semibold text-ink">{c.term}</b>
                  <Chip label={c.evidence} tone="neutral" icon={<FileText size={10} />} />
                </span>
                <span className="block mt-0.5 text-[12.5px] text-ink/65">{c.definition}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button variant="primary" compact disabled={checked.size === 0} onClick={addTerms}>
            <Plus size={13} /> Add {checked.size} term{checked.size === 1 ? "" : "s"}
          </Button>
          <Button compact onClick={scan}><RefreshCw size={13} /> Scan again</Button>
          <span className="text-[11.5px] text-ink/50">Unchecked rows are discarded.</span>
        </div>
      </div>
    );
  }

  // start
  return (
    <div className={`${card} p-6 text-center ${className}`.trim()}>
      <span className="grid place-items-center mx-auto w-10 h-10 rounded-full border border-ink/15 text-ink/50 mb-3"><BookOpen size={20} /></span>
      {addResult ? (
        <p className="text-[13.5px] text-moss inline-flex items-center gap-1.5 justify-center">
          <CheckCircle2 size={15} /> Added {addResult.ok} term{addResult.ok === 1 ? "" : "s"} to your glossary.
        </p>
      ) : (
        <p className="text-[13.5px] text-ink/70 max-w-[420px] mx-auto">
          Seed your glossary from your own documents. Mari proposes term candidates grounded in real docs — you review before anything is saved.
        </p>
      )}
      <div className="mt-4">
        <Button variant="primary" onClick={scan}>
          <Sparkles size={14} /> {addResult ? "Scan again" : "Scan my documents"}
        </Button>
      </div>
      {addedThisSession > 0 && (
        <p className="mt-3 font-term text-[11px] text-ink/45">{addedThisSession} terms added this session</p>
      )}
    </div>
  );
}
