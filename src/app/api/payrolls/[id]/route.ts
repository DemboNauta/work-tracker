import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import path from "path";
import fs from "fs/promises";
import { db, UPLOADS_DIR } from "@/lib/db";
import { payrolls } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const { id } = await params;
  const [row] = await db
    .select()
    .from(payrolls)
    .where(and(eq(payrolls.id, Number(id)), eq(payrolls.userId, user.id)));
  if (!row) return new NextResponse("No encontrada", { status: 404 });

  try {
    const data = await fs.readFile(path.join(UPLOADS_DIR, row.storedName));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": row.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(row.fileName)}"`,
      },
    });
  } catch {
    return new NextResponse("Archivo no disponible", { status: 404 });
  }
}
