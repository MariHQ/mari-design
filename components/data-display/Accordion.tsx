import type { ReactNode } from "react";
import * as RA from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { focusRing } from "../tokens/focusRing";
import { Skeleton, SkeletonLine } from "./Skeleton";

export type AccordionItemData = { value: string; title: ReactNode; content: ReactNode };

const ROOT_CLASS = "rounded-md border border-ink/15 bg-paper";
const TRIGGER_CLASS = `group flex w-full items-center justify-between gap-3 px-4 py-3 text-[13px] font-medium text-ink text-left ${focusRing}`;

function Items({ items }: { items: AccordionItemData[] }) {
  return (
    <>
      {items.map((item) => (
        <RA.Item key={item.value} value={item.value} className="border-b border-ink/10 last:border-0">
          <RA.Header>
            <RA.Trigger className={TRIGGER_CLASS}>
              {item.title}
              <ChevronDown size={15} className="text-ink/40 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            </RA.Trigger>
          </RA.Header>
          <RA.Content className="px-4 pb-4 text-[13px] text-ink/70">{item.content}</RA.Content>
        </RA.Item>
      ))}
    </>
  );
}

export type AccordionProps =
  | { type?: "single"; items: AccordionItemData[]; defaultValue?: string; collapsible?: boolean; loading?: boolean }
  | { type: "multiple"; items: AccordionItemData[]; defaultValue?: string[]; loading?: boolean };

/** Disclosure sections — a settings page's grouped panels, an FAQ list. */
export function Accordion(props: AccordionProps) {
  if (props.loading) {
    return (
      <div className={ROOT_CLASS} aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 border-b border-ink/10 px-4 py-3 last:border-0">
            <SkeletonLine w={`${52 - i * 6}%`} h={12} />
            <Skeleton width={15} height={15} rounded="rounded-[3px]" />
          </div>
        ))}
      </div>
    );
  }
  if (props.type === "multiple") {
    return (
      <RA.Root type="multiple" defaultValue={props.defaultValue} className={ROOT_CLASS}>
        <Items items={props.items} />
      </RA.Root>
    );
  }
  return (
    <RA.Root type="single" collapsible={props.collapsible ?? true} defaultValue={props.defaultValue} className={ROOT_CLASS}>
      <Items items={props.items} />
    </RA.Root>
  );
}
