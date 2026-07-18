import { describe, it, expect } from "vitest";
import { jwtVerify } from "jose";
import { signToken, authenticateBearer, getSecret } from "@/lib/auth";

function reqWithAuth(value?: string): Request {
  return new Request("http://localhost/api/mobile/week", {
    headers: value ? { authorization: value } : {},
  });
}

describe("signToken", () => {
  it("firma un JWT verificable con sub = userId", async () => {
    const token = await signToken(42);
    const { payload } = await jwtVerify(token, getSecret());
    expect(payload.sub).toBe("42");
  });
});

describe("authenticateBearer", () => {
  it("devuelve null sin cabecera Authorization", async () => {
    expect(await authenticateBearer(reqWithAuth())).toBeNull();
  });

  it("devuelve null con cabecera malformada (sin Bearer)", async () => {
    expect(await authenticateBearer(reqWithAuth("Token abc"))).toBeNull();
  });

  it("devuelve null con token de firma inválida", async () => {
    expect(
      await authenticateBearer(reqWithAuth("Bearer not.a.valid.jwt"))
    ).toBeNull();
  });

  it("devuelve null con token válido de usuario inexistente", async () => {
    // Firma correcta pero userId que no existe en la BD → no autoriza.
    const token = await signToken(999999);
    expect(await authenticateBearer(reqWithAuth(`Bearer ${token}`))).toBeNull();
  });
});
