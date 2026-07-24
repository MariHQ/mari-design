import { useState } from "react";
import { Feather, Check, ChevronDown, ChevronRight, X } from "lucide-react";
import { Card } from "../layout/Card";
import { Button } from "../actions/Button";
import { Input } from "../forms/Input";
import { Textarea } from "../forms/Textarea";
import { Checkbox } from "../forms/Checkbox";
import { SectionLabel } from "../forms/SectionLabel";
import { Badge } from "../data-display/Badge";
import { IconRing, type IconRingTone } from "../data-display/IconRing";
import { Skeleton, SkeletonLine, SkeletonCircle, SkeletonText } from "../data-display/Skeleton";
import { Scrollable } from "../data-display/Scrollable";
import { ResultCount } from "../data-display/Pagination";
import { Truncate } from "../data-display/Truncate";

/* LibraryGuidesPanel — the Library › Style guides tab.
   Pick a trusted built-in style pack as the project default, then layer
   project-specific voice, preferred terms, banned phrases and enforcement
   toggles on top. Purely client-side in the real console (localStorage);
   here it manages the same state locally and renders standalone. */

export type Guide = { id: string; name: string; description: string; rules: number; tone: IconRingTone; preview: string[] };

const GUIDES: Guide[] = [
  { id: "plain", name: "Plain language", tone: "ok", rules: 42, description: "Direct, concise, and accessible. Prefer familiar words and active voice.", preview: ["Prefer one- or two-syllable words when they carry the meaning", "Keep sentences under 25 words", "Address the reader as “you”", "Use active voice unless the actor is unknown"] },
  { id: "microsoft", name: "Microsoft", tone: "info", rules: 38, description: "Warm, clear product writing with task-oriented language.", preview: ["Use contractions for a natural tone", "Drop “please” from direct instructions", "Use sentence case everywhere, including titles", "Bold UI labels exactly as they appear"] },
  { id: "google", name: "Google developer", tone: "attention", rules: 35, description: "Scannable technical guidance with precise, consistent terminology.", preview: ["Write in second person, present tense", "Put conditions before instructions", "Number sequences, bullet options", "Define an initialism at first mention"] },
  { id: "ap", name: "AP style", tone: "blocked", rules: 31, description: "Newsroom conventions for capitalization, numerals, names, and dates.", preview: ["Spell out one through nine, numerals for 10+", "Abbreviate months with specific dates", "Use last names on second reference", "No serial comma in a simple series"] },
  { id: "chicago", name: "Chicago", tone: "info", rules: 29, description: "Long-form editorial conventions for careful, polished prose.", preview: ["Use the serial comma", "Spell out numbers up to one hundred", "Italicize titles of standalone works", "Lowercase job titles unless they precede a name"] },
];

type Layer = {
  voice: string;
  terms: string;
  banned: string;
  inclusive: boolean;
  jargon: boolean;
  sentenceCase: boolean;
};

const DEFAULT_LAYER: Layer = {
  voice: "Confident and plain. We explain the why before the how, and we never hype. Short sentences. Address the reader directly.",
  terms: "sign in → not login\nMari → not the assistant\nknowledge base → not KB",
  banned: "leverage, synergy, best-in-class, seamless, revolutionary",
  inclusive: true,
  jargon: true,
  sentenceCase: true,
};

export type LibraryGuidesPanelProps = {
  guides?: Guide[];
  workspace?: string;
  defaultPack?: string;
  loading?: boolean;
  className?: string;
};

export function LibraryGuidesPanel({
  guides = GUIDES,
  workspace = "Northwind",
  defaultPack = "plain",
  loading = false,
  className = "",
}: LibraryGuidesPanelProps) {
  const [active, setActive] = useState(defaultPack);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  const [layer, setLayer] = useState<Layer>(DEFAULT_LAYER);
  const [saved, setSaved] = useState(false);

  const setField = <K extends keyof Layer>(k: K, v: Layer[K]) => { setLayer((l) => ({ ...l, [k]: v })); setSaved(false); };

  const save = () => { setSaved(true); window.setTimeout(() => setSaved(false), 1800); };

  if (loading) {
    return (
      <div className={`grid gap-4 lg:grid-cols-[1.4fr_1fr] items-start ${className}`.trim()} aria-hidden="true">
        <div className="space-y-3 rounded-md border border-ink/12 bg-paper p-4">
          <SkeletonLine w={150} h={13} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-[5px] border border-ink/12 p-3.5">
              <SkeletonCircle size={30} />
              <div className="flex-1 space-y-2">
                <SkeletonLine w="42%" h={12} />
                <SkeletonLine w="60%" h={9} />
                <SkeletonText lines={1} lastWidth="88%" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3 rounded-md border border-ink/12 bg-paper p-4">
          <SkeletonLine w={130} h={13} />
          <Skeleton height={64} />
          <Skeleton height={64} />
          <Skeleton height={38} />
          <div className="space-y-2 pt-1">
            <SkeletonLine w="70%" h={10} />
            <SkeletonLine w="62%" h={10} />
            <SkeletonLine w="66%" h={10} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 lg:grid-cols-[1.4fr_1fr] items-start ${className}`.trim()}>
      {/* Left — style guide packs */}
      <Card
        variant="flush"
        title="Style guide packs"
        hint={`${guides.length} packs`}
        actions={<Button compact onClick={() => setCustom(true)}>Custom guide</Button>}
      >
        <ResultCount from={1} to={guides.length} total={guides.length} noun="packs" className="border-t" />
        {/* A workspace can install dozens of packs; the list scrolls in a
            bounded box with a visible bar rather than running the card off
            the fold (CONVENTIONS §20). */}
        <Scrollable axis="y" className="max-h-[560px]" scrollerClassName="flex flex-col gap-2.5 px-4 pb-4 pt-3">
          {custom && (
            <div className="flex items-start gap-2.5 rounded-[4px] border border-clay/35 bg-clay/[0.06] px-3 py-2.5 text-[12.5px] text-ink/80">
              <span className="flex-1">
                <b className="text-ink">Untitled custom guide</b>: draft created from Plain language. Custom packs are a
                visual placeholder; nothing persists yet.
              </span>
              <button type="button" aria-label="Dismiss" onClick={() => setCustom(false)} className="shrink-0 text-ink/65 hover:text-ink">
                <X size={14} />
              </button>
            </div>
          )}

          {guides.map((g) => {
            const on = active === g.id;
            const open = expanded === g.id;
            return (
              <div key={g.id} className={`rounded-[5px] border px-3.5 py-3 ${on ? "border-biscay-2/50 bg-biscay-2/[0.04]" : "border-ink/12"}`}>
                <div className="flex items-start gap-3">
                  <IconRing tone={g.tone}><Feather size={15} /></IconRing>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <Truncate className="text-[14px] font-semibold text-ink">{g.name}</Truncate>
                      {on && <Check size={14} className="shrink-0 text-moss" />}
                    </div>
                    <div className="truncate font-term text-[11px] text-ink/65">{on ? "Active · Project default" : "Built in"} · {g.preview.length} rules</div>
                    <Truncate as="p" lines={2} className="mt-1 text-[12.5px] text-ink/70">{g.description}</Truncate>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-2 pl-[43px]">
                  <Button variant="link" onClick={() => setExpanded(open ? null : g.id)}>
                    {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    {open ? "Hide rules" : "View rules"}
                  </Button>
                  {on ? <Badge label="Project default" tone="ok" /> : <Button compact onClick={() => setActive(g.id)}>Set as default</Button>}
                </div>
                {/* The whole rule list, never clipped with an "and N more":
                    a 200-rule pack scrolls inside its own bounded box. */}
                {open && (
                  <Scrollable axis="y" className="mt-2 max-h-[220px]" scrollerClassName="pl-[59px] pr-1">
                    <ul className="flex list-disc flex-col gap-1 marker:text-ink/65">
                      {g.preview.map((r) => (
                        <li key={r} className="break-words text-[12.5px] text-ink/70">{r}</li>
                      ))}
                    </ul>
                  </Scrollable>
                )}
              </div>
            );
          })}
        </Scrollable>
      </Card>

      {/* Right — project layer editor */}
      <Card variant="flush" eyebrow="Project layer" title={`${workspace} voice`}>
        <div className="px-4 pb-4 border-t border-ink/10 pt-3 flex flex-col gap-3.5">
          <div>
            <SectionLabel>Voice and tone</SectionLabel>
            <Textarea short className="mt-1" value={layer.voice} onChange={(e) => setField("voice", e.target.value)} />
          </div>
          <div>
            <SectionLabel>Preferred terms</SectionLabel>
            <div className="mb-1 font-term text-[11px] text-ink/65">One mapping per line</div>
            <Textarea short className="font-term text-[12px]" value={layer.terms} onChange={(e) => setField("terms", e.target.value)} />
          </div>
          <div>
            <SectionLabel>Zero-tolerance phrases</SectionLabel>
            <Input className="mt-1 w-full" value={layer.banned} onChange={(e) => setField("banned", e.target.value)} />
          </div>

          <div className="flex flex-col gap-2 pt-0.5">
            <Checkbox checked={layer.inclusive} onCheckedChange={(v) => setField("inclusive", v)} label="Enforce inclusive language" />
            <Checkbox checked={layer.jargon} onCheckedChange={(v) => setField("jargon", v)} label="Flag unexplained jargon" />
            <Checkbox checked={layer.sentenceCase} onCheckedChange={(v) => setField("sentenceCase", v)} label="Sentence-case headings" />
          </div>

          {/* Primary action bottom LEFT; the confirmation keeps a reserved
              slot so saving never shifts the button (CONVENTIONS §2). */}
          <div className="flex items-center gap-3 border-t border-ink/10 pt-3">
            <Button variant="primary" compact onClick={save}>Save</Button>
            <span className="w-[3.5rem] font-term text-[11.5px] text-moss">{saved ? "Saved" : ""}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default LibraryGuidesPanel;
