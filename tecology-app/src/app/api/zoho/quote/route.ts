import { NextResponse } from "next/server";
import { isZohoConfigured, zohoFetch, zohoJson, ZOHO_TAX_ID } from "@/lib/zoho";

export const dynamic = "force-dynamic";

interface QuoteItem {
  zohoItemId?: string;
  name: string;
  price: string;
  qty?: number;
}
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
  items?: QuoteItem[];
}

const MAX_ITEMS = 20;

function parsePrice(raw: string): number {
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// POST /api/zoho/quote
// Endpoint público (lo llama el visitante del catálogo desde "Solicitar
// cotización"): crea/reutiliza el contacto en Zoho Books, crea una cotización
// real con los productos favoritos y devuelve su PDF para descargar.
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

  const nombreCompleto = [body.nombre, body.apellido].filter(Boolean).join(" ").trim() || correo;

  try {
    const customerId = await findOrCreateContact({
      email: correo,
      name: nombreCompleto,
      company: body.empresa?.trim() || "",
      phone: [body.codigo, body.telefono].filter(Boolean).join(" ").trim(),
      firstName: body.nombre?.trim() || nombreCompleto,
      lastName: body.apellido?.trim() || "",
      designation: body.cargo?.trim() || "",
    });

    const lineItems = items.map((i) => ({
      ...(i.zohoItemId ? { item_id: i.zohoItemId } : {}),
      name: i.name,
      rate: parsePrice(i.price),
      quantity: i.qty && i.qty > 0 ? i.qty : 1,
      ...(ZOHO_TAX_ID ? { tax_id: ZOHO_TAX_ID } : {}),
    }));

    // Datos del registro que no tienen un campo propio en el contacto de Zoho
    // (colaboradores, intención de renovación) quedan visibles en la nota de
    // la cotización, para que el asesor los tenga a la mano sin perder nada
    // de lo que el visitante llenó en el registro.
    const noteLines = [
      body.cargo?.trim() ? `Cargo: ${body.cargo.trim()}` : null,
      body.colaboradores?.trim() ? `Colaboradores: ${body.colaboradores.trim()}` : null,
      body.renovar ? `¿Planea renovar equipos?: ${body.renovar}` : null,
    ].filter(Boolean);

    const created = await zohoJson<{ estimate: { estimate_id: string } }>("/estimates?ignore_auto_number_generation=false", {
      method: "POST",
      body: JSON.stringify({
        customer_id: customerId,
        line_items: lineItems,
        ...(noteLines.length ? { notes: noteLines.join("\n") } : {}),
      }),
    });
    const estimateId = created.estimate.estimate_id;

    const pdfRes = await zohoFetch(`/estimates/${estimateId}?accept=pdf`);
    if (!pdfRes.ok) throw new Error("No se pudo generar el PDF de la cotización.");
    const pdfBuffer = await pdfRes.arrayBuffer();

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

async function findOrCreateContact(p: {
  email: string;
  name: string;
  company: string;
  phone: string;
  firstName: string;
  lastName: string;
  designation: string;
}): Promise<string> {
  const found = await zohoJson<{ contacts: { contact_id: string }[] }>(`/contacts?email=${encodeURIComponent(p.email)}`);
  if (found.contacts && found.contacts.length > 0) return found.contacts[0].contact_id;

  const created = await zohoJson<{ contact: { contact_id: string } }>("/contacts", {
    method: "POST",
    body: JSON.stringify({
      contact_name: p.name,
      company_name: p.company,
      contact_type: "customer",
      contact_persons: [
        {
          first_name: p.firstName,
          last_name: p.lastName,
          email: p.email,
          phone: p.phone,
          designation: p.designation,
          is_primary_contact: true,
        },
      ],
    }),
  });
  return created.contact.contact_id;
}
