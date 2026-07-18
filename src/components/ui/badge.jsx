import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary/20 text-primary-light border border-primary/30",
        secondary:
          "bg-secondary/20 text-secondary-light border border-secondary/30",
        success:
          "bg-success/20 text-success border border-success/30",
        warning:
          "bg-warning/20 text-warning border border-warning/30",
        destructive:
          "bg-destructive/20 text-destructive border border-destructive/30",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export const Badge = ({ className, variant, ...props }) => {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
};
