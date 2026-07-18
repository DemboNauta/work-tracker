"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deletePayroll } from "@/app/actions/payrolls";
import { Button } from "@/components/ui/button";

export function DeletePayrollButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Eliminar esta nómina?")) return;
        startTransition(async () => {
          await deletePayroll(id);
          toast.success("Nómina eliminada");
        });
      }}
      aria-label="Eliminar nómina"
    >
      ✕
    </Button>
  );
}
