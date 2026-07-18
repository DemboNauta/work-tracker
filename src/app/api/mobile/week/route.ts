import { authenticateBearer, getUserSettings } from "@/lib/auth";
import { getDashboardData, getShiftsBetween, limitsFrom } from "@/lib/queries";
import { formatDate } from "@/lib/hours";

// Semana actual (o la de ?date=YYYY-MM-DD) para el widget/app Android.
// Reutiliza el motor de cálculo del panel web (getDashboardData).
export async function GET(req: Request) {
  const user = await authenticateBearer(req);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const today =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : formatDate(new Date());

  const settings = await getUserSettings(user.id);
  const limits = limitsFrom(settings);
  const data = await getDashboardData(user.id, limits, today);

  // Tramos por día (turnos) para el widget. Agrupa los shifts de la semana.
  const weekStart = data.weekDays[0]?.date;
  const weekEnd = data.weekDays[data.weekDays.length - 1]?.date;
  const segsByDate = new Map<string, { startMin: number; endMin: number }[]>();
  if (weekStart && weekEnd) {
    const rows = await getShiftsBetween(user.id, weekStart, weekEnd);
    for (const r of rows) {
      const list = segsByDate.get(r.date) ?? [];
      list.push({ startMin: r.startMin, endMin: r.endMin });
      segsByDate.set(r.date, list);
    }
    for (const list of segsByDate.values()) {
      list.sort((a, b) => a.startMin - b.startMin);
    }
  }

  return Response.json({
    weekStart: data.weekDays[0]?.date ?? null,
    days: data.weekDays.map((d) => ({
      date: d.date,
      weekdayShort: d.weekdayShort,
      totalMin: d.totalMin,
      nightMin: d.nightMin,
      isToday: d.isToday,
      segments: segsByDate.get(d.date) ?? [],
    })),
    weekTotalMin: data.week.totalMin,
    weekNightMin: data.week.nightMin,
    weekComplementaryMin: data.week.complementaryMin,
    weeklyLimitMin: data.week.limitMin,
  });
}
