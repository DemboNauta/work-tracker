import { authenticateBearer } from "@/lib/auth";
import { getShiftsBetween } from "@/lib/queries";
import { formatDate, addDays } from "@/lib/hours";

// Turnos en un rango [from, to] para sincronizar con el calendario del dispositivo.
// Defecto: desde hoy hasta +27 días (4 semanas).
export async function GET(req: Request) {
  const user = await authenticateBearer(req);
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const isDate = (s: string | null): s is string =>
    !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const today = formatDate(new Date());
  const from = isDate(fromParam) ? fromParam : today;
  const to = isDate(toParam) ? toParam : addDays(from, 27);

  const rows = await getShiftsBetween(user.id, from, to);
  const byDate = new Map<string, { startMin: number; endMin: number }[]>();
  for (const r of rows) {
    const list = byDate.get(r.date) ?? [];
    list.push({ startMin: r.startMin, endMin: r.endMin });
    byDate.set(r.date, list);
  }

  const days = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, segs]) => ({
      date,
      segments: segs.sort((a, b) => a.startMin - b.startMin),
    }));

  return Response.json({ from, to, days });
}
