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
import { Badge } from "../data-display/Badge";
import { Skeleton, SkeletonLine, SkeletonText, SkeletonChip } from "../data-display/Skeleton";

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

const DIFF_SAMPLE = {
  original: "…is expected to reduce login latency by roughly 40%…",
  proposed: "…reduces measured login latency by 22%…",
};

const TYPE_TONE: Record<BlockType, string> = {
  h1: "info", h2: "info", h3: "info", p: "neutral", li: "attention", code: "blocked",
};

type EngineTab = "blocks" | "roundtrip" | "decorate" | "diff";

const codeBox = "font-term text-[12px] leading-[1.6] text-ink/85 bg-flysch border border-ink/12 rounded-[5px] p-3 overflow-x-auto whitespace-pre-wrap";

/* fmark underline styling, applied on the decorated-html container */
const MARKED =
  "[&_.fmark]:cursor-help [&_.fmark]:underline [&_.fmark]:decoration-wavy [&_.fmark]:decoration-2 [&_.fmark]:underline-offset-[3px] " +
  "[&_.fmark--red]:decoration-espelette [&_.fmark--red]:text-espelette [&_.fmark--gold]:decoration-clay [&_.fmark--gold]:text-clay";

export function DocReviewMarkdown({
  markdown = DEMO_MD,
  findings = DEMO_FINDINGS,
  loading = false,
}: {
  markdown?: string;
  findings?: Finding[];
  loading?: boolean;
}) {
  const [tab, setTab] = useState<EngineTab>("blocks");

  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);
  const roundtrip = useMemo(() => serialize(blocks), [blocks]);
  const faithful = roundtrip.trim() === markdown.trim();

  const decorated = useMemo(() => {
    const done = new Set<number>();
    return blocks.map((b) => (b.type === "code" ? b.html : decorateBlock(b.html, findings, done)));
  }, [blocks, findings]);

  const diff = useMemo(() => diffChange(cleanText(DIFF_SAMPLE.original), cleanText(DIFF_SAMPLE.proposed)), []);

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
          <Badge label="pure module" tone="info" />
        </div>
        <p className="mt-1 text-[12.5px] text-ink/60">
          Dependency-free markdown ⇄ block conversion — parse, serialize, decorate findings, and word-diff.
        </p>
      </div>

      <div className="px-4 pt-3">
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
      </div>

      <div className="p-4">
        {tab === "blocks" && (
          <div className="space-y-1.5">
            {blocks.map((b) => (
              <div key={b.id} className="flex items-start gap-3 rounded-[4px] border border-ink/10 bg-paper px-2.5 py-1.5">
                <Badge label={b.type} tone={TYPE_TONE[b.type]} />
                <code className="min-w-0 flex-1 font-term text-[12px] leading-[1.5] text-ink/80 break-words">
                  {b.html || <span className="text-ink/35">·</span>}
                </code>
                <div className="flex shrink-0 gap-1.5">
                  {b.tight && <Badge label="tight" tone="attention" />}
                  {b.lang && <Badge label={b.lang} tone="neutral" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "roundtrip" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[12.5px]">
              <span className="text-ink/60">serialize(parseMarkdown(md)) === md</span>
              <Badge label={faithful ? "byte-faithful ✓" : "differs"} tone={faithful ? "ok" : "blocked"} />
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
            <div className="space-y-1.5">
              {findings.map((f) => {
                const red = f.kind === "fact" || f.severity === "error";
                return (
                  <div key={f.id} className="flex items-center gap-2 text-[12.5px]">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${red ? "bg-espelette" : "bg-clay"}`} />
                    <span className="text-ink/80">“{cleanText(f.text)}”</span>
                    <span className="text-ink/45">— {f.id < 0 && f.kind === "prose" ? f.note : f.kind === "fact" ? "fact-check" : f.kind}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "diff" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/45">Original</span>
                <p className="mt-1 font-term text-[13px] leading-[1.6] text-ink/80">
                  {diff.pre && <>{diff.pre} </>}
                  {diff.delA && <s className="text-espelette/80 decoration-espelette/60">{diff.delA}</s>}
                  {diff.suf && <> {diff.suf}</>}
                </p>
              </div>
              <div>
                <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/45">⇄ Proposed</span>
                <p className="mt-1 font-term text-[13px] leading-[1.6] text-ink/80">
                  {diff.pre && <>{diff.pre} </>}
                  {diff.delB && <b className="text-moss">{diff.delB}</b>}
                  {diff.suf && <> {diff.suf}</>}
                </p>
              </div>
            </div>
            <pre className={codeBox}>{JSON.stringify(diff, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <span className="font-term text-[10.5px] uppercase tracking-[0.08em] text-ink/45">Blueprint render (MarkdownView)</span>
        <div className="mt-2 rounded-[6px] border border-ink/12 bg-paper p-4">
          <MarkdownView>{markdown}</MarkdownView>
        </div>
      </div>
    </Card>
  );
}
