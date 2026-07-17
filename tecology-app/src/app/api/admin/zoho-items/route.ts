import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { isZohoConfigured, zohoJson } from "@/lib/zoho";

export const dynamic = "force-dynamic";

interface ZohoItemRow {
  item_id: string;
  name: string;
  rate: number;
  sku: string;
  status: string;
}

// GET /api/admin/zoho-items?search=thinkpad
// Busca artículos en Zoho Books para vincularlos a un producto del catálogo.
// Requiere sesión de admin (Supabase Auth) — nunca expone las credenciales de Zoho.
export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  if (!isZohoConfigured) {
    return NextResponse.json({ error: "Zoho no está configurado todavía." }, { status: 400 });
  }

  const search = new URL(req.url).searchParams.get("search")?.trim() || "";
  const path = `/items?per_page=15&filter_by=Status.Active${search ? `&search_text=${encodeURIComponent(search)}` : ""}`;

  try {
    const data = await zohoJson<{ items: ZohoItemRow[] }>(path);
    const items = (data.items || []).map((i) => ({ id: i.item_id, name: i.name, rate: i.rate, sku: i.sku }));
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error consultando Zoho." }, { status: 502 });
  }
}
