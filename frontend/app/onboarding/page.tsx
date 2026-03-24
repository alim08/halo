"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/api";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <OnboardingWizard />
      </div>
    </main>
  );
}
