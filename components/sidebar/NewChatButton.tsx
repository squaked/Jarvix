"use client";

import { useRouter } from "next/navigation";

export function NewChatButton({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        onCreated?.();
        router.push("/");
      }}
      className="w-full bg-surface-2 rounded-2xl border border-border p-3 text-left font-medium text-text shadow-sm transition-all hover:bg-surface hover:shadow-soft flex items-center gap-3 group"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-white shadow-sm transition-transform group-hover:scale-105">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
      <span>New Chat</span>
    </button>
  );
}
