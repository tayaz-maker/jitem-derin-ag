import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-(--motion-quick) ease-(--ease-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/70 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-olive text-olive-fg hover:bg-paper",
        secondary:
          "bg-elevated text-fg border border-border hover:border-olive/50 hover:text-paper",
        ghost: "bg-transparent text-muted hover:text-fg hover:bg-elevated",
        stamp:
          "bg-stamp/90 text-paper hover:bg-stamp",
        outline:
          "border border-border bg-transparent text-fg hover:border-paper/50 hover:bg-elevated",
      },
      size: {
        default: "h-11 px-4 text-sm rounded-sm",
        sm: "h-9 px-3 text-xs rounded-sm",
        lg: "h-12 px-5 text-sm rounded-md",
        icon: "size-11 rounded-sm",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
