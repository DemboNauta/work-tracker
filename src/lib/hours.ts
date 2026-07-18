/**
 * Motor de cálculo de horas trabajadas.
 *
 * Convenciones:
 * - Los tramos se expresan en minutos desde la medianoche del día `date`.
 * - `endMin` puede superar 1440 si el tramo cruza la medianoche.
 * - Horas nocturnas: las comprendidas en la ventana [nightStart, nightEnd)
 *   (por defecto 22:00 → 06:00).
 * - Horas complementarias: el exceso sobre el límite semanal o anual
 *   configurado (por defecto 16 h/semana, 720 h/año).
 */

export interface Segment {
  date: string; // YYYY-MM-DD
  startMin: number;
  endMin: number;
}

export interface HourLimits {
  weeklyLimitMin: number;
  annualLimitMin: number;
  nightStartMin: number;
  nightEndMin: number;
}

export const DEFAULT_LIMITS: HourLimits = {
  weeklyLimitMin: 16 * 60,
  annualLimitMin: 720 * 60,
  nightStartMin: 22 * 60,
  nightEndMin: 6 * 60,
};

export function segmentMinutes(s: Pick<Segment, "startMin" | "endMin">): number {
  return Math.max(0, s.endMin - s.startMin);
}

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

/**
 * Minutos nocturnos de un tramo. Ventanas nocturnas sobre el eje del tramo
 * (que puede extenderse hasta 2880 si cruza la medianoche):
 *   [0, nightEnd)                — madrugada del propio día
 *   [nightStart, 1440+nightEnd)  — noche que empieza ese día
 *   [1440+nightStart, 2880)      — noche del día siguiente (tramos larguísimos)
 */
export function nightMinutes(
  s: Pick<Segment, "startMin" | "endMin">,
  limits: HourLimits = DEFAULT_LIMITS
): number {
  const { nightStartMin, nightEndMin } = limits;
  return (
    overlap(s.startMin, s.endMin, 0, nightEndMin) +
    overlap(s.startMin, s.endMin, nightStartMin, 1440 + nightEndMin) +
    overlap(s.startMin, s.endMin, 1440 + nightStartMin, 2880)
  );
}

export interface DayTotal {
  date: string;
  totalMin: number;
  nightMin: number;
  segments: Segment[];
}

export function groupByDay(segments: Segment[], limits: HourLimits = DEFAULT_LIMITS): Map<string, DayTotal> {
  const map = new Map<string, DayTotal>();
  for (const s of segments) {
    let day = map.get(s.date);
    if (!day) {
      day = { date: s.date, totalMin: 0, nightMin: 0, segments: [] };
      map.set(s.date, day);
    }
    day.totalMin += segmentMinutes(s);
    day.nightMin += nightMinutes(s, limits);
    day.segments.push(s);
  }
  return map;
}

/** Lunes de la semana ISO a la que pertenece la fecha (YYYY-MM-DD). */
export function isoWeekStart(date: string): string {
  const d = parseDate(date);
  const dow = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - dow);
  return formatDate(d);
}

export function parseDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export interface WeekTotal {
  weekStart: string; // lunes
  totalMin: number;
  nightMin: number;
  /** Exceso sobre el límite semanal. */
  complementaryMin: number;
}

export function groupByWeek(
  segments: Segment[],
  limits: HourLimits = DEFAULT_LIMITS
): Map<string, WeekTotal> {
  const map = new Map<string, WeekTotal>();
  for (const s of segments) {
    const ws = isoWeekStart(s.date);
    let w = map.get(ws);
    if (!w) {
      w = { weekStart: ws, totalMin: 0, nightMin: 0, complementaryMin: 0 };
      map.set(ws, w);
    }
    w.totalMin += segmentMinutes(s);
    w.nightMin += nightMinutes(s, limits);
  }
  for (const w of map.values()) {
    w.complementaryMin = Math.max(0, w.totalMin - limits.weeklyLimitMin);
  }
  return map;
}

export interface YearSummary {
  year: number;
  totalMin: number;
  nightMin: number;
  /** Suma de excesos semanales del año. */
  weeklyComplementaryMin: number;
  /** Exceso sobre el límite anual. */
  annualExcessMin: number;
  /** Complementarias totales: máximo de ambos criterios. */
  complementaryMin: number;
}

export function yearSummary(
  segments: Segment[],
  year: number,
  limits: HourLimits = DEFAULT_LIMITS
): YearSummary {
  const inYear = segments.filter((s) => s.date.startsWith(`${year}-`));
  const totalMin = inYear.reduce((a, s) => a + segmentMinutes(s), 0);
  const nightMin = inYear.reduce((a, s) => a + nightMinutes(s, limits), 0);
  const weeks = groupByWeek(inYear, limits);
  const weeklyComplementaryMin = [...weeks.values()].reduce(
    (a, w) => a + w.complementaryMin,
    0
  );
  const annualExcessMin = Math.max(0, totalMin - limits.annualLimitMin);
  return {
    year,
    totalMin,
    nightMin,
    weeklyComplementaryMin,
    annualExcessMin,
    complementaryMin: Math.max(weeklyComplementaryMin, annualExcessMin),
  };
}

/** Formatea minutos como "12h 30m" (o "0h"). */
export function fmtMin(min: number): string {
  const sign = min < 0 ? "-" : "";
  min = Math.abs(Math.round(min));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${String(m).padStart(2, "0")}m`;
}

/** Formatea minutos desde medianoche como "HH:MM" (normaliza >24h). */
export function fmtTime(min: number): string {
  const norm = ((min % 1440) + 1440) % 1440;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(norm / 60))}:${p(norm % 60)}`;
}
