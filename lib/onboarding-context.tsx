import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type OnboardingData = {
  goal: string;
  subjects: string[];
  minutesPerDay: number;
  studyDays: string[];
  completed: boolean;
};

const STORAGE_KEY = "edicurve-onboarding-v1";
const DEFAULT_DATA: OnboardingData = { goal: "", subjects: [], minutesPerDay: 30, studyDays: ["Mon", "Wed", "Fri"], completed: false };

type OnboardingContextValue = {
  data: OnboardingData;
  loading: boolean;
  save: (next: Omit<OnboardingData, "completed">) => Promise<void>;
  reset: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value) setData({ ...DEFAULT_DATA, ...JSON.parse(value) });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    data,
    loading,
    save: async (next: Omit<OnboardingData, "completed">) => {
      const saved = { ...next, completed: true };
      setData(saved);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    },
    reset: async () => {
      setData(DEFAULT_DATA);
      await AsyncStorage.removeItem(STORAGE_KEY);
    },
  }), [data, loading]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return value;
}
