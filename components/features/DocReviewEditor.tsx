// DocReview block editor — a from-scratch contentEditable editor over a
// document's markdown body, ported from mari-cloud/web/src/pages/docreview/
// Editor.tsx + index.tsx. Each block (h1|h2|h3|p|li|code) is its own
// contentEditable element; a toolbar drives block-type / bold-italic-underline /
// bullet / justify / line-height; findings are underlined inline and echoed in
// a right margin column, aligned to their match with collision spreading.
//
// No third-party editor — parsing, inline formatting (execCommand), Enter/
// Backspace block splitting/merging, blur-commit, and finding decoration are all
// hand-rolled. Renders standalone with a baked-in demo document + findings.

import {
  createElement, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type KeyboardEvent, type ReactNode,
} from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import {
  parseMarkdown, mdInline, escapeHtml, type Block, type BlockType,
} from "../data-display/markdown";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Menu, MenuRadioGroup, MenuRadioItem } from "../navigation/Menu";
import { Skeleton, SkeletonLine, SkeletonText, SkeletonChip } from "../data-display/Skeleton";

/* ————— ported local helpers (browser-only; use the DOM) ————— */

type Finding = { id: number; kind: string; severity: string; text: string; note: string };

let blockSeq = 1_000_000;
const nid = () => blockSeq++;

const blockText = (html: string): string => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").replace(/ /g, " ").trim();
};

const stripMarks = (html: string): string => {
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
};

const cleanText = (s: string) => s.replace(/^[…\s]+/, "").replace(/[…\s]+$/, "").trim();

const decorateBlock = (html: string, findings: Finding[], done: Set<number>): string => {
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
};

/* ————— static maps ————— */

const BLOCK_TAG: Record<BlockType, keyof JSX.IntrinsicElements> = {
  h1: "h1", h2: "h2", h3: "h3", p: "p", li: "div", code: "pre",
};
const BLOCK_LABEL: Record<BlockType, string> = {
  h1: "H1", h2: "H2", h3: "H3", p: "¶", li: "•", code: "‹›",
};
const TYPE_LABELS: Record<string, string> = { h1: "H1", h2: "H2", h3: "H3", p: "Paragraph" };

const BLOCK_CLS: Record<BlockType, string> = {
  h1: "font-display text-[26px] font-semibold text-ink leading-tight mb-1 outline-none",
  h2: "font-display text-[18px] font-semibold text-ink leading-snug mt-5 mb-1 outline-none",
  h3: "font-display text-[15.5px] font-semibold text-ink leading-snug mt-4 mb-1 outline-none",
  p: "font-term text-[14.5px] text-ink/90 my-2 outline-none",
  li: "font-term text-[14.5px] text-ink/90 my-1 pl-5 relative outline-none before:content-['•'] before:absolute before:left-1 before:text-clay",
  code: "font-term text-[12.5px] text-ink/90 my-3 px-3 py-2.5 rounded-[6px] bg-flysch border border-ink/10 overflow-x-auto whitespace-pre outline-none",
};

/* toolbar glyph icons — line-art, matching the console's icon set */
const svg = (children: ReactNode) => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);
const BulletListIc = () => svg(<>
  <circle cx="5" cy="6.5" r="1" fill="currentColor" /><path d="M10 6.5 h9" />
  <circle cx="5" cy="12" r="1" fill="currentColor" /><path d="M10 12 h9" />
  <circle cx="5" cy="17.5" r="1" fill="currentColor" /><path d="M10 17.5 h9" />
</>);
const JustifyIc = () => svg(<><path d="M4 6.5 h16" /><path d="M4 12 h16" /><path d="M4 17.5 h16" /></>);
const LineHeightIc = () => svg(<>
  <path d="M10 6.5 h10" /><path d="M10 12 h10" /><path d="M10 17.5 h10" />
  <path d="M5.5 5.5 v13 M3.5 7.5 l2 -2 2 2 M3.5 16.5 l2 2 2 -2" />
</>);

/* fmark underline styling, applied on the prose container */
const MARKED =
  "[&_.fmark]:cursor-pointer [&_.fmark]:underline [&_.fmark]:decoration-wavy [&_.fmark]:decoration-2 [&_.fmark]:underline-offset-[3px] " +
  "[&_.fmark--red]:decoration-espelette [&_.fmark--gold]:decoration-clay " +
  "[&_.dr-flash]:!bg-clay/15 [&_.dr-flash]:rounded-[3px] [&_.dr-flash]:transition-colors";

/* ————— demo document + findings ————— */

const DEMO_MD = `# Authentication Service Migration

## 1. Overview
The new authentication service replaces the legacy session store with stateless JWT tokens. It is expected to reduce login latency by roughly 40% and remove the shared-session bottleneck.

Tokens are signed with RS256 and rotated every 24 hours. Downstream services validate signatures against the published JWKS endpoint.

## 2. Rollout phases
We will roll out the change in three phases across the fleet.

### 2.1 Canary
Route 5% of traffic through the new service and watch error rates for 48 hours.

### 2.2 Ramp
Increase to 50% once the canary is stable, tracking p99 latency closely.

## 3. Risks
- Token replay if clock skew exceeds the allowed window
- JWKS downtime blocks all signature validation
- Rollback requires draining every active token`;

const DEMO_FINDINGS: Finding[] = [
  { id: 1, kind: "fact", severity: "error", text: "reduce login latency by roughly 40%", note: "Contradicts verified fact: measured reduction was 22% in staging." },
  { id: -2, kind: "prose", severity: "warn", text: "expected to", note: "hedge" },
  { id: 3, kind: "freshness", severity: "warn", text: "rotated every 24 hours", note: "rotation cadence unverified" },
  { id: -4, kind: "prose", severity: "warn", text: "across the fleet", note: "vague scope" },
];

type Annot = { fid: number; rule: string; red: boolean; quote: string; top: number };

/* ————— component ————— */

export function DocReviewEditor({
  body = DEMO_MD,
  findings = DEMO_FINDINGS,
  loading = false,
}: {
  body?: string;
  findings?: Finding[];
  loading?: boolean;
}) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseMarkdown(body));
  const [focusedId, setFocusedId] = useState<number | null>(() => blocks[0]?.id ?? null);
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false });
  const [, setHasSel] = useState(false);
  const [justify, setJustify] = useState(false);
  const [airy, setAiry] = useState(false);
  const [liveHeadings, setLiveHeadings] = useState<Record<number, string | undefined>>({});
  const [annTops, setAnnTops] = useState<Record<string, number>>({});

  const blockEls = useRef(new Map<number, HTMLElement>());
  const focusNext = useRef<{ id: number; atEnd: boolean } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const focusedBlock = blocks.find((b) => b.id === focusedId) ?? null;

  /* decorated html per block */
  const rendered = useMemo(() => {
    const done = new Set<number>();
    return blocks.map((b) => (b.type === "code" ? b.html : decorateBlock(b.html, findings, done)));
  }, [blocks, findings]);

  /* ——— block refs + commit ——— */
  const bindRef = (id: number) => (el: HTMLElement | null) => {
    if (el) blockEls.current.set(id, el); else blockEls.current.delete(id);
  };
  const domHtml = (b: Block): string | null => {
    const el = blockEls.current.get(b.id);
    if (!el) return null;
    return b.type === "code" ? escapeHtml(el.innerText.replace(/\n+$/, "")) : stripMarks(el.innerHTML);
  };
  const commitBlock = (id: number) => {
    setBlocks((bs) => bs.map((b) => {
      if (b.id !== id) return b;
      const html = domHtml(b);
      return html === null || html === b.html ? b : { ...b, html };
    }));
  };

  const onBlockInput = (b: Block) => {
    if (b.type === "h2" || b.type === "h3") {
      const t = blockEls.current.get(b.id)?.textContent ?? "";
      setLiveHeadings((m) => (m[b.id] === t ? m : { ...m, [b.id]: t }));
    }
  };

  const onBlockKeyDown = (e: KeyboardEvent, b: Block) => {
    const el = blockEls.current.get(b.id);
    if (!el) return;
    if (e.key === "Enter" && !e.shiftKey && b.type !== "code") {
      e.preventDefault();
      let tail = "";
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const r = sel.getRangeAt(0);
        const rest = r.cloneRange();
        rest.selectNodeContents(el);
        rest.setStart(r.endContainer, r.endOffset);
        const tmp = document.createElement("div");
        tmp.appendChild(rest.extractContents());
        tail = stripMarks(tmp.innerHTML);
      }
      const head = stripMarks(el.innerHTML);
      const newId = nid();
      focusNext.current = { id: newId, atEnd: false };
      if (b.type === "h2" || b.type === "h3") setLiveHeadings((m) => ({ ...m, [b.id]: blockText(head) }));
      setBlocks((bs) => {
        const ix = bs.findIndex((x) => x.id === b.id);
        if (ix === -1) return bs;
        const nb: Block = { id: newId, type: b.type === "li" ? "li" : "p", html: tail };
        return [...bs.slice(0, ix), { ...bs[ix], html: head }, nb, ...bs.slice(ix + 1)];
      });
    } else if (e.key === "Backspace" && (el.textContent ?? "").trim() === "" && blocks.length > 1) {
      e.preventDefault();
      setBlocks((bs) => {
        const ix = bs.findIndex((x) => x.id === b.id);
        if (ix === -1) return bs;
        const prev = bs[ix - 1] ?? bs[ix + 1];
        if (prev) focusNext.current = { id: prev.id, atEnd: true };
        return bs.filter((x) => x.id !== b.id);
      });
    }
  };

  /* place caret in the freshly created / target block after render */
  useEffect(() => {
    const f = focusNext.current;
    if (!f) return;
    focusNext.current = null;
    const el = blockEls.current.get(f.id);
    if (!el) return;
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(!f.atEnd);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  }, [blocks]);

  /* ——— toolbar: track fmt + selection ——— */
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      const inEditor = !!sel && !sel.isCollapsed && !!sel.anchorNode &&
        !!editorRef.current?.contains(sel.anchorNode);
      setHasSel((prev) => (prev === inEditor ? prev : inEditor));
      try {
        const next = {
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          underline: document.queryCommandState("underline"),
        };
        setFmt((p) => (p.bold === next.bold && p.italic === next.italic && p.underline === next.underline ? p : next));
      } catch { /* execCommand unsupported — leave states as-is */ }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  const exec = (cmd: "bold" | "italic" | "underline") => { document.execCommand(cmd); };

  const setBlockType = (type: BlockType) => {
    if (!focusedBlock || focusedBlock.type === "code") return;
    const html = domHtml(focusedBlock);
    setBlocks((bs) => bs.map((b) => (b.id === focusedBlock.id ? { ...b, type, html: html ?? b.html } : b)));
  };

  /* ——— scroll-and-flash ——— */
  const flash = (el: Element | null | undefined) => {
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("dr-flash");
    setTimeout(() => el.classList.remove("dr-flash"), 1400);
  };
  const jumpToFinding = (fid: number) =>
    flash(editorRef.current?.querySelector(`span.fmark[data-fid="${fid}"]`));

  /* ——— margin annotations aligned to their match ——— */
  useLayoutEffect(() => {
    const cont = editorRef.current;
    if (!cont) return;
    const crect = cont.getBoundingClientRect();
    const tops: Record<string, number> = {};
    cont.querySelectorAll<HTMLElement>("span.fmark").forEach((s) => {
      const fid = s.dataset.fid;
      if (fid && !(fid in tops)) tops[fid] = Math.max(6, Math.round(s.getBoundingClientRect().top - crect.top));
    });
    setAnnTops((prev) => (JSON.stringify(prev) === JSON.stringify(tops) ? prev : tops));
  }, [rendered, findings]);

  const annots = useMemo<Annot[]>(() => {
    const fs = findings.filter((f) => f.severity === "warn" || f.severity === "error").slice(0, 6);
    const items = fs.map((f) => {
      const rule = f.id < 0 && f.kind === "prose" ? f.note : f.kind === "fact" ? "fact-check" : f.kind;
      const red = f.kind === "fact" || f.severity === "error";
      return { fid: f.id, rule, red, quote: `“${cleanText(f.text)}”`, top: annTops[String(f.id)] as number | undefined };
    });
    const placed = items.filter((i) => i.top !== undefined).sort((a, b) => a.top! - b.top!);
    let last = -46;
    for (const p of placed) { p.top = Math.max(p.top!, last + 46); last = p.top; }
    for (const u of items.filter((i) => i.top === undefined)) { last += 46; u.top = Math.max(6, last); }
    return items.slice().sort((a, b) => a.top! - b.top!).map((i) => ({ ...i, top: i.top! }));
  }, [findings, annTops]);

  const typeValue = focusedBlock && focusedBlock.type in TYPE_LABELS ? focusedBlock.type : "";
  const toolBtn = (active: boolean) =>
    `border ${active ? "border-biscay-2/50 bg-biscay-2/[0.08] text-ink" : "border-ink/15 text-ink/70 hover:text-ink hover:border-ink/40"}`;

  if (loading) {
    return (
      <Card variant="flush" className="max-w-[860px]">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-ink/12 px-3 py-2" aria-hidden="true">
          <SkeletonChip w={44} /><SkeletonChip w={28} /><SkeletonChip w={28} /><SkeletonChip w={28} />
          <span className="ml-auto"><SkeletonChip w={28} /></span>
        </div>
        <div className="grid grid-cols-[1fr_190px] gap-4 p-5" aria-hidden="true">
          <div className="space-y-3">
            <Skeleton width="55%" height={24} />
            <SkeletonText lines={4} /><SkeletonText lines={3} /><SkeletonText lines={5} />
          </div>
          <div className="space-y-6 border-l border-ink/10 pl-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5"><SkeletonLine w="55%" h={9} /><SkeletonLine w="90%" h={9} /></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="flush" className="max-w-[860px]">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-ink/12">
        <Menu
          align="start"
          trigger={
            <Button compact aria-label="Block type">
              {focusedBlock ? BLOCK_LABEL[focusedBlock.type] : "¶"} <ChevronDown size={11} />
            </Button>
          }
        >
          <MenuRadioGroup value={typeValue} onValueChange={(v) => setBlockType(v as BlockType)}>
            {(["h1", "h2", "h3", "p"] as const).map((t) => (
              <MenuRadioItem key={t} value={t}>{TYPE_LABELS[t]}</MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </Menu>

        {([["bold", "B"], ["italic", "I"], ["underline", "U"]] as const).map(([cmd, glyph]) => {
          const label = glyph === "B" ? "Bold" : glyph === "I" ? "Italic" : "Underline";
          return (
            <Button
              key={cmd}
              icon
              className={`${toolBtn(fmt[cmd])} ${glyph === "B" ? "font-bold" : glyph === "I" ? "italic font-serif" : "underline"}`}
              aria-pressed={fmt[cmd]}
              aria-label={`${label} selection`}
              title={`${label} selection`}
              onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}
            >{glyph}</Button>
          );
        })}

        <Button
          icon
          className={toolBtn(focusedBlock?.type === "li")}
          aria-pressed={focusedBlock?.type === "li"}
          aria-label="Toggle bullet list"
          title="Toggle bullet list"
          onMouseDown={(e) => { e.preventDefault(); setBlockType(focusedBlock?.type === "li" ? "p" : "li"); }}
        ><BulletListIc /></Button>

        <span className="mx-1 h-5 w-px bg-ink/12" />

        <Button icon className={toolBtn(justify)} aria-pressed={justify} aria-label="Justify text" title="Justify text" onClick={() => setJustify((v) => !v)}><JustifyIc /></Button>
        <Button icon className={toolBtn(airy)} aria-pressed={airy} aria-label="Relaxed line height" title="Relaxed line height" onClick={() => setAiry((v) => !v)}><LineHeightIc /></Button>
        <div className="ml-auto">
          <Button icon className={toolBtn(false)} aria-label="Open the knowledge library" title="Open the knowledge library" onClick={() => window.open("/knowledge", "_blank")}><ExternalLink size={13} /></Button>
        </div>
      </div>

      {/* prose + margin */}
      <div className="grid grid-cols-[1fr_190px] gap-4 p-5">
        <div
          ref={editorRef}
          className={`relative min-w-0 ${MARKED}`}
          style={{
            textAlign: justify ? "justify" : undefined,
            lineHeight: airy ? 2 : 1.65,
          } as CSSProperties}
        >
          {blocks.map((b, i) =>
            createElement(BLOCK_TAG[b.type], {
              key: b.id,
              ref: bindRef(b.id),
              className: BLOCK_CLS[b.type],
              contentEditable: true,
              suppressContentEditableWarning: true,
              spellCheck: false,
              dangerouslySetInnerHTML: { __html: rendered[i] },
              onInput: () => onBlockInput(b),
              onBlur: () => commitBlock(b.id),
              onFocus: () => setFocusedId(b.id),
              onKeyDown: (e: KeyboardEvent) => onBlockKeyDown(e, b),
            }),
          )}
          {blocks.length === 0 && <div className="text-[13px] text-ink/45">Loading document…</div>}
        </div>

        <div className="relative border-l border-ink/10">
          {annots.map((a) => (
            <button
              key={a.fid}
              type="button"
              className="absolute left-3 right-0 text-left group"
              style={{ top: a.top }}
              onClick={() => jumpToFinding(a.fid)}
            >
              <span className="flex items-center gap-1.5">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${a.red ? "bg-espelette" : "bg-clay"}`} />
                <span className={`font-term text-[10.5px] uppercase tracking-[0.05em] ${a.red ? "text-espelette" : "text-clay"}`}>{a.rule}</span>
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-ink/55 group-hover:text-ink/80 line-clamp-2">{a.quote}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
