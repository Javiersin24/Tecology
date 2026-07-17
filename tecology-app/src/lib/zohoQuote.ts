import "server-only";
import { zohoFetch, zohoJson, ZOHO_TAX_ID } from "./zoho";

// Lógica compartida para crear una cotización (Estimate) en Zoho Books.
// La usan tanto la ruta pública (/api/zoho/quote) como la prueba de conexión
// del panel admin (/api/admin/zoho-test), para que ambas ejerciten el MISMO
// camino de código.

// Algunas organizaciones de Zoho exigen un "Vendedor" (salesperson) en cada
// cotización. Se resuelve una vez: si defines ZOHO_SALESPERSON_ID se usa ese;
// si no, se toma el primer vendedor de la cuenta. Se cachea en memoria.
let cachedSalespersonId: string | null | undefined;

async function getSalespersonId(): Promise<string | null> {
  if (cachedSalespersonId !== undefined) return cachedSalespersonId;
  const fromEnv = process.env.ZOHO_SALESPERSON_ID?.trim();
  if (fromEnv) {
    cachedSalespersonId = fromEnv;
    return cachedSalespersonId;
  }
  try {
    const data = await zohoJson<{ salespersons: { salesperson_id: string; status?: string }[] }>("/salespersons");
    const list = data.salespersons || [];
    const active = list.find((s) => s.status !== "inactive") || list[0];
    cachedSalespersonId = active?.salesperson_id ?? null;
  } catch {
    cachedSalespersonId = null;
  }
  return cachedSalespersonId;
}

export interface QuoteItemInput {
  zohoItemId?: string;
  name: string;
  price: string;
  qty?: number;
}

export interface QuoteInput {
  nombre?: string;
  apellido?: string;
  empresa?: string;
  cargo?: string;
  correo: string;
  codigo?: string;
  telefono?: string;
  colaboradores?: string;
  renovar?: string | null;
  items: QuoteItemInput[];
}

function parsePrice(raw: string): number {
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
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

/** Crea el contacto (si hace falta) y la cotización. Devuelve el estimate. */
export async function createZohoQuote(input: QuoteInput): Promise<{ estimateId: string; estimateNumber?: string }> {
  const correo = input.correo.trim();
  const nombreCompleto = [input.nombre, input.apellido].filter(Boolean).join(" ").trim() || correo;

  const customerId = await findOrCreateContact({
    email: correo,
    name: nombreCompleto,
    company: input.empresa?.trim() || "",
    phone: [input.codigo, input.telefono].filter(Boolean).join(" ").trim(),
    firstName: input.nombre?.trim() || nombreCompleto,
    lastName: input.apellido?.trim() || "",
    designation: input.cargo?.trim() || "",
  });

  const lineItems = input.items.map((i) => ({
    ...(i.zohoItemId ? { item_id: i.zohoItemId } : {}),
    name: i.name,
    rate: parsePrice(i.price),
    quantity: i.qty && i.qty > 0 ? i.qty : 1,
    ...(ZOHO_TAX_ID ? { tax_id: ZOHO_TAX_ID } : {}),
  }));

  const noteLines = [
    input.cargo?.trim() ? `Cargo: ${input.cargo.trim()}` : null,
    input.colaboradores?.trim() ? `Colaboradores: ${input.colaboradores.trim()}` : null,
    input.renovar ? `¿Planea renovar equipos?: ${input.renovar}` : null,
  ].filter(Boolean);

  const salespersonId = await getSalespersonId();

  const created = await zohoJson<{ estimate: { estimate_id: string; estimate_number?: string } }>(
    "/estimates?ignore_auto_number_generation=false",
    {
      method: "POST",
      body: JSON.stringify({
        customer_id: customerId,
        line_items: lineItems,
        ...(salespersonId ? { salesperson_id: salespersonId } : {}),
        ...(noteLines.length ? { notes: noteLines.join("\n") } : {}),
      }),
    },
  );
  return { estimateId: created.estimate.estimate_id, estimateNumber: created.estimate.estimate_number };
}

/** Descarga el PDF de una cotización ya creada. */
export async function fetchZohoQuotePdf(estimateId: string): Promise<ArrayBuffer> {
  const pdfRes = await zohoFetch(`/estimates/${estimateId}?accept=pdf`);
  if (!pdfRes.ok) throw new Error("No se pudo generar el PDF de la cotización.");
  return pdfRes.arrayBuffer();
}

/** Borra una cotización (se usa para dejar limpia la prueba de conexión). */
export async function deleteZohoQuote(estimateId: string): Promise<void> {
  await zohoFetch(`/estimates/${estimateId}`, { method: "DELETE" });
}
