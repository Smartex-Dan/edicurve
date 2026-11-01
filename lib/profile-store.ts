import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

const KEY = "edicurve-profile-v1";

export const DAILY_TARGETS = [10, 20, 30, 50];

export type LocalProfile = {
  name: string;
  dailyTarget: number;
  createdAt: number;
};

const DEFAULT_PROFILE: LocalProfile = { name: "", dailyTarget: 20, createdAt: 0 };

async function readProfile(): Promise<LocalProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const profile: LocalProfile = {
      ...DEFAULT_PROFILE,
      ...(raw ? JSON.parse(raw) : {}),
    };
    if (!profile.createdAt) {
      profile.createdAt = Date.now();
      await AsyncStorage.setItem(KEY, JSON.stringify(profile));
    }
    return profile;
  } catch {
    return { ...DEFAULT_PROFILE, createdAt: Date.now() };
  }
}

export function useLocalProfile() {
  const [profile, setProfile] = useState<LocalProfile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      readProfile().then((loadedProfile) => {
        if (!active) return;
        setProfile(loadedProfile);
        setLoaded(true);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const update = useCallback(async (patch: Partial<LocalProfile>) => {
    const current = await readProfile();
    const next: LocalProfile = { ...current, ...patch };
    if (typeof next.name === "string") next.name = next.name.trim().slice(0, 30);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    setProfile(next);
  }, []);

  return { profile, loaded, update };
}