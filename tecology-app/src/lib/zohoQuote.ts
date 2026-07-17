import "server-only";
import { zohoFetch, zohoJson, ZOHO_TAX_ID } from "./zoho";

// Lógica compartida para crear una cotización (Estimate) en Zoho Books.
// La usan tanto la ruta pública (/api/zoho/quote) como la prueba de conexión
// del panel admin (/api/admin/zoho-test), para que ambas ejerciten el MISMO
// camino de código.

// Algunas organizaciones de Zoho exigen un "Vendedor" (salesperson) en cada
// cotización. Nombre por defecto del vendedor (el que crea "Crear vendedor").
const SALESPERSON_NAME = process.env.ZOHO_SALESPERSON_NAME?.trim() || "Tecology";

export interface ZohoSalesperson {
  salesperson_id: string;
  salesperson_name?: string;
  status?: string;
}
let cachedSalespersonId: string | null = null;

/** Lista los vendedores de la cuenta. Lanza el error real si la API falla. */
export async function listSalespersons(): Promise<ZohoSalesperson[]> {
  const data = await zohoJson<{ salespersons: ZohoSalesperson[] }>("/salespersons");
  return data.salespersons || [];
}

/** Crea un vendedor en Zoho Books. */
export async function createSalesperson(name: string, email?: string): Promise<ZohoSalesperson> {
  const created = await zohoJson<{ salesperson: ZohoSalesperson }>("/salespersons", {
    method: "POST",
    body: JSON.stringify({ salesperson_name: name, ...(email ? { salesperson_email: email } : {}) }),
  });
  cachedSalespersonId = created.salesperson.salesperson_id; // úsalo de inmediato
  return created.salesperson;
}

// Resuelve el vendedor a incluir en la cotización. Prioridad:
//   1. ZOHO_SALESPERSON_ID (si lo fijaste)
//   2. el primer vendedor del listado (cuando el listado sí funciona)
//   3. por NOMBRE (SALESPERSON_NAME) — Zoho lo asocia si existe. Esto cubre el
//      caso en que GET /salespersons devuelve vacío pero el vendedor sí existe.
async function resolveSalesperson(): Promise<{ salesperson_id: string } | { salesperson_name: string }> {
  const envId = process.env.ZOHO_SALESPERSON_ID?.trim();
  if (envId) return { salesperson_id: envId };
  if (cachedSalespersonId) return { salesperson_id: cachedSalespersonId };
  try {
    const list = await listSalespersons();
    const active = list.find((s) => s.status !== "inactive") || list[0];
    if (active?.salesperson_id) {
      cachedSalespersonId = active.salesperson_id;
      return { salesperson_id: cachedSalespersonId };
    }
  } catch {
    /* el listado falló o vino vacío: usamos el nombre como respaldo */
  }
  return { salesperson_name: SALESPERSON_NAME };
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

  const salesperson = await resolveSalesperson();

  const created = await zohoJson<{ estimate: { estimate_id: string; estimate_number?: string } }>(
    "/estimates?ignore_auto_number_generation=false",
    {
      method: "POST",
      body: JSON.stringify({
        customer_id: customerId,
        line_items: lineItems,
        ...salesperson,
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
