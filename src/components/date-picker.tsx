"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { es } from "react-day-picker/locale";
import { formatDate, parseDate } from "@/lib/hours";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const FMT = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Selector de fecha con calendario (shadcn Calendar + Popover).
 * Envía el valor como input oculto `name` (YYYY-MM-DD) para formularios, o
 * funciona controlado con `value`/`onChange`.
 */
export function DatePicker({
  id,
  name,
  value,
  onChange,
  defaultValue = "",
  placeholder = "Elige una fecha",
  required,
  onlyMondays = false,
  className,
}: {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (date: string) => void;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  onlyMondays?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultValue);
  const current = value !== undefined ? value : internal;
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(current)
    ? parseDate(current)
    : undefined;

  function select(d: Date | undefined) {
    const next = d ? formatDate(d) : "";
    if (value === undefined) setInternal(next);
    onChange?.(next);
    if (d) setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-4 opacity-70" />
          {selected ? (
            <span className="tnum">{FMT.format(selected)}</span>
          ) : (
            placeholder
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={es}
          selected={selected}
          defaultMonth={selected}
          disabled={onlyMondays ? { dayOfWeek: [0, 2, 3, 4, 5, 6] } : undefined}
          onSelect={select}
          autoFocus
        />
      </PopoverContent>
      {name && (
        <input
          type="hidden"
          name={name}
          value={current}
          required={required}
        />
      )}
    </Popover>
  );
}
