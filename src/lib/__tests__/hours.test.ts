import { describe, it, expect } from "vitest";
import {
  nightMinutes,
  segmentMinutes,
  groupByWeek,
  yearSummary,
  isoWeekStart,
  fmtMin,
  fmtTime,
  DEFAULT_LIMITS,
} from "@/lib/hours";

describe("nightMinutes", () => {
  it("turno diurno sin horas nocturnas", () => {
    expect(nightMinutes({ startMin: 9 * 60, endMin: 17 * 60 })).toBe(0);
  });

  it("turno que entra en la noche (19:30-23:00 → 1h nocturna)", () => {
    expect(nightMinutes({ startMin: 19 * 60 + 30, endMin: 23 * 60 })).toBe(60);
  });

  it("turno que cruza medianoche (22:00-02:00 → 4h nocturnas)", () => {
    expect(nightMinutes({ startMin: 22 * 60, endMin: 26 * 60 })).toBe(240);
  });

  it("madrugada del propio día (04:00-08:00 → 2h nocturnas)", () => {
    expect(nightMinutes({ startMin: 4 * 60, endMin: 8 * 60 })).toBe(120);
  });

  it("ventana nocturna configurable (desde 21:00)", () => {
    const limits = { ...DEFAULT_LIMITS, nightStartMin: 21 * 60 };
    expect(nightMinutes({ startMin: 20 * 60, endMin: 23 * 60 }, limits)).toBe(120);
  });
});

describe("agregados", () => {
  it("semana ISO empieza en lunes", () => {
    expect(isoWeekStart("2026-07-03")).toBe("2026-06-29"); // viernes → lunes
    expect(isoWeekStart("2026-06-29")).toBe("2026-06-29");
    expect(isoWeekStart("2026-07-05")).toBe("2026-06-29"); // domingo
  });

  it("complementarias semanales = exceso sobre 16h", () => {
    const segs = [
      { date: "2026-06-29", startMin: 9 * 60, endMin: 18 * 60 }, // 9h
      { date: "2026-06-30", startMin: 9 * 60, endMin: 18 * 60 }, // 9h
    ];
    const weeks = groupByWeek(segs);
    const w = weeks.get("2026-06-29")!;
    expect(w.totalMin).toBe(18 * 60);
    expect(w.complementaryMin).toBe(2 * 60);
  });

  it("resumen anual acumula excesos semanales y detecta exceso anual", () => {
    const segs = [
      { date: "2026-01-05", startMin: 9 * 60, endMin: 27 * 60 }, // 18h (lunes)
      { date: "2026-02-02", startMin: 9 * 60, endMin: 19 * 60 }, // 10h
    ];
    const s = yearSummary(segs, 2026);
    expect(s.totalMin).toBe(28 * 60);
    expect(s.weeklyComplementaryMin).toBe(2 * 60); // solo la primera semana excede
    expect(s.annualExcessMin).toBe(0);
    expect(s.complementaryMin).toBe(2 * 60);
  });
});

describe("formato", () => {
  it("fmtMin", () => {
    expect(fmtMin(0)).toBe("0h");
    expect(fmtMin(90)).toBe("1h 30m");
    expect(fmtMin(720 * 60)).toBe("720h");
  });
  it("fmtTime normaliza más de 24h", () => {
    expect(fmtTime(22 * 60)).toBe("22:00");
    expect(fmtTime(26 * 60)).toBe("02:00");
  });
});
