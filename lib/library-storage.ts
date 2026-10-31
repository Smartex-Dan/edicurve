import AsyncStorage from "@react-native-async-storage/async-storage";

export const MATERIALS_KEY = "edicurve-materials-v1";
const PDF_TEXT_PREFIX = "edicurve-pdf-text-";
const ACTIVE_DOC_KEY = "edicurve-active-document";

export type ActiveDocument = { id: string; name: string; text: string };

export const savePdfText = (id: string, text: string) =>
  AsyncStorage.setItem(PDF_TEXT_PREFIX + id, text);

export async function removePdf(id: string) {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_DOC_KEY);
    if (raw && JSON.parse(raw).id === id) {
      await AsyncStorage.removeItem(ACTIVE_DOC_KEY);
    }
  } catch {
    // Nothing to clear.
  }
  await AsyncStorage.removeItem(PDF_TEXT_PREFIX + id);
}

export async function setActiveDocument(id: string, name: string) {
  await AsyncStorage.setItem(ACTIVE_DOC_KEY, JSON.stringify({ id, name }));
}

export async function clearActiveDocument() {
  await AsyncStorage.removeItem(ACTIVE_DOC_KEY);
}

export async function getActiveDocument(): Promise<ActiveDocument | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_DOC_KEY);
    if (!raw) return null;
    const { id, name } = JSON.parse(raw) as { id?: string; name?: string };
    if (!id || !name) return null;
    const text = await AsyncStorage.getItem(PDF_TEXT_PREFIX + id);
    return text ? { id, name, text } : null;
  } catch {
    return null;
  }
}