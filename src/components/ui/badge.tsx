import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider uppercase",
  {
    variants: {
      tone: {
        belgeli: "border-paper/40 text-paper bg-paper/10",
        guc: "border-olive/50 text-olive bg-olive/10",
        tart: "border-warn/50 text-warn bg-warn/10",
        bos: "border-border text-subtle bg-transparent",
        mute: "border-border text-muted bg-elevated",
        stamp: "border-stamp/50 text-stamp bg-stamp/10",
      },
    },
    defaultVariants: { tone: "mute" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
