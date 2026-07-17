import { NextResponse } from "next/server";
import { isZohoConfigured } from "@/lib/zoho";
import { createZohoQuote, fetchZohoQuotePdf, type QuoteItemInput } from "@/lib/zohoQuote";

export const dynamic = "force-dynamic";

interface QuoteBody {
  nombre?: string;
  apellido?: string;
  empresa?: string;
  cargo?: string;
  correo?: string;
  codigo?: string;
  telefono?: string;
  colaboradores?: string;
  renovar?: string | null;
  items?: QuoteItemInput[];
}

const MAX_ITEMS = 20;

// POST /api/zoho/quote
// Endpoint público (lo llama el visitante desde "Solicitar cotización"):
// crea/reutiliza el contacto en Zoho, crea la cotización real y devuelve el PDF.
export async function POST(req: Request) {
  if (!isZohoConfigured) {
    return NextResponse.json({ error: "zoho_not_configured" }, { status: 501 });
  }

  let body: QuoteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const correo = body.correo?.trim();
  const items = (body.items || []).slice(0, MAX_ITEMS).filter((i) => i && i.name);
  if (!correo) return NextResponse.json({ error: "Falta el correo del cliente." }, { status: 400 });
  if (items.length === 0) return NextResponse.json({ error: "No hay productos para cotizar." }, { status: 400 });

  try {
    const { estimateId } = await createZohoQuote({ ...body, correo, items });
    const pdfBuffer = await fetchZohoQuotePdf(estimateId);
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cotizacion-tecology-${estimateId}.pdf"`,
      },
    });
  } catch (e) {
    console.error("Tecology: error creando cotización en Zoho:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo crear la cotización." }, { status: 502 });
  }
}
