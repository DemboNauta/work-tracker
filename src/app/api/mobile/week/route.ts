import { authenticateBearer, getUserSettings } from "@/lib/auth";
import { getDashboardData, limitsFrom } from "@/lib/queries";
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

  return Response.json({
    weekStart: data.weekDays[0]?.date ?? null,
    days: data.weekDays.map((d) => ({
      date: d.date,
      weekdayShort: d.weekdayShort,
      totalMin: d.totalMin,
      nightMin: d.nightMin,
      isToday: d.isToday,
    })),
    weekTotalMin: data.week.totalMin,
    weekNightMin: data.week.nightMin,
    weekComplementaryMin: data.week.complementaryMin,
    weeklyLimitMin: data.week.limitMin,
  });
}
