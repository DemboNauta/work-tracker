import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { signToken } from "@/lib/auth";

// Login para clientes nativos: devuelve un JWT Bearer en el body
// (misma firma/secreto que la sesión web, ver signToken).
export async function POST(req: Request) {
  let name = "";
  let password = "";
  try {
    const body = await req.json();
    name = String(body?.name ?? "").trim();
    password = String(body?.password ?? "");
  } catch {
    return Response.json({ error: "JSON no válido." }, { status: 400 });
  }

  if (!name || !password) {
    return Response.json(
      { error: "Faltan nombre o contraseña." },
      { status: 400 }
    );
  }

  const [user] = await db.select().from(users).where(eq(users.name, name));
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return Response.json(
      { error: "Nombre o contraseña incorrectos." },
      { status: 401 }
    );
  }

  const token = await signToken(user.id);
  return Response.json({ token, user: { id: user.id, name: user.name } });
}
