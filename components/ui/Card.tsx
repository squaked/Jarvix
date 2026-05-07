import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-border bg-surface p-6", className)}
      style={{ boxShadow: "var(--card-shadow)" } as React.CSSProperties}
      {...props}
    />
  );
}
