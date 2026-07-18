import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Se resuelve en runtime (no al cargar el módulo) para que el build
// funcione sin .env y producción falle rápido si falta AUTH_SECRET.
function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET no definido: obligatorio en producción (ver deploy.ps1)."
      );
    }
    return new TextEncoder().encode(
      "work-tracker-dev-secret-cambia-esto-en-produccion"
    );
  }
  return new TextEncoder().encode(secret);
}

const PUBLIC_PATHS = ["/login"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const token = req.cookies.get("wt_session")?.value;
  let authed = false;
  if (token) {
    try {
      await jwtVerify(token, getSecret());
      authed = true;
    } catch {
      authed = false;
    }
  }

  if (!authed && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (authed && isPublic) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
