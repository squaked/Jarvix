"use client";

import { hasAnyApiKey } from "@/lib/settings-credentials";
import { useJarvixSettings } from "@/lib/settings";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RequireApiKey({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { settings, bootstrapped, serverReady } = useJarvixSettings();

  const hasKey = hasAnyApiKey(settings);

  useEffect(() => {
    if (!bootstrapped) return;
    if (hasKey) return;
    if (!serverReady) return;
    router.replace("/onboarding");
  }, [bootstrapped, serverReady, hasKey, router]);

  if (!bootstrapped || (!hasKey && !serverReady)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (!hasKey && serverReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-muted">
        Opening setup…
      </div>
    );
  }

  return <>{children}</>;
}
