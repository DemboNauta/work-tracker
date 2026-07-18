"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

export interface SettingsState {
  error?: string;
  ok?: boolean;
}

export async function saveSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const user = await requireUser();

  const weeklyHours = Number(formData.get("weeklyHours"));
  const annualHours = Number(formData.get("annualHours"));
  const nightStart = String(formData.get("nightStart") ?? "22:00");
  const nightEnd = String(formData.get("nightEnd") ?? "06:00");

  if (!Number.isFinite(weeklyHours) || weeklyHours <= 0 || weeklyHours > 168) {
    return { error: "Límite semanal no válido (1-168 horas)." };
  }
  if (!Number.isFinite(annualHours) || annualHours <= 0 || annualHours > 8784) {
    return { error: "Límite anual no válido." };
  }
  const toMin = (t: string): number | null => {
    const m = t.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Number(m[1]), min = Number(m[2]);
    return h > 23 || min > 59 ? null : h * 60 + min;
  };
  const nightStartMin = toMin(nightStart);
  const nightEndMin = toMin(nightEnd);
  if (nightStartMin === null || nightEndMin === null) {
    return { error: "Horario nocturno no válido." };
  }

  await db
    .insert(settings)
    .values({
      userId: user.id,
      weeklyLimitMin: Math.round(weeklyHours * 60),
      annualLimitMin: Math.round(annualHours * 60),
      nightStartMin,
      nightEndMin,
    })
    .onConflictDoUpdate({
      target: settings.userId,
      set: {
        weeklyLimitMin: Math.round(weeklyHours * 60),
        annualLimitMin: Math.round(annualHours * 60),
        nightStartMin,
        nightEndMin,
      },
    });

  revalidatePath("/", "layout");
  return { ok: true };
}
