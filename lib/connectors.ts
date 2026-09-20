// lib/connectors.ts
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

WebBrowser.maybeCompleteAuthSession();

export async function openOAuthFlow(
  authUrl: string,
  expectedCallbackPath: string,
): Promise<string | null> {
  const redirectUri = Linking.createURL(expectedCallbackPath);

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== "success") return null;

  const url = new URL(result.url);
  return url.searchParams.get("code");
}