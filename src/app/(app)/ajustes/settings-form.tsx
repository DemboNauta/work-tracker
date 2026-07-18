"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { saveSettings, type SettingsState } from "@/app/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TimePicker } from "@/components/time-picker";

const initial: SettingsState = {};

export function SettingsForm({
  weeklyHours,
  annualHours,
  nightStart,
  nightEnd,
}: {
  weeklyHours: number;
  annualHours: number;
  nightStart: string;
  nightEnd: string;
}) {
  const [state, action, pending] = useActionState(saveSettings, initial);

  useEffect(() => {
    if (state.ok) toast.success("Ajustes guardados");
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      <Card className="punch-edge pt-6">
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Horas habituales (complementarias)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="weeklyHours">Límite semanal (horas)</Label>
            <Input
              id="weeklyHours"
              name="weeklyHours"
              type="number"
              min={1}
              max={168}
              step="0.5"
              defaultValue={weeklyHours}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="annualHours">Límite anual (horas)</Label>
            <Input
              id="annualHours"
              name="annualHours"
              type="number"
              min={1}
              max={8784}
              step="1"
              defaultValue={annualHours}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Todo lo que supere estos límites se marca como horas
            complementarias (por defecto: 16 h/semana, 720 h/año).
          </p>
        </CardContent>
      </Card>

      <Card className="punch-edge pt-6">
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Ventana nocturna
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nightStart">Inicio</Label>
            <TimePicker id="nightStart" name="nightStart" defaultValue={nightStart} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nightEnd">Fin</Label>
            <TimePicker id="nightEnd" name="nightEnd" defaultValue={nightEnd} required />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Las horas trabajadas dentro de esta ventana cuentan como nocturnas
            (por defecto de 22:00 a 06:00).
          </p>
        </CardContent>
      </Card>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar ajustes"}
      </Button>
    </form>
  );
}
