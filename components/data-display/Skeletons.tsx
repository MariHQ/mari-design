import {
  Skeleton, SkeletonLine, SkeletonText, SkeletonCircle, SkeletonChip, SkeletonButton,
  SkeletonCard, SkeletonStat, SkeletonList, SkeletonTable,
} from "./Skeleton";

/* Full-page loading skeletons that mirror each page archetype's real layout,
   so the loading state reads as "the page, arriving" rather than a spinner.
   Pages pick a `variant` matching their content. */

export type SkeletonPageVariant =
  | "dashboard" | "list" | "table" | "detail" | "editor"
  | "graph" | "form" | "board" | "gallery" | "settings" | "feed" | "auth";

function PageHead({ actions = 2 }: { actions?: number }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="space-y-2.5">
        <Skeleton width={230} height={22} />
        <SkeletonLine w={340} h={11} />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }).map((_, i) => <SkeletonButton key={i} w={i === 0 ? 110 : 84} />)}
      </div>
    </div>
  );
}

function TabsRow({ n = 4 }: { n?: number }) {
  return (
    <div className="mb-5 flex gap-5 border-b border-ink/10 pb-2.5">
      {Array.from({ length: n }).map((_, i) => <SkeletonLine key={i} w={70 + (i % 3) * 18} h={11} />)}
    </div>
  );
}

function Grid({ children, cols = "sm:grid-cols-2 lg:grid-cols-3" }: { children: React.ReactNode; cols?: string }) {
  return <div className={`grid grid-cols-1 gap-4 ${cols}`}>{children}</div>;
}

export function SkeletonPage({ variant = "dashboard", className = "" }: { variant?: SkeletonPageVariant; className?: string }) {
  if (variant === "auth") {
    return (
      <div className={`grid min-h-[600px] place-items-center px-6 ${className}`.trim()} aria-hidden="true">
        <div className="w-full max-w-sm rounded-xl border border-ink/12 bg-paper p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-3">
            <SkeletonCircle size={44} />
            <SkeletonLine w={160} h={16} />
            <SkeletonLine w={220} h={10} />
          </div>
          <div className="space-y-4">
            <Skeleton height={40} /><Skeleton height={40} /><Skeleton height={42} className="mt-2" />
          </div>
        </div>
      </div>
    );
  }

  const inner = (() => {
    switch (variant) {
      case "dashboard":
        return (
          <>
            <div className="mb-6 flex items-center gap-3">
              <SkeletonCircle size={30} />
              <Skeleton width={260} height={24} />
            </div>
            <Grid cols="sm:grid-cols-3" >
              <SkeletonStat /><SkeletonStat /><SkeletonStat />
            </Grid>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-4"><SkeletonCard lines={4} footer /><SkeletonCard lines={3} /></div>
              <div className="space-y-4"><SkeletonCard lines={2} media /><SkeletonCard lines={4} /></div>
            </div>
          </>
        );
      case "list":
        return (<><PageHead /><div className="mb-4 flex gap-2"><SkeletonChip w={72} /><SkeletonChip w={64} /><SkeletonChip w={88} /></div><SkeletonList rows={7} /></>);
      case "feed":
        return (<><PageHead /><SkeletonList rows={8} /></>);
      case "table":
        return (
          <>
            <PageHead />
            <div className="mb-3 flex items-center gap-2">
              <Skeleton width={240} height={34} rounded="rounded-[4px]" />
              <SkeletonChip w={90} /><SkeletonChip w={90} />
              <span className="ml-auto"><SkeletonButton w={96} /></span>
            </div>
            <SkeletonTable rows={8} cols={5} />
          </>
        );
      case "detail":
        return (
          <>
            <PageHead />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4"><SkeletonCard lines={5} /><SkeletonList rows={4} /></div>
              <div className="space-y-4"><SkeletonCard lines={6} /><SkeletonCard lines={3} footer /></div>
            </div>
          </>
        );
      case "editor":
        return (
          <>
            <div className="mb-4 flex items-center gap-2 border-b border-ink/10 pb-3">
              <SkeletonChip w={80} /><SkeletonChip w={64} /><SkeletonChip w={64} />
              <span className="ml-auto"><SkeletonButton w={96} /></span>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_260px]">
              <div className="space-y-2"><SkeletonLine w="80%" /><SkeletonLine w="60%" /><SkeletonLine w="70%" /><SkeletonLine w="50%" /></div>
              <div className="space-y-3 rounded-md border border-ink/12 bg-paper p-6">
                <Skeleton width="55%" height={20} />
                <SkeletonText lines={5} /><SkeletonText lines={4} /><SkeletonText lines={6} />
              </div>
              <div className="space-y-3"><SkeletonCard lines={3} /><SkeletonCard lines={2} /></div>
            </div>
          </>
        );
      case "graph":
        return (
          <>
            <div className="mb-3 flex items-center gap-2">
              <Skeleton width={220} height={34} rounded="rounded-[4px]" />
              <SkeletonChip w={80} /><SkeletonChip w={80} />
              <span className="ml-auto"><SkeletonButton w={90} /></span>
            </div>
            <Skeleton height={440} className="rounded-md" />
            <div className="mt-3"><Skeleton height={54} className="rounded-md" /></div>
          </>
        );
      case "form":
      case "settings":
        return (
          <>
            {variant === "settings" && <TabsRow n={6} />}
            <PageHead actions={1} />
            <div className="max-w-2xl space-y-5 rounded-md border border-ink/12 bg-paper p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2"><SkeletonLine w={120} h={10} /><Skeleton height={38} /></div>
              ))}
              <div className="flex gap-2 pt-1"><SkeletonButton w={110} /><SkeletonButton w={80} /></div>
            </div>
          </>
        );
      case "board":
        return (
          <>
            <PageHead />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((c) => (
                <div key={c} className="space-y-3">
                  <SkeletonLine w="40%" h={11} />
                  <SkeletonCard lines={2} /><SkeletonCard lines={3} /><SkeletonCard lines={2} />
                </div>
              ))}
            </div>
          </>
        );
      case "gallery":
        return (
          <>
            <PageHead />
            <Grid><SkeletonCard lines={2} media /><SkeletonCard lines={2} media /><SkeletonCard lines={2} media /><SkeletonCard lines={2} media /><SkeletonCard lines={2} media /><SkeletonCard lines={2} media /></Grid>
          </>
        );
    }
  })();

  return <div className={`mx-auto max-w-6xl px-5 py-6 sm:px-8 ${className}`.trim()} aria-hidden="true">{inner}</div>;
}
