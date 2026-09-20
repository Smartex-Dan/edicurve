import { useEffect } from "react";
import { usePathname, useRouter } from "expo-router";
import { useOnboarding } from "@/lib/onboarding-context";

export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { data, loading } = useOnboarding();

  useEffect(() => {
    if (loading) return;
    if (!data.completed && pathname !== "/onboarding") router.replace("/onboarding");
  }, [data.completed, loading, pathname, router]);

  return null;
}
