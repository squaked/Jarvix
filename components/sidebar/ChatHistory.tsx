"use client";

import type { Chat } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

type Props = {
  chats: Chat[];
  onDeleteChat: (id: string) => void;
};

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function bucket(updatedAtIso: string): "today" | "yesterday" | "week" | "older" {
  const d = new Date(updatedAtIso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(d, now)) return "today";
  if (sameDay(d, yesterday)) return "yesterday";
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);
  if (d >= weekAgo) return "week";
  return "older";
}

const ORDER: Array<{ key: "today" | "yesterday" | "week" | "older"; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This week" },
  { key: "older", label: "Earlier" },
];

export function ChatHistory({ chats, onDeleteChat }: Props) {
  const pathname = usePathname();
  const currentId =
    pathname?.startsWith("/chat/") ? pathname.split("/")[2] : undefined;
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<"today" | "yesterday" | "week" | "older", Chat[]> = {
      today: [], yesterday: [], week: [], older: [],
    };
    const sorted = [...chats].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    for (const c of sorted) g[bucket(c.updatedAt)].push(c);
    return g;
  }, [chats]);

  if (chats.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-8">No conversations yet</p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {ORDER.map(({ key, label }) => {
        const list = grouped[key];
        if (list.length === 0) return null;
        return (
          <section key={key}>
            <h3 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
              {label}
            </h3>
            <ul className="flex flex-col gap-0.5">
              {list.map((c) => {
                const active = c.id === currentId;
                return (
                  <li key={c.id} className="relative group">
                    <Link
                      href={`/chat/${c.id}`}
                      className={cn(
                        "flex items-center rounded-xl px-3 py-2.5 text-sm transition-all",
                        active
                          ? "bg-accent-soft border border-border"
                          : "hover:bg-surface-2 border border-transparent",
                      )}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                          style={{ background: "var(--accent)" }}
                        />
                      )}
                      <span
                        className={cn(
                          "flex-1 truncate leading-snug",
                          active ? "text-text font-medium" : "text-text",
                        )}
                      >
                        {c.title || "Conversation"}
                      </span>
                      <button
                        type="button"
                        aria-label="Delete"
                        className={cn(
                          "ml-2 flex-shrink-0 px-1.5 py-0.5 rounded-lg text-xs text-muted opacity-0 group-hover:opacity-100 transition-all hover:bg-surface",
                          confirmId === c.id && "opacity-100 text-red-500",
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirmId === c.id) {
                            onDeleteChat(c.id);
                            setConfirmId(null);
                          } else {
                            setConfirmId(c.id);
                            window.setTimeout(() => setConfirmId(null), 3000);
                          }
                        }}
                      >
                        {confirmId === c.id ? "Sure?" : "×"}
                      </button>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
