import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useMemo, useState } from "react";
import { Alert, ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";

type Resource = { id: string; title: string; kind: "PDF" | "Note"; meta: string; tone: string; icon: "doc.text.fill" | "folder.fill"; key?: string; mimeType?: string; content?: string; cloudId?: number };
const STORAGE_KEY = "prepify-materials-v1";
const starterResources: Resource[] = [
  { id: "1", title: "Dart cheat sheet", kind: "PDF", meta: "Dart foundations · Starter resource", tone: "#E85D5D", icon: "doc.text.fill" },
  { id: "2", title: "Functions & parameters", kind: "Note", meta: "Dart foundations · Starter note", tone: "#D89034", icon: "doc.text.fill", content: "Remember: keep functions small and name parameters clearly." },
  { id: "3", title: "Chapter 4 — Data structures", kind: "PDF", meta: "Computer science · Starter resource", tone: "#7668D9", icon: "doc.text.fill" },
  { id: "4", title: "Essay ideas", kind: "Note", meta: "Academic writing · Starter note", tone: "#4EA982", icon: "doc.text.fill", content: "Collect examples before drafting the thesis." },
];

export default function LibraryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [items, setItems] = useState<Resource[]>(starterResources);
  const upload = trpc.documents.upload.useMutation();
  const notes = trpc.notes.list.useQuery(undefined, { enabled: isAuthenticated });
  const createCloudNote = trpc.notes.create.useMutation({ onSuccess: () => notes.refetch() });
  const filtered = useMemo(() => items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())), [items, query]);

  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then((value) => { if (value) setItems([...JSON.parse(value), ...starterResources]); }); }, []);
  useEffect(() => {
    if (!notes.data) return;
    const cloudNotes: Resource[] = notes.data.map((note) => ({ id: `cloud-note-${note.id}`, cloudId: note.id, title: note.title, kind: "Note", content: note.content, meta: "Synced note · Updated recently", tone: colors.primary, icon: "doc.text.fill" }));
    setItems((current) => [...cloudNotes, ...current.filter((item) => item.kind === "PDF" || !item.cloudId)]);
  }, [notes.data, colors.primary]);

  const persistLocal = async (next: Resource[]) => { setItems(next); await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next.filter((item) => item.key || (item.kind === "Note" && !item.cloudId)))); };
  const createNote = async () => {
    if (!noteTitle.trim()) return;
    try {
      if (isAuthenticated) await createCloudNote.mutateAsync({ title: noteTitle.trim(), content: noteBody.trim() });
      else await persistLocal([{ id: Date.now().toString(), title: noteTitle.trim(), kind: "Note", meta: "Personal notes · Just now", tone: colors.primary, icon: "doc.text.fill", content: noteBody.trim() }, ...items]);
      setNoteTitle(""); setNoteBody(""); setShowComposer(false); Alert.alert("Note created", isAuthenticated ? "Your note is synced to your workspace." : "Your note is saved on this device.");
    } catch { Alert.alert("Could not save note", "Please sign in or try again."); }
  };

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: false, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0]; if (!asset) return;
      if ((asset.size ?? 0) > 15_000_000) { Alert.alert("PDF is too large", "Please choose a PDF smaller than 15 MB."); return; }
      const base64 = asset.base64 || await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const uploaded = await upload.mutateAsync({ name: asset.name, mimeType: asset.mimeType || "application/pdf", size: asset.size || 1, base64: base64.replace(/^data:.*?;base64,/, "") });
      const resource: Resource = { id: uploaded.key, title: uploaded.name, kind: "PDF", meta: `Uploaded PDF · ${Math.max(1, Math.round(uploaded.size / 1024))} KB`, tone: "#E85D5D", icon: "doc.text.fill", key: uploaded.key, mimeType: uploaded.mimeType };
      await persistLocal([resource, ...items]); Alert.alert("PDF uploaded", "You can now ask Prep AI questions about this document.");
    } catch (error) { Alert.alert("Upload failed", error instanceof Error ? error.message : "Please try again."); }
  };

  const askAbout = async (item: Resource) => {
    if (!item.key) { Alert.alert("Starter resource", "Upload your own PDF to ask Prep AI document-specific questions."); return; }
    await AsyncStorage.setItem("prepify-active-document", JSON.stringify({ name: item.title, key: item.key, mimeType: item.mimeType || "application/pdf" })); router.push("/tutor");
  };

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row items-end justify-between"><View><Text className="text-sm font-semibold text-primary">YOUR MATERIALS</Text><Text className="mt-1 text-3xl font-bold text-foreground">Library</Text></View><Pressable onPress={() => setShowComposer((value) => !value)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}><View className="h-10 w-10 items-center justify-center rounded-full bg-primary"><IconSymbol name="plus" size={22} color={colors.background} /></View></Pressable></View>
        <Text className="mt-2 text-sm leading-5 text-muted">Keep notes, PDFs, and helpful resources close to your courses.</Text>
        {!isAuthenticated && <View className="mt-4 rounded-2xl border border-[#E6D9B6] bg-[#FFF8E7] p-3"><Text className="text-xs leading-5 text-[#806D3D]">Notes are local right now. Sign in from Profile to sync them across sessions and devices.</Text></View>}
        <View className="mt-5 flex-row items-center rounded-2xl border border-border bg-surface px-4 py-3"><IconSymbol name="magnifyingglass" size={20} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search your library" placeholderTextColor={colors.muted} className="ml-2 flex-1 text-sm text-foreground" /></View>
        <View className="mt-4 flex-row gap-2"><View className="rounded-full bg-primary px-4 py-2"><Text className="text-xs font-bold text-background">All files</Text></View><View className="rounded-full border border-border bg-surface px-4 py-2"><Text className="text-xs font-semibold text-muted">Notes</Text></View><View className="rounded-full border border-border bg-surface px-4 py-2"><Text className="text-xs font-semibold text-muted">PDFs</Text></View></View>
        {showComposer && <View className="mt-5 rounded-2xl border border-border bg-surface p-4"><Text className="text-sm font-bold text-foreground">Create a note</Text><TextInput value={noteTitle} onChangeText={setNoteTitle} placeholder="Note title" placeholderTextColor={colors.muted} className="mt-3 rounded-xl bg-background px-3 py-3 text-sm text-foreground" /><TextInput value={noteBody} onChangeText={setNoteBody} placeholder="Write a few thoughts…" placeholderTextColor={colors.muted} multiline className="mt-2 min-h-20 rounded-xl bg-background px-3 py-3 text-sm text-foreground" /><Pressable onPress={createNote} disabled={createCloudNote.isPending} style={({ pressed }) => [{ opacity: pressed ? 0.8 : createCloudNote.isPending ? 0.6 : 1 }]}><View className="mt-3 items-center rounded-xl bg-primary py-3"><Text className="text-sm font-bold text-background">{createCloudNote.isPending ? "Saving…" : isAuthenticated ? "Save synced note" : "Save note"}</Text></View></Pressable></View>}
        <View className="mt-7 flex-row items-center justify-between"><Text className="text-xl font-bold text-foreground">Recent resources</Text><Text className="text-xs font-semibold text-muted">{items.length} items</Text></View>
        <View className="mt-4 gap-3">{filtered.map((item) => <View key={item.id} className="rounded-2xl border border-border bg-surface p-4"><View className="flex-row items-center"><View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${item.tone}1A` }}><IconSymbol name={item.icon} size={21} color={item.tone} /></View><View className="ml-3 flex-1"><Text className="font-bold text-foreground">{item.title}</Text><Text className="mt-1 text-xs text-muted">{item.meta}</Text></View><View className="rounded-md px-2 py-1" style={{ backgroundColor: `${item.tone}1A` }}><Text className="text-[10px] font-bold" style={{ color: item.tone }}>{item.kind}</Text></View></View>{item.kind === "Note" && item.content && <Text className="mt-3 text-xs leading-5 text-muted" numberOfLines={2}>{item.content}</Text>}{item.kind === "PDF" && <Pressable onPress={() => askAbout(item)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}><View className="mt-3 flex-row items-center rounded-xl bg-background px-3 py-2.5"><IconSymbol name="sparkles" size={16} color={colors.primary} /><Text className="ml-2 text-xs font-bold text-primary">Ask Prep AI about this PDF</Text></View></Pressable>}</View>)}</View>
        <Pressable onPress={pickPdf} disabled={upload.isPending} style={({ pressed }) => [{ opacity: pressed ? 0.75 : upload.isPending ? 0.6 : 1 }]}><View className="mt-6 flex-row items-center justify-center rounded-2xl border border-dashed border-primary bg-[#EAF5F0] px-4 py-4">{upload.isPending ? <ActivityIndicator size="small" color={colors.primary} /> : <IconSymbol name="folder.fill" size={21} color={colors.primary} />}<Text className="ml-2 text-sm font-bold text-primary">{upload.isPending ? "Uploading PDF…" : "Upload a PDF"}</Text></View></Pressable>
        <Text className="mt-3 text-center text-xs leading-5 text-muted">PDFs are stored securely and can be used as context when you chat with Prep AI.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}
