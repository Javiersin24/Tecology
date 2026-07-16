// Tipos de dominio del catálogo Tecology.
// Reflejan el contrato de datos que Supabase implementará en producción
// (tablas: use_cases, categories, products/combos, leads).

export type Tier = "Básico" | "Recomendado" | "Empresarial";

export type CategoryKey = "laptops" | "desktop" | "combos" | "monitores";

export interface Spec {
  k: string;
  v: string;
}

export interface ComboItem {
  icon: string;
  label: string;
}

export interface Product {
  id: string;
  active: boolean;
  img: string;
  tier: Tier;
  name: string;
  model: string;
  price: string;
  warranty: string;
  specs: Spec[];
  ideal: string;
  features: string[];
  /** Servicios incluidos (editables por producto). */
  services?: string[];
  /** Solo combos. */
  includes?: ComboItem[];
  /** IDs de los tipos de uso a los que aplica este producto. */
  uses?: string[];
}

export interface Category {
  label: string;
  plans: Product[];
}

export interface UseCase {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

export interface CatalogData {
  useCases: UseCase[];
  categories: Record<string, Category>;
}

export interface Lead {
  id: string;
  createdAt: string;
  nombre?: string;
  apellido?: string;
  empresa?: string;
  cargo?: string;
  correo?: string;
  codigo?: string;
  telefono?: string;
  colaboradores?: string;
  uso?: string;
  renovar?: string | null;
  categorias?: string[];
  vistos?: string[];
  favoritos?: string[];
  cotizo?: boolean;
  segundos?: number | null;
}

export type NewLead = Omit<Lead, "id" | "createdAt">;
