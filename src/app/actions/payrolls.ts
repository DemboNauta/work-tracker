"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { db, UPLOADS_DIR } from "@/lib/db";
import { payrolls, settings } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { decryptPdf } from "@/lib/pdf";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

export interface PayrollState {
  error?: string;
  ok?: boolean;
}

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

export async function uploadPayroll(
  _prev: PayrollState,
  formData: FormData
): Promise<PayrollState> {
  const user = await requireUser();

  const month = String(formData.get("month") ?? ""); // YYYY-MM
  const file = formData.get("file");

  const m = month.match(/^(\d{4})-(\d{2})$/);
  if (!m) return { error: "Selecciona el mes de la nómina." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo (PDF o imagen)." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Formato no admitido. Usa PDF, JPG, PNG o WebP." };
  }
  if (file.size > MAX_SIZE) return { error: "El archivo supera los 15 MB." };

  const year = Number(m[1]);
  const monthNum = Number(m[2]);
  if (monthNum < 1 || monthNum > 12) return { error: "Mes no válido." };

  let bytes: Buffer = Buffer.from(await file.arrayBuffer());

  // PDFs con contraseña: descifrar al subir para guardarlos desbloqueados.
  const rememberPassword = formData.get("rememberPassword") != null;
  let passwordToRemember: string | null = null;
  if (file.type === "application/pdf") {
    const typed = String(formData.get("pdfPassword") ?? "").trim();
    const saved = typed ? null : await getSavedPdfPassword(user.id);
    const password = typed || saved || undefined;

    const res = decryptPdf(bytes, password);
    if (res.ok === "needs-password") {
      return { error: "Este PDF tiene contraseña. Introdúcela para guardarlo." };
    }
    if (res.ok === "wrong-password") {
      return { error: "Contraseña del PDF incorrecta." };
    }
    bytes = res.data;
    if (rememberPassword && typed) passwordToRemember = typed;
  }

  const ext = path.extname(file.name) || ".pdf";
  const storedName = `${user.id}-${year}-${String(monthNum).padStart(2, "0")}-${crypto
    .randomBytes(6)
    .toString("hex")}${ext}`;
  await fs.writeFile(path.join(UPLOADS_DIR, storedName), bytes);

  // Una nómina por mes: reemplaza la existente
  const [previous] = await db
    .select()
    .from(payrolls)
    .where(
      and(
        eq(payrolls.userId, user.id),
        eq(payrolls.year, year),
        eq(payrolls.month, monthNum)
      )
    );
  if (previous) {
    await db.delete(payrolls).where(eq(payrolls.id, previous.id));
    await fs.unlink(path.join(UPLOADS_DIR, previous.storedName)).catch(() => {});
  }

  await db.insert(payrolls).values({
    userId: user.id,
    year,
    month: monthNum,
    fileName: file.name,
    storedName,
    mimeType: file.type,
    size: bytes.length,
  });

  if (passwordToRemember) {
    const enc = encryptSecret(passwordToRemember);
    await db
      .insert(settings)
      .values({ userId: user.id, payrollPdfPassword: enc })
      .onConflictDoUpdate({
        target: settings.userId,
        set: { payrollPdfPassword: enc },
      });
  }

  revalidatePath("/nominas");
  return { ok: true };
}

/** Contraseña de PDF guardada por el usuario (descifrada), o null. */
async function getSavedPdfPassword(userId: number): Promise<string | null> {
  const [row] = await db
    .select({ pw: settings.payrollPdfPassword })
    .from(settings)
    .where(eq(settings.userId, userId));
  return row?.pw ? decryptSecret(row.pw) : null;
}

export async function deletePayroll(id: number): Promise<void> {
  const user = await requireUser();
  const [row] = await db
    .select()
    .from(payrolls)
    .where(and(eq(payrolls.id, id), eq(payrolls.userId, user.id)));
  if (!row) return;
  await db.delete(payrolls).where(eq(payrolls.id, row.id));
  await fs.unlink(path.join(UPLOADS_DIR, row.storedName)).catch(() => {});
  revalidatePath("/nominas");
}
