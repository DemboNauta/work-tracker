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

/** Firma un JWT de sesión (sub = userId). Compartido por cookie web y API móvil. */
export async function signToken(userId: number): Promise<string> {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function createSession(userId: number) {
  const token = await signToken(userId);
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

/**
 * Autentica una petición de API por cabecera `Authorization: Bearer <jwt>`.
 * No usa cookies (pensado para clientes nativos). Devuelve el usuario o null.
 */
export async function authenticateBearer(req: Request): Promise<User | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], getSecret());
    const userId = payload.sub ? Number(payload.sub) : null;
    if (userId == null || Number.isNaN(userId)) return null;
    const rows = await db.select().from(users).where(eq(users.id, userId));
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

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
  payrollPdfPassword: null,
};

export async function getUserSettings(userId: number): Promise<Settings> {
  const rows = await db.select().from(settings).where(eq(settings.userId, userId));
  return rows[0] ?? { userId, ...DEFAULT_SETTINGS };
}
