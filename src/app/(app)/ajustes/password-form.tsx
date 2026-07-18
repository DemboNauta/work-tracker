"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { changePassword, type PasswordState } from "@/app/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initial: PasswordState = {};

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initial);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.ok) {
      toast.success("Contraseña cambiada");
      setFormKey((k) => k + 1);
    }
  }, [state]);

  return (
    <Card className="punch-edge pt-6">
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Cambiar contraseña
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form key={formKey} action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw-current">Contraseña actual</Label>
            <Input
              id="pw-current"
              name="current"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pw-next">Nueva contraseña</Label>
              <Input
                id="pw-next"
                name="next"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-confirm">Repite la nueva</Label>
              <Input
                id="pw-confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
          </div>
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Cambiando…" : "Cambiar contraseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
