// Prerender pipeline: screenshot every page × state × view (FULL page height)
// into PNGs that the infinite canvas displays. Runs against a `vite preview`
// server of the built dist so the render route + code-split chunks resolve
// exactly as deployed.
//
//   node scripts/prerender.mjs
//
// Output: .preview/public/canvas/<page>__<state>__<view>.png + manifest.json
// (a subsequent `vite build` copies public/canvas/* into dist/canvas/).

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, ".preview/public/canvas");
const PORT = 4318;
const BASE = `http://localhost:${PORT}`;

const SIZES = { desktop: { w: 1440, h: 900 }, mobile: { w: 390, h: 844 } };

// Canvas layout constants (native px on the plane).
const FRAME_GAP = 72;
const MOBILE_GAP = 140;
const ROW_GAP = 220;
const TOP_PAD = 140;

function waitForServer(url, tries = 60) {
  return new Promise((res, rej) => {
    const tick = async (n) => {
      try {
        const r = await fetch(url);
        if (r.ok || r.status === 404) return res();
      } catch {}
      if (n <= 0) return rej(new Error("server did not start"));
      setTimeout(() => tick(n - 1), 500);
    };
    tick(tries);
  });
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    cwd: ROOT, stdio: "ignore", env: process.env,
  });
  const cleanup = () => { try { server.kill("SIGKILL"); } catch {} };
  process.on("exit", cleanup);

  try {
    await waitForServer(`${BASE}/render.html`);
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ deviceScaleFactor: 1 });
    const page = await ctx.newPage();

    await page.goto(`${BASE}/render.html?list=1`, { waitUntil: "networkidle" });
    const frames = await page.evaluate(() => window.__FRAMES__);
    const pages = await page.evaluate(() => window.__PAGES__);
    if (!frames?.length) throw new Error("no frames enumerated — is the registry empty?");
    console.log(`Prerendering ${frames.length} frames across ${pages.length} pages…`);

    // Capture each frame at full page height.
    const ordered = [...frames].sort((a, b) =>
      a.row - b.row || (a.view === b.view ? 0 : a.view === "desktop" ? -1 : 1),
    );
    const captured = [];
    for (const f of ordered) {
      const { w, h: devH } = SIZES[f.view];
      const file = `${f.page}__${f.state}__${f.view}.png`;
      const url = `${BASE}/render.html?page=${encodeURIComponent(f.page)}&state=${encodeURIComponent(f.state)}&view=${f.view}`;
      await page.setViewportSize({ width: w, height: devH });
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForSelector("body[data-ready]", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(250);
      const fullH = Math.max(devH, await page.evaluate(() =>
        Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      ));
      await page.screenshot({ path: resolve(OUT_DIR, file), fullPage: true });
      captured.push({
        file, page: f.page, pageTitle: f.pageTitle, row: f.row,
        state: f.state, stateLabel: f.stateLabel, view: f.view, w, h: fullH,
      });
      process.stdout.write(".");
    }
    process.stdout.write("\n");

    // Layout: one row per page, desktop states then mobile states; rows stack
    // with cumulative (variable) heights.
    const rows = [...new Set(captured.map((c) => c.row))].sort((a, b) => a - b);
    const byRow = new Map();
    for (const c of captured) {
      if (!byRow.has(c.row)) byRow.set(c.row, []);
      byRow.get(c.row).push(c);
    }
    let y = TOP_PAD;
    const pagesOut = [];
    for (const r of rows) {
      const list = byRow.get(r);
      list.sort((a, b) => (a.view === b.view ? 0 : a.view === "desktop" ? -1 : 1));
      const rowH = Math.max(...list.map((c) => c.h));
      let x = 0; let prevView = null;
      for (const c of list) {
        if (prevView === "desktop" && c.view === "mobile") x += MOBILE_GAP;
        c.x = x; c.y = y;
        x += c.w + FRAME_GAP; prevView = c.view;
      }
      const p = pages.find((pp) => pp.row === r);
      if (p) pagesOut.push({ ...p, y });
      y += rowH + ROW_GAP;
    }

    const manifest = { generatedFrames: captured.length, pages: pagesOut, frames: captured };
    await writeFile(resolve(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
    console.log(`Wrote ${captured.length} full-page PNGs + manifest.json to ${OUT_DIR}`);

    await browser.close();
  } finally {
    cleanup();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
