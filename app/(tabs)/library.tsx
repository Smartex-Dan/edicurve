import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { Toast } from "@/components/toast";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useToast } from "@/hooks/use-toast";
import {
  MATERIALS_KEY,
  removePdf,
  savePdfText,
  setActiveDocument,
} from "@/lib/library-storage";
import { trpc } from "@/lib/trpc";

type Resource = {
  id: string;
  kind: "PDF" | "Note";
  title: string;
  meta: string;
  createdAt: number;
  content?: string;
};

type Filter = "all" | "Note" | "PDF";

const MAX_PDF_BYTES = 10_000_000;

function shortDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

async function readAsBase64(
  asset: DocumentPicker.DocumentPickerAsset,
): Promise<string> {
  if (asset.base64) return asset.base64.replace(/^data:.*?;base64,/, "");

  if (Platform.OS === "web" && (asset as any).file) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("Could not read that file."));
      reader.readAsDataURL((asset as any).file);
    });
  }

  return FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export default function LibraryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const extract = trpc.documents.extractText.useMutation();

  const [items, setItems] = useState<Resource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showComposer, setShowComposer] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(MATERIALS_KEY).then((raw) => {
        try {
          setItems(raw ? JSON.parse(raw) : []);
        } catch {
          setItems([]);
        }
        setLoaded(true);
      });
    }, []),
  );

  const persist = async (next: Resource[]) => {
    setItems(next);
    await AsyncStorage.setItem(MATERIALS_KEY, JSON.stringify(next));
  };

  const noteCount = items.filter((i) => i.kind === "Note").length;
  const pdfCount = items.filter((i) => i.kind === "PDF").length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        (filter === "all" || item.kind === filter) &&
        item.title.toLowerCase().includes(q),
    );
  }, [items, filter, query]);

  const chips: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: items.length },
    { id: "Note", label: "Notes", count: noteCount },
    { id: "PDF", label: "PDFs", count: pdfCount },
  ];

  const createNote = async () => {
    const title = noteTitle.trim();
    if (!title) {
      showToast("Give your note a title first.", "error");
      return;
    }
    const now = Date.now();
    try {
      await persist([
        {
          id: `note-${now}`,
          kind: "Note",
          title,
          content: noteBody.trim(),
          meta: `Note · ${shortDate(now)}`,
          createdAt: now,
        },
        ...items,
      ]);
      setNoteTitle("");
      setNoteBody("");
      setShowComposer(false);
      showToast("Note saved on this device.");
    } catch {
      showToast("Could not save the note. Please try again.", "error");
    }
  };

  const pickPdf = async () => {
    if (status) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      if ((asset.size ?? 0) > MAX_PDF_BYTES) {
        showToast("That PDF is too large. Choose one under 10 MB.", "error");
        return;
      }

      setStatus("Reading file...");
      const base64 = await readAsBase64(asset);

      setStatus("Extracting text...");
      const extracted = await extract.mutateAsync({
        name: asset.name,
        base64,
      });

      if (extracted.text.trim().length < 20) {
        showToast(
          "No readable text found. Scanned PDFs are not supported yet.",
          "error",
        );
        return;
      }

      const now = Date.now();
      const id = `pdf-${now}`;
      await savePdfText(id, extracted.text);
      await persist([
        {
          id,
          kind: "PDF",
          title: asset.name,
          meta: `${extracted.pages} page${extracted.pages === 1 ? "" : "s"} · ${shortDate(now)}`,
          createdAt: now,
        },
        ...items,
      ]);
      showToast(
        extracted.truncated
          ? "PDF added. EDI will use its first 40,000 characters."
          : "PDF added. EDI can now answer questions about it.",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Upload failed. Please try again.",
        "error",
      );
    } finally {
      setStatus(null);
    }
  };

  const askAbout = async (item: Resource) => {
    await setActiveDocument(item.id, item.title);
    router.push("/tutor");
  };

  const remove = async (item: Resource) => {
    setConfirmId(null);
    if (item.kind === "PDF") await removePdf(item.id);
    await persist(items.filter((i) => i.id !== item.id));
    showToast(`${item.kind === "PDF" ? "PDF" : "Note"} deleted.`);
  };

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
              YOUR MATERIALS
            </Text>
            <Text className="mt-1 text-3xl font-bold text-foreground">
              Library
            </Text>
          </View>
          <Pressable
            onPress={() => setShowComposer((value) => !value)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
              <IconSymbol name="plus" size={22} color={colors.background} />
            </View>
          </Pressable>
        </View>
        <Text className="mt-2 text-sm leading-5 text-muted">
          Keep notes and PDFs here. Ask EDI about any PDF you add.
        </Text>

        <View className="mt-5 flex-row items-center rounded-2xl border border-border bg-surface px-4 py-3">
          <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your library"
            placeholderTextColor={colors.muted}
            className="ml-2 flex-1 text-sm text-foreground"
          />
        </View>

        <View className="mt-4 flex-row gap-2">
          {chips.map((chip) => {
            const active = filter === chip.id;
            return (
              <Pressable
                key={chip.id}
                onPress={() => setFilter(chip.id)}
                style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
              >
                <View
                  className={`rounded-full px-4 py-2 ${
                    active ? "bg-primary" : "border border-border bg-surface"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      active ? "text-background" : "text-muted"
                    }`}
                  >
                    {chip.label} ({chip.count})
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {showComposer && (
          <View className="mt-5 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-sm font-bold text-foreground">
              Create a note
            </Text>
            <TextInput
              value={noteTitle}
              onChangeText={setNoteTitle}
              placeholder="Note title"
              placeholderTextColor={colors.muted}
              className="mt-3 rounded-xl bg-background px-3 py-3 text-sm text-foreground"
            />
            <TextInput
              value={noteBody}
              onChangeText={setNoteBody}
              placeholder="Write a few thoughts..."
              placeholderTextColor={colors.muted}
              multiline
              className="mt-2 min-h-20 rounded-xl bg-background px-3 py-3 text-sm text-foreground"
            />
            <Pressable
              onPress={createNote}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <View className="mt-3 items-center rounded-xl bg-primary py-3">
                <Text className="text-sm font-bold text-background">
                  Save note
                </Text>
              </View>
            </Pressable>
          </View>
        )}

        <View className="mt-7 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-foreground">
            {filter === "all" ? "Your resources" : filter === "Note" ? "Notes" : "PDFs"}
          </Text>
          <Text className="text-xs font-semibold text-muted">
            {filtered.length} item{filtered.length === 1 ? "" : "s"}
          </Text>
        </View>

        {loaded && items.length === 0 && (
          <View className="mt-4 items-center rounded-2xl border border-border bg-surface p-6">
            <IconSymbol name="folder.fill" size={28} color={colors.muted} />
            <Text className="mt-3 text-center font-semibold text-foreground">
              Your library is empty
            </Text>
            <Text className="mt-1 text-center text-sm leading-5 text-muted">
              Add a note with the plus button, or upload a PDF below so EDI can
              answer questions about it.
            </Text>
          </View>
        )}

        {items.length > 0 && filtered.length === 0 && (
          <Text className="mt-4 text-sm text-muted">
            Nothing matches that search or filter.
          </Text>
        )}

        <View className="mt-4 gap-3">
          {filtered.map((item) => {
            const tone = item.kind === "PDF" ? "#E85D5D" : colors.primary;
            const expanded = expandedId === item.id;
            return (
              <View
                key={item.id}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <Pressable
                  onPress={() =>
                    item.kind === "Note" && setExpandedId(expanded ? null : item.id)
                  }
                >
                  <View className="flex-row items-center">
                    <View
                      className="h-11 w-11 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${tone}1A` }}
                    >
                      <IconSymbol name="doc.text.fill" size={21} color={tone} />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="font-bold text-foreground">
                        {item.title}
                      </Text>
                      <Text className="mt-1 text-xs text-muted">{item.meta}</Text>
                    </View>
                    <View
                      className="rounded-md px-2 py-1"
                      style={{ backgroundColor: `${tone}1A` }}
                    >
                      <Text
                        className="text-[10px] font-bold"
                        style={{ color: tone }}
                      >
                        {item.kind}
                      </Text>
                    </View>
                  </View>
                </Pressable>

                {item.kind === "Note" && !!item.content && (
                  <Text
                    className="mt-3 text-xs leading-5 text-muted"
                    numberOfLines={expanded ? undefined : 2}
                  >
                    {item.content}
                  </Text>
                )}

                {item.kind === "PDF" && (
                  <Pressable
                    onPress={() => askAbout(item)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View className="mt-3 flex-row items-center rounded-xl bg-background px-3 py-2.5">
                      <IconSymbol
                        name="sparkles"
                        size={16}
                        color={colors.primary}
                      />
                      <Text className="ml-2 text-xs font-bold text-primary">
                        Ask EDI about this PDF
                      </Text>
                    </View>
                  </Pressable>
                )}

                {confirmId === item.id ? (
                  <View className="mt-3 flex-row items-center gap-4">
                    <Text className="text-xs text-muted">Delete this?</Text>
                    <Pressable onPress={() => remove(item)}>
                      <Text className="text-xs font-bold text-error">Yes, delete</Text>
                    </Pressable>
                    <Pressable onPress={() => setConfirmId(null)}>
                      <Text className="text-xs font-bold text-muted">Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => setConfirmId(item.id)}>
                    <Text className="mt-3 text-xs font-semibold text-muted">
                      Delete
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={pickPdf}
          disabled={!!status}
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : status ? 0.7 : 1 }]}
        >
          <View className="mt-6 flex-row items-center justify-center rounded-2xl border border-dashed border-primary bg-[#EAF5F0] px-4 py-4">
            {status ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <IconSymbol name="folder.fill" size={21} color={colors.primary} />
            )}
            <Text className="ml-2 text-sm font-bold text-primary">
              {status ?? "Upload a PDF"}
            </Text>
          </View>
        </Pressable>
        <Text className="mt-3 text-center text-xs leading-5 text-muted">
          PDFs stay on this device. When you ask EDI about one, its text is sent
          to answer your question. Nothing is saved on the server.
        </Text>
      </ScrollView>
      <Toast toast={toast} />
    </ScreenContainer>
  );
}