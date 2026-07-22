import { StrictMode, useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";

/* Figma-like infinite canvas of prerendered page frames. Reads
   /canvas/manifest.json (produced by scripts/prerender.mjs) and lays every
   page × state × view frame onto a pannable/zoomable plane. Only frames that
   intersect the viewport are mounted, so the DOM stays small no matter how
   many frames exist. Trackpad: pinch to zoom, two-finger drag to pan; you can
   also drag the background. */

type Frame = {
  file: string; page: string; pageTitle: string; row: number;
  state: string; stateLabel: string; view: "desktop" | "mobile";
  x: number; y: number; w: number; h: number;
};
type PageRow = { id: string; title: string; route: string; row: number; y: number };
type Manifest = { generatedFrames: number; pages: PageRow[]; frames: Frame[] };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function useManifest() {
  const [data, setData] = useState<Manifest | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("./canvas/manifest.json", { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(`manifest ${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, []);
  return { data, err };
}

function Canvas({ data }: { data: Manifest }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [t, setT] = useState({ k: 0.18, x: 80, y: 60 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  // Bounds of all content, to frame the initial view.
  useLayoutEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Wheel: ctrl/⌘ (or trackpad pinch) → zoom about cursor; else pan.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setT((prev) => {
        if (e.ctrlKey || e.metaKey) {
          const factor = Math.exp(-e.deltaY * 0.01);
          const k = clamp(prev.k * factor, 0.03, 4);
          return { k, x: cx - ((cx - prev.x) / prev.k) * k, y: cy - ((cy - prev.y) / prev.k) * k };
        }
        return { ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    setT((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
  }, []);
  const onPointerUp = useCallback(() => { drag.current = null; }, []);

  const zoomTo = (k: number) => setT((p) => {
    const cx = vp.w / 2, cy = vp.h / 2;
    return { k, x: cx - ((cx - p.x) / p.k) * k, y: cy - ((cy - p.y) / p.k) * k };
  });

  const fitAll = useCallback(() => {
    const fr = data.frames;
    if (!fr.length) return;
    const maxX = Math.max(...fr.map((f) => f.x + f.w));
    const maxY = Math.max(...fr.map((f) => f.y + f.h));
    const k = clamp(Math.min((vp.w - 120) / maxX, (vp.h - 120) / maxY), 0.03, 1);
    setT({ k, x: 60, y: 60 });
  }, [data, vp]);

  useEffect(() => { fitAll(); }, [fitAll]);

  // Visible plane rect (+ margin) for virtualization.
  const margin = 600;
  const minPX = (-t.x) / t.k - margin;
  const minPY = (-t.y) / t.k - margin;
  const maxPX = (vp.w - t.x) / t.k + margin;
  const maxPY = (vp.h - t.y) / t.k + margin;
  const visible = data.frames.filter(
    (f) => f.x < maxPX && f.x + f.w > minPX && f.y < maxPY && f.y + f.h > minPY,
  );

  return (
    <div
      ref={ref}
      className="canvas-vp"
      style={{ position: "fixed", inset: 0, cursor: drag.current ? "grabbing" : "grab", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div style={{ position: "absolute", top: 0, left: 0, transformOrigin: "0 0", transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})` }}>
        {/* Row (page) labels */}
        {data.pages.map((p) => (
          <div key={p.id} style={{ position: "absolute", left: 0, top: p.y - 78, width: 1200 }}>
            <div style={{ font: "700 40px ui-sans-serif, system-ui", color: "#10263B" }}>{p.title}</div>
            <div style={{ font: "500 22px ui-monospace, monospace", color: "#10263B80", marginTop: 4 }}>{p.route}</div>
          </div>
        ))}
        {/* Frames */}
        {visible.map((f) => (
          <div key={f.file} style={{ position: "absolute", left: f.x, top: f.y, width: f.w, height: f.h }}>
            <div style={{ position: "absolute", left: 0, top: -34, font: "600 20px ui-monospace, monospace", color: "#10263B99", whiteSpace: "nowrap" }}>
              {f.view === "mobile" ? "▯ " : "▭ "}{f.stateLabel}
            </div>
            <img
              src={`./canvas/${f.file}`}
              width={f.w}
              height={f.h}
              loading="lazy"
              decoding="async"
              alt={`${f.pageTitle} · ${f.stateLabel} · ${f.view}`}
              style={{ display: "block", width: f.w, height: f.h, background: "#fff", borderRadius: 10, border: "1px solid #10263B26", boxShadow: "0 12px 40px -12px #10263B40" }}
            />
          </div>
        ))}
      </div>

      {/* HUD */}
      <div style={{ position: "fixed", left: 16, top: 16, display: "flex", gap: 8, alignItems: "center", background: "#fff", border: "1px solid #10263B22", borderRadius: 10, padding: "8px 12px", boxShadow: "0 8px 24px -12px #10263B40", font: "500 13px ui-sans-serif, system-ui", color: "#10263B" }}>
        <b style={{ letterSpacing: 1, textTransform: "uppercase", fontSize: 11, color: "#B23A1E" }}>Mari</b>
        <span style={{ color: "#10263B99" }}>Page canvas — {data.generatedFrames} frames · {data.pages.length} pages</span>
        <span style={{ width: 1, height: 16, background: "#10263B22" }} />
        <button onClick={() => zoomTo(clamp(t.k * 1.3, 0.03, 4))} style={hudBtn}>+</button>
        <button onClick={() => zoomTo(clamp(t.k / 1.3, 0.03, 4))} style={hudBtn}>−</button>
        <span style={{ width: 44, textAlign: "center", color: "#10263B99" }}>{Math.round(t.k * 100)}%</span>
        <button onClick={fitAll} style={hudBtn}>Fit</button>
        <a href="./index.html" style={{ ...hudBtn, textDecoration: "none", color: "#1E6FA8" }}>Components</a>
      </div>
      <div style={{ position: "fixed", right: 16, bottom: 16, font: "500 12px ui-sans-serif, system-ui", color: "#10263B80", background: "#ffffffcc", borderRadius: 8, padding: "6px 10px" }}>
        pinch to zoom · two-finger drag to pan · drag background to move
      </div>
    </div>
  );
}

const hudBtn: React.CSSProperties = {
  border: "1px solid #10263B22", background: "#fff", borderRadius: 6,
  padding: "3px 9px", cursor: "pointer", font: "600 13px ui-sans-serif", color: "#10263B",
};

function App() {
  const { data, err } = useManifest();
  if (err) {
    return (
      <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", font: "500 14px ui-sans-serif", color: "#10263B", textAlign: "center", padding: 24 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>No canvas manifest yet</div>
          <div style={{ color: "#10263B99" }}>Run <code>npm run prerender</code> to generate the page frames.<br />({err})</div>
        </div>
      </div>
    );
  }
  if (!data) return <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", font: "500 14px ui-sans-serif", color: "#10263B99" }}>Loading canvas…</div>;
  return <Canvas data={data} />;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
