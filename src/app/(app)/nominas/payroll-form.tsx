"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { uploadPayroll, type PayrollState } from "@/app/actions/payrolls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initial: PayrollState = {};

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function PayrollForm({
  hasSavedPassword = false,
}: {
  hasSavedPassword?: boolean;
}) {
  const [state, action, pending] = useActionState(uploadPayroll, initial);
  const [formKey, setFormKey] = useState(0);

  const now = new Date();
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));

  useEffect(() => {
    if (state.ok) {
      toast.success("Nómina guardada");
      setFormKey((k) => k + 1);
    }
  }, [state]);

  return (
    <Card className="punch-edge h-fit pt-6">
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Subir nómina
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form key={formKey} action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="payroll-month">Mes</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="payroll-month" className="w-full">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {MONTHS_ES.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payroll-year">Año</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="payroll-year" className="tnum w-full">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)} className="tnum">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <input
            type="hidden"
            name="month"
            value={`${year}-${month.padStart(2, "0")}`}
          />
          <div className="space-y-2">
            <Label htmlFor="payroll-file">Archivo (PDF, JPG, PNG, WebP)</Label>
            <Input
              id="payroll-file"
              name="file"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payroll-pdf-password">
              Contraseña del PDF (si tiene)
            </Label>
            <Input
              id="payroll-pdf-password"
              name="pdfPassword"
              type="password"
              autoComplete="off"
              placeholder={
                hasSavedPassword ? "Se usará la guardada" : "Solo si el PDF está protegido"
              }
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                name="rememberPassword"
                className="size-4 accent-primary"
              />
              Recordar esta contraseña para próximas nóminas
            </label>
          </div>
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Subiendo…" : "Guardar nómina"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
