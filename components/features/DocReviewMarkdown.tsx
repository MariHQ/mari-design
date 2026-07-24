// DocReview markdown engine — the hand-rolled markdown ⇄ block substrate the
// editor and change queue are built on, shown live. Ported from
// mari-cloud/web/src/pages/docreview/markdown.ts. Parse → Block[], serialize
// back byte-faithfully, decorate findings inline, and compute the word-level
// diff used by the change queue — no third-party parser.
//
// This file re-uses the library's ported parser (parseMarkdown / mdInline /
// escapeHtml) and adds the doc-specific helpers that live outside the lib
// (serialize, blockText, stripMarks, cleanText, hasOwnNumbering, decorateBlock,
// diffChange). It is a visual showcase — every function is exercised on real
// demo data — around the library's MarkdownView.

import { useMemo, useState } from "react";
import {
  parseMarkdown, mdInline, escapeHtml, type Block, type BlockType,
} from "../data-display/markdown";
import { MarkdownView } from "../data-display/MarkdownView";
import { Card } from "../layout/Card";
import { Tabs } from "../navigation/Tabs";
import { Chip } from "../data-display/Chip";
import { SortHeader, useSort, tdPad } from "../data-display/sortable";
import { Skeleton, SkeletonLine, SkeletonText, SkeletonChip } from "../data-display/Skeleton";
import { Scrollable } from "../data-display/Scrollable";

/* ————— ported doc-specific helpers (not in the shared lib module) ————— */

type Finding = { id: number; kind: string; severity: string; text: string; note: string };

/** Plain text of a block's html. */
export function blockText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").replace(/ /g, " ").trim();
}

/** html → markdown inline text: <b>→**, <i>→*, <code>→`; strip the rest. */
function htmlToMd(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const inner = Array.from(el.childNodes).map(walk).join("");
    switch (el.tagName) {
      case "B": case "STRONG": return inner.trim() ? `**${inner}**` : inner;
      case "I": case "EM": return inner.trim() ? `*${inner}*` : inner;
      case "CODE": return inner.trim() ? `\`${inner}\`` : inner;
      case "BR": return " ";
      case "DIV": case "P": return inner + " ";
      default: return inner; // u, spans, marks → plain text
    }
  };
  return walk(div).replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
}

/** Serialize a block list back to markdown, byte-faithful (tight headings kept). */
export function serialize(blocks: Block[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type === "li") {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].type === "li") { items.push("- " + htmlToMd(blocks[i].html)); i++; }
      parts.push(items.join("\n"));
      continue;
    }
    if (b.type === "code") {
      parts.push("```" + (b.lang ?? "") + "\n" + blockText(b.html) + "\n```");
    } else {
      const text = htmlToMd(b.html);
      const hashes = { h1: "#", h2: "##", h3: "###", p: "" }[b.type];
      if (text) parts.push(hashes + (hashes && !b.tight ? " " : "") + text);
    }
    i++;
  }
  return parts.join("\n\n") + "\n";
}

/** Remove the finding-underline spans injected at render time. */
export function stripMarks(html: string): string {
  if (!html.includes("fmark")) return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  div.querySelectorAll("span.fmark").forEach((s) => {
    const parent = s.parentNode;
    if (!parent) return;
    while (s.firstChild) parent.insertBefore(s.firstChild, s);
    parent.removeChild(s);
  });
  return div.innerHTML;
}

/** Finding text is stored with … markers — trim them before matching. */
export const cleanText = (s: string) => s.replace(/^[…\s]+/, "").replace(/[…\s]+$/, "").trim();

/** Does the heading already carry its own section number ("2. Rollout")? */
export const hasOwnNumbering = (s: string) => /^\s*\d+(\.\d+)*[.)]?(\s|$)/.test(s);

/** Wrap the first occurrence of each finding's text in an underline span. */
export function decorateBlock(html: string, findings: Finding[], done: Set<number>): string {
  let out = html;
  for (const f of findings) {
    if (done.has(f.id)) continue;
    const t = escapeHtml(cleanText(f.text));
    if (!t) continue;
    const ix = out.indexOf(t);
    if (ix === -1) continue;
    const red = f.kind === "fact" || f.severity === "error";
    out =
      out.slice(0, ix) +
      `<span class="fmark ${red ? "fmark--red" : "fmark--gold"}" data-fid="${f.id}">` +
      t + "</span>" + out.slice(ix + t.length);
    done.add(f.id);
  }
  return out;
}

/** Word-level common prefix/suffix diff for the change-queue rows. */
export function diffChange(orig: string, repl: string) {
  const a = orig.split(" ");
  const b = repl.split(" ");
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  return {
    pre: a.slice(0, pre).join(" "),
    delA: a.slice(pre, a.length - suf).join(" "),
    delB: b.slice(pre, b.length - suf).join(" "),
    suf: suf ? a.slice(a.length - suf).join(" ") : "",
  };
}

/* ————— demo data ————— */

const DEMO_MD = `# Authentication Service Migration

##1. Overview
The new authentication service replaces the legacy session store with stateless **JWT** tokens. It is expected to reduce login latency by roughly 40% and remove the shared-session bottleneck.

Tokens are signed with \`RS256\` and rotated every 24 hours.

## 2. Rollout phases
- Canary at *5%* of traffic for 48 hours
- Ramp to 50% once the canary is stable
- Full cutover after a clean week

\`\`\`bash
POST /auth/token
Authorization: Basic <credentials>
\`\`\`
`;

const DEMO_FINDINGS: Finding[] = [
  { id: 1, kind: "fact", severity: "error", text: "reduce login latency by roughly 40%", note: "Contradicts verified fact: measured reduction was 22%." },
  { id: -2, kind: "prose", severity: "warn", text: "expected to", note: "hedge" },
  { id: 3, kind: "freshness", severity: "warn", text: "every 24 hours", note: "rotation cadence unverified" },
];

/* The diff sample is a whole paragraph so both sides can be rendered as real
   prose (parallel MarkdownView renders), not as two clipped fragments. */
const DIFF_SAMPLE = {
  original: "Tokens are signed with `RS256`. It is expected to reduce login latency by roughly 40%.",
  proposed: "Tokens are signed with `RS256`. It reduces measured login latency by 22%.",
};

/* Finding kinds carry their own chip tone and a plain-language gloss, so
   "fact check" never reads the same as "hedge" (CONVENTIONS.md §4). The tones
   match DocReviewEditor's margin annotations exactly. */
const KIND_META: Record<string, { label: string; tone: string; legend: string }> = {
  fact: { label: "Fact check", tone: "blocked", legend: "The claim disagrees with a verified fact in the knowledge base." },
  prose: { label: "Hedge", tone: "attention", legend: "Wording that softens a claim (“expected to”, “roughly”) instead of stating it." },
  freshness: { label: "Freshness", tone: "info", legend: "The supporting source is old enough that the number may have moved." },
};
const kindMeta = (kind: string) =>
  KIND_META[kind] ?? { label: kind, tone: "neutral", legend: "No gloss for this finding kind." };

/* Plain bold-mono block markers. Deliberately NOT chips: the right-hand
   flags are chips, and when the type marker was a chip too the two read as
   the same thing (CONVENTIONS.md §4). */
const TYPE_MARK: Record<BlockType, string> = {
  h1: "H1", h2: "H2", h3: "H3", p: "P", li: "LI", code: "CODE",
};

/** Tag-free preview of a block's inline html, for sorting and table cells. */
const blockPreview = (html: string) =>
  html.replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();

type EngineTab = "blocks" | "roundtrip" | "decorate" | "diff";

const codeBox = "font-term text-[12px] leading-[1.6] text-ink/85 bg-flysch border border-ink/12 rounded-[5px] p-3 overflow-x-auto whitespace-pre-wrap";

/* fmark underline styling, applied on the decorated-html container */
const MARKED =
  "[&_.fmark]:cursor-help [&_.fmark]:underline [&_.fmark]:decoration-wavy [&_.fmark]:decoration-2 [&_.fmark]:underline-offset-[3px] " +
  "[&_.fmark--red]:decoration-espelette [&_.fmark--red]:text-espelette [&_.fmark--gold]:decoration-clay [&_.fmark--gold]:text-clay";

export function DocReviewMarkdown({
  markdown = DEMO_MD,
  findings = DEMO_FINDINGS,
  defaultTab = "blocks",
  loading = false,
}: {
  markdown?: string;
  findings?: Finding[];
  /** Which engine tab opens first, so each tab can be reviewed on its own. */
  defaultTab?: EngineTab;
  loading?: boolean;
}) {
  const [tab, setTab] = useState<EngineTab>(defaultTab);

  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);
  const roundtrip = useMemo(() => serialize(blocks), [blocks]);
  const faithful = roundtrip.trim() === markdown.trim();

  const decorated = useMemo(() => {
    const done = new Set<number>();
    return blocks.map((b) => (b.type === "code" ? b.html : decorateBlock(b.html, findings, done)));
  }, [blocks, findings]);

  const diff = useMemo(() => diffChange(cleanText(DIFF_SAMPLE.original), cleanText(DIFF_SAMPLE.proposed)), []);

  /* Both sides of the diff as real markdown, with the changed span bolded, so
     the update is visible in a parallel MarkdownView render rather than in a
     JSON dump. */
  const diffMd = (changed: string) =>
    [diff.pre, changed ? `**${changed}**` : "", diff.suf].filter(Boolean).join(" ");

  /* Table rows for the Parse tab. */
  const { sort, onSort, sorted } = useSort(blocks, {
    type: (b) => b.type,
    content: (b) => blockPreview(b.html),
  });

  /* One row per finding kind actually present, for the decorate legend. */
  const legendKinds = Array.from(new Set(findings.map((f) => f.kind)));

  if (loading) {
    return (
      <Card variant="flush" className="max-w-[860px]">
        <div className="space-y-2 border-b border-ink/12 px-4 pb-3 pt-4" aria-hidden="true">
          <div className="flex items-center gap-2"><SkeletonLine w={150} h={14} /><SkeletonChip w={72} /></div>
          <SkeletonLine w="70%" h={10} />
        </div>
        <div className="flex gap-4 px-4 pt-3" aria-hidden="true">
          <SkeletonLine w={54} h={11} /><SkeletonLine w={64} h={11} /><SkeletonLine w={70} h={11} /><SkeletonLine w={64} h={11} />
        </div>
        <div className="space-y-1.5 p-4" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-[4px] border border-ink/10 bg-paper px-2.5 py-2">
              <SkeletonChip w={34} />
              <span className="min-w-0 flex-1"><SkeletonLine w={`${88 - (i % 3) * 14}%`} h={10} /></span>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4" aria-hidden="true">
          <div className="rounded-[6px] border border-ink/12 bg-paper p-4">
            <Skeleton width="50%" height={20} className="mb-3" />
            <SkeletonText lines={4} />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant="flush"
      className="max-w-[860px]"
    >
      <div className="px-4 pt-4 pb-3 border-b border-ink/12">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-ink">Markdown engine</h3>
          <Chip label="Pure module" tone="info" />
        </div>
        <p className="mt-1 text-[12.5px] text-ink/70">
          Dependency-free markdown to block conversion: parse, serialize, decorate findings, and word-diff.
        </p>
      </div>

      {/* Padding rides the scroll box so the tab row can slide under it. */}
      <Scrollable scrollerClassName="px-4 pt-3">
        <Tabs<EngineTab>
          ariaLabel="Markdown engine"
          variant="underline"
          value={tab}
          onChange={setTab}
          options={[
            { id: "blocks", label: "Parse", count: blocks.length },
            { id: "roundtrip", label: "Serialize" },
            { id: "decorate", label: "Decorate", count: findings.length },
            { id: "diff", label: "Word diff" },
          ]}
        />
      </Scrollable>

      <div className="p-4">
        {tab === "blocks" && (
          /* A real table with sortable column headers (CONVENTIONS.md §3).
             The type marker is plain bold mono and sits in its own column, well
             clear of the flag chips on the right. */
          <Scrollable className="rounded-[6px] border border-ink/12">
            {/* table-fixed so a 90-char unbreakable token wraps inside the
                content column instead of widening the whole table. */}
            <table className="w-full table-fixed border-collapse text-left">
              <thead>
                <tr>
                  {/* Proportional widths, not pixels: at 320px a fixed 84/140
                      split left the content column one character wide. */}
                  <SortHeader label="Type" sortKey="type" sort={sort} onSort={onSort} className="w-[86px] border-t-0" />
                  <SortHeader label="Content" sortKey="content" sort={sort} onSort={onSort} className="border-t-0" />
                  <SortHeader label="Flags" align="right" sortable={false} className="w-[15%] border-t-0" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((b) => (
                  <tr key={b.id} className="border-b border-ink/10 last:border-0">
                    <td className={`${tdPad} align-top font-term text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink`}>
                      {TYPE_MARK[b.type]}
                    </td>
                    <td className={`${tdPad} align-top`}>
                      <code className="block min-w-0 font-term text-[12px] leading-[1.5] text-ink/80 break-words">
                        {b.html || <span className="text-ink/65">Empty block</span>}
                      </code>
                    </td>
                    <td className={`${tdPad} align-top`}>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {b.tight && <Chip label="Tight" tone="attention" />}
                        {b.lang && <Chip label={b.lang} tone="neutral" />}
                      </div>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td className={`${tdPad} text-[12.5px] text-ink/70`} colSpan={3}>
                      Nothing to parse yet. The document is empty.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Scrollable>
        )}

        {tab === "roundtrip" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[12.5px]">
              <span className="text-ink/70">serialize(parseMarkdown(md)) === md</span>
              <Chip label={faithful ? "Byte faithful" : "Differs"} tone={faithful ? "ok" : "blocked"} dot />
            </div>
            <pre className={codeBox}>{roundtrip}</pre>
          </div>
        )}

        {tab === "decorate" && (
          <div className="space-y-4">
            <div className={`rounded-[6px] border border-ink/12 bg-paper p-4 ${MARKED}`}>
              {decorated.map((html, i) => {
                const b = blocks[i];
                if (b.type === "code") return null;
                if (b.type === "li") {
                  return (
                    <div key={b.id} className="font-term text-[14px] leading-[1.7] text-ink/90 flex gap-2">
                      <span className="text-clay">•</span>
                      <span dangerouslySetInnerHTML={{ __html: html }} />
                    </div>
                  );
                }
                const cls =
                  b.type === "h1" ? "font-display text-[22px] font-semibold text-ink mb-2"
                  : b.type === "h2" ? "font-display text-[17px] font-semibold text-ink mt-3 mb-1"
                  : b.type === "h3" ? "font-display text-[15px] font-semibold text-ink mt-2 mb-1"
                  : "font-term text-[14px] leading-[1.7] text-ink/90 my-1.5";
                return <div key={b.id} className={cls} dangerouslySetInnerHTML={{ __html: html }} />;
              })}
            </div>
            {/* One row per finding: the kind chip sits INLINE with the quote and
                uses its own tone, so the three kinds are told apart at a glance
                (CONVENTIONS.md §4). */}
            <div className="space-y-1.5">
              {findings.map((f) => {
                const m = kindMeta(f.kind);
                return (
                  <div key={f.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12.5px]">
                    <Chip label={m.label} tone={m.tone} dot />
                    <span className="min-w-0 break-words text-ink/80">“{cleanText(f.text)}”</span>
                  </div>
                );
              })}
              {findings.length === 0 && (
                <p className="text-[12.5px] text-ink/70">No findings on this document, so nothing is decorated.</p>
              )}
            </div>

            {/* Legend: what each decoration kind actually means. */}
            {legendKinds.length > 0 && (
              <div className="rounded-[6px] border border-ink/12 bg-flysch/50 p-3">
                <h4 className="mb-2 font-term text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink/65">Legend</h4>
                <dl className="space-y-1.5">
                  {legendKinds.map((k) => {
                    const m = kindMeta(k);
                    return (
                      <div key={k} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <dt className="shrink-0"><Chip label={m.label} tone={m.tone} dot /></dt>
                        <dd className="min-w-0 flex-1 text-[12px] leading-snug text-ink/70">{m.legend}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            )}
          </div>
        )}

        {tab === "diff" && (
          /* Old and new rendered side by side as parallel MarkdownView renders,
             so the update is legible as prose. The word-level result is stated
             underneath in plain language rather than as a JSON dump. */
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/65">Original</span>
                <div className="mt-1.5 min-w-0 rounded-[6px] border border-espelette/25 bg-espelette/[0.04] p-3 [&_b]:bg-espelette/15 [&_b]:text-espelette [&_b]:rounded-[3px] [&_b]:px-1">
                  <MarkdownView className="break-words">{diffMd(diff.delA)}</MarkdownView>
                </div>
              </div>
              <div className="min-w-0">
                <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/65">Proposed</span>
                <div className="mt-1.5 min-w-0 rounded-[6px] border border-moss/30 bg-moss/[0.05] p-3 [&_b]:bg-moss/15 [&_b]:text-moss [&_b]:rounded-[3px] [&_b]:px-1">
                  <MarkdownView className="break-words">{diffMd(diff.delB)}</MarkdownView>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 text-[12.5px]">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <Chip label="Removed" tone="blocked" dot />
                <span className="min-w-0 break-words text-ink/80">{diff.delA || "Nothing removed."}</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <Chip label="Added" tone="ok" dot />
                <span className="min-w-0 break-words text-ink/80">{diff.delB || "Nothing added."}</span>
              </div>
              <p className="text-[12px] text-ink/70">
                {diff.pre || diff.suf
                  ? "The shared words on either side of the change are left untouched."
                  : "The whole passage is rewritten, so there is no shared context."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/65">Blueprint render (MarkdownView)</span>
        <div className="mt-2 rounded-[6px] border border-ink/12 bg-paper p-4">
          <MarkdownView>{markdown}</MarkdownView>
        </div>
      </div>
    </Card>
  );
}
