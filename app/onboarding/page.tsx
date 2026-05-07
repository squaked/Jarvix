"use client";

import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { hasAnyApiKey } from "@/lib/settings-credentials";
import { useJarvixSettings } from "@/lib/settings";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const { settings, bootstrapped } = useJarvixSettings();

  useEffect(() => {
    if (!bootstrapped) return;
    if (hasAnyApiKey(settings)) {
      router.replace("/chat");
    }
  }, [bootstrapped, settings, router]);

  return (
    <div className="min-h-screen bg-bg py-16">
      <OnboardingFlow />
    </div>
  );
}
