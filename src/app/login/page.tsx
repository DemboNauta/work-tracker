import { AuthCard } from "./auth-card";

export const metadata = { title: "Entrar · Fichaje" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm stamp-in">
        <div className="mb-8 text-center">
          <div className="display-heading text-4xl text-primary">Fichaje</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu registro de horas trabajadas
          </p>
        </div>
        <AuthCard />
      </div>
    </main>
  );
}
