import { describe, it, expect } from "vitest";
import { parseOrquestText, weekdayAnchor, normalize } from "@/lib/orquest-parser";

const SAMPLE = `
Mis turnos
8 jun - 14 jun de 2026
Tus turnos
Lun 8
09:00 - 14:00
Mar 9
Día libre
Mié 10
13:30 - 17:00 / 19:30 - 23:00
Jue 11
Sin asignaciones
Vie 12
17:00 - 01:00
Sáb 13
Día libre
14 Dom
10:00 - 15:30
`;

describe("parseOrquestText", () => {
  const result = parseOrquestText(SAMPLE);

  it("detecta año y lunes de la semana", () => {
    expect(result.year).toBe(2026);
    expect(result.weekStart).toBe("2026-06-08");
  });

  it("asigna fechas a los 7 días", () => {
    expect(result.days[0].date).toBe("2026-06-08");
    expect(result.days[6].date).toBe("2026-06-14");
  });

  it("turno simple", () => {
    expect(result.days[0].status).toBe("work");
    expect(result.days[0].segments).toEqual([{ startMin: 540, endMin: 840 }]);
  });

  it("día libre y sin asignaciones", () => {
    expect(result.days[1].status).toBe("free");
    expect(result.days[3].status).toBe("unassigned");
    expect(result.days[5].status).toBe("free");
  });

  it("turno partido: dos tramos", () => {
    expect(result.days[2].segments).toEqual([
      { startMin: 810, endMin: 1020 },
      { startMin: 1170, endMin: 1380 },
    ]);
  });

  it("turno que cruza medianoche", () => {
    expect(result.days[4].segments).toEqual([{ startMin: 1020, endMin: 1500 }]);
  });

  it("domingo con número delante", () => {
    expect(result.days[6].status).toBe("work");
    expect(result.days[6].segments).toEqual([{ startMin: 600, endMin: 930 }]);
  });
});

// Salida real de tesseract.js sobre una captura de móvil: las cajas negras
// con el día se leen mal ("PM", "YA", "PUE") y la abreviatura sale pegada a
// "Cuenca: General".
const REAL_OCR = `
22:40 - 2 $ kéío “Sal ED
Mis turnos
21 de junio de 2026
29 jun - 5 jul
29 30 1 2 3 4 5
Tus turnos
29 Día libre (63)
Lun Cuenca: General
PM Día libre (63)
MSN Cuenca: General
1 14:00 - 17:00 / 21:00 - 0:00
Mié Cuenca: General
14:30 - 18:30 / 21:00 - 1:00
Jue C a: Ganeral
Cuenca: Genera
3 13:00 - 15:30 / 19:30 - 23:00
Vie Cuenca: General
YA 21:00 - 2:00
ESE Cuenca: General
5 19:30 - 22:30
PUE Cuenca: General
(n Q [9 =
Inicio Peticiones Vacantes Menú
`;

describe("parseOrquestText con OCR real (cajas de día ilegibles)", () => {
  const r = parseOrquestText(REAL_OCR);

  it("semana del 29 jun al 5 jul de 2026", () => {
    expect(r.year).toBe(2026);
    expect(r.weekStart).toBe("2026-06-29");
    expect(r.days[6].date).toBe("2026-07-05");
  });

  it("lunes y martes libres (martes sin número legible)", () => {
    expect(r.days[0].status).toBe("free");
    expect(r.days[1].status).toBe("free");
  });

  it("miércoles resincronizado por el número 1: partido con cruce a 0:00", () => {
    expect(r.days[2].segments).toEqual([
      { startMin: 840, endMin: 1020 },
      { startMin: 1260, endMin: 1440 },
    ]);
  });

  it("jueves secuencial (sin número): partido con cruce a 1:00", () => {
    expect(r.days[3].segments).toEqual([
      { startMin: 870, endMin: 1110 },
      { startMin: 1260, endMin: 1500 },
    ]);
  });

  it("viernes por número 3", () => {
    expect(r.days[4].segments).toEqual([
      { startMin: 780, endMin: 930 },
      { startMin: 1170, endMin: 1380 },
    ]);
  });

  it("sábado con caja ilegible (YA): 21:00-2:00", () => {
    expect(r.days[5].segments).toEqual([{ startMin: 1260, endMin: 1560 }]);
  });

  it("domingo por número 5", () => {
    expect(r.days[6].segments).toEqual([{ startMin: 1170, endMin: 1350 }]);
  });

  it("la barra de estado y el menú no generan tramos", () => {
    const total = r.days.reduce((a, d) => a + d.segments.length, 0);
    expect(total).toBe(8);
  });
});

describe("weekdayAnchor", () => {
  it("acepta variantes", () => {
    expect(weekdayAnchor("Lun")).toEqual({ index: 0, dayNumber: null });
    expect(weekdayAnchor("21 Dom")).toEqual({ index: 6, dayNumber: 21 });
    expect(weekdayAnchor("Dom 21")).toEqual({ index: 6, dayNumber: 21 });
    expect(weekdayAnchor("Mié.")).toEqual({ index: 2, dayNumber: null });
    expect(weekdayAnchor("13:30 - 17:00")).toBeNull();
    expect(weekdayAnchor("cualquier texto")).toBeNull();
  });
});

describe("normalize", () => {
  it("quita tildes y baja a minúsculas", () => {
    expect(normalize("Miércoles Día LIBRE")).toBe("miercoles dia libre");
  });
});
