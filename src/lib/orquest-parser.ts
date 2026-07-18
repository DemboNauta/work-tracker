/**
 * Parser del texto OCR de la pantalla "Mis turnos" de Orquest.
 * Inspirado en el ShiftParser de DemboNauta/orquest-calendar, adaptado a la
 * salida de tesseract.js sobre capturas reales.
 *
 * El OCR suele destrozar las cajas negras con el día ("30 Mar" → "PM"), así
 * que no se puede depender de las abreviaturas de día. Estrategia:
 * - Cabecera de semana ("29 jun - 5 jul") + año ("... de 2026") → fechas.
 * - Tras "Tus turnos", cada línea con contenido (tramos horarios, "Día
 *   libre" o "Sin asignaciones") es una tarjeta; las tarjetas van en orden
 *   Lun→Dom, y si la línea empieza por un número que coincide con el día del
 *   mes de la semana, se resincroniza el índice.
 * - Se mantienen las anclas puras ("Lun", "21 Dom") como apoyo.
 */

import { addDays, formatDate, parseDate } from "@/lib/hours";

export type DayStatus = "work" | "free" | "unassigned" | "unknown";

export interface ParsedSegment {
  startMin: number;
  endMin: number; // > 1440 si cruza medianoche
}

export interface ParsedDay {
  index: number; // lunes = 0 … domingo = 6
  date: string | null; // YYYY-MM-DD si se pudo resolver
  dayNumber: number | null; // número de día visto junto al ancla
  status: DayStatus;
  segments: ParsedSegment[];
}

export interface ParseResult {
  weekStart: string | null; // lunes YYYY-MM-DD
  year: number | null;
  days: ParsedDay[];
}

const MONTHS: Record<string, number> = (() => {
  const full = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const m: Record<string, number> = {};
  full.forEach((name, i) => {
    m[name] = i + 1;
    m[name.slice(0, 3)] = i + 1;
  });
  m["sept"] = 9;
  return m;
})();

const WEEKDAYS: Record<string, number> = {
  lun: 0, mar: 1, mie: 2, jue: 3, vie: 4, sab: 5, dom: 6,
};

/** Quita tildes y pasa a minúsculas (robusto frente a fallos de OCR). */
export function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i")
    .replace(/ó/g, "o").replace(/ú/g, "u").replace(/ü/g, "u");
}

export function monthNumber(token: string): number | null {
  return MONTHS[normalize(token).replace(/\.$/, "")] ?? null;
}

/**
 * Índice de día (lun=0…dom=6) de una línea que sea SOLO una abreviatura de
 * día, opcionalmente con el número del día delante o detrás ("21 Dom",
 * "Dom 21"). Devuelve null si la línea tiene más contenido.
 */
export function weekdayAnchor(
  line: string
): { index: number; dayNumber: number | null } | null {
  const n = normalize(line).replace(/\.$/, "");
  const m = n.match(/^(?:(\d{1,2})\s+)?([a-z]{3})(?:\s+(\d{1,2}))?$/);
  if (!m) return null;
  const idx = WEEKDAYS[m[2]];
  if (idx === undefined) return null;
  const num = m[1] ?? m[3];
  return { index: idx, dayNumber: num ? Number(num) : null };
}

const TIME_RANGE = /(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})/g;
const WEEK_RANGE =
  /(\d{1,2})\s+([a-záéíóú]{3,12})\.?\s*[-–—]\s*(\d{1,2})\s+([a-záéíóú]{3,12})\.?/;
const YEAR_RE = /\bde\s+(\d{4})\b/;

/** Extrae tramos horarios de una línea ("14:00 - 17:00 / 21:00 - 0:00"). */
export function parseTimeRanges(line: string): ParsedSegment[] {
  const out: ParsedSegment[] = [];
  for (const m of line.matchAll(TIME_RANGE)) {
    const sh = Number(m[1]), sm = Number(m[2]);
    const eh = Number(m[3]), em = Number(m[4]);
    if (sh > 23 || eh > 23 || sm > 59 || em > 59) continue;
    const start = sh * 60 + sm;
    let end = eh * 60 + em;
    if (end <= start) end += 1440; // cruza medianoche
    out.push({ startMin: start, endMin: end });
  }
  return out;
}

/**
 * Parsea el texto OCR completo de una captura.
 * `fallbackYear`: año a usar si la captura no lo incluye.
 */
export function parseOrquestText(
  text: string,
  fallbackYear: number = new Date().getFullYear()
): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let year: number | null = null;
  let headerDay: number | null = null;
  let headerMonth: number | null = null;

  // 1ª pasada: año y rango de semana
  for (const raw of lines) {
    const n = normalize(raw);
    if (year === null) {
      const ym = n.match(YEAR_RE);
      if (ym) year = Number(ym[1]);
    }
    if (headerDay === null) {
      const wm = n.match(WEEK_RANGE);
      if (wm) {
        const month = monthNumber(wm[2]);
        if (month !== null) {
          headerDay = Number(wm[1]);
          headerMonth = month;
        }
      }
    }
  }

  const y = year ?? fallbackYear;
  let weekStart: string | null = null;
  if (headerDay !== null && headerMonth !== null) {
    weekStart = formatDate(new Date(y, headerMonth - 1, headerDay));
  }

  const days: ParsedDay[] = Array.from({ length: 7 }, (_, i) => ({
    index: i,
    date: weekStart ? addDays(weekStart, i) : null,
    dayNumber: weekStart ? parseDate(addDays(weekStart, i)).getDate() : null,
    status: "unknown" as DayStatus,
    segments: [],
  }));

  // Día del mes → índice de la semana, para resincronizar
  const dayNumberToIndex = new Map<number, number>();
  if (weekStart) {
    days.forEach((d) => {
      if (d.dayNumber !== null) dayNumberToIndex.set(d.dayNumber, d.index);
    });
  }

  // 2ª pasada: tarjetas en orden Lun→Dom tras "Tus turnos" (si aparece)
  const startIdx = lines.findIndex((l) => normalize(l).includes("tus turnos"));
  const contentLines = startIdx >= 0 ? lines.slice(startIdx + 1) : lines;

  let nextIndex = 0;
  for (const raw of contentLines) {
    const n = normalize(raw);
    if (WEEK_RANGE.test(n) && !new RegExp(TIME_RANGE.source).test(raw)) continue;

    const anchor = weekdayAnchor(raw);
    if (anchor) {
      nextIndex = anchor.index;
      if (anchor.dayNumber !== null) days[anchor.index].dayNumber = anchor.dayNumber;
      continue;
    }

    const segs = parseTimeRanges(raw);
    const isFree = n.includes("dia libre");
    const isUnassigned = n.includes("sin asignacion");
    if (segs.length === 0 && !isFree && !isUnassigned) continue; // ruido

    // Resincroniza con el número de día al inicio de la tarjeta
    let index = nextIndex;
    const lead = n.match(/^(\d{1,2})\s/);
    if (lead) {
      const mapped = dayNumberToIndex.get(Number(lead[1]));
      if (mapped !== undefined) index = mapped;
    }
    if (index > 6) continue;

    const day = days[index];
    if (segs.length > 0) {
      day.segments.push(...segs);
      day.status = "work";
    } else if (day.status === "unknown") {
      day.status = isFree ? "free" : "unassigned";
    }
    nextIndex = index + 1;
  }

  return { weekStart, year, days };
}
