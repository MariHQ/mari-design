import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Select } from "../forms/Select";
import { Textarea } from "../forms/Textarea";
import { Checkbox } from "../forms/Checkbox";
import { SectionLabel } from "../forms/SectionLabel";
import { Chip } from "../data-display/Chip";
import { Stat } from "../data-display/Stat";
import { EmptyState } from "../data-display/EmptyState";
import { SkeletonCard, SkeletonStat, SkeletonTable } from "../data-display/Skeleton";
import { RulesPanel as RulesPanelUI, type RuleRow, type RuleStatus, type RuleSeverity } from "../data-display/RulesPanel";

/* LibraryRulesPanel — the Library › Rules tab.
   Configures the deterministic prose engine: rules across four families
   (AI slop, Clarity, Style guide, Inclusive), each set to Active / Zero
   tolerance / Ignore, plus a live client-side document checker that runs a
   subset of the rules as regexes over sample docs. Composes the library's
   RulesPanel registry with a project-config strip and a checker card, and
   renders standalone. */

const RULE_CATALOG_COUNT = 170;

type Rule = RuleRow & { re?: RegExp; suggestion?: string };

const RULES: Rule[] = [
  { id: "ai-slop.hedging", family: "AI slop", severity: "warn", description: "Hedging filler like “it's worth noting” adds no information.", pack: "slop-01", re: /\bit'?s worth noting\b/gi, suggestion: "Delete the hedge and state the point." },
  { id: "ai-slop.delve", family: "AI slop", severity: "warn", description: "“Delve into” is an AI tell; prefer a plain verb.", pack: "slop-04", re: /\bdelve into\b/gi, suggestion: "Use “look at” or “examine”." },
  { id: "ai-slop.seamless", family: "AI slop", severity: "advisory", description: "Marketing adjective with no measurable meaning.", pack: "slop-09", re: /\bseamless(ly)?\b/gi, suggestion: "Describe what actually happens." },
  { id: "ai-slop.leverage", family: "AI slop", severity: "advisory", description: "“Leverage” as a verb; prefer “use”.", pack: "slop-12", re: /\bleverage\b/gi, suggestion: "Use “use”." },
  { id: "clarity.passive", family: "Clarity", severity: "advisory", description: "Passive construction hides the actor.", pack: "clarity-02", re: /\b(is|are|was|were|be|been)\s+\w+ed\b/gi, suggestion: "Name who does the action." },
  { id: "clarity.long-sentence", family: "Clarity", severity: "warn", description: "Sentences over 24 words are hard to scan.", pack: "clarity-05", suggestion: "Split into two sentences." },
  { id: "clarity.very", family: "Clarity", severity: "advisory", description: "Intensifiers like “very” weaken the claim.", pack: "clarity-08", re: /\bvery\b/gi, suggestion: "Pick a stronger word." },
  { id: "clarity.in-order-to", family: "Clarity", severity: "advisory", description: "“In order to” is wordy.", pack: "clarity-11", re: /\bin order to\b/gi, suggestion: "Use “to”." },
  { id: "style.sentence-case", family: "Style guide", severity: "warn", description: "Headings should be sentence case, not Title Case.", pack: "style-03", re: /^#+\s+(?:[A-Z][a-z]+\s+){2,}[A-Z][a-z]+/gm, suggestion: "Lowercase all but the first word." },
  { id: "style.oxford", family: "Style guide", severity: "advisory", description: "Missing serial comma before “and”.", pack: "style-06", re: /\w+\s+\w+\s+and\s+\w+/gi, suggestion: "Add the serial comma." },
  { id: "style.login", family: "Style guide", severity: "warn", description: "Prefer “sign in” (verb) over “login”.", pack: "style-09", re: /\blogin\b/gi, suggestion: "Use “sign in”." },
  { id: "inclusive.guys", family: "Inclusive", severity: "error", description: "“You guys” excludes; use a neutral address.", pack: "incl-01", re: /\byou guys\b/gi, suggestion: "Use “everyone” or “you all”." },
  { id: "inclusive.whitelist", family: "Inclusive", severity: "error", description: "“Whitelist/blacklist” carry bias; prefer allow/deny.", pack: "incl-03", re: /\b(whitelist|blacklist)\b/gi, suggestion: "Use “allowlist” / “denylist”." },
  { id: "inclusive.sanity", family: "Inclusive", severity: "warn", description: "“Sanity check” is ableist; prefer a neutral term.", pack: "incl-06", re: /\bsanity check\b/gi, suggestion: "Use “quick check” or “confidence check”." },
];

const FAMILIES = ["AI slop", "Clarity", "Style guide", "Inclusive"] as const;
const FAMILY_HELP: Record<string, string> = {
  "AI slop": "Machine-writing tells and empty marketing words",
  Clarity: "Passive voice, long sentences, wordiness",
  "Style guide": "Casing, punctuation, and terminology",
  Inclusive: "Biased or exclusionary language",
};

const PACKS = [
  { id: "plain", label: "Plain language" },
  { id: "microsoft", label: "Microsoft" },
  { id: "google", label: "Google developer" },
  { id: "ap", label: "AP style" },
  { id: "chicago", label: "Chicago" },
];

const DOCS = [
  {
    id: "runbook",
    label: "Payments runbook",
    source: "github · docs/runbooks/payments.md",
    text: "# Handling Payment Incidents\n\nIt's worth noting that our payments flow is seamless in order to reduce friction. When an alarm fires, you guys should delve into the dashboards very carefully. The transaction is processed and the record is written before the customer is notified. Please login to the console to whitelist the affected merchant.",
  },
  {
    id: "release",
    label: "Release notes",
    source: "notion · Product / Release notes",
    text: "# What Changed This Week\n\nWe shipped a seamless new onboarding flow. The migration is handled automatically and no action is required. Run a sanity check on your integrations before you sign in.",
  },
  {
    id: "clean",
    label: "Clean sample",
    source: "docs · style/example.md",
    text: "# Sign in to the console\n\nOpen the console and sign in. The service writes the record, then notifies the customer. If an alarm fires, open the dashboards and check the failed transaction.",
  },
];

const SEV_WEIGHT: Record<RuleSeverity, number> = { error: 9, warn: 6, advisory: 3 };

type Finding = { ruleId: string; severity: RuleSeverity; start: number; end: number; excerpt: string; markStart: number; markEnd: number; suggestion?: string };

function runDetector(text: string, ignore: Set<string>, zero: Set<string>): Finding[] {
  const out: Finding[] = [];
  for (const rule of RULES) {
    if (ignore.has(rule.id)) continue;
    if (rule.id === "clarity.long-sentence") {
      let idx = 0;
      for (const s of text.split(/(?<=[.!?])\s+/)) {
        const words = s.trim().split(/\s+/).filter(Boolean).length;
        const start = text.indexOf(s, idx);
        idx = start + s.length;
        if (words > 24 && start >= 0) out.push(mk(rule, text, start, start + Math.min(s.length, 40)));
      }
      continue;
    }
    if (!rule.re) continue;
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(text))) {
      out.push(mk(rule, text, m.index, m.index + m[0].length));
      if (m.index === rule.re.lastIndex) rule.re.lastIndex++;
    }
  }
  void zero;
  return out.sort((a, b) => a.start - b.start);
}

function mk(rule: Rule, text: string, start: number, end: number): Finding {
  const ctxStart = Math.max(0, start - 34);
  const ctxEnd = Math.min(text.length, end + 34);
  return {
    ruleId: rule.id,
    severity: rule.severity,
    start,
    end,
    excerpt: text.slice(ctxStart, ctxEnd).replace(/\n/g, " "),
    markStart: start - ctxStart,
    markEnd: end - ctxStart,
    suggestion: rule.suggestion,
  };
}

const SEV_TONE: Record<RuleSeverity, string> = { error: "blocked", warn: "attention", advisory: "neutral" };

export type LibraryRulesPanelProps = {
  workspace?: string;
  loading?: boolean;
  className?: string;
};

export function LibraryRulesPanel({ workspace = "Northwind", loading = false, className = "" }: LibraryRulesPanelProps) {
  const [pack, setPack] = useState("plain");
  const [grammar, setGrammar] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<Record<string, RuleStatus>>({});
  const [ignore, setIgnore] = useState<Set<string>>(new Set());
  const [zero, setZero] = useState<Set<string>>(new Set(["inclusive.guys", "inclusive.whitelist"]));

  const [docId, setDocId] = useState(DOCS[0].id);
  const doc = DOCS.find((d) => d.id === docId) ?? DOCS[0];
  const [text, setText] = useState(doc.text);
  const [checked, setChecked] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);

  const onStatusChange = (id: string, s: RuleStatus) => {
    setStatus((prev) => ({ ...prev, [id]: s }));
    setIgnore((prev) => { const n = new Set(prev); s === "ignored" ? n.add(id) : n.delete(id); return n; });
    setZero((prev) => { const n = new Set(prev); s === "zero" ? n.add(id) : n.delete(id); return n; });
    setDirty(true);
  };

  const rulesForRegistry: RuleRow[] = RULES.map((r) => ({
    id: r.id, family: r.family, severity: r.severity, description: r.description, pack: r.pack,
    status: status[r.id] ?? (zero.has(r.id) ? "zero" : ignore.has(r.id) ? "ignored" : "active"),
  }));

  const familyCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of RULES) c[r.family] = (c[r.family] ?? 0) + 1;
    return c;
  }, []);

  const selectDoc = (id: string) => { const d = DOCS.find((x) => x.id === id) ?? DOCS[0]; setDocId(id); setText(d.text); setChecked(false); setFindings([]); };
  const check = () => { setFindings(runDetector(text, ignore, zero)); setChecked(true); };
  const save = () => { setDirty(false); setSaved(true); window.setTimeout(() => setSaved(false), 1800); };

  const score = Math.min(100, findings.reduce((s, f) => s + SEV_WEIGHT[f.severity], 0));
  const band = score < 12 ? "clean" : score < 30 ? "light" : score < 60 ? "moderate" : "heavy";
  const bandTone = score < 12 ? "text-moss" : score < 30 ? "text-clay" : "text-espelette" ;

  const ruleName = (id: string) => RULES.find((r) => r.id === id)?.id ?? id;

  if (loading) {
    return (
      <div className={`flex flex-col gap-4 ${className}`.trim()} aria-hidden="true">
        <SkeletonCard lines={1} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
        </div>
        <SkeletonTable rows={6} cols={4} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`.trim()}>
      {/* Project config strip */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[10rem]">
            <SectionLabel>Project</SectionLabel>
            <div className="text-[14px] font-semibold text-ink">{workspace}</div>
          </div>
          <div>
            <SectionLabel>Style pack</SectionLabel>
            <Select className="mt-1 block" value={pack} onChange={(e) => { setPack(e.target.value); setDirty(true); }}>
              {PACKS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          </div>
          <div className="pt-4">
            <Checkbox checked={grammar} onCheckedChange={(v) => { setGrammar(v); setDirty(true); }} label="Grammar" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="font-term text-[11.5px] text-moss">{saved ? "Saved" : ""}</span>
            <Button variant="primary" compact disabled={!dirty} onClick={save}>Save project rules</Button>
          </div>
        </div>
      </Card>

      {/* Family grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FAMILIES.map((f) => (
          <Stat key={f} value={familyCounts[f] ?? 0} label={f} sub={FAMILY_HELP[f]} tone="info" />
        ))}
      </div>

      {/* Rule registry — reuse the library RulesPanel */}
      <RulesPanelUI
        rules={rulesForRegistry}
        onStatusChange={onStatusChange}
        title="Rule registry"
        hint={`${RULE_CATALOG_COUNT}+ rules · every finding has an ID and span`}
      />

      {/* Document checker */}
      <Card variant="flush" eyebrow="Document check" title="Live document checker">
        <div className="px-4 pb-4 border-t border-ink/10 pt-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <SectionLabel>Document</SectionLabel>
              <Select className="mt-1 block" value={docId} onChange={(e) => selectDoc(e.target.value)}>
                {DOCS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </Select>
            </div>
            <div className="font-term text-[11px] text-ink/50 pb-2">{doc.source}</div>
            <Button variant="primary" compact className="ml-auto" onClick={check}>Run deterministic check</Button>
          </div>

          <Textarea className="font-term text-[12.5px]" rows={7} value={text} onChange={(e) => { setText(e.target.value); setChecked(false); }} />

          {checked && (
            <div aria-live="polite" className="flex flex-col gap-2.5">
              <div className="flex items-baseline gap-3">
                <span className={`text-[26px] font-bold leading-none ${bandTone}`}>{score}</span>
                <span className="text-[12.5px] text-ink/65">slop score · <span className="capitalize">{band}</span> · {findings.length} finding{findings.length === 1 ? "" : "s"}</span>
              </div>

              {findings.length === 0 ? (
                <EmptyState icon={<CheckCircle2 size={22} />} title="No configured rules fired">
                  This content passes the current project configuration.
                </EmptyState>
              ) : (
                <div className="flex flex-col gap-2">
                  {findings.slice(0, 8).map((f, i) => (
                    <div key={i} className="rounded-[4px] border border-ink/12 px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Chip label={f.severity} tone={SEV_TONE[f.severity]} caps />
                        <code className="font-term text-[11.5px] text-ink/70">{ruleName(f.ruleId)}</code>
                        {zero.has(f.ruleId) && <Chip label="zero tolerance" tone="blocked" />}
                      </div>
                      <p className="font-term text-[12px] text-ink/70">
                        …{f.excerpt.slice(0, f.markStart)}
                        <mark className="bg-espelette/20 text-espelette rounded-[2px] px-0.5">{f.excerpt.slice(f.markStart, f.markEnd)}</mark>
                        {f.excerpt.slice(f.markEnd)}…
                      </p>
                      {f.suggestion && <div className="mt-1 text-[12px] text-ink/60">→ {f.suggestion}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default LibraryRulesPanel;
