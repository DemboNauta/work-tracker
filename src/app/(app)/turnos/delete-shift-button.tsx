"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteShift } from "@/app/actions/shifts";
import { Button } from "@/components/ui/button";

export function DeleteShiftButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-muted-foreground hover:text-destructive"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteShift(id);
          toast.success("Tramo eliminado");
        })
      }
      aria-label="Eliminar tramo"
    >
      ✕
    </Button>
  );
}
