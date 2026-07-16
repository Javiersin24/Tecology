import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente de Supabase. Las claves son públicas (anon key) — seguras de exponer;
// la seguridad real la imponen las políticas RLS definidas en supabase/schema.sql.

// Normaliza la URL: quita espacios, barras finales y un posible sufijo /rest/v1
// (un error común al copiarla desde el panel de Supabase).
function normalizeUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, "").replace(/\/rest\/v1$/i, "").replace(/\/+$/, "");
}

const url = normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

/** True cuando hay credenciales de Supabase; si no, la app usa el almacén local. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
