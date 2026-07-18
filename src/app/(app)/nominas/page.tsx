import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { payrolls, settings } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PayrollForm } from "./payroll-form";
import { DeletePayrollButton } from "./delete-payroll-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nóminas · Fichaje" };

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function NominasPage() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(payrolls)
    .where(eq(payrolls.userId, user.id))
    .orderBy(desc(payrolls.year), desc(payrolls.month));

  const [setting] = await db
    .select({ pw: settings.payrollPdfPassword })
    .from(settings)
    .where(eq(settings.userId, user.id));
  const hasSavedPassword = !!setting?.pw;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-heading text-3xl">Nóminas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube la nómina de cada mes (PDF o imagen). Una por mes: si vuelves a
          subir, se reemplaza.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <PayrollForm hasSavedPassword={hasSavedPassword} />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Archivo de nóminas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Todavía no has subido ninguna nómina.
              </p>
            )}
            <ul className="space-y-2">
              {rows.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 p-3"
                >
                  <div>
                    <div className="font-semibold">
                      {MONTHS_ES[p.month - 1]}{" "}
                      <span className="tnum">{p.year}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.fileName} · {fmtSize(p.size)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-muted-foreground">
                      {p.mimeType === "application/pdf" ? "PDF" : "imagen"}
                    </Badge>
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`/api/payrolls/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver
                      </a>
                    </Button>
                    <DeletePayrollButton id={p.id} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
