// Prerender pipeline: screenshot every page × state × view (FULL page height)
// into images the infinite canvas displays. Runs against a `vite preview`
// server of the built dist so the render route + code-split chunks resolve
// exactly as deployed.
//
//   node scripts/prerender.mjs
//
// Output: .preview/public/canvas/<page>__<state>__<view>.jpg + manifest.json
// (a subsequent `vite build` copies public/canvas/* into dist/canvas/).
//
// Fast: a pool of browser pages captures frames concurrently, `waitUntil:load`
// + a `body[data-ready]` flag instead of networkidle, and JPEG encoding (much
// faster than PNG for tall full-page shots, and far smaller to upload/load).

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import os from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, ".preview/public/canvas");
const PORT = 4318;
const BASE = `http://localhost:${PORT}`;
const CONCURRENCY = Math.max(2, Math.min(8, (os.cpus()?.length || 4) - 1));
const JPEG_QUALITY = 88;
// Decoded-pixel budget per frame. Browsers subsample bitmaps past their decode
// limits, which renders on the canvas as a squished frame; staying under this
// keeps every frame pixel-exact.
const MAX_FRAME_PX = 16_000_000;

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
    // Desktop at 1x (its tall frames would blow past browser image-size limits
    // at 2x); mobile at 2x DPR so the small 390px frames stay crisp when zoomed
    // in on the canvas (manifest stays CSS px — the image just carries 2x
    // pixels, i.e. retina).
    const ctxByView = {
      desktop: await browser.newContext({ deviceScaleFactor: 1 }),
      mobile: await browser.newContext({ deviceScaleFactor: 2 }),
      // Fallback for very tall mobile frames: past roughly 16MP a browser
      // subsamples the decoded bitmap, which shows up on the canvas as a
      // squished/blurry frame. Those frames are captured at 1x instead, so
      // they stay geometrically correct (just not retina).
      mobile1x: await browser.newContext({ deviceScaleFactor: 1 }),
    };
    const ctx = ctxByView.desktop;

    // Enumerate frames from the registry.
    const listPage = await ctx.newPage();
    await listPage.goto(`${BASE}/render.html?list=1`, { waitUntil: "load" });
    const frames = await listPage.evaluate(() => window.__FRAMES__);
    const pages = await listPage.evaluate(() => window.__PAGES__);
    await listPage.close();
    if (!frames?.length) throw new Error("no frames enumerated — is the registry empty?");
    console.log(`Prerendering ${frames.length} frames across ${pages.length} pages with ${CONCURRENCY} workers…`);

    const ordered = [...frames].sort((a, b) =>
      a.row - b.row || (a.view === b.view ? 0 : a.view === "desktop" ? -1 : 1),
    );

    // Worker pool: each page pulls frames off a shared cursor.
    const results = new Array(ordered.length);
    let cursor = 0;
    let done = 0;
    async function worker() {
      // One page per view (each from its own DPR context).
      const pageByView = {
        desktop: await ctxByView.desktop.newPage(),
        mobile: await ctxByView.mobile.newPage(),
        mobile1x: await ctxByView.mobile1x.newPage(),
      };
      for (;;) {
        const i = cursor++;
        if (i >= ordered.length) break;
        const f = ordered[i];
        const p = pageByView[f.view];
        const { w, h: devH } = SIZES[f.view];
        const file = `${f.page}__${f.state}__${f.view}.jpg`;
        const url = `${BASE}/render.html?page=${encodeURIComponent(f.page)}&state=${encodeURIComponent(f.state)}&view=${f.view}`;
        await p.setViewportSize({ width: w, height: devH });
        await p.goto(url, { waitUntil: "load" });
        await p.waitForSelector("body[data-ready]", { timeout: 15000 }).catch(() => {});
        await p.waitForTimeout(120);
        let fullH = Math.max(devH, await p.evaluate(() =>
          Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
        ));

        // Re-shoot oversized retina mobile frames at 1x so the browser never
        // subsamples them (see MAX_FRAME_PX).
        let shooter = p;
        if (f.view === "mobile" && w * fullH * 4 > MAX_FRAME_PX) {
          shooter = pageByView.mobile1x;
          await shooter.setViewportSize({ width: w, height: devH });
          await shooter.goto(url, { waitUntil: "load" });
          await shooter.waitForSelector("body[data-ready]", { timeout: 15000 }).catch(() => {});
          await shooter.waitForTimeout(120);
          fullH = Math.max(devH, await shooter.evaluate(() =>
            Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
          ));
        }
        await shooter.screenshot({ path: resolve(OUT_DIR, file), fullPage: true, type: "jpeg", quality: JPEG_QUALITY });
        results[i] = {
          file, page: f.page, pageTitle: f.pageTitle, row: f.row,
          state: f.state, stateLabel: f.stateLabel, view: f.view, w, h: fullH,
        };
        done++;
        if (done % 25 === 0) process.stdout.write(`${done}/${ordered.length} `);
      }
      await pageByView.desktop.close();
      await pageByView.mobile.close();
      await pageByView.mobile1x.close();
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    process.stdout.write("\n");

    const captured = results.filter(Boolean);

    // Layout: one row per page, desktop states then mobile states; rows stack
    // with cumulative (variable) heights.
    const byRow = new Map();
    for (const c of captured) {
      if (!byRow.has(c.row)) byRow.set(c.row, []);
      byRow.get(c.row).push(c);
    }
    const rows = [...byRow.keys()].sort((a, b) => a - b);
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
    console.log(`Wrote ${captured.length} JPEG frames + manifest.json to ${OUT_DIR}`);

    await browser.close();
  } finally {
    cleanup();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
