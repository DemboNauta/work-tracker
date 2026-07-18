import crypto from "crypto";
import { getSecret } from "@/lib/auth";

// Clave AES-256 derivada del AUTH_SECRET (32 bytes vía SHA-256).
function key(): Buffer {
  return crypto.createHash("sha256").update(getSecret()).digest();
}

/** Cifra un texto para guardarlo en reposo. Formato: iv:tag:ciphertext (base64). */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(":");
}

/** Descifra un valor de `encryptSecret`. Devuelve null si el formato es inválido o falla. */
export function decryptSecret(stored: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = stored.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}
