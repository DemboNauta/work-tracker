"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { db, UPLOADS_DIR } from "@/lib/db";
import { payrolls } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

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

  const ext = path.extname(file.name) || ".pdf";
  const storedName = `${user.id}-${year}-${String(monthNum).padStart(2, "0")}-${crypto
    .randomBytes(6)
    .toString("hex")}${ext}`;
  await fs.writeFile(
    path.join(UPLOADS_DIR, storedName),
    Buffer.from(await file.arrayBuffer())
  );

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
    size: file.size,
  });

  revalidatePath("/nominas");
  return { ok: true };
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
