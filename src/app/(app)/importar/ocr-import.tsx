"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createWorker } from "tesseract.js";
import {
  parseOrquestText,
  parseTimeRanges,
  type ParseResult,
} from "@/lib/orquest-parser";
import { addDays, fmtMin, fmtTime, segmentMinutes } from "@/lib/hours";
import { importOcrDays, type ImportDay } from "@/app/actions/shifts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EditableDay {
  /** Texto editable de tramos, p. ej. "14:00 - 17:00 / 21:00 - 0:00" */
  text: string;
  /** Estado detectado por el OCR (para mostrar "día libre", etc.) */
  detected: "work" | "free" | "unassigned" | "unknown";
  include: boolean;
}

interface ParsedWeek {
  key: string;
  fileName: string;
  imageUrl: string;
  detectedWeekStart: string | null;
  weekStart: string;
  days: EditableDay[];
}

const WEEKDAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function weekFromResult(
  fileName: string,
  imageUrl: string,
  result: ParseResult,
  i: number
): ParsedWeek {
  return {
    key: `${fileName}-${i}-${Date.now()}`,
    fileName,
    imageUrl,
    detectedWeekStart: result.weekStart,
    weekStart: result.weekStart ?? "",
    days: result.days.map((d) => ({
      text: d.segments
        .map((s) => `${fmtTime(s.startMin)} - ${fmtTime(s.endMin)}`)
        .join(" / "),
      detected: d.status,
      include: d.segments.length > 0,
    })),
  };
}

function dayStatusBadge(day: EditableDay, hasSegments: boolean) {
  if (hasSegments)
    return (
      <Badge className="bg-primary/15 text-primary" variant="outline">
        turno
      </Badge>
    );
  if (day.text.trim() !== "")
    return (
      <Badge variant="outline" className="border-destructive/50 text-destructive">
        no válido
      </Badge>
    );
  switch (day.detected) {
    case "free":
      return <Badge variant="outline" className="text-muted-foreground">día libre</Badge>;
    case "unassigned":
      return <Badge variant="outline" className="text-muted-foreground">sin asignaciones</Badge>;
    default:
      return <Badge variant="outline" className="text-muted-foreground/60">—</Badge>;
  }
}

export function OcrImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [weeks, setWeeks] = useState<ParsedWeek[]>([]);
  const [saving, startSaving] = useTransition();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setProcessing(true);
    setProgress(0);
    setWeeks([]);
    try {
      setStatusText("Cargando motor OCR (español)…");
      const worker = await createWorker("spa", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      const parsed: ParsedWeek[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatusText(`Leyendo ${file.name} (${i + 1}/${files.length})…`);
        setProgress(0);
        const { data } = await worker.recognize(file);
        const result = parseOrquestText(data.text);
        // Aunque no detecte nada, se muestra la semana para rellenar a mano
        parsed.push(
          weekFromResult(file.name, URL.createObjectURL(file), result, i)
        );
        const found = result.days.filter((d) => d.segments.length > 0).length;
        if (found === 0) {
          toast.warning(
            `${file.name}: no se detectaron turnos. Puedes escribirlos a mano abajo.`
          );
        }
      }
      await worker.terminate();
      setWeeks(parsed);
      if (parsed.length > 0) {
        toast.success(
          `${parsed.length} captura(s) procesada(s). Revisa, corrige y confirma.`
        );
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al procesar las imágenes con OCR.");
    } finally {
      setProcessing(false);
      setStatusText("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function updateDay(wi: number, di: number, patch: Partial<EditableDay>) {
    setWeeks((prev) =>
      prev.map((w, i) =>
        i === wi
          ? {
              ...w,
              days: w.days.map((d, j) => (j === di ? { ...d, ...patch } : d)),
            }
          : w
      )
    );
  }

  function discard() {
    for (const w of weeks) URL.revokeObjectURL(w.imageUrl);
    setWeeks([]);
  }

  function daysToImport(): ImportDay[] {
    const out: ImportDay[] = [];
    for (const w of weeks) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(w.weekStart)) continue;
      w.days.forEach((d, i) => {
        if (!d.include) return;
        const segments = parseTimeRanges(d.text);
        if (segments.length === 0) return;
        out.push({ date: addDays(w.weekStart, i), segments });
      });
    }
    return out;
  }

  const pendingWeekStart = weeks.some(
    (w) => !/^\d{4}-\d{2}-\d{2}$/.test(w.weekStart)
  );
  const importable = daysToImport();

  function confirmImport() {
    startSaving(async () => {
      const res = await importOcrDays(importable);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`${res.imported} tramo(s) importado(s).`);
        discard();
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="punch-edge pt-6">
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ocr-files">Capturas de “Mis turnos”</Label>
            <Input
              id="ocr-files"
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={processing}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          {processing && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{statusText}</p>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {weeks.map((w, wi) => (
        <Card key={w.key} className="stamp-in">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <div className="flex items-center gap-3">
              {/* Captura original: miniatura + zoom */}
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="group relative shrink-0 overflow-hidden rounded-md border"
                    aria-label="Ver captura original"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={w.imageUrl}
                      alt={`Captura ${w.fileName}`}
                      className="h-16 w-12 object-cover object-top transition-transform group-hover:scale-105"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      🔍
                    </span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-lg overflow-auto p-2">
                  <DialogTitle className="sr-only">
                    Captura original: {w.fileName}
                  </DialogTitle>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={w.imageUrl}
                    alt={`Captura ${w.fileName}`}
                    className="h-auto w-full rounded"
                  />
                </DialogContent>
              </Dialog>
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                {w.fileName}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`ws-${wi}`} className="text-xs text-muted-foreground">
                Lunes de la semana
              </Label>
              <DatePicker
                id={`ws-${wi}`}
                className="w-48"
                placeholder="Elige el lunes"
                onlyMondays
                value={w.weekStart}
                onChange={(date) =>
                  setWeeks((prev) =>
                    prev.map((p, i) =>
                      i === wi ? { ...p, weekStart: date } : p
                    )
                  )
                }
              />
            </div>
          </CardHeader>
          <CardContent>
            {!w.detectedWeekStart && (
              <Alert className="mb-4">
                <AlertDescription>
                  No se pudo detectar la fecha de la semana en la captura.
                  Indica el lunes manualmente.
                </AlertDescription>
              </Alert>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Día</TableHead>
                  <TableHead className="hidden sm:table-cell">Estado</TableHead>
                  <TableHead>Tramos (edítalos si el OCR falló)</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    Horas
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {w.days.map((d, di) => {
                  const segments = parseTimeRanges(d.text);
                  const total = segments.reduce(
                    (a, s) => a + segmentMinutes(s),
                    0
                  );
                  const date = /^\d{4}-\d{2}-\d{2}$/.test(w.weekStart)
                    ? addDays(w.weekStart, di)
                    : null;
                  return (
                    <TableRow key={di}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--primary)]"
                          checked={d.include && segments.length > 0}
                          disabled={segments.length === 0}
                          onChange={(e) =>
                            updateDay(wi, di, { include: e.target.checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="tnum">
                        {WEEKDAYS_ES[di]}
                        {date && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {date.slice(8)}/{date.slice(5, 7)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {dayStatusBadge(d, segments.length > 0)}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={d.text}
                          placeholder="p. ej. 14:00 - 17:00 / 21:00 - 0:00"
                          className="tnum min-w-44 text-sm"
                          aria-invalid={
                            d.text.trim() !== "" && segments.length === 0
                          }
                          onChange={(e) =>
                            updateDay(wi, di, {
                              text: e.target.value,
                              include: true,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="tnum hidden text-right sm:table-cell">
                        {total > 0 ? fmtMin(total) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">
              Formato: <span className="tnum">HH:MM - HH:MM</span>, varios
              tramos separados por «/». Un fin menor que el inicio cruza la
              medianoche. Deja vacío el día que no trabajaste.
            </p>
          </CardContent>
        </Card>
      ))}

      {weeks.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={confirmImport}
            disabled={saving || importable.length === 0 || pendingWeekStart}
          >
            {saving ? "Importando…" : `Importar ${importable.length} día(s)`}
          </Button>
          <Button variant="outline" onClick={discard} disabled={saving}>
            Descartar
          </Button>
          {pendingWeekStart && (
            <span className="text-sm text-complementary">
              Falta indicar el lunes de alguna semana.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
