"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const ITEM_H = 40; // alto de cada fila de la rueda (px)
const VISIBLE = 3; // filas visibles

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0")
);

function WheelColumn({
  values,
  value,
  onChange,
  ariaLabel,
}: {
  values: string[];
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppress = React.useRef(false);

  // Posiciona la rueda en el valor actual (montaje y cambios externos)
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = Math.max(0, values.indexOf(value));
    const top = idx * ITEM_H;
    if (Math.abs(el.scrollTop - top) > 1) {
      suppress.current = true;
      el.scrollTop = top;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleScroll() {
    if (suppress.current) {
      suppress.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.min(
        values.length - 1,
        Math.max(0, Math.round(el.scrollTop / ITEM_H))
      );
      if (values[idx] !== value) onChange(values[idx]);
    }, 120);
  }

  function clickItem(idx: number) {
    ref.current?.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    onChange(values[idx]);
  }

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={ariaLabel}
      className="no-scrollbar snap-y snap-mandatory overflow-y-auto overscroll-contain"
      style={{ height: ITEM_H * VISIBLE }}
      onScroll={handleScroll}
    >
      <div style={{ height: ITEM_H }} aria-hidden />
      {values.map((v, i) => (
        <div
          key={v}
          role="option"
          aria-selected={v === value}
          className={cn(
            "tnum flex cursor-pointer snap-center items-center justify-center text-lg transition-colors",
            v === value
              ? "font-bold text-primary"
              : "text-muted-foreground/60"
          )}
          style={{ height: ITEM_H }}
          onClick={() => clickItem(i)}
        >
          {v}
        </div>
      ))}
      <div style={{ height: ITEM_H }} aria-hidden />
    </div>
  );
}

/**
 * Rueda de hora HH:MM estilo iOS: 3 filas visibles, deslizas y encaja en el
 * centro. Minutos de 5 en 5. Envía el valor como input oculto `name`.
 */
export function TimePicker({
  id,
  name,
  defaultValue = "",
  required,
  className,
}: {
  id?: string;
  name?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  const valid = /^\d{1,2}:\d{2}$/.test(defaultValue);
  const [defH, defM] = valid ? defaultValue.split(":") : ["00", "00"];
  const [hour, setHour] = React.useState(defH.padStart(2, "0"));
  const [minute, setMinute] = React.useState(
    String((Math.round(Number(defM) / 5) * 5) % 60).padStart(2, "0")
  );
  // Hasta que el usuario toque la rueda (o haya valor inicial), no se envía
  const [touched, setTouched] = React.useState(valid);

  return (
    <div
      id={id}
      className={cn(
        "relative grid grid-cols-2 overflow-hidden rounded-lg border bg-input/20",
        !touched && "opacity-80",
        className
      )}
    >
      {/* Banda central que marca la fila seleccionada */}
      <div
        className="pointer-events-none absolute inset-x-1 rounded-md border-y border-primary/30 bg-primary/10"
        style={{ top: ITEM_H, height: ITEM_H }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-lg font-bold text-muted-foreground"
        style={{ top: ITEM_H, lineHeight: `${ITEM_H}px` }}
        aria-hidden
      >
        :
      </span>
      {/* Difuminado arriba/abajo, efecto rueda */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-card to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-card to-transparent" aria-hidden />

      <WheelColumn
        values={HOURS}
        value={hour}
        onChange={(v) => {
          setHour(v);
          setTouched(true);
        }}
        ariaLabel="Hora"
      />
      <WheelColumn
        values={MINUTES}
        value={minute}
        onChange={(v) => {
          setMinute(v);
          setTouched(true);
        }}
        ariaLabel="Minutos"
      />
      {name && (
        <input
          type="hidden"
          name={name}
          value={touched ? `${hour}:${minute}` : ""}
          required={required}
        />
      )}
    </div>
  );
}
