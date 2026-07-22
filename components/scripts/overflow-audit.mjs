// Automated overflow audit across every page x state x view.
//
//   node scripts/overflow-audit.mjs [--view desktop|mobile|both] [--json out.json]
//
// Reports three classes of layout defect that contact sheets can only show one
// at a time:
//
//   PAGE_OVERFLOW  the document scrolls sideways at the device width
//   ESCAPE         an element's content is wider than its own box, i.e. it is
//                  spilling past a border (the visible "runs off the card" bug)
//   CRUSH          a flex/grid child squeezed so narrow that its text wraps a
//                  character or two per line. Detected as a very tall, very
//                  narrow text box. This is what turned one panel into a
//                  23,000px column.
//
// Everything is measured in the real browser, so it catches the cases that
// reading CSS does not.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import os from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : argv[i + 1]; };
const VIEW = opt("view", "both");
const JSON_OUT = opt("json", null);
const ONLY = opt("page", null);

const PORT = 5496;
const BASE = `http://localhost:${PORT}`;
const SIZES = { desktop: { w: 1440, h: 900 }, mobile: { w: 390, h: 844 } };
const CONCURRENCY = Math.max(2, Math.min(8, (os.cpus()?.length || 4) - 1));

function waitForServer(url, tries = 90) {
  return new Promise((res, rej) => {
    const tick = async (n) => {
      try { const r = await fetch(url); if (r.ok || r.status === 404) return res(); } catch {}
      if (n <= 0) return rej(new Error("vite did not start"));
      setTimeout(() => tick(n - 1), 400);
    };
    tick(tries);
  });
}

/* Runs in the page. Keep it self-contained. */
function probe() {
  const out = { page: [], escapes: [], crushes: [] };
  const de = document.documentElement;
  const vw = de.clientWidth;
  if (de.scrollWidth > vw + 2) out.page.push({ scrollWidth: de.scrollWidth, clientWidth: vw });

  const label = (el) => {
    const t = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 48);
    const cls = (typeof el.className === "string" ? el.className : "").split(/\s+/).slice(0, 4).join(" ");
    return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} .${cls} :: ${t}`;
  };

  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;

    // ESCAPE: content wider than the box AND actually visible past the edge.
    // Deliberately excluded, because scrollWidth > clientWidth is the CORRECT
    // state for each of these and reporting them buries the real bugs:
    //   - overflow hidden/clip/auto/scroll: the element is containing it
    //     (`truncate` is overflow:hidden + ellipsis, working as intended)
    //   - form controls: long values always scroll inside the field
    const contained = /(auto|scroll|hidden|clip)/.test(cs.overflowX);
    const formControl = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
    if (!contained && !formControl && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
      // Only count it if the parent isn't clipping it anyway.
      const pc = el.parentElement ? getComputedStyle(el.parentElement) : null;
      const parentClips = pc && /(hidden|clip|auto|scroll)/.test(pc.overflowX);
      if (!parentClips) out.escapes.push({ by: el.scrollWidth - el.clientWidth, w: el.clientWidth, el: label(el) });
    }

    // CRUSH: a narrow box holding text far taller than it is wide.
    const hasText = el.children.length === 0 && (el.textContent || "").trim().length > 12;
    if (hasText && r.width > 0 && r.width < 90 && r.height > 4 * r.width) {
      out.crushes.push({ w: Math.round(r.width), h: Math.round(r.height), el: label(el) });
    }
  }
  const dedupe = (arr, key) => {
    const seen = new Set();
    return arr.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; });
  };
  out.escapes = dedupe(out.escapes, (x) => x.el).sort((a, b) => b.by - a.by).slice(0, 8);
  out.crushes = dedupe(out.crushes, (x) => x.el).sort((a, b) => b.h - a.h).slice(0, 8);
  return out;
}

async function main() {
  const server = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], {
    cwd: ROOT, stdio: "ignore", env: { ...process.env, MARI_NO_OPEN: "1" },
  });
  const cleanup = () => { try { server.kill("SIGKILL"); } catch {} };
  process.on("exit", cleanup);

  try {
    await waitForServer(`${BASE}/render.html`);
    const browser = await chromium.launch();
    const ctx = await browser.newContext();
    const list = await ctx.newPage();
    await list.goto(`${BASE}/render.html?list=1`, { waitUntil: "load" });
    let frames = await list.evaluate(() => window.__FRAMES__);
    await list.close();

    const views = VIEW === "both" ? ["desktop", "mobile"] : [VIEW];
    frames = frames.filter((f) => views.includes(f.view) && (!ONLY || f.page === ONLY));

    const findings = [];
    let cursor = 0, done = 0;
    async function worker() {
      const page = await ctx.newPage();
      for (;;) {
        const i = cursor++;
        if (i >= frames.length) break;
        const f = frames[i];
        const { w, h } = SIZES[f.view];
        await page.setViewportSize({ width: w, height: h });
        await page.goto(
          `${BASE}/render.html?page=${encodeURIComponent(f.page)}&state=${encodeURIComponent(f.state)}&view=${f.view}&full=1`,
          { waitUntil: "load" },
        );
        await page.waitForTimeout(180);
        const r = await page.evaluate(probe).catch(() => null);
        if (r && (r.page.length || r.escapes.length || r.crushes.length)) {
          findings.push({
            page: f.page, state: f.state, view: f.view,
            pageOverflow: r.page, escapes: r.escapes, crushes: r.crushes,
          });
        }
        if (++done % 50 === 0) process.stdout.write(`${done}/${frames.length} `);
      }
      await page.close();
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    process.stdout.write("\n");

    // Roll up by page so the worst offenders are obvious.
    // NOTE: `f.page` is the page id, `f.pageOverflow` the document-level hits.
    const byPage = new Map();
    for (const f of findings) {
      const e = byPage.get(f.page) ?? { page: f.page, overflow: 0, escapes: 0, crushes: 0, worst: [] };
      e.overflow += f.pageOverflow?.length ?? 0;
      e.escapes += f.escapes.length;
      e.crushes += f.crushes.length;
      for (const x of f.escapes.slice(0, 2)) e.worst.push(`${f.state}/${f.view} ESCAPE +${x.by}px ${x.el}`);
      for (const x of f.crushes.slice(0, 2)) e.worst.push(`${f.state}/${f.view} CRUSH ${x.w}x${x.h} ${x.el}`);
      byPage.set(f.page, e);
    }
    const rows = [...byPage.values()].sort((a, b) => (b.escapes + b.crushes) - (a.escapes + a.crushes));
    console.log(`\n${findings.length} frames with defects, of ${frames.length} checked\n`);
    for (const r of rows) {
      console.log(`${String(r.page).padEnd(20)} overflow=${String(r.overflow).padStart(3)}  escapes=${String(r.escapes).padStart(4)}  crushes=${String(r.crushes).padStart(4)}`);
      for (const w of r.worst.slice(0, 3)) console.log(`    ${w}`);
    }
    if (JSON_OUT) await writeFile(JSON_OUT, JSON.stringify(findings, null, 2));

    await browser.close();
  } finally { cleanup(); }
}

main().catch((e) => { console.error(e); process.exit(1); });
