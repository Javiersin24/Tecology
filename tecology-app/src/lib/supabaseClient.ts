import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente de Supabase. Las claves son públicas (anon key) — seguras de exponer;
// la seguridad real la imponen las políticas RLS definidas en supabase/schema.sql.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True cuando hay credenciales de Supabase; si no, la app usa el almacén local. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
