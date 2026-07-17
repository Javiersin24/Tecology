import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { isZohoConfigured } from "@/lib/zoho";
import { createZohoQuote, deleteZohoQuote, fetchZohoQuotePdf, listSalespersons } from "@/lib/zohoQuote";

export const dynamic = "force-dynamic";

// POST /api/admin/zoho-test  (solo admin)
// Diagnóstico paso a paso: verifica token, lista de vendedores, y ejecuta el
// MISMO flujo que "Solicitar cotización" (contacto + cotización + PDF) con
// datos de prueba, borrando la cotización creada. Devuelve exactamente en qué
// paso falla y con qué mensaje — sin tener que revisar los logs de Vercel.
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  if (!isZohoConfigured) {
    return NextResponse.json({
      ok: false,
      message: "Faltan variables de entorno de Zoho en Vercel (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORGANIZATION_ID). Agrégalas y vuelve a desplegar.",
    });
  }

  // Info de vendedores (no bloqueante: la cotización usa el nombre de respaldo
  // si el listado viene vacío, así que igual intentamos crear la cotización).
  let salesInfo = "";
  try {
    const sps = await listSalespersons();
    salesInfo = sps.length
      ? `Vendedores en la cuenta: ${sps.length}.`
      : `El listado de vendedores vino vacío; se usará el vendedor por nombre.`;
  } catch {
    salesInfo = "No se pudo leer el listado de vendedores; se usará el vendedor por nombre.";
  }

  // Crea (y borra) una cotización de prueba real.
  let estimateId: string | null = null;
  try {
    const created = await createZohoQuote({
      correo: "prueba-tecology@example.com",
      nombre: "Prueba",
      apellido: "Tecology",
      empresa: "Prueba de conexión",
      cargo: "—",
      items: [{ name: "Producto de prueba (Tecology)", price: "$1", qty: 1 }],
    });
    estimateId = created.estimateId;
    await fetchZohoQuotePdf(created.estimateId);
    await deleteZohoQuote(created.estimateId).catch(() => {});
    return NextResponse.json({
      ok: true,
      message: `Conexión correcta. ${salesInfo} Se creó y borró una cotización de prueba (nº ${created.estimateNumber || created.estimateId}). Todo listo.`,
    });
  } catch (e) {
    if (estimateId) await deleteZohoQuote(estimateId).catch(() => {});
    return NextResponse.json({
      ok: false,
      message: `${salesInfo ? salesInfo + " Pero al crear la cotización Zoho respondió: " : ""}${e instanceof Error ? e.message : "Error desconocido."}`,
    });
  }
}
