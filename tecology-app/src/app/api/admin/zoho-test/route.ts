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

  // Paso 1 — vendedores (causa típica del error "Vendedor no puede estar vacío").
  let salesInfo = "";
  const hasEnvSalesperson = !!process.env.ZOHO_SALESPERSON_ID?.trim();
  try {
    const sps = await listSalespersons();
    if (hasEnvSalesperson) {
      salesInfo = `Usando el vendedor fijado en ZOHO_SALESPERSON_ID. (${sps.length} vendedor(es) en la cuenta.)`;
    } else if (sps.length === 0) {
      return NextResponse.json({
        ok: false,
        message: "Tu Zoho exige un vendedor en cada cotización, pero la cuenta no tiene ninguno. Crea un Vendedor en Zoho (Configuración → Vendedores) o define la variable ZOHO_SALESPERSON_ID en Vercel.",
      });
    } else {
      const first = sps.find((s) => s.status !== "inactive") || sps[0];
      salesInfo = `Vendedor asignado automáticamente: "${first.salesperson_name || first.salesperson_id}" (de ${sps.length} en la cuenta).`;
    }
  } catch (e) {
    return NextResponse.json({
      ok: false,
      message: "No se pudo leer la lista de vendedores de Zoho: " + (e instanceof Error ? e.message : "error") + ". Revisa que el token tenga acceso completo (scope ZohoBooks.fullaccess.all).",
    });
  }

  // Paso 2 — crear (y borrar) una cotización de prueba real.
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
