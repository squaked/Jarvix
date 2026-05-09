"use client";

import { deleteChat, getChats } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChatHistory } from "./ChatHistory";
import type { Chat } from "@/lib/types";

type Props = {
  chats: Chat[];
  onChatsChange: () => void | Promise<void>;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

export function Sidebar({
  chats,
  onChatsChange,
  mobileOpen,
  onMobileOpenChange,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const currentId =
    pathname?.startsWith("/chat/") ? pathname.split("/")[2] : undefined;

  const handleDelete = async (id: string) => {
    await deleteChat(id);
    void onChatsChange();
    if (id === currentId) {
      const rest = await getChats();
      const next = rest[0];
      if (next) router.push(`/chat/${next.id}`);
      else {
        router.push("/");
      }
    }
  };

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-border">
        <span className="font-display text-base font-medium text-text" style={{ fontVariationSettings: '"opsz" 18' }}>
          History
        </span>
        <button
          type="button"
          onClick={() => onMobileOpenChange(false)}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:text-text hover:bg-surface-2 transition-colors"
          aria-label="Close"
        >
          <CloseIcon />
        </button>
      </div>

      {/* New conversation & Search */}
      <div className="px-4 pt-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            onMobileOpenChange(false);
            router.push("/");
          }}
          className={cn(
            "w-full flex items-center gap-2 rounded-xl border border-border bg-surface-2",
            "px-4 py-2.5 text-sm font-medium text-text transition-all",
            "hover:border-accent/40 hover:bg-surface",
          )}
          style={{ boxShadow: "var(--warm-shadow)" }}
        >
          <PlusIcon />
          New conversation
        </button>
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm text-text placeholder:text-muted outline-none focus:border-accent/50"
          />
        </div>
      </div>

      {/* History list */}
      <div className="flex flex-1 flex-col overflow-y-auto scrollbar-none px-4 py-4">
        <ChatHistory chats={filteredChats} onDeleteChat={handleDelete} />
      </div>
    </>
  );

  return (
    <AnimatePresence>
      {mobileOpen ? (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
            aria-hidden
            onClick={() => onMobileOpenChange(false)}
          />
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-surface border-l border-border"
            style={{ boxShadow: "-4px 0 32px rgba(0,0,0,0.3)" }}
          >
            {sidebarContent}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
