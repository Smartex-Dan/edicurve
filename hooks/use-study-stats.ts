import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import { useOnboarding } from "@/lib/onboarding-context";
import {
  EMPTY_HISTORY,
  StudyHistory,
  computeStudyStats,
  loadStudyHistory,
} from "@/lib/study-stats";

export function useStudyStats() {
  const { data: onboarding } = useOnboarding();
  const [history, setHistory] = useState<StudyHistory | null>(null);

  const reload = useCallback(async () => {
    setHistory(await loadStudyHistory());
  }, []);

  // Reload every time the screen comes into focus so new results show up.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadStudyHistory().then((loaded) => {
        if (active) setHistory(loaded);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const goalDays = onboarding.studyDays?.length ?? 0;
  const stats = useMemo(
    () => computeStudyStats(history ?? EMPTY_HISTORY, goalDays),
    [history, goalDays],
  );

  return {
    stats,
    history: history ?? EMPTY_HISTORY,
    loaded: history !== null,
    reload,
  };
}