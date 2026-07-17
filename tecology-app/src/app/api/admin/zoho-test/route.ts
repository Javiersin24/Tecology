import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { isZohoConfigured } from "@/lib/zoho";
import { createZohoQuote, deleteZohoQuote, fetchZohoQuotePdf } from "@/lib/zohoQuote";

export const dynamic = "force-dynamic";

// POST /api/admin/zoho-test  (solo admin)
// Diagnóstico: ejecuta el MISMO flujo que "Solicitar cotización" (contacto +
// cotización + PDF) con datos de prueba, luego borra la cotización creada.
// Devuelve exactamente en qué paso falla y con qué mensaje — para no tener que
// revisar los logs de Vercel.
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  if (!isZohoConfigured) {
    return NextResponse.json({
      ok: false,
      step: "config",
      message: "Faltan variables de entorno de Zoho en Vercel (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORGANIZATION_ID). Agrégalas y vuelve a desplegar.",
    });
  }

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

    // Verifica también la generación del PDF (mismo paso que ve el visitante).
    await fetchZohoQuotePdf(created.estimateId);

    // Limpia: borra la cotización de prueba para no dejar basura en Zoho.
    await deleteZohoQuote(created.estimateId).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: `Conexión correcta. Se creó y borró una cotización de prueba (nº ${created.estimateNumber || created.estimateId}). Todo listo.`,
    });
  } catch (e) {
    // Si alcanzó a crear la cotización antes de fallar, intenta borrarla igual.
    if (estimateId) await deleteZohoQuote(estimateId).catch(() => {});
    const message = e instanceof Error ? e.message : "Error desconocido.";
    return NextResponse.json({
      ok: false,
      step: estimateId ? "pdf" : "api",
      message,
    });
  }
}
