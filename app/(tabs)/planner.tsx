import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { scheduleAssignmentReminder } from "@/lib/notifications";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";

type Task = { id: string; title: string; course: string; dueAt: string; done: boolean; tone: string; reminderEnabled: boolean; reminderMinutes: number };
const seedTasks: Task[] = [
  { id: "1", title: "Dart classes practice", course: "Dart foundations", dueAt: "2026-09-15T18:00:00", done: false, tone: "#F2B84B", reminderEnabled: true, reminderMinutes: 60 },
  { id: "2", title: "Read chapter 4 notes", course: "Computer science", dueAt: "2026-09-16T09:00:00", done: false, tone: "#8A7CF0", reminderEnabled: true, reminderMinutes: 60 },
  { id: "3", title: "Outline essay introduction", course: "Academic writing", dueAt: "2026-09-17T17:00:00", done: true, tone: "#4EA982", reminderEnabled: false, reminderMinutes: 60 },
];

function formatDue(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return date.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }

export default function PlannerScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [showComposer, setShowComposer] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 16));
  const assignments = trpc.assignments.list.useQuery(undefined, { enabled: isAuthenticated });
  const createAssignment = trpc.assignments.create.useMutation({ onSuccess: () => assignments.refetch() });
  const toggleAssignment = trpc.assignments.toggle.useMutation({ onSuccess: () => assignments.refetch() });

  useEffect(() => {
    if (!assignments.data) return;
    setTasks(assignments.data.map((task) => ({ id: String(task.id), title: task.title, course: task.course, dueAt: new Date(task.dueAt).toISOString(), done: task.done, tone: colors.primary, reminderEnabled: task.reminderEnabled, reminderMinutes: task.reminderMinutes })));
  }, [assignments.data, colors.primary]);

  const openTasks = useMemo(() => tasks.filter((task) => !task.done), [tasks]);
  const addTask = async () => {
    if (!newTask.trim()) return;
    const parsedDue = new Date(dueDate.replace(" ", "T"));
    if (Number.isNaN(parsedDue.getTime())) { Alert.alert("Check the due date", "Use the format YYYY-MM-DD HH:mm."); return; }
    const localTask = { id: Date.now().toString(), title: newTask.trim(), course: "Personal task", dueAt: parsedDue.toISOString(), done: false, tone: colors.primary, reminderEnabled: true, reminderMinutes: 60 };
    try {
      if (isAuthenticated) {
        const id = await createAssignment.mutateAsync({ title: localTask.title, course: localTask.course, dueAt: parsedDue.toISOString(), reminderMinutes: 60, reminderEnabled: true });
        await scheduleAssignmentReminder({ ...localTask, id: String(id) });
      } else {
        setTasks((current) => [localTask, ...current]);
        await scheduleAssignmentReminder(localTask);
      }
      setNewTask(""); setShowComposer(false);
      Alert.alert("Added to your planner", "Your deadline is saved and a reminder is scheduled on this device.");
    } catch (error) { Alert.alert("Could not add task", error instanceof Error ? error.message : "Please try again."); }
  };

  const toggleTask = async (task: Task) => {
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, done: !item.done } : item));
    if (isAuthenticated) await toggleAssignment.mutateAsync({ id: Number(task.id), done: !task.done });
  };

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row items-end justify-between"><View><Text className="text-sm font-semibold text-primary">STAY ON TRACK</Text><Text className="mt-1 text-3xl font-bold text-foreground">Planner</Text></View><Pressable onPress={() => setShowComposer((value) => !value)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}><View className="h-10 w-10 items-center justify-center rounded-full bg-primary"><IconSymbol name="plus" size={22} color={colors.background} /></View></Pressable></View>
        <Text className="mt-2 text-sm leading-5 text-muted">A calm view of what needs your attention next.</Text>
        {!isAuthenticated && <View className="mt-4 rounded-2xl border border-[#E6D9B6] bg-[#FFF8E7] p-3"><Text className="text-xs leading-5 text-[#806D3D]">You’re using local planner mode. Sign in from Profile to sync assignments across devices.</Text></View>}
        {showComposer && <View className="mt-5 rounded-2xl border border-border bg-surface p-4"><Text className="text-sm font-bold text-foreground">New deadline</Text><TextInput value={newTask} onChangeText={setNewTask} placeholder="e.g. Review Dart mixins" placeholderTextColor={colors.muted} className="mt-3 rounded-xl bg-background px-3 py-3 text-sm text-foreground" /><Text className="mt-3 text-xs font-bold text-muted">DUE DATE · YYYY-MM-DD HH:mm</Text><TextInput value={dueDate} onChangeText={setDueDate} placeholder="2026-09-17 18:00" placeholderTextColor={colors.muted} onSubmitEditing={addTask} returnKeyType="done" className="mt-2 rounded-xl bg-background px-3 py-3 text-sm text-foreground" /><Pressable onPress={addTask} disabled={createAssignment.isPending} style={({ pressed }) => [{ opacity: pressed ? 0.8 : createAssignment.isPending ? 0.6 : 1 }]}><View className="mt-3 items-center rounded-xl bg-primary py-3"><Text className="text-sm font-bold text-background">{createAssignment.isPending ? "Saving…" : "Add task & remind me"}</Text></View></Pressable></View>}
        <View className="mt-6 flex-row gap-3"><View className="flex-1 rounded-2xl bg-[#17382F] p-4"><Text className="text-xs font-semibold text-[#BFE4D5]">OPEN</Text><Text className="mt-2 text-3xl font-bold text-white">{openTasks.length}</Text><Text className="mt-1 text-xs text-[#C7E4D8]">tasks to go</Text></View><View className="flex-1 rounded-2xl bg-[#F6D98A] p-4"><Text className="text-xs font-semibold text-[#6F5C28]">DONE</Text><Text className="mt-2 text-3xl font-bold text-[#423A20]">{tasks.length - openTasks.length}</Text><Text className="mt-1 text-xs text-[#6F5C28]">this week</Text></View></View>
        <Text className="mt-7 text-xl font-bold text-foreground">This week</Text>
        <View className="mt-4 gap-3">{tasks.map((task) => <Pressable key={task.id} onPress={() => toggleTask(task)} style={({ pressed }) => [{ opacity: pressed ? 0.74 : 1 }]}><View className="flex-row items-center rounded-2xl border border-border bg-surface p-4"><View className="h-6 w-6 items-center justify-center rounded-full border-2" style={{ borderColor: task.done ? task.tone : colors.border, backgroundColor: task.done ? task.tone : "transparent" }}>{task.done && <IconSymbol name="checkmark.circle.fill" size={20} color="#FFFFFF" />}</View><View className="ml-3 flex-1"><Text className={`font-bold ${task.done ? "text-muted line-through" : "text-foreground"}`}>{task.title}</Text><Text className="mt-1 text-xs text-muted">{task.course} · {formatDue(task.dueAt)}</Text></View><View className="items-end"><View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: task.tone }} />{task.reminderEnabled && <IconSymbol name="bell.fill" size={14} color={colors.muted} />}</View></View></Pressable>)}</View>
        <View className="mt-6 rounded-2xl border border-[#E6D9B6] bg-[#FFF8E7] p-4"><View className="flex-row items-center"><IconSymbol name="bell.fill" size={20} color="#A9781A" /><Text className="ml-2 text-sm font-bold text-[#6F5C28]">Gentle reminders</Text></View><Text className="mt-2 text-xs leading-5 text-[#806D3D]">New deadlines schedule a reminder one hour before they’re due. Your study schedule can also send recurring session nudges.</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}
