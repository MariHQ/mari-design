import { useRef, useState, type DragEvent } from "react";
import { Send, FileText, CheckCircle2 } from "lucide-react";
import { Drawer } from "../layout/Drawer";
import { Button } from "../actions/Button";
import { Spinner } from "../data-display/Spinner";
import { Chip } from "../data-display/Chip";
import { focusRing } from "../tokens/focusRing";

/* WelcomeUploadConnect — the Welcome wizard's Upload sub-flow: drag-and-drop or
   browse .md/.txt files through the same document → chunk → embed pipeline as
   GitHub sync. Per-file results (chunks / embedded / error) come straight from
   the server; re-uploading unchanged content honestly shows 0 embedded
   (content-hash skip). Local FileDropzone + UploadResultList are built here;
   POST /onboard/upload is simulated. Standalone: opens by default. */

const MAX_FILES = 20;
const MAX_BYTES = 1_000_000;

type FileResult = { name: string; docId: number | null; chunks: number; embedded: number; error?: string };
type UploadResult = { files: FileResult[] };

// Deterministic per-name demo counts so re-dropping the same file skips embeds.
const seen = new Set<string>();
function fakeIngest(name: string, size: number): FileResult {
  if (!/\.(md|mdx|markdown|txt)$/i.test(name)) return { name, docId: null, chunks: 0, embedded: 0, error: "unsupported file type" };
  const chunks = Math.max(1, Math.round(size / 1800) || 3 + (name.length % 5));
  const first = !seen.has(name);
  seen.add(name);
  return { name, docId: Math.floor(Math.random() * 9000), chunks, embedded: first ? chunks : 0 };
}

function FileDropzone({
  uploading, onFiles,
}: { uploading: boolean; onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
      className={`grid place-items-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors ${
        dragging ? "border-biscay-2 bg-biscay/[0.04]" : "border-ink/20"
      }`}
    >
      {uploading ? (
        <span className="inline-flex items-center gap-2 text-[13px] text-ink/65"><Spinner size="md" /> Uploading and embedding…</span>
      ) : (
        <>
          <Send size={22} className="text-ink/35 -rotate-45" />
          <span className="text-[13px] text-ink/60">Drag files here, or</span>
          <Button compact onClick={() => inputRef.current?.click()}>Browse files</Button>
          <input
            ref={inputRef} type="file" multiple hidden accept=".md,.mdx,.markdown,.txt"
            className={focusRing}
            onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}
          />
        </>
      )}
    </div>
  );
}

function UploadResultList({ result }: { result: UploadResult }) {
  const ok = result.files.filter((f) => f.docId != null);
  const totalChunks = ok.reduce((n, f) => n + f.chunks, 0);
  const totalEmbedded = ok.reduce((n, f) => n + f.embedded, 0);
  return (
    <div className="mt-3">
      <p className="text-[12.5px] text-ink/70">
        {ok.length} file{ok.length === 1 ? "" : "s"} ingested · {totalChunks} chunks · {totalEmbedded} embedded
        {totalEmbedded < totalChunks && <span className="text-ink/50"> (unchanged chunks skipped by content hash)</span>}
      </p>
      <div className="mt-2 grid gap-1.5">
        {result.files.map((f, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-md border border-ink/12">
            <FileText size={14} className="text-ink/45 shrink-0" />
            <span className="text-[13px] text-ink truncate flex-1">{f.name}</span>
            {f.docId != null
              ? <span className="font-term text-[11px] text-ink/55 shrink-0">{f.chunks} chunks · {f.embedded} embedded</span>
              : <Chip label={f.error ?? "failed"} tone="blocked" className="shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export type WelcomeUploadConnectProps = {
  defaultOpen?: boolean;
  className?: string;
};

export function WelcomeUploadConnect({ defaultOpen = true, className = "" }: WelcomeUploadConnectProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);

  const upload = (files: File[]) => {
    if (files.length === 0) return;
    setError("");
    if (files.length > MAX_FILES) { setError(`At most ${MAX_FILES} files per upload — you picked ${files.length}.`); return; }
    const over = files.find((f) => f.size > MAX_BYTES);
    if (over) { setError(`"${over.name}" is over the 1 MB per-file limit.`); return; }
    setUploading(true);
    window.setTimeout(() => {
      setResult({ files: files.map((f) => fakeIngest(f.name, f.size)) });
      setUploading(false);
    }, 1300);
  };

  const footer = (
    <div className="flex-1 flex items-center gap-3">
      <span className="text-[12px] text-ink/55 flex-1">.md / .txt · up to 20 files · 1 MB each</span>
      <Button variant="primary" onClick={() => setOpen(false)}>
        {result ? <>Done <CheckCircle2 size={14} /></> : "Close"}
      </Button>
    </div>
  );

  return (
    <div className={className}>
      <Button variant="primary" onClick={() => { setResult(null); setError(""); setOpen(true); }}>
        <Send size={14} className="-rotate-45" /> Upload files
      </Button>
      <Drawer open={open} onClose={() => !uploading && setOpen(false)} title="Upload files" subtitle="Connector setup"
        icon={<Send size={18} className="-rotate-45" />} footer={footer}>
        <p className="text-[13px] text-ink/70 mb-3">
          Files run the same document → chunk → embed pipeline as GitHub sync and land in your shared library.
        </p>
        <FileDropzone uploading={uploading} onFiles={upload} />
        {error && (
          <div className="mt-3 rounded-[4px] border border-espelette/30 bg-espelette/[0.05] px-3 py-2 text-[12.5px] text-espelette" role="alert">
            {error}
          </div>
        )}
        {result && <UploadResultList result={result} />}
      </Drawer>
    </div>
  );
}
