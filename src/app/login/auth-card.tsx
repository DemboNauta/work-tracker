"use client";

import { useActionState } from "react";
import { login, type AuthState } from "@/app/actions/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initial: AuthState = {};

export function AuthCard() {
  const [loginState, loginAction, loginPending] = useActionState(login, initial);

  return (
    <Card className="punch-edge overflow-hidden pt-8">
      <CardContent>
        <form action={loginAction} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-name">Nombre</Label>
            <Input id="login-name" name="name" autoComplete="username" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Contraseña</Label>
            <Input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {loginState.error && (
            <Alert variant="destructive">
              <AlertDescription>{loginState.error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={loginPending}>
            {loginPending ? "Entrando…" : "Fichar entrada"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
