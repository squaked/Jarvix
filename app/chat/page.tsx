"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** `/chat` without an id — home is the hub for new conversations. */
export default function ChatHubRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-sm text-muted">
      <p>Redirecting…</p>
      <Link href="/" className="text-accent text-sm font-medium hover:underline">
        Go to home
      </Link>
    </div>
  );
}
