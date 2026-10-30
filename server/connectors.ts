// server/connectors.ts
import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { connectorTokens } from "../drizzle/schema";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

async function findToken(userId: number, provider: "google" | "notion") {
  const db = await requireDb();
  const [token] = await db
    .select()
    .from(connectorTokens)
    .where(
      and(
        eq(connectorTokens.userId, userId),
        eq(connectorTokens.provider, provider),
      ),
    )
    .limit(1);
  return token;
}

// ─── Google ───────────────────────────────────────────────────────────────────

export function buildGoogleAuthUrl(): string {
  const scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    "https://www.googleapis.com/auth/classroom.announcements.readonly",
    "openid",
    "email",
    "profile",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
  userId: number,
): Promise<void> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${await res.text()}`);
  }

  const data = await res.json();
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : null;

  const db = await requireDb();
  await db
    .insert(connectorTokens)
    .values({
      userId,
      provider: "google",
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt,
      scope: data.scope ?? null,
    })
    .onDuplicateKeyUpdate({
      set: {
        accessToken: data.access_token,
        ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
        expiresAt,
        scope: data.scope ?? null,
      },
    });
}

export async function refreshGoogleToken(userId: number): Promise<string> {
  const token = await findToken(userId, "google");
  if (!token?.refreshToken) throw new Error("No Google refresh token stored");

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: token.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) throw new Error("Google token refresh failed");
  const data = await res.json();

  const db = await requireDb();
  await db
    .update(connectorTokens)
    .set({
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    })
    .where(
      and(
        eq(connectorTokens.userId, userId),
        eq(connectorTokens.provider, "google"),
      ),
    );

  return data.access_token;
}

export async function getValidGoogleToken(userId: number): Promise<string> {
  const token = await findToken(userId, "google");
  if (!token) throw new Error("Google not connected");

  const isExpired =
    token.expiresAt && token.expiresAt.getTime() < Date.now() + 60_000;

  return isExpired ? refreshGoogleToken(userId) : token.accessToken;
}

// ─── Notion ───────────────────────────────────────────────────────────────────

export function buildNotionAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID!,
    redirect_uri: process.env.NOTION_REDIRECT_URI!,
    response_type: "code",
    owner: "user",
  });

  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

export async function exchangeNotionCode(
  code: string,
  userId: number,
): Promise<void> {
  const credentials = Buffer.from(
    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`,
  ).toString("base64");

  const res = await fetch(NOTION_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.NOTION_REDIRECT_URI!,
    }),
  });

  if (!res.ok) {
    throw new Error(`Notion token exchange failed: ${await res.text()}`);
  }

  const data = await res.json();

  const db = await requireDb();
  await db
    .insert(connectorTokens)
    .values({
      userId,
      provider: "notion",
      accessToken: data.access_token,
      refreshToken: null,
      expiresAt: null,
      scope: null,
    })
    .onDuplicateKeyUpdate({ set: { accessToken: data.access_token } });
}

export async function getNotionToken(userId: number): Promise<string> {
  const token = await findToken(userId, "notion");
  if (!token) throw new Error("Notion not connected");
  return token.accessToken;
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export async function disconnectProvider(
  userId: number,
  provider: "google" | "notion",
): Promise<void> {
  if (provider === "google") {
    const token = await findToken(userId, "google");
    if (token?.accessToken) {
      await fetch(`${GOOGLE_REVOKE_URL}?token=${token.accessToken}`, {
        method: "POST",
      }).catch(() => {});
    }
  }

  const db = await requireDb();
  await db
    .delete(connectorTokens)
    .where(
      and(
        eq(connectorTokens.userId, userId),
        eq(connectorTokens.provider, provider),
      ),
    );
}

export async function getConnectorStatus(
  userId: number,
): Promise<{ google: boolean; notion: boolean }> {
  const db = await requireDb();
  const tokens = await db
    .select({ provider: connectorTokens.provider })
    .from(connectorTokens)
    .where(eq(connectorTokens.userId, userId));

  return {
    google: tokens.some((t) => t.provider === "google"),
    notion: tokens.some((t) => t.provider === "notion"),
  };
}