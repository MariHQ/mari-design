import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button, type ButtonProps } from "./Button";

/* CopyButton — copies `value` to the clipboard and flips to a "Copied" check
   for ~1.4s. Wraps Button, so all its variants/sizes apply. Icon-only by
   default; pass a `label` for a labeled button. Composes with CodeBlock and
   TokenReveal. */

export type CopyButtonProps = Omit<ButtonProps, "onClick" | "children"> & {
  value: string;
  /** Text label; omit for an icon-only button. */
  label?: string;
  copiedLabel?: string;
  onCopy?: (value: string) => void;
};

export function CopyButton({
  value, label, copiedLabel = "Copied", icon, compact, variant = "default", onCopy, ...rest
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(value);
    } catch {
      /* clipboard blocked — still flip UI so the action feels responsive */
    }
    onCopy?.(value);
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1400);
  };

  const iconOnly = icon ?? label === undefined;
  /* A labelled copy button ("Copy install") sits in a row with ordinary
     buttons, so it takes the ordinary h-9 height. Only the icon-only form
     stays compact, where it tucks into code blocks and dense rows. */
  const isCompact = compact ?? iconOnly;

  return (
    <Button
      {...rest}
      variant={variant}
      compact={isCompact}
      icon={iconOnly}
      onClick={copy}
      aria-label={iconOnly ? (copied ? copiedLabel : "Copy") : undefined}
    >
      {copied ? <Check size={14} className="text-moss" /> : <Copy size={14} />}
      {!iconOnly && (copied ? copiedLabel : label)}
    </Button>
  );
}
