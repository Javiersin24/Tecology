import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { exchangeGrantToken } from "@/lib/zoho";

export const dynamic = "force-dynamic";

// POST /api/admin/zoho-connect
// Ayudante de configuración: recibe un Client ID / Secret / Grant Token
// (generados una sola vez en https://api-console.zoho.com) y hace el
// intercambio OAuth por un refresh token — así el admin no necesita usar una
// terminal. El refresh token se devuelve para copiarlo a las variables de
// entorno de Vercel; esta ruta no guarda nada.
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  let body: { clientId?: string; clientSecret?: string; grantToken?: string; accountsDomain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const clientId = body.clientId?.trim();
  const clientSecret = body.clientSecret?.trim();
  const grantToken = body.grantToken?.trim();
  if (!clientId || !clientSecret || !grantToken) {
    return NextResponse.json({ error: "Completa Client ID, Client Secret y Grant Token." }, { status: 400 });
  }

  try {
    const result = await exchangeGrantToken({ clientId, clientSecret, grantToken, accountsDomain: body.accountsDomain });
    return NextResponse.json({ refreshToken: result.refresh_token });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo conectar con Zoho." }, { status: 502 });
  }
}
