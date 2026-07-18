import { requireUser, getUserSettings } from "@/lib/auth";
import { SettingsForm } from "./settings-form";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajustes · Fichaje" };

export default async function AjustesPage() {
  const user = await requireUser();
  const settings = await getUserSettings(user.id);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="display-heading text-3xl">Ajustes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura tus límites de horas habituales y la ventana nocturna. Las
          horas por encima del límite semanal o anual cuentan como
          complementarias.
        </p>
      </div>
      <SettingsForm
        weeklyHours={settings.weeklyLimitMin / 60}
        annualHours={settings.annualLimitMin / 60}
        nightStart={`${String(Math.floor(settings.nightStartMin / 60)).padStart(2, "0")}:${String(settings.nightStartMin % 60).padStart(2, "0")}`}
        nightEnd={`${String(Math.floor(settings.nightEndMin / 60)).padStart(2, "0")}:${String(settings.nightEndMin % 60).padStart(2, "0")}`}
      />
      <PasswordForm />
    </div>
  );
}
