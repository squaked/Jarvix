import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "text-white hover:opacity-90",
        variant === "secondary" &&
          "border border-border bg-surface text-text hover:bg-surface-2 hover:border-accent/30",
        variant === "ghost" && "text-text hover:bg-surface-2",
        variant === "danger" &&
          "bg-red-600/90 text-white hover:bg-red-600",
        className,
      )}
      style={
        variant === "primary"
          ? { background: "var(--accent)", boxShadow: "0 2px 12px var(--accent-glow)" }
          : undefined
      }
      {...props}
    />
  );
}
