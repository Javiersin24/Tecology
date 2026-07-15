import type { CatalogData, Lead, NewLead } from "./types";
import { SEED_DATA } from "./seed";
import { isSupabaseConfigured } from "./supabaseClient";
import { SupabaseDataStore } from "./supabaseStore";
import { compressToDataUrl } from "./imageCompress";

// ---------------------------------------------------------------------------
// Capa de datos del catálogo. Una única interfaz `DataStore` con dos
// implementaciones:
//   • SupabaseDataStore — producción: base real, compartida entre dispositivos.
//   • LocalDataStore    — desarrollo / demo: persistencia en localStorage.
// La app elige automáticamente según haya o no credenciales de Supabase.
// ---------------------------------------------------------------------------

export interface DataStore {
  load(): Promise<CatalogData>;
  save(data: CatalogData): Promise<void>;
  reset(): Promise<void>;
  getLeads(): Promise<Lead[]>;
  addLead(lead: NewLead): Promise<string>;
  updateLead(id: string, patch: Partial<Lead>): Promise<void>;
  clearLeads(): Promise<void>;
  /** Sube una imagen y devuelve una URL utilizable en <img src>. */
  uploadImage(file: Blob): Promise<string>;
  /** Notifica cuando cambian datos o leads (para refrescar la UI). */
  subscribe(listener: () => void): () => void;
}

const CATALOG_KEY = "tecology_catalog_v2";
const LEADS_KEY = "tecology_leads_v1";
const EVENT = "tecology:change";

function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}
function hasWindow(): boolean {
  return typeof window !== "undefined";
}
function emit() {
  if (hasWindow()) window.dispatchEvent(new Event(EVENT));
}

class LocalDataStore implements DataStore {
  async load(): Promise<CatalogData> {
    if (hasWindow()) {
      try {
        const raw = localStorage.getItem(CATALOG_KEY);
        if (raw) {
          const d = JSON.parse(raw) as CatalogData;
          if (!d.useCases || !d.useCases.length) d.useCases = clone(SEED_DATA.useCases);
          return d;
        }
      } catch {
        /* almacenamiento no disponible o corrupto: usa la semilla */
      }
    }
    return clone(SEED_DATA);
  }

  async save(data: CatalogData): Promise<void> {
    if (!hasWindow()) return;
    try {
      localStorage.setItem(CATALOG_KEY, JSON.stringify(data));
      emit();
    } catch (e) {
      console.error("Tecology: no se pudo guardar (posible límite de almacenamiento):", e);
      alert(
        "No se pudo guardar: la imagen es muy pesada o se llenó el almacenamiento local. Intenta con una imagen más pequeña.",
      );
    }
  }

  async reset(): Promise<void> {
    if (!hasWindow()) return;
    try {
      localStorage.removeItem(CATALOG_KEY);
    } catch {
      /* noop */
    }
    emit();
  }

  async getLeads(): Promise<Lead[]> {
    if (!hasWindow()) return [];
    try {
      const raw = localStorage.getItem(LEADS_KEY);
      if (raw) return JSON.parse(raw) as Lead[];
    } catch {
      /* noop */
    }
    return [];
  }

  private setLeads(leads: Lead[]): void {
    if (!hasWindow()) return;
    try {
      localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
      emit();
    } catch {
      /* noop */
    }
  }

  async addLead(lead: NewLead): Promise<string> {
    const leads = await this.getLeads();
    const id = "ld-" + Date.now();
    leads.push({ id, createdAt: new Date().toISOString(), ...lead });
    this.setLeads(leads);
    return id;
  }

  async updateLead(id: string, patch: Partial<Lead>): Promise<void> {
    const leads = await this.getLeads();
    const i = leads.findIndex((l) => l.id === id);
    if (i >= 0) {
      leads[i] = { ...leads[i], ...patch };
      this.setLeads(leads);
    }
  }

  async clearLeads(): Promise<void> {
    if (!hasWindow()) return;
    try {
      localStorage.removeItem(LEADS_KEY);
    } catch {
      /* noop */
    }
    emit();
  }

  /** Sin Storage remoto: comprime a data URL en el navegador (como el prototipo). */
  async uploadImage(file: Blob): Promise<string> {
    return compressToDataUrl(file);
  }

  subscribe(listener: () => void): () => void {
    if (!hasWindow()) return () => {};
    const onChange = () => listener();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CATALOG_KEY || e.key === LEADS_KEY) listener();
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }
}


export const store: DataStore = isSupabaseConfigured
  ? new SupabaseDataStore()
  : new LocalDataStore();

/** Útil para la UI: indica si estamos con base real o modo demo local. */
export { isSupabaseConfigured };
