import * as mupdf from "mupdf";

export type DecryptResult =
  | { ok: true; data: Buffer }
  | { ok: "needs-password" }
  | { ok: "wrong-password" };

/**
 * Descifra un PDF protegido con contraseña y lo devuelve sin cifrar.
 * - Si el PDF no tiene contraseña, devuelve los bytes originales.
 * - Si tiene contraseña y no se aporta (o es incorrecta), lo indica en `ok`.
 */
export function decryptPdf(buf: Buffer, password?: string): DecryptResult {
  const doc = mupdf.Document.openDocument(
    new Uint8Array(buf),
    "application/pdf"
  );

  if (!doc.needsPassword()) return { ok: true, data: buf };

  if (!password) return { ok: "needs-password" };
  if (doc.authenticatePassword(password) === 0) return { ok: "wrong-password" };

  const pdf = doc.asPDF();
  if (!pdf) return { ok: "wrong-password" };

  const out = pdf.saveToBuffer({ encrypt: "none" });
  return { ok: true, data: Buffer.from(out.asUint8Array()) };
}
