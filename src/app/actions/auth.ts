"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createSession, destroySession, requireUser } from "@/lib/auth";

export interface AuthState {
  error?: string;
}

// Sin registro público: los usuarios se crean por administración
// (scripts/seed-users.cjs en el servidor).

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const [user] = await db.select().from(users).where(eq(users.name, name));
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Nombre o contraseña incorrectos." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export interface PasswordState {
  error?: string;
  ok?: boolean;
}

export async function changePassword(
  _prev: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const user = await requireUser();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "La contraseña actual no es correcta." };
  }
  if (next.length < 6) {
    return { error: "La nueva contraseña debe tener al menos 6 caracteres." };
  }
  if (next !== confirm) {
    return { error: "Las contraseñas nuevas no coinciden." };
  }
  if (next === current) {
    return { error: "La nueva contraseña es igual que la actual." };
  }

  const passwordHash = await bcrypt.hash(next, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
  return { ok: true };
}
