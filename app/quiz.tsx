import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";

type Question = { question: string; options: string[]; answerIndex: number; explanation: string };

export default function QuizScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ course?: string; progress?: string; focus?: string }>();
  const course = params.course || "Dart foundations";
  const progress = Number(params.progress || 72);
  const focus = params.focus || "functions, parameters, and the next lesson";
  const generate = trpc.quizzes.generate.useMutation();
  const { isAuthenticated } = useAuth();
  const attempts = trpc.quizzes.attempts.useQuery(undefined, { enabled: isAuthenticated });
  const saveAttempt = trpc.quizzes.saveAttempt.useMutation({ onSuccess: () => attempts.refetch() });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");

  const score = useMemo(() => answers.reduce((total, answer, index) => total + (questions[index]?.answerIndex === answer ? 1 : 0), 0), [answers, questions]);
  const start = async () => {
    setError("");
    try {
      const result = await generate.mutateAsync({ course, progress, completedLessons: Math.round(progress / 6), focus });
      if (!result.questions.length) throw new Error("Edi did not return any questions.");
      setTitle(result.title); setIntro(result.intro); setQuestions(result.questions as Question[]); setCurrent(0); setAnswers([]); setFinished(false);
    } catch {
      setError("Edi could not build the quiz this time. Please try again.");
    }
  };
  const choose = async (index: number) => {
    const next = [...answers]; next[current] = index; setAnswers(next);
    if (current === questions.length - 1) {
      setFinished(true);
      if (isAuthenticated) {
        const finalScore = next.reduce((total, answer, questionIndex) => total + (questions[questionIndex]?.answerIndex === answer ? 1 : 0), 0);
        await saveAttempt.mutateAsync({ course, quizTitle: title || `${course} practice`, score: finalScore, total: questions.length, answers: next });
      }
    } else setCurrent(current + 1);
  };

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right", "bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row items-center"><Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}><IconSymbol name="chevron.left" size={20} color={colors.foreground} /></Pressable><Text className="ml-3 text-xl font-bold text-foreground">Personalized quiz</Text></View>
        {questions.length === 0 && !generate.isPending && <View className="mt-12"><View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#F6EBC7]"><IconSymbol name="sparkles" size={27} color="#A9781A" /></View><Text className="mt-6 text-4xl font-bold leading-tight text-foreground">A quiz made for where you are.</Text><Text className="mt-4 text-base leading-6 text-muted">Edi will use your progress in {course} and focus on {focus} to create five questions that help you practice, not just memorize.</Text><View className="mt-7 rounded-2xl border border-border bg-surface p-4"><Text className="text-xs font-bold text-muted">CURRENT COURSE PROGRESS</Text><Text className="mt-2 text-3xl font-bold text-primary">{progress}%</Text><View className="mt-3 h-2 overflow-hidden rounded-full bg-[#E6E1D7]"><View className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></View></View>{isAuthenticated && attempts.data && attempts.data.length > 0 && <View className="mt-4 rounded-2xl border border-border bg-surface p-4"><Text className="text-xs font-bold text-muted">RECENT QUIZ HISTORY</Text>{attempts.data.slice(0, 3).map((attempt) => <View key={attempt.id} className="mt-3 flex-row items-center"><View className="flex-1"><Text className="text-sm font-semibold text-foreground">{attempt.quizTitle}</Text><Text className="mt-1 text-xs text-muted">{attempt.course}</Text></View><Text className="text-sm font-bold text-primary">{attempt.score}/{attempt.total}</Text></View>)}</View>}{error && <Text className="mt-4 text-sm font-semibold text-error">{error}</Text>}<Pressable onPress={start} style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}><View className="mt-7 items-center rounded-2xl bg-primary py-4"><Text className="text-sm font-bold text-background">{error ? "Try again" : "Generate my quiz"}</Text></View></Pressable></View>}
        {generate.isPending && <View className="mt-24 items-center"><ActivityIndicator size="large" color={colors.primary} /><Text className="mt-4 text-sm font-semibold text-muted">Edi is tailoring your questions…</Text></View>}
        {questions.length > 0 && !finished && <View className="mt-8"><Text className="text-sm font-semibold text-primary">QUESTION {current + 1} OF {questions.length}</Text><Text className="mt-3 text-2xl font-bold leading-8 text-foreground">{title}</Text><Text className="mt-2 text-sm leading-5 text-muted">{intro}</Text><View className="mt-8 rounded-3xl border border-border bg-surface p-5"><Text className="text-lg font-bold leading-7 text-foreground">{questions[current]?.question}</Text><View className="mt-5 gap-3">{questions[current]?.options?.map((option, index) => <Pressable key={option} onPress={() => choose(index)} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}><View className="flex-row items-center rounded-2xl border border-border bg-background p-4"><View className="h-7 w-7 items-center justify-center rounded-full border border-border"><Text className="text-xs font-bold text-muted">{String.fromCharCode(65 + index)}</Text></View><Text className="ml-3 flex-1 text-sm font-semibold text-foreground">{option}</Text></View></Pressable>)}</View></View></View>}
        {finished && <View className="mt-12 items-center"><View className="h-16 w-16 items-center justify-center rounded-full bg-[#E6F2EE]"><IconSymbol name="checkmark.circle.fill" size={35} color={colors.primary} /></View><Text className="mt-6 text-3xl font-bold text-foreground">Nice work.</Text><Text className="mt-2 text-base text-muted">You scored {score} out of {questions.length}.</Text><Text className="mt-6 text-center text-sm leading-5 text-muted">{score >= 4 ? "You’re ready to move forward. Keep the momentum going." : "Review the tricky parts with Edi, then try again when you’re ready."}</Text><Pressable onPress={() => { setQuestions([]); setAnswers([]); setFinished(false); }} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}><View className="mt-8 rounded-2xl bg-primary px-7 py-4"><Text className="text-sm font-bold text-background">Try another quiz</Text></View></Pressable></View>}
      </ScrollView>
    </ScreenContainer>
  );
}
