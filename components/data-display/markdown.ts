// Hand-rolled, dependency-free markdown parser ported from the DocReview
// editor (mari-cloud/web/src/pages/docreview/markdown.ts). No npm parser —
// this is the real thing, tuned to the blocks the console produces.
//
// It supports: h1–h3 headings (optionally "tight" — no space after the
// hashes, e.g. "##1. Overview"), bullet lists (- / *), fenced code blocks
// (``` optionally with a language), inline **bold** / *italic* / `code`,
// and paragraphs. Pure functions — safe on the server, no DOM required.

export type BlockType = "h1" | "h2" | "h3" | "p" | "li" | "code";

export type Block = {
  id: number;
  type: BlockType;
  /** Inline HTML for prose blocks; escaped text for code blocks. */
  html: string;
  /** Language hint captured from a ``` fence. */
  lang?: string;
  /** Heading written without a space after the hashes ("##1. Overview"). */
  tight?: boolean;
};

let blockSeq = 1;
const nid = () => blockSeq++;

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Escape, then apply inline **bold**, *italic*, `code`. Returns HTML. */
export const mdInline = (s: string): string =>
  escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<i>$2</i>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

// A heading is 1–3 hashes optionally followed by whitespace ("##1. Overview"
// is a real heading in live docs). `tight` records the missing space.
const HEADING = /^(#{1,3})(?!#)([ \t]*)(\S.*)$/;

/** Parse markdown into a flat list of blocks. */
export function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let para: string[] = [];
  const flush = () => {
    if (!para.length) return;
    const chunk = para;
    para = [];
    if (chunk.every((l) => /^[-*]\s+/.test(l))) {
      for (const l of chunk) blocks.push({ id: nid(), type: "li", html: mdInline(l.replace(/^[-*]\s+/, "")) });
      return;
    }
    const m = HEADING.exec(chunk[0]);
    if (m) {
      blocks.push({
        id: nid(),
        type: (["h1", "h2", "h3"] as const)[m[1].length - 1],
        html: mdInline(m[3]),
        tight: m[2] === "" || undefined,
      });
      const rest = chunk.slice(1).join(" ").trim();
      if (rest) blocks.push({ id: nid(), type: "p", html: mdInline(rest) });
      return;
    }
    const joined = chunk.join(" ").trim();
    if (joined && !/^(-{3,}|_{3,}|\*{3,})$/.test(joined)) blocks.push({ id: nid(), type: "p", html: mdInline(joined) });
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
      i++; // closing fence
      blocks.push({ id: nid(), type: "code", lang: fence[1], html: escapeHtml(code.join("\n")) });
      continue;
    }
    if (line.trim() === "") flush();
    else if (HEADING.test(line)) { flush(); para = [line]; flush(); }
    else para.push(line);
    i++;
  }
  flush();
  return blocks;
}
