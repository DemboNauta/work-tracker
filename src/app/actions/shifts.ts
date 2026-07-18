"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { shifts } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

export interface ShiftState {
  error?: string;
  ok?: boolean;
}

function parseTime(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export async function addShift(
  _prev: ShiftState,
  formData: FormData
): Promise<ShiftState> {
  const user = await requireUser();
  const date = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Fecha no válida." };

  // Admite varios tramos: start[]/end[] emparejados por posición
  const starts = formData.getAll("start").map(String);
  const ends = formData.getAll("end").map(String);

  const rows: { startMin: number; endMin: number }[] = [];
  for (let i = 0; i < Math.max(starts.length, ends.length); i++) {
    const rawStart = starts[i] ?? "";
    const rawEnd = ends[i] ?? "";
    if (rawStart === "" && rawEnd === "") continue; // tramo sin rellenar
    const start = parseTime(rawStart);
    let end = parseTime(rawEnd);
    if (start === null || end === null) {
      return { error: `Tramo ${i + 1}: falta inicio o fin.` };
    }
    if (end === start) {
      return { error: `Tramo ${i + 1}: el inicio y el fin son iguales.` };
    }
    if (end < start) end += 1440; // cruza medianoche
    rows.push({ startMin: start, endMin: end });
  }
  if (rows.length === 0) {
    return { error: "Añade al menos un tramo completo (inicio y fin)." };
  }

  try {
    await db.insert(shifts).values(
      rows.map((r) => ({
        userId: user.id,
        date,
        startMin: r.startMin,
        endMin: r.endMin,
        source: "manual" as const,
        note,
      }))
    );
  } catch {
    return { error: "Ya existe un tramo idéntico para ese día." };
  }

  revalidatePath("/");
  revalidatePath("/turnos");
  return { ok: true };
}

export async function deleteShift(id: number): Promise<void> {
  const user = await requireUser();
  await db
    .delete(shifts)
    .where(and(eq(shifts.id, id), eq(shifts.userId, user.id)));
  revalidatePath("/");
  revalidatePath("/turnos");
}

export interface ImportDay {
  date: string;
  segments: { startMin: number; endMin: number }[];
}

/**
 * Importa días detectados por OCR. Idempotente: reemplaza los tramos OCR
 * existentes de cada fecha importada.
 */
export async function importOcrDays(
  days: ImportDay[]
): Promise<{ imported: number; error?: string }> {
  const user = await requireUser();
  const valid = days.filter(
    (d) =>
      /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
      d.segments.every(
        (s) =>
          Number.isInteger(s.startMin) &&
          Number.isInteger(s.endMin) &&
          s.startMin >= 0 &&
          s.startMin < 1440 &&
          s.endMin > s.startMin &&
          s.endMin <= 2880
      )
  );
  if (valid.length === 0) return { imported: 0, error: "Nada que importar." };

  const dates = valid.map((d) => d.date);
  await db
    .delete(shifts)
    .where(
      and(
        eq(shifts.userId, user.id),
        eq(shifts.source, "ocr"),
        inArray(shifts.date, dates)
      )
    );

  let imported = 0;
  for (const day of valid) {
    for (const seg of day.segments) {
      try {
        await db.insert(shifts).values({
          userId: user.id,
          date: day.date,
          startMin: seg.startMin,
          endMin: seg.endMin,
          source: "ocr",
        });
        imported++;
      } catch {
        // tramo duplicado con uno manual: se ignora
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/turnos");
  return { imported };
}
