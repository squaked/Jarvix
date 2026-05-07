"use client";

import { getChats } from "@/lib/storage";
import type { Chat } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RecentConversations() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await getChats();
      setChats(all.slice(0, 6));
    } catch {
      setChats([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return (
    <div className="w-full animate-fade-up stagger-6 pb-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 px-1">
        Recent
      </p>

      {!loaded ? (
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-14 w-44 rounded-2xl flex-shrink-0" />
          ))}
        </div>
      ) : chats.length === 0 ? (
        <p className="text-sm text-muted text-center py-6 px-4 rounded-2xl border border-dashed border-border bg-surface-2/50">
          No conversations yet — type above or pick a suggestion to start.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {chats.map((chat) => (
            <Link
              key={chat.id}
              href={`/chat/${chat.id}`}
              className={cn(
                "flex-shrink-0 w-48 rounded-2xl border border-border bg-surface px-4 py-3 transition-all",
                "hover:border-accent/40 hover:bg-surface-2",
              )}
              style={{ boxShadow: "var(--card-shadow)" }}
            >
              <p className="text-sm font-medium text-text truncate leading-snug">
                {chat.title || "Conversation"}
              </p>
              <p className="text-xs text-muted mt-1">
                {relativeDate(chat.updatedAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
