import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { isZohoConfigured } from "@/lib/zoho";
import { createSalesperson, listSalespersons } from "@/lib/zohoQuote";

export const dynamic = "force-dynamic";

// POST /api/admin/zoho-salesperson  (solo admin)
// Crea un vendedor en Zoho Books (necesario cuando la organización exige uno
// en cada cotización y la cuenta no tiene ninguno). Si ya existe alguno, no
// crea otro. Body: { name, email? }.
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
  if (!isZohoConfigured) return NextResponse.json({ ok: false, message: "Zoho no está configurado." });

  let body: { name?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const name = body.name?.trim() || "Tecology";
  const email = body.email?.trim() || undefined;

  try {
    const existing = await listSalespersons();
    if (existing.length > 0) {
      const first = existing.find((s) => s.status !== "inactive") || existing[0];
      return NextResponse.json({ ok: true, message: `Ya existe un vendedor ("${first.salesperson_name || first.salesperson_id}"). No se creó otro. Ya puedes cotizar.` });
    }
    const sp = await createSalesperson(name, email);
    return NextResponse.json({ ok: true, message: `Vendedor "${sp.salesperson_name || name}" creado. Ya puedes generar cotizaciones. (Vuelve a tocar "Probar conexión" para confirmar.)` });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "No se pudo crear el vendedor." });
  }
}
