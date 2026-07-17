import "server-only";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Verifica, en el servidor, que una petición trae la sesión de un admin ya
// autenticado (Supabase Auth). Usa la misma anon key que el resto de la app;
// no hace falta una service role key: validar un token de usuario contra
// Supabase Auth es una operación permitida con la anon key.
// ---------------------------------------------------------------------------

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function requireAdmin(req: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!url || !anonKey) return { ok: false, status: 500, error: "Supabase no está configurado en el servidor." };
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return { ok: false, status: 401, error: "Falta la sesión del panel admin." };

  const client = createClient(url, anonKey);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "Sesión inválida o expirada." };
  return { ok: true };
}
