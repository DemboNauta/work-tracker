import { OcrImport } from "./ocr-import";

export const metadata = { title: "Importar OCR · Fichaje" };

export default function ImportarPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-heading text-3xl">Importar de Orquest</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Sube capturas de la pantalla <strong>“Mis turnos”</strong> de Orquest.
          El texto se lee con OCR en tu navegador (no se envían las imágenes a
          ningún servidor), se detectan los turnos y los confirmas antes de
          guardar. Reimportar la misma semana actualiza en vez de duplicar.
        </p>
      </div>
      <OcrImport />
    </div>
  );
}
