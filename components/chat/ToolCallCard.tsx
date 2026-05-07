"use client";

import { motion, AnimatePresence } from "framer-motion";

export type ToolCallCardProps = {
  tool: string;
  status: "running" | "done";
  result?: unknown;
};

function labelForTool(tool: string): string {
  const t = tool.toLowerCase();
  if (t === "fetch_web_page") return "Reading a web page";
  if (t.includes("web_search") || t.includes("search")) return "Searching the web";
  if (t.includes("calendar_create")) return "Adding to calendar";
  if (t.includes("calendar")) return "Checking your calendar";
  if (t.includes("weather")) return "Checking the weather";
  if (t.includes("file") || t.includes("spotlight")) return "Searching your files";
  if (t.includes("remember") || t.includes("memory")) return "Saving a note";
  if (t.includes("screenshot")) return "Taking a screenshot";
  return "Working on it";
}

export function ToolCallCard({ tool, status }: ToolCallCardProps) {
  const label = labelForTool(tool);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${tool}-${status}`}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2.5 py-1"
      >
        {status === "running" ? (
          <motion.div
            className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
          />
        ) : (
          <div
            className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center"
            style={{ background: "var(--accent-soft)" }}
          >
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
              <polyline points="1.5 5.5 4 8 8.5 2" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        <span
          className="text-sm italic"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
          {status === "running" ? "…" : ""}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
