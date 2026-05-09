"use client";

import { Card } from "@/components/ui/Card";

export function AboutCard() {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl overflow-hidden shadow-soft border border-border/50">
          <img src="/icon.png" alt="Jarvix Icon" className="w-full h-full object-cover" />
        </div>
        <div>
          <h2
            className="font-display text-lg font-medium text-text"
            style={{ fontVariationSettings: '"opsz" 20' }}
          >
            Jarvix 1.0
          </h2>
          <p className="text-xs text-muted">A personal AI for Mac.</p>
        </div>
      </div>
      <div className="pt-2 flex flex-col gap-3">
        <button
          onClick={() => fetch("/api/reveal-app", { method: "POST" })}
          className="self-start text-xs font-medium text-accent hover:text-accent/80 transition-colors flex items-center gap-1.5"
        >
          <FinderIcon />
          Reveal in Finder
        </button>
        <p className="text-[10px] text-muted/60 uppercase tracking-tight">MIT License</p>
      </div>
    </Card>
  );
}

function FinderIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}
