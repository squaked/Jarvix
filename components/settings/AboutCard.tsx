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
      <p className="text-sm text-muted leading-relaxed">
        Jarvix was built to be a loyal, capable companion on your Mac. 
        It stays local-first and focuses on giving you control over your tools and data.
      </p>
      <div className="pt-2 flex flex-col gap-1">
         <p className="text-[11px] text-muted">Made with love for friends and family.</p>
         <p className="text-[10px] text-muted/60 uppercase tracking-tight">Open Source • MIT License</p>
      </div>
    </Card>
  );
}
