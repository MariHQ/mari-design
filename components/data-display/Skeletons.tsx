import type { ReactNode } from "react";
import {
  Skeleton, SkeletonLine, SkeletonText, SkeletonCircle, SkeletonChip, SkeletonButton,
  SkeletonCard, SkeletonStat, SkeletonList, SkeletonRows, SkeletonRegion,
} from "./Skeleton";
import { SortHeader } from "./sortable";
import { PageHeader } from "../layout/PageHeader";
import { PAGE_CONTAINER, SPLIT, DASH3 } from "../tokens/pagegrid";

/* Full-page loading skeletons that mirror each page archetype's real layout,
   so the loading state reads as "the page, arriving" rather than a spinner.

   TWO THINGS THIS FILE GETS RIGHT THAT IT USED TO GET WRONG.

   1. It shows what it knows. A page's eyebrow, title, description, tab strip,
      section headings and column headers are literals in the page file — the
      app holds all of them at first paint. Drawing them as grey rectangles
      threw away information the reader could already be reading, made all 23
      loading screens identical and unplaceable, and relaid the page out when
      real words swapped in at a different width. So the caller passes the
      strings it has, and only the VALUES the response owes (counts, names,
      dates, rows, chart series) are bars. A page whose title comes from the
      response (a document's name in Doc Review) passes none and gets a bar —
      inventing a title would be worse than a grey box.

   2. It occupies the loaded page's geometry (DD-39). This used to be
      `max-w-6xl` with its own `sm:grid-cols-2` / `lg:grid-cols-[1fr_320px]`
      stacking while §11 mandates `max-w-[1400px]` and §10 forbids that
      stacking, so every page loaded at one width and settled at another. It
      now sits in PAGE_CONTAINER and uses the same SPLIT / DASH3 recipes the
      pages themselves use — one source of truth, in tokens/pagegrid.ts.

   Pages pick a `variant` matching their content. */

export type SkeletonPageVariant =
  | "dashboard" | "list" | "table" | "detail" | "editor"
  | "graph" | "form" | "board" | "gallery" | "settings" | "feed" | "auth";

export type SkeletonPageProps = {
  variant?: SkeletonPageVariant;
  /** Real header copy, exactly as the loaded page's `<PageHeader>` spells it.
      Omit any part that is derived from the response. */
  eyebrow?: string;
  title?: string;
  description?: string;
  icon?: ReactNode;
  /** What to announce as loading, when the page's own title is data and so
      cannot be shown ("Doc Review", "sign in"). Defaults to `title`. */
  label?: string;
  /** Real tab labels and which one is on. */
  tabs?: string[];
  activeTab?: string;
  /** Real headings of the main column's sections, in order. */
  sections?: string[];
  /** Real headings of the supporting rail's sections, in order. */
  rail?: string[];
  /** Real column headers for the table variants. */
  columns?: string[];
  /** Real stat-tile captions for a dashboard's stat row. */
  stats?: string[];
  /** Real field labels for a form / auth card. */
  fields?: string[];
  /** How many action buttons the loaded header draws. A button's label is a
      control, not information the reader is waiting for, and a live-looking
      button that cannot be pressed is worse than a bar — so these stay bars,
      sized and counted to match. */
  actions?: number;
  /** Page-level mobile (§10/§11): the page owns the collapse, not the
      components. Rails drop below the main column. */
  mobile?: boolean;
  className?: string;
};

/* The header when the page's own title is data (Doc Review, a Publish site):
   bars, at PageHeader's heights, so nothing is claimed and nothing jumps. */
function HeadBars({ actions = 2 }: { actions?: number }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-3">
      <div className="min-w-[15rem] flex-1 space-y-2.5">
        <Skeleton width="min(230px, 70%)" height={22} />
        <SkeletonLine w="min(340px, 95%)" h={13} />
      </div>
      {actions > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: actions }).map((_, i) => <SkeletonButton key={i} w={i === 0 ? 110 : 84} />)}
        </div>
      )}
    </header>
  );
}

function Head({ eyebrow, title, description, icon, actions = 2 }: SkeletonPageProps) {
  if (!title) return <HeadBars actions={actions} />;
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      icon={icon}
      actions={actions > 0 ? (
        <>{Array.from({ length: actions }).map((_, i) => <SkeletonButton key={i} w={i === 0 ? 110 : 84} />)}</>
      ) : undefined}
    />
  );
}

/* The tab strip, real. Underline `Tabs` geometry (13px medium, gap-5,
   border-b-2, pb-2) so the row does not move when the page becomes
   interactive. Rendered as text rather than buttons: a tab that cannot switch
   yet is a label, and a button that ignores the click is a lie (§2). */
function TabStrip({ tabs, active }: { tabs?: string[]; active?: string }) {
  if (!tabs?.length) return null;
  const on = active ?? tabs[0];
  return (
    <div className="flex max-w-full items-center gap-5 overflow-hidden border-b border-ink/15">
      {tabs.map((t) => (
        <span
          key={t}
          className={`inline-flex shrink-0 items-center whitespace-nowrap border-b-2 pb-2 text-[13px] font-medium ${
            t === on ? "border-biscay-2 text-ink" : "border-transparent text-ink/70"
          }`}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

/** A card standing in for one titled section. Real heading, skeleton body. */
function Section({ title, lines = 4, media = false, footer = false }: { title?: string; lines?: number; media?: boolean; footer?: boolean }) {
  return <SkeletonCard title={title} lines={lines} media={media} footer={footer} className="min-w-0" />;
}

function Sections({ titles, count = 2, lines = 4 }: { titles?: string[]; count?: number; lines?: number }) {
  const list = titles?.length ? titles : Array.from({ length: count }, () => undefined);
  return <>{list.map((t, i) => <Section key={t ?? i} title={t} lines={lines} />)}</>;
}

/** A table with its real column headers and skeleton cells. */
function TableBlock({ columns, cols = 5, rows = 8 }: { columns?: string[]; cols?: number; rows?: number }) {
  const heads = columns?.length ? columns : Array.from({ length: cols }, () => null);
  return (
    <div className="overflow-hidden rounded-md border border-ink/12 bg-paper">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {heads.map((label, i) => (
              <SortHeader key={i} label={label ?? <SkeletonLine w={70} h={9} />} sortable={false} />
            ))}
          </tr>
        </thead>
        <tbody><SkeletonRows rows={rows} cols={heads.length} /></tbody>
      </table>
    </div>
  );
}

/** Search + facets + action: the toolbar chrome above a table or list (§13). */
function Toolbar() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Skeleton width={240} height={32} rounded="rounded-[4px]" />
      <SkeletonChip w={90} /><SkeletonChip w={90} />
      <span className="ml-auto"><SkeletonButton w={96} /></span>
    </div>
  );
}

/** Labelled form fields. The labels are the form's own copy, so they render;
    only the inputs' contents are unknown. */
function Fields({ fields, count = 5 }: { fields?: string[]; count?: number }) {
  const list = fields?.length ? fields : Array.from({ length: count }, () => undefined);
  return (
    <>
      {list.map((label, i) => (
        <div key={label ?? i} className="space-y-1.5">
          {label != null
            ? <span className="block text-[12.5px] font-medium text-ink/70">{label}</span>
            : <SkeletonLine w={120} h={12} />}
          <Skeleton height={38} rounded="rounded-[4px]" />
        </div>
      ))}
    </>
  );
}

export function SkeletonPage(props: SkeletonPageProps) {
  const {
    variant = "dashboard", tabs, activeTab, sections, rail, columns, stats, fields,
    title, label, mobile = false, className = "",
  } = props;

  /* Auth shells own the whole viewport rather than the console grid: no
     sidebar, no page container. Login/Setup/Welcome know their own headline
     and field labels, so the card is legible before the session resolves. */
  if (variant === "auth") {
    return (
      <SkeletonRegion
        label={label ?? title ?? "sign in"}
        className={`grid min-h-[600px] place-items-center px-6 ${className}`.trim()}
      >
        <div className="w-full max-w-sm rounded-xl border border-ink/12 bg-paper p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <SkeletonCircle size={44} />
            {title
              ? <h1 className="text-[20px] font-bold leading-tight tracking-[-0.015em] text-ink">{title}</h1>
              : <SkeletonLine w={160} h={20} />}
            {props.description
              ? <p className="text-[13px] text-ink/70">{props.description}</p>
              : <SkeletonLine w={220} h={13} />}
          </div>
          <div className="space-y-4">
            <Fields fields={fields} count={2} />
            <Skeleton height={38} rounded="rounded-[4px]" className="mt-2" />
          </div>
        </div>
      </SkeletonRegion>
    );
  }

  const railCol = mobile ? "min-w-0" : "min-w-0";

  const inner = (() => {
    switch (variant) {
      case "dashboard":
        /* Overview / Insights: a stat row over a three-up widget grid (§11
           dashboard grid), not the old two-column `lg:grid-cols-2` stack. */
        return (
          <>
            <Head {...props} />
            <div className="mt-6 flex flex-col gap-5">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                {(stats?.length ? stats : [undefined, undefined, undefined, undefined]).map((s, i) => (
                  <SkeletonStat key={s ?? i} label={s} />
                ))}
              </div>
              <div className={mobile ? "flex flex-col gap-5" : DASH3}>
                <Sections titles={sections} count={3} lines={5} />
              </div>
            </div>
          </>
        );

      case "list":
        /* Answers / Audit / Flows / Library: filter chips, then rows. The
           chips' labels are per-workspace data (source names, statuses), so
           they stay bars; the heading above them does not. */
        return (
          <>
            <Head {...props} />
            <div className="mt-6 flex flex-col gap-5">
              <TabStrip tabs={tabs} active={activeTab} />
              <div className="flex flex-wrap gap-2">
                <SkeletonChip w={72} /><SkeletonChip w={64} /><SkeletonChip w={88} />
              </div>
              <SkeletonList rows={7} />
            </div>
          </>
        );

      case "feed":
        return (
          <>
            <Head {...props} />
            <div className="mt-6 flex flex-col gap-5">
              <TabStrip tabs={tabs} active={activeTab} />
              <SkeletonList rows={8} />
            </div>
          </>
        );

      case "table":
        return (
          <>
            <Head {...props} />
            <div className="mt-6 flex flex-col gap-5">
              <TabStrip tabs={tabs} active={activeTab} />
              <Toolbar />
              <TableBlock columns={columns} />
            </div>
          </>
        );

      case "detail":
        /* Knowledge: main column plus the 360px inspector rail (§11). */
        return (
          <>
            <Head {...props} />
            <div className={mobile ? "mt-6 flex flex-col gap-5" : `mt-6 ${SPLIT[360]}`}>
              <div className="flex min-w-0 flex-col gap-5">
                <Sections titles={sections} count={1} lines={5} />
                <SkeletonList rows={5} />
              </div>
              <div className={`flex flex-col gap-5 ${railCol}`}>
                <Sections titles={rail} count={2} lines={5} />
              </div>
            </div>
          </>
        );

      case "editor":
        /* Doc Review / Publish: outline rail, document, findings rail. The
           document's own title is data, so the header is bars unless the
           caller passed a static one. */
        return (
          <>
            <Head {...props} />
            <div className="mt-6 flex flex-col gap-5">
              <TabStrip tabs={tabs} active={activeTab} />
              <div className={mobile ? "flex flex-col gap-5" : "grid grid-cols-1 gap-5 xl:grid-cols-[220px_minmax(0,1fr)_320px]"}>
                <div className="flex min-w-0 flex-col gap-5">
                  <Section title={sections?.[0]} lines={6} />
                </div>
                <div className="min-w-0 rounded-md border border-ink/12 bg-paper p-6">
                  <SkeletonLine w="55%" h={20} />
                  <SkeletonText lines={5} className="mt-4" />
                  <SkeletonText lines={4} className="mt-4" />
                  <SkeletonText lines={6} className="mt-4" />
                </div>
                <div className={`flex flex-col gap-5 ${railCol}`}>
                  <Sections titles={rail} count={2} lines={4} />
                </div>
              </div>
            </div>
          </>
        );

      case "graph":
        /* Lineage: toolbar, canvas, time scrubber. The canvas is the one place
           a full grey block is honest — every pixel of it is the response. */
        return (
          <>
            <Head {...props} />
            <div className="mt-6 flex flex-col gap-5">
              <Toolbar />
              <Skeleton height={440} className="rounded-md" />
              <Skeleton height={54} className="rounded-md" />
            </div>
          </>
        );

      case "form":
      case "settings":
        /* Settings pages: header, the real Settings tab row, then a form
           column beside a summary rail (§11, 320px). */
        return (
          <>
            <Head {...props} />
            <div className="mt-5"><TabStrip tabs={tabs} active={activeTab} /></div>
            <div className={mobile ? "mt-6 flex flex-col gap-5" : `mt-6 ${SPLIT[320]}`}>
              <div className="flex min-w-0 flex-col gap-5">
                <div className="rounded-md border border-ink/12 bg-paper">
                  <div className="px-4 pt-4 pb-3">
                    {sections?.[0] != null
                      ? <h2 className="truncate text-[15px] font-semibold leading-snug text-ink">{sections[0]}</h2>
                      : <SkeletonLine w="38%" h={15} />}
                  </div>
                  <div className="flex flex-col gap-4 px-4 pb-4">
                    <Fields fields={fields} />
                    <div className="flex gap-2 pt-1"><SkeletonButton w={110} /><SkeletonButton w={80} /></div>
                  </div>
                </div>
                {sections && sections.length > 1 && <Sections titles={sections.slice(1)} lines={4} />}
              </div>
              <div className={`flex flex-col gap-5 ${railCol}`}>
                <Sections titles={rail} count={1} lines={4} />
              </div>
            </div>
          </>
        );

      case "board":
        /* Tasks: the column names ARE the workflow ("Inbox", "In progress",
           "Done") and never come from the response. They render. */
        return (
          <>
            <Head {...props} />
            <div className={mobile ? "mt-6 flex flex-col gap-5" : `mt-6 ${DASH3}`}>
              {(sections?.length ? sections : [undefined, undefined, undefined]).map((s, i) => (
                <div key={s ?? i} className="flex min-w-0 flex-col gap-3">
                  {s != null
                    ? <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink/70">{s}</h2>
                    : <SkeletonLine w="40%" h={13} />}
                  <SkeletonCard lines={2} /><SkeletonCard lines={3} /><SkeletonCard lines={2} />
                </div>
              ))}
            </div>
          </>
        );

      case "gallery":
        /* Sources / Lookbook: a wrapping card gallery that runs edge to edge
           (§11), not a fixed three-column grid with a dead bottom-right. */
        return (
          <>
            <Head {...props} />
            <div className="mt-6 flex flex-col gap-5">
              <TabStrip tabs={tabs} active={activeTab} />
              <div className="flex flex-wrap gap-5">
                {(sections?.length ? sections : Array.from({ length: 6 }, () => undefined)).map((s, i) => (
                  <div key={s ?? i} className="min-w-[260px] flex-1 basis-[300px]">
                    <Section title={s} lines={2} media />
                  </div>
                ))}
              </div>
            </div>
          </>
        );
    }
  })();

  return (
    <SkeletonRegion label={label ?? title ?? "page"} className={`${PAGE_CONTAINER} ${className}`.trim()}>
      {inner}
    </SkeletonRegion>
  );
}
