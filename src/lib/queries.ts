import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { shifts, type Shift, type Settings } from "@/lib/db/schema";
import {
  addDays,
  formatDate,
  fmtMin,
  groupByDay,
  groupByWeek,
  isoWeekStart,
  nightMinutes,
  segmentMinutes,
  yearSummary,
  type HourLimits,
  type YearSummary,
} from "@/lib/hours";

export function limitsFrom(s: Settings): HourLimits {
  return {
    weeklyLimitMin: s.weeklyLimitMin,
    annualLimitMin: s.annualLimitMin,
    nightStartMin: s.nightStartMin,
    nightEndMin: s.nightEndMin,
  };
}

export async function getShiftsBetween(
  userId: number,
  from: string,
  to: string
): Promise<Shift[]> {
  return db
    .select()
    .from(shifts)
    .where(
      and(eq(shifts.userId, userId), gte(shifts.date, from), lte(shifts.date, to))
    )
    .orderBy(desc(shifts.date), shifts.startMin);
}

export interface PeriodStat {
  label: string;
  totalMin: number;
  nightMin: number;
}

export interface WeekDayBar {
  date: string;
  weekdayShort: string;
  totalMin: number;
  nightMin: number;
  isToday: boolean;
}

export interface WeekHistoryBar {
  weekStart: string;
  totalMin: number;
  complementaryMin: number;
}

export interface DashboardData {
  today: PeriodStat;
  week: PeriodStat & { complementaryMin: number; limitMin: number };
  month: PeriodStat;
  year: YearSummary & { limitMin: number };
  weekDays: WeekDayBar[];
  weekHistory: WeekHistoryBar[];
}

const WEEKDAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export async function getDashboardData(
  userId: number,
  limits: HourLimits,
  todayStr = formatDate(new Date())
): Promise<DashboardData> {
  const year = Number(todayStr.slice(0, 4));
  const weekStart = isoWeekStart(todayStr);
  // Historia: 8 semanas hacia atrás; rango total a consultar
  const historyStart = addDays(weekStart, -7 * 7);
  const from = `${year}-01-01` < historyStart ? `${year}-01-01` : historyStart;
  const to = addDays(weekStart, 6) > `${year}-12-31` ? addDays(weekStart, 6) : `${year}-12-31`;

  const rows = await getShiftsBetween(userId, from, to);
  const segs = rows.map((r) => ({
    date: r.date,
    startMin: r.startMin,
    endMin: r.endMin,
  }));

  const days = groupByDay(segs, limits);
  const weeks = groupByWeek(segs, limits);

  const todayTotal = days.get(todayStr);

  const monthPrefix = todayStr.slice(0, 7);
  const monthSegs = segs.filter((s) => s.date.startsWith(monthPrefix));

  const weekEntry = weeks.get(weekStart);

  const weekDays: WeekDayBar[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const d = days.get(date);
    return {
      date,
      weekdayShort: WEEKDAYS_ES[i],
      totalMin: d?.totalMin ?? 0,
      nightMin: d?.nightMin ?? 0,
      isToday: date === todayStr,
    };
  });

  const weekHistory: WeekHistoryBar[] = Array.from({ length: 8 }, (_, i) => {
    const ws = addDays(weekStart, -7 * (7 - i));
    const w = weeks.get(ws);
    return {
      weekStart: ws,
      totalMin: w?.totalMin ?? 0,
      complementaryMin: w?.complementaryMin ?? 0,
    };
  });

  return {
    today: {
      label: "Hoy",
      totalMin: todayTotal?.totalMin ?? 0,
      nightMin: todayTotal?.nightMin ?? 0,
    },
    week: {
      label: "Esta semana",
      totalMin: weekEntry?.totalMin ?? 0,
      nightMin: weekEntry?.nightMin ?? 0,
      complementaryMin: weekEntry?.complementaryMin ?? 0,
      limitMin: limits.weeklyLimitMin,
    },
    month: {
      label: "Este mes",
      totalMin: monthSegs.reduce((a, s) => a + segmentMinutes(s), 0),
      nightMin: monthSegs.reduce((a, s) => a + nightMinutes(s, limits), 0),
    },
    year: {
      ...yearSummary(segs, year, limits),
      limitMin: limits.annualLimitMin,
    },
    weekDays,
    weekHistory,
  };
}

export { fmtMin };
