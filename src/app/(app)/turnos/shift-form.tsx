"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { addShift, type ShiftState } from "@/app/actions/shifts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";

const initial: ShiftState = {};

export function ShiftForm() {
  const [state, action, pending] = useActionState(addShift, initial);
  const [segments, setSegments] = useState(1);
  // Remonta el formulario tras guardar para limpiar los pickers
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.ok) {
      toast.success("Turno registrado");
      setSegments(1);
      setFormKey((k) => k + 1);
    }
  }, [state]);

  return (
    <Card className="punch-edge h-fit pt-6">
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Registrar turno
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form key={formKey} action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shift-date">Fecha</Label>
            <DatePicker id="shift-date" name="date" required />
          </div>

          {Array.from({ length: segments }, (_, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`start-${i}`}>
                  {segments > 1 ? `Inicio ${i + 1}` : "Inicio"}
                </Label>
                <TimePicker id={`start-${i}`} name="start" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`end-${i}`}>
                  {segments > 1 ? `Fin ${i + 1}` : "Fin"}
                </Label>
                <TimePicker id={`end-${i}`} name="end" required />
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSegments((s) => Math.min(s + 1, 4))}
              disabled={segments >= 4}
            >
              + Tramo (turno partido)
            </Button>
            {segments > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSegments((s) => s - 1)}
              >
                Quitar tramo
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift-note">Nota (opcional)</Label>
            <Input id="shift-note" name="note" placeholder="p. ej. inventario" />
          </div>

          <p className="text-xs text-muted-foreground">
            Si el fin es anterior al inicio se asume que el turno cruza la
            medianoche.
          </p>

          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Guardando…" : "Fichar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
