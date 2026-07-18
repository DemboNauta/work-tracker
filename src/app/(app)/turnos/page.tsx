import Link from "next/link";
import { requireUser, getUserSettings } from "@/lib/auth";
import { getShiftsBetween, limitsFrom } from "@/lib/queries";
import {
  addDays,
  fmtMin,
  fmtTime,
  formatDate,
  isoWeekStart,
  nightMinutes,
  segmentMinutes,
} from "@/lib/hours";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShiftForm } from "./shift-form";
import { DeleteShiftButton } from "./delete-shift-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Turnos · Fichaje" };

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MONTHS_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];
const WEEKDAYS_LONG = [
  "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
];

function weekdayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // lunes = 0
  return WEEKDAYS_LONG[dow];
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_ES[m - 1]} ${y}`;
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function weekLabel(start: string, end: string): string {
  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  if (ys === ye && ms === me) return `${ds}–${de} ${MONTHS_SHORT[ms - 1]} ${ys}`;
  if (ys === ye) {
    return `${ds} ${MONTHS_SHORT[ms - 1]} – ${de} ${MONTHS_SHORT[me - 1]} ${ys}`;
  }
  return `${ds} ${MONTHS_SHORT[ms - 1]} ${ys} – ${de} ${MONTHS_SHORT[me - 1]} ${ye}`;
}

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; semana?: string; vista?: string }>;
}) {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const limits = limitsFrom(settings);

  const params = await searchParams;
  const today = formatDate(new Date());
  const view = params.vista === "mes" ? "mes" : "semana";

  // Rango a consultar y navegación según la vista activa
  let from: string;
  let to: string;
  let periodLabel: string;
  let prevHref: string;
  let nextHref: string;
  let month = today.slice(0, 7);

  if (view === "semana") {
    const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(params.semana ?? "")
      ? isoWeekStart(params.semana!)
      : isoWeekStart(today);
    const weekEnd = addDays(weekStart, 6);
    from = weekStart;
    to = weekEnd;
    periodLabel = weekLabel(weekStart, weekEnd);
    prevHref = `/turnos?vista=semana&semana=${addDays(weekStart, -7)}`;
    nextHref = `/turnos?vista=semana&semana=${addDays(weekStart, 7)}`;
  } else {
    month = /^\d{4}-\d{2}$/.test(params.mes ?? "") ? params.mes! : today.slice(0, 7);
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    from = `${month}-01`;
    to = `${month}-${String(lastDay).padStart(2, "0")}`;
    periodLabel = monthLabel(month);
    prevHref = `/turnos?vista=mes&mes=${shiftMonth(month, -1)}`;
    nextHref = `/turnos?vista=mes&mes=${shiftMonth(month, 1)}`;
  }

  const rows = await getShiftsBetween(user.id, from, to);

  const byDate = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }
  const periodTotal = rows.reduce((a, r) => a + segmentMinutes(r), 0);
  const periodNight = rows.reduce((a, r) => a + nightMinutes(r, limits), 0);
  const complementary =
    view === "semana" ? Math.max(0, periodTotal - limits.weeklyLimitMin) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-heading text-3xl">Turnos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registra tus horas manualmente o{" "}
          <Link href="/importar" className="text-primary underline-offset-4 hover:underline">
            impórtalas por OCR
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <ShiftForm />

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex overflow-hidden rounded-md border">
                <Button
                  asChild
                  variant={view === "semana" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none"
                >
                  <Link href="/turnos?vista=semana">Semana</Link>
                </Button>
                <Button
                  asChild
                  variant={view === "mes" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none"
                >
                  <Link href="/turnos?vista=mes">Mes</Link>
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={prevHref}>←</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={nextHref}>→</Link>
                </Button>
              </div>
            </div>
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {periodLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="tnum">
                Total: {fmtMin(periodTotal)}
              </Badge>
              <Badge
                variant="outline"
                className="tnum border-night/40 bg-night/10 text-night"
              >
                🌙 {fmtMin(periodNight)}
              </Badge>
              {view === "semana" &&
                (complementary > 0 ? (
                  <Badge
                    variant="outline"
                    className="tnum border-complementary/40 bg-complementary/10 text-complementary"
                  >
                    +{fmtMin(complementary)} complementarias
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-ok/40 bg-ok/10 text-ok"
                  >
                    dentro del límite
                  </Badge>
                ))}
            </div>

            {byDate.size === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {view === "semana" ? "Sin turnos esta semana." : "Sin turnos este mes."}
              </p>
            )}

            <div className="space-y-3">
              {[...byDate.entries()].map(([date, dayRows]) => {
                const dayTotal = dayRows.reduce((a, r) => a + segmentMinutes(r), 0);
                const dayNight = dayRows.reduce(
                  (a, r) => a + nightMinutes(r, limits),
                  0
                );
                return (
                  <div key={date} className="rounded-md border bg-muted/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold">
                        {weekdayLabel(date)}{" "}
                        <span className="tnum">{date.split("-").reverse().join("/")}</span>
                      </span>
                      <span className="tnum text-sm text-muted-foreground">
                        {fmtMin(dayTotal)}
                        {dayNight > 0 && (
                          <span className="text-night"> · 🌙 {fmtMin(dayNight)}</span>
                        )}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {dayRows.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="tnum">
                            {fmtTime(r.startMin)} – {fmtTime(r.endMin)}
                            {r.endMin > 1440 && (
                              <span className="text-muted-foreground"> (+1d)</span>
                            )}
                          </span>
                          <span className="flex items-center gap-2">
                            {r.note && (
                              <span className="max-w-40 truncate text-xs text-muted-foreground">
                                {r.note}
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={
                                r.source === "ocr"
                                  ? "border-primary/40 text-primary"
                                  : "text-muted-foreground"
                              }
                            >
                              {r.source === "ocr" ? "OCR" : "manual"}
                            </Badge>
                            <DeleteShiftButton id={r.id} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
