import Link from "next/link";
import { requireUser, getUserSettings } from "@/lib/auth";
import { getShiftsBetween, limitsFrom } from "@/lib/queries";
import {
  fmtMin,
  fmtTime,
  formatDate,
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

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_ES[m - 1]} ${y}`;
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const limits = limitsFrom(settings);

  const params = await searchParams;
  const current = formatDate(new Date()).slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(params.mes ?? "") ? params.mes! : current;

  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const rows = await getShiftsBetween(
    user.id,
    `${month}-01`,
    `${month}-${String(lastDay).padStart(2, "0")}`
  );

  const byDate = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }
  const monthTotal = rows.reduce((a, r) => a + segmentMinutes(r), 0);
  const monthNight = rows.reduce((a, r) => a + nightMinutes(r, limits), 0);

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
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {monthLabel(month)}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/turnos?mes=${shiftMonth(month, -1)}`}>←</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/turnos?mes=${shiftMonth(month, 1)}`}>→</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="tnum">
                Total: {fmtMin(monthTotal)}
              </Badge>
              <Badge
                variant="outline"
                className="tnum border-night/40 bg-night/10 text-night"
              >
                🌙 {fmtMin(monthNight)}
              </Badge>
            </div>

            {byDate.size === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin turnos este mes.
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
                      <span className="tnum text-sm font-bold">
                        {date.split("-").reverse().join("/")}
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
