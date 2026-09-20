import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const ASSIGNMENT_IDS_KEY = "prepify-assignment-notification-ids";
const STUDY_IDS_KEY = "prepify-study-notification-ids";

export type ReminderAssignment = { id: string; title: string; dueAt: string | Date; reminderMinutes: number; reminderEnabled: boolean };
export type ReminderSchedule = { studyDays: string[]; reminderEnabled: boolean; reminderHour: number; reminderMinute: number; minutesPerDay: number };

let configured = false;

export async function configureNotifications() {
  if (configured || Platform.OS === "web") return;
  configured = true;
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("prepify", { name: "Learning reminders", importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 200, 100, 200], lightColor: "#0F6B54" });
}

export async function requestNotificationPermission() {
  if (Platform.OS === "web") return false;
  await configureNotifications();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export async function getPushToken() {
  if (Platform.OS === "web") return null;
  const granted = await requestNotificationPermission();
  if (!granted) return null;
  try {
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    const result = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return result.data;
  } catch (error) {
    console.warn("[Notifications] Push token unavailable:", error);
    return null;
  }
}

async function readIds(key: string) { const raw = await AsyncStorage.getItem(key); return raw ? JSON.parse(raw) as string[] : []; }
async function writeIds(key: string, ids: string[]) { await AsyncStorage.setItem(key, JSON.stringify(ids)); }
async function cancelIds(key: string) { const ids = await readIds(key); await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined))); await writeIds(key, []); }

export async function scheduleAssignmentReminder(task: ReminderAssignment) {
  if (Platform.OS === "web" || !task.reminderEnabled) return;
  await configureNotifications();
  const due = new Date(task.dueAt).getTime() - task.reminderMinutes * 60_000;
  if (due <= Date.now()) return;
  const granted = await requestNotificationPermission();
  if (!granted) return;
  const existing = await readIds(ASSIGNMENT_IDS_KEY);
  const notificationId = await Notifications.scheduleNotificationAsync({ content: { title: "Study reminder", body: `${task.title} is due soon.`, data: { assignmentId: task.id } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(due) } });
  await writeIds(ASSIGNMENT_IDS_KEY, [...existing, notificationId]);
}

export async function rescheduleStudyReminders(schedule: ReminderSchedule) {
  if (Platform.OS === "web") return;
  await configureNotifications();
  await cancelIds(STUDY_IDS_KEY);
  if (!schedule.reminderEnabled || !schedule.studyDays.length || !(await requestNotificationPermission())) return;
  const dayMap: Record<string, number> = { Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6, Sat: 7 };
  const ids: string[] = [];
  for (const day of schedule.studyDays) {
    const notificationId = await Notifications.scheduleNotificationAsync({ content: { title: "Your study time", body: `A focused ${schedule.minutesPerDay}-minute session is ready.`, data: { type: "study-session", day } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: dayMap[day] || 2, hour: schedule.reminderHour, minute: schedule.reminderMinute } });
    ids.push(notificationId);
  }
  await writeIds(STUDY_IDS_KEY, ids);
}

export async function clearLearningReminders() {
  if (Platform.OS === "web") return;
  await cancelIds(ASSIGNMENT_IDS_KEY);
  await cancelIds(STUDY_IDS_KEY);
}
