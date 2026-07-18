import Link from "next/link";
import { requireUser, getUserSettings } from "@/lib/auth";
import { getDashboardData, limitsFrom } from "@/lib/queries";
import { fmtMin, fmtTime } from "@/lib/hours";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  night,
  extra,
}: {
  label: string;
  value: string;
  night: number;
  extra?: React.ReactNode;
}) {
  return (
    <Card className="stamp-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="tnum text-2xl font-bold sm:text-3xl">{value}</div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Badge
            variant="outline"
            className="border-night/40 bg-night/10 text-night"
          >
            🌙 {fmtMin(night)} nocturnas
          </Badge>
          {extra}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);
  const limits = limitsFrom(settings);
  const data = await getDashboardData(user.id, limits);

  const maxDay = Math.max(...data.weekDays.map((d) => d.totalMin), 60);
  const maxWeek = Math.max(
    ...data.weekHistory.map((w) => w.totalMin),
    limits.weeklyLimitMin,
    60
  );
  const annualPct = Math.min(
    100,
    (data.year.totalMin / data.year.limitMin) * 100
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display-heading text-3xl">Panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nocturnas desde las {fmtTime(limits.nightStartMin)} · límite{" "}
            {fmtMin(limits.weeklyLimitMin)}/semana · {fmtMin(limits.annualLimitMin)}/año
          </p>
        </div>
        <Button asChild>
          <Link href="/turnos">+ Registrar horas</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Hoy"
          value={fmtMin(data.today.totalMin)}
          night={data.today.nightMin}
        />
        <StatCard
          label="Esta semana"
          value={fmtMin(data.week.totalMin)}
          night={data.week.nightMin}
          extra={
            data.week.complementaryMin > 0 ? (
              <Badge
                variant="outline"
                className="border-complementary/40 bg-complementary/10 text-complementary"
              >
                +{fmtMin(data.week.complementaryMin)} complementarias
              </Badge>
            ) : (
              <Badge variant="outline" className="border-ok/40 bg-ok/10 text-ok">
                dentro del límite
              </Badge>
            )
          }
        />
        <StatCard
          label="Este mes"
          value={fmtMin(data.month.totalMin)}
          night={data.month.nightMin}
        />
        <StatCard
          label="Este año"
          value={fmtMin(data.year.totalMin)}
          night={data.year.nightMin}
          extra={
            data.year.complementaryMin > 0 ? (
              <Badge
                variant="outline"
                className="border-complementary/40 bg-complementary/10 text-complementary"
              >
                +{fmtMin(data.year.complementaryMin)} complementarias
              </Badge>
            ) : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Semana actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-44 items-end gap-1.5 sm:gap-3">
              {data.weekDays.map((d) => {
                const h = Math.round((d.totalMin / maxDay) * 100);
                const nightH =
                  d.totalMin > 0 ? Math.round((d.nightMin / d.totalMin) * 100) : 0;
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                    <div className="tnum text-xs text-muted-foreground">
                      {d.totalMin > 0 ? fmtMin(d.totalMin) : "·"}
                    </div>
                    <div className="flex h-28 w-full items-end rounded-sm bg-muted/40">
                      {d.totalMin > 0 && (
                        <div
                          className="relative w-full overflow-hidden rounded-sm bg-primary"
                          style={{ height: `${Math.max(h, 4)}%` }}
                        >
                          {nightH > 0 && (
                            <div
                              className="absolute inset-x-0 bottom-0 bg-night"
                              style={{ height: `${nightH}%` }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <div
                      className={
                        d.isToday
                          ? "text-xs font-bold text-primary"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {d.weekdayShort}
                    </div>
                  </div>
                );
              })}
            </div>
            <Separator className="my-4" />
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-primary" /> día
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-night" /> nocturna (desde{" "}
                {fmtTime(limits.nightStartMin)})
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Últimas 8 semanas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative flex h-44 items-end gap-2">
              {/* Línea del límite semanal */}
              <div
                className="absolute inset-x-0 border-t border-dashed border-complementary/60"
                style={{
                  bottom: `${(limits.weeklyLimitMin / maxWeek) * 70 + 16}%`,
                }}
              >
                <span className="tnum absolute -top-4 right-0 text-[10px] text-complementary">
                  límite {fmtMin(limits.weeklyLimitMin)}
                </span>
              </div>
              {data.weekHistory.map((w) => {
                const h = Math.round((w.totalMin / maxWeek) * 70);
                const over = w.complementaryMin > 0;
                return (
                  <div
                    key={w.weekStart}
                    className="flex flex-1 flex-col items-center gap-2"
                    title={`Semana del ${w.weekStart}: ${fmtMin(w.totalMin)}`}
                  >
                    <div className="flex h-32 w-full items-end rounded-sm bg-muted/40">
                      {w.totalMin > 0 && (
                        <div
                          className={
                            over
                              ? "w-full rounded-sm bg-complementary"
                              : "w-full rounded-sm bg-primary/80"
                          }
                          style={{ height: `${Math.max(h, 4)}%` }}
                        />
                      )}
                    </div>
                    <div className="tnum text-[10px] text-muted-foreground">
                      {w.weekStart.slice(8)}/{w.weekStart.slice(5, 7)}
                    </div>
                  </div>
                );
              })}
            </div>
            <Separator className="my-4" />
            <div className="text-xs text-muted-foreground">
              Las semanas en rojo superan el límite: el exceso cuenta como{" "}
              <span className="text-complementary">horas complementarias</span>.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Cómputo anual {data.year.year}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="tnum text-2xl font-bold">
              {fmtMin(data.year.totalMin)}
            </span>
            <span className="tnum text-sm text-muted-foreground">
              de {fmtMin(data.year.limitMin)} ({annualPct.toFixed(1)}%)
            </span>
          </div>
          <Progress value={annualPct} />
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <div className="text-muted-foreground">Nocturnas acumuladas</div>
              <div className="tnum font-semibold text-night">
                {fmtMin(data.year.nightMin)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">
                Exceso semanal acumulado
              </div>
              <div className="tnum font-semibold text-complementary">
                {fmtMin(data.year.weeklyComplementaryMin)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Exceso sobre límite anual</div>
              <div className="tnum font-semibold text-complementary">
                {fmtMin(data.year.annualExcessMin)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
