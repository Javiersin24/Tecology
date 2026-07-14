import type { CatalogData, Lead, NewLead } from "./types";
import { SEED_DATA } from "./seed";

// ---------------------------------------------------------------------------
// Capa de datos del catálogo. Simula el rol de Supabase con persistencia en
// localStorage. En producción, se reemplaza la implementación de `DataStore`
// por llamadas al SDK de Supabase (tablas: products, combos, use_cases, leads)
// manteniendo exactamente esta interfaz — el resto de la app no cambia.
// ---------------------------------------------------------------------------

export interface DataStore {
  load(): CatalogData;
  save(data: CatalogData): void;
  reset(): void;
  getLeads(): Lead[];
  addLead(lead: NewLead): string;
  updateLead(id: string, patch: Partial<Lead>): void;
  clearLeads(): void;
  /** Notifica a los suscriptores cuando cambian datos o leads. */
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
  load(): CatalogData {
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

  save(data: CatalogData): void {
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

  reset(): void {
    if (!hasWindow()) return;
    try {
      localStorage.removeItem(CATALOG_KEY);
    } catch {
      /* noop */
    }
    emit();
  }

  getLeads(): Lead[] {
    if (!hasWindow()) return [];
    try {
      const raw = localStorage.getItem(LEADS_KEY);
      if (raw) return JSON.parse(raw) as Lead[];
    } catch {
      /* noop */
    }
    return [];
  }

  private saveLeads(leads: Lead[]): void {
    if (!hasWindow()) return;
    try {
      localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
      emit();
    } catch {
      /* noop */
    }
  }

  addLead(lead: NewLead): string {
    const leads = this.getLeads();
    const id = "ld-" + Date.now();
    leads.push({ id, createdAt: new Date().toISOString(), ...lead });
    this.saveLeads(leads);
    return id;
  }

  updateLead(id: string, patch: Partial<Lead>): void {
    const leads = this.getLeads();
    const i = leads.findIndex((l) => l.id === id);
    if (i >= 0) {
      leads[i] = { ...leads[i], ...patch };
      this.saveLeads(leads);
    }
  }

  clearLeads(): void {
    if (!hasWindow()) return;
    try {
      localStorage.removeItem(LEADS_KEY);
    } catch {
      /* noop */
    }
    emit();
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

export const store: DataStore = new LocalDataStore();
