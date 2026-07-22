import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Toaster } from "../feedback/Toast";
import { PAGES } from "../pages";
import { setStaticFrame } from "../pages/PageFrame";

// Grow frames to full content height so screenshots capture the whole page.
setStaticFrame(true);

/* Single-frame renderer for the prerender pipeline. URL params:
     ?page=<id>&state=<id>&view=desktop|mobile
   Renders exactly one page state at a fixed device size, then flags the body
   ready so the screenshotter can capture a settled frame. */

const params = new URLSearchParams(location.search);
const pageId = params.get("page") ?? "";
const stateId = params.get("state") ?? "default";
const view = params.get("view") === "mobile" ? "mobile" : "desktop";

const SIZES = { desktop: { w: 1440, h: 900 }, mobile: { w: 390, h: 844 } } as const;
const { w, h } = SIZES[view];

// Enumeration mode for the prerender script: expose every frame combo.
if (params.has("list")) {
  const views = ["desktop", "mobile"] as const;
  (window as unknown as { __FRAMES__: unknown }).__FRAMES__ = PAGES.flatMap((p, row) =>
    p.states.flatMap((s) =>
      views.map((v) => ({ page: p.id, pageTitle: p.title, row, state: s.id, stateLabel: s.label, view: v })),
    ),
  );
  (window as unknown as { __PAGES__: unknown }).__PAGES__ = PAGES.map((p, row) => ({ id: p.id, title: p.title, route: p.route, row }));
  document.body.dataset.ready = "1";
}

const mod = PAGES.find((p) => p.id === pageId);

function Ready() {
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => { document.body.dataset.ready = "1"; }),
    );
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}

function Frame() {
  if (!mod) {
    return <div style={{ padding: 24, fontFamily: "monospace" }}>Unknown page: {pageId || "(none)"}</div>;
  }
  const Cmp = mod.component;
  // Fixed device width, min-height = device height but free to grow taller so
  // the full page is captured (see prerender.mjs fullPage screenshot).
  // overflowX:"clip" keeps the frame exactly device-width — like a real
  // fixed-width window / Figma frame — so horizontal overflow shows as content
  // cut off at the edge instead of widening (and squishing) the screenshot.
  // (`clip` on x with default-visible y does NOT create a vertical scroll
  // container, so the full-height capture still works.)
  return (
    <div style={{ width: w, minHeight: h, overflowX: "clip" }} className="bg-paper text-ink">
      <Cmp state={stateId} mobile={view === "mobile"} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster>
      <Frame />
      <Ready />
    </Toaster>
  </StrictMode>,
);
