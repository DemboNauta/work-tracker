import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, settings, type Settings, type User } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SECRET_FALLBACK = "work-tracker-dev-secret-cambia-esto-en-produccion";

export function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET no definido: obligatorio en producción (ver deploy.ps1)."
      );
    }
    return new TextEncoder().encode(SECRET_FALLBACK);
  }
  return new TextEncoder().encode(secret);
}

export const SESSION_COOKIE = "wt_session";
const SESSION_DAYS = 30;

export async function createSession(userId: number) {
  const token = await new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export const getSessionUserId = cache(async (): Promise<number | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.sub ? Number(payload.sub) : null;
  } catch {
    return null;
  }
});

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const userId = await getSessionUserId();
  if (userId == null) return null;
  const rows = await db.select().from(users).where(eq(users.id, userId));
  return rows[0] ?? null;
});

/** Redirige a /login si no hay sesión válida. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export const DEFAULT_SETTINGS: Omit<Settings, "userId"> = {
  weeklyLimitMin: 16 * 60,
  annualLimitMin: 720 * 60,
  nightStartMin: 22 * 60,
  nightEndMin: 6 * 60,
};

export async function getUserSettings(userId: number): Promise<Settings> {
  const rows = await db.select().from(settings).where(eq(settings.userId, userId));
  return rows[0] ?? { userId, ...DEFAULT_SETTINGS };
}
