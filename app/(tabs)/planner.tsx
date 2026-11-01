import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { DateTimeField } from "@/components/date-time-field";
import { ScreenContainer } from "@/components/screen-container";
import { Toast } from "@/components/toast";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useToast } from "@/hooks/use-toast";
import { defaultDue } from "@/lib/date-time";
import { scheduleAssignmentReminder } from "@/lib/notifications";
import { useOnboarding } from "@/lib/onboarding-context";
import { trpc } from "@/lib/trpc";

type Task = {
  id: string;
  title: string;
  course: string;
  dueAt: string;
  done: boolean;
  tone: string;
  reminderEnabled: boolean;
  reminderMinutes: number;
};

const TASKS_KEY = "edicurve-planner-v1";
const GENERAL = "Personal task";
const OVERDUE_COLOR = "#C0392B";

function formatDue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const byDue = (a: Task, b: Task) =>
  new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();

export default function PlannerScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const { data: onboarding } = useOnboarding();
  const { toast, showToast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [course, setCourse] = useState(GENERAL);
  const [due, setDue] = useState<Date>(defaultDue);

  const assignments = trpc.assignments.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const createAssignment = trpc.assignments.create.useMutation({
    onSuccess: () => assignments.refetch(),
  });
  const toggleAssignment = trpc.assignments.toggle.useMutation({
    onSuccess: () => assignments.refetch(),
  });

  // Signed out: load tasks from this device every time the screen is shown.
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) return;
      AsyncStorage.getItem(TASKS_KEY).then((raw) => {
        try {
          setTasks(raw ? JSON.parse(raw) : []);
        } catch {
          setTasks([]);
        }
        setLoaded(true);
      });
    }, [isAuthenticated]),
  );

  // Signed in: tasks come from the server.
  useEffect(() => {
    if (!assignments.data) return;
    setTasks(
      assignments.data.map((task) => ({
        id: String(task.id),
        title: task.title,
        course: task.course,
        dueAt: new Date(task.dueAt).toISOString(),
        done: task.done,
        tone: colors.primary,
        reminderEnabled: task.reminderEnabled,
        reminderMinutes: task.reminderMinutes,
      })),
    );
    setLoaded(true);
  }, [assignments.data, colors.primary]);

  const persist = async (next: Task[]) => {
    setTasks(next);
    if (!isAuthenticated) {
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(next));
    }
  };

  const addTask = async () => {
    const title = newTask.trim();
    if (!title) {
      showToast("Give the task a name first.", "error");
      return;
    }
    if (due.getTime() <= Date.now()) {
      showToast("That time has already passed. Pick a later time.", "error");
      return;
    }

    const task: Task = {
      id: Date.now().toString(),
      title,
      course,
      dueAt: due.toISOString(),
      done: false,
      tone: colors.primary,
      reminderEnabled: true,
      reminderMinutes: 60,
    };

    try {
      let reminderOk = true;
      if (isAuthenticated) {
        const id = await createAssignment.mutateAsync({
          title,
          course,
          dueAt: task.dueAt,
          reminderMinutes: 60,
          reminderEnabled: true,
        });
        try {
          await scheduleAssignmentReminder({ ...task, id: String(id) });
        } catch {
          reminderOk = false;
        }
      } else {
        await persist([task, ...tasks]);
        try {
          await scheduleAssignmentReminder(task);
        } catch {
          reminderOk = false;
        }
      }

      setNewTask("");
      setCourse(GENERAL);
      setDue(defaultDue());
      setShowComposer(false);
      showToast(
        reminderOk
          ? "Task added. Reminder set for 1 hour before."
          : "Task added. Reminders are not available here.",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not add the task.",
        "error",
      );
    }
  };

  const toggleTask = async (task: Task) => {
    await persist(
      tasks.map((item) =>
        item.id === task.id ? { ...item, done: !item.done } : item,
      ),
    );
    if (isAuthenticated) {
      await toggleAssignment.mutateAsync({
        id: Number(task.id),
        done: !task.done,
      });
    }
  };

  const now = Date.now();
  const open = tasks.filter((task) => !task.done).sort(byDue);
  const overdue = open.filter((task) => new Date(task.dueAt).getTime() < now);
  const upcoming = open.filter((task) => new Date(task.dueAt).getTime() >= now);
  const done = tasks.filter((task) => task.done).sort(byDue).reverse();
  const courseChoices = [GENERAL, ...(onboarding.subjects ?? [])];

  const renderTask = (task: Task, isOverdue = false) => (
    <Pressable
      key={task.id}
      onPress={() => toggleTask(task)}
      style={({ pressed }) => [{ opacity: pressed ? 0.74 : 1 }]}
    >
      <View className="flex-row items-center rounded-2xl border border-border bg-surface p-4">
        <View
          className="h-6 w-6 items-center justify-center rounded-full border-2"
          style={{
            borderColor: task.done
              ? colors.primary
              : isOverdue
                ? OVERDUE_COLOR
                : colors.border,
            backgroundColor: task.done ? colors.primary : "transparent",
          }}
        >
          {task.done && (
            <IconSymbol name="checkmark" size={14} color={colors.background} />
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text
            className={`font-bold ${
              task.done ? "text-muted line-through" : "text-foreground"
            }`}
          >
            {task.title}
          </Text>
          <Text
            className="mt-1 text-xs"
            style={{ color: isOverdue ? OVERDUE_COLOR : colors.muted }}
          >
            {task.course} · {formatDue(task.dueAt)}
            {isOverdue ? " · overdue" : ""}
          </Text>
        </View>
        {task.reminderEnabled && !task.done && (
          <IconSymbol name="bell.fill" size={14} color={colors.muted} />
        )}
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-sm font-semibold text-primary">
              STAY ON TRACK
            </Text>
            <Text className="mt-1 text-3xl font-bold text-foreground">
              Planner
            </Text>
          </View>
          <Pressable
            onPress={() => setShowComposer((value) => !value)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
              <IconSymbol
                name={showComposer ? "xmark" : "plus"}
                size={22}
                color={colors.background}
              />
            </View>
          </Pressable>
        </View>
        <Text className="mt-2 text-sm leading-5 text-muted">
          Deadlines and tasks, saved on this device.
        </Text>

        {showComposer && (
          <View className="mt-5 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-sm font-bold text-foreground">
              New deadline
            </Text>
            <TextInput
              value={newTask}
              onChangeText={setNewTask}
              placeholder="e.g. Finish Physics past questions"
              placeholderTextColor={colors.muted}
              onSubmitEditing={addTask}
              returnKeyType="done"
              className="mt-3 rounded-xl bg-background px-3 py-3 text-sm text-foreground"
            />

            <Text className="mt-4 text-xs font-bold text-muted">SUBJECT</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {courseChoices.map((choice) => {
                const selected = course === choice;
                return (
                  <Pressable key={choice} onPress={() => setCourse(choice)}>
                    <View
                      className="rounded-full border px-3 py-2"
                      style={{
                        backgroundColor: selected ? colors.primary : colors.background,
                        borderColor: selected ? colors.primary : colors.border,
                      }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{
                          color: selected ? colors.background : colors.foreground,
                        }}
                      >
                        {choice === GENERAL ? "General" : choice}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-4">
              <DateTimeField value={due} onChange={setDue} />
            </View>

            <Pressable
              onPress={addTask}
              disabled={createAssignment.isPending}
              style={({ pressed }) => [
                { opacity: pressed ? 0.8 : createAssignment.isPending ? 0.6 : 1 },
              ]}
            >
              <View className="mt-4 items-center rounded-xl bg-primary py-3.5">
                <Text className="text-sm font-bold text-background">
                  {createAssignment.isPending ? "Saving..." : "Add task and remind me"}
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        <View className="mt-6 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-[#17382F] p-4">
            <Text className="text-xs font-semibold text-[#BFE4D5]">OPEN</Text>
            <Text className="mt-2 text-3xl font-bold text-white">
              {open.length}
            </Text>
            <Text className="mt-1 text-xs text-[#C7E4D8]">
              {overdue.length > 0 ? `${overdue.length} overdue` : "tasks to go"}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl bg-[#F6D98A] p-4">
            <Text className="text-xs font-semibold text-[#6F5C28]">DONE</Text>
            <Text className="mt-2 text-3xl font-bold text-[#423A20]">
              {done.length}
            </Text>
            <Text className="mt-1 text-xs text-[#6F5C28]">completed</Text>
          </View>
        </View>

        {loaded && tasks.length === 0 && (
          <View className="mt-6 items-center rounded-2xl border border-border bg-surface p-6">
            <IconSymbol name="calendar" size={28} color={colors.muted} />
            <Text className="mt-3 text-center font-semibold text-foreground">
              No tasks yet
            </Text>
            <Text className="mt-1 text-center text-sm leading-5 text-muted">
              Tap the plus button to add a deadline. Edicurve will remind you an
              hour before it is due.
            </Text>
          </View>
        )}

        {overdue.length > 0 && (
          <>
            <Text
              className="mt-7 text-xl font-bold"
              style={{ color: OVERDUE_COLOR }}
            >
              Overdue
            </Text>
            <View className="mt-4 gap-3">
              {overdue.map((task) => renderTask(task, true))}
            </View>
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <Text className="mt-7 text-xl font-bold text-foreground">
              Upcoming
            </Text>
            <View className="mt-4 gap-3">
              {upcoming.map((task) => renderTask(task))}
            </View>
          </>
        )}

        {done.length > 0 && (
          <>
            <Text className="mt-7 text-xl font-bold text-foreground">Done</Text>
            <View className="mt-4 gap-3">
              {done.map((task) => renderTask(task))}
            </View>
          </>
        )}
      </ScrollView>
      <Toast toast={toast} />
    </ScreenContainer>
  );
}