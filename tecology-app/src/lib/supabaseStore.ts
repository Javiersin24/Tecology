import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { CatalogData, Category, Lead, NewLead, Product, Tier } from "./types";
import { CATEGORY_LABELS, CATEGORY_ORDER, SEED_DATA } from "./seed";
import { supabase } from "./supabaseClient";
import type { DataStore } from "./store";
import { compressToDataUrl } from "./imageCompress";

const BUCKET = "product-images";

interface ProductRow {
  id: string;
  category: string;
  tier: string;
  name: string;
  model: string | null;
  price: string | null;
  warranty: string | null;
  ideal: string | null;
  img: string | null;
  active: boolean;
  specs: Product["specs"] | null;
  features: string[] | null;
  includes: Product["includes"] | null;
  uses: string[] | null;
  sort: number | null;
}

interface LeadRow {
  id: string;
  created_at: string;
  nombre: string | null;
  apellido: string | null;
  empresa: string | null;
  cargo: string | null;
  correo: string | null;
  codigo: string | null;
  telefono: string | null;
  colaboradores: string | null;
  uso: string | null;
  renovar: string | null;
  categorias: string[] | null;
  vistos: string[] | null;
  favoritos: string[] | null;
  cotizo: boolean | null;
  segundos: number | null;
}

function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    active: r.active !== false,
    img: r.img || "",
    tier: r.tier as Tier,
    name: r.name,
    model: r.model || "",
    price: r.price || "",
    warranty: r.warranty || "",
    specs: Array.isArray(r.specs) ? r.specs : [],
    ideal: r.ideal || "",
    features: Array.isArray(r.features) ? r.features : [],
    includes: r.includes && r.includes.length ? r.includes : undefined,
    uses: Array.isArray(r.uses) ? r.uses : [],
  };
}

function rowToLead(r: LeadRow): Lead {
  return {
    id: r.id,
    createdAt: r.created_at,
    nombre: r.nombre ?? "",
    apellido: r.apellido ?? "",
    empresa: r.empresa ?? "",
    cargo: r.cargo ?? "",
    correo: r.correo ?? "",
    codigo: r.codigo ?? "",
    telefono: r.telefono ?? "",
    colaboradores: r.colaboradores ?? "",
    uso: r.uso ?? "",
    renovar: r.renovar ?? null,
    categorias: r.categorias ?? [],
    vistos: r.vistos ?? [],
    favoritos: r.favoritos ?? [],
    cotizo: r.cotizo ?? false,
    segundos: r.segundos ?? null,
  };
}

export class SupabaseDataStore implements DataStore {
  // Un único canal de tiempo real para toda la app + emisión local: la UI del
  // dispositivo que edita se refresca de inmediato, y el tiempo real (best-effort)
  // sincroniza a los demás. Si el tiempo real falla, la app sigue funcionando.
  private listeners = new Set<() => void>();
  private channel: RealtimeChannel | null = null;

  private get db(): SupabaseClient {
    if (!supabase) throw new Error("Supabase no está configurado");
    return supabase;
  }

  private emit(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {
        /* un listener no debe tumbar a los demás */
      }
    });
  }

  async load(): Promise<CatalogData> {
    const [{ data: prods, error: e1 }, { data: uses, error: e2 }] = await Promise.all([
      this.db.from("products").select("*").order("sort", { ascending: true }),
      this.db.from("use_cases").select("*").order("sort", { ascending: true }),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;

    const categories: Record<string, Category> = {};
    for (const key of CATEGORY_ORDER) {
      categories[key] = { label: CATEGORY_LABELS[key] || key, plans: [] };
    }
    (prods as ProductRow[] | null)?.forEach((r) => {
      if (!categories[r.category]) categories[r.category] = { label: CATEGORY_LABELS[r.category] || r.category, plans: [] };
      categories[r.category].plans.push(rowToProduct(r));
    });

    const useCases = ((uses as { id: string; icon: string; name: string; desc: string }[] | null) ?? []).map((u) => ({
      id: u.id, icon: u.icon || "", name: u.name, desc: u.desc || "",
    }));

    return { categories, useCases };
  }

  async save(data: CatalogData): Promise<void> {
    // Aplana productos con su categoría y orden.
    const productRows: ProductRow[] = [];
    for (const key of CATEGORY_ORDER) {
      const block = data.categories[key];
      if (!block) continue;
      block.plans.forEach((p, i) => {
        productRows.push({
          id: p.id, category: key, tier: p.tier, name: p.name, model: p.model, price: p.price,
          warranty: p.warranty, ideal: p.ideal, img: p.img, active: p.active !== false,
          specs: p.specs, features: p.features, includes: p.includes ?? null,
          uses: p.uses ?? [], sort: i,
        });
      });
    }
    const useRows = data.useCases.map((u, i) => ({ id: u.id, icon: u.icon, name: u.name, desc: u.desc, sort: i }));

    const { error: pe } = await this.db.from("products").upsert(productRows);
    if (pe) throw pe;
    const { error: ue } = await this.db.from("use_cases").upsert(useRows);
    if (ue) throw ue;

    await this.deleteMissing("products", productRows.map((r) => r.id));
    await this.deleteMissing("use_cases", useRows.map((r) => r.id));
    this.emit();
  }

  /** Borra las filas cuyo id no esté en `keep`. */
  private async deleteMissing(table: string, keep: string[]): Promise<void> {
    let q = this.db.from(table).delete();
    q = keep.length ? q.not("id", "in", `(${keep.join(",")})`) : q.not("id", "is", null);
    const { error } = await q;
    if (error) throw error;
  }

  async reset(): Promise<void> {
    // Restaura los productos y usos de ejemplo (upsert) sin borrar los que hayas creado.
    const productRows: ProductRow[] = [];
    for (const key of CATEGORY_ORDER) {
      SEED_DATA.categories[key].plans.forEach((p, i) => {
        productRows.push({
          id: p.id, category: key, tier: p.tier, name: p.name, model: p.model, price: p.price,
          warranty: p.warranty, ideal: p.ideal, img: p.img, active: true,
          specs: p.specs, features: p.features, includes: p.includes ?? null, uses: p.uses ?? [], sort: i,
        });
      });
    }
    const useRows = SEED_DATA.useCases.map((u, i) => ({ id: u.id, icon: u.icon, name: u.name, desc: u.desc, sort: i }));
    await this.db.from("products").upsert(productRows);
    await this.db.from("use_cases").upsert(useRows);
    this.emit();
  }

  async getLeads(): Promise<Lead[]> {
    const { data, error } = await this.db.from("leads").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return (data as LeadRow[] | null)?.map(rowToLead) ?? [];
  }

  async addLead(lead: NewLead): Promise<string> {
    const { data, error } = await this.db.from("leads").insert(leadToRow(lead)).select("id").single();
    if (error) throw error;
    this.emit();
    return (data as { id: string }).id;
  }

  async updateLead(id: string, patch: Partial<Lead>): Promise<void> {
    const { error } = await this.db.from("leads").update(leadToRow(patch)).eq("id", id);
    if (error) throw error;
    this.emit();
  }

  async clearLeads(): Promise<void> {
    const { error } = await this.db.from("leads").delete().not("id", "is", null);
    if (error) throw error;
    this.emit();
  }

  async uploadImage(file: Blob): Promise<string> {
    // Comprime en el navegador y sube al bucket público de Storage.
    const dataUrl = await compressToDataUrl(file);
    const blob = await (await fetch(dataUrl)).blob();
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await this.db.storage.from(BUCKET).upload(path, blob, {
      contentType: "image/jpeg", upsert: true,
    });
    if (error) throw error;
    return this.db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    this.ensureChannel();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.channel) {
        try {
          this.db.removeChannel(this.channel);
        } catch {
          /* noop */
        }
        this.channel = null;
      }
    };
  }

  /** Abre (una sola vez) el canal de tiempo real. Best-effort: si falla, la app
   *  sigue funcionando gracias a la emisión local tras cada escritura. */
  private ensureChannel(): void {
    if (this.channel) return;
    try {
      const notify = () => this.emit();
      this.channel = this.db
        .channel("tecology-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "products" }, notify)
        .on("postgres_changes", { event: "*", schema: "public", table: "use_cases" }, notify)
        .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, notify)
        .subscribe();
    } catch (e) {
      console.warn("Tecology: tiempo real no disponible (se usará refresco local):", e);
      this.channel = null;
    }
  }
}

function leadToRow(lead: Partial<Lead>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const map: (keyof Lead)[] = [
    "nombre", "apellido", "empresa", "cargo", "correo", "codigo", "telefono",
    "colaboradores", "uso", "renovar", "categorias", "vistos", "favoritos", "cotizo", "segundos",
  ];
  for (const k of map) {
    if (lead[k] !== undefined) row[k] = lead[k];
  }
  return row;
}
