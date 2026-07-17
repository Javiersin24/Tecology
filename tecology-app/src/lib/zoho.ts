import "server-only";

// ---------------------------------------------------------------------------
// Cliente de Zoho Books para el servidor. NUNCA importar desde código cliente:
// usa el secreto ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN. Solo se usa desde
// Route Handlers (src/app/api/**), que corren en el servidor.
// ---------------------------------------------------------------------------

const CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;
const ORG_ID = process.env.ZOHO_ORGANIZATION_ID;
const ACCOUNTS_DOMAIN = (process.env.ZOHO_ACCOUNTS_DOMAIN || "https://accounts.zoho.com").replace(/\/+$/, "");
const API_DOMAIN = (process.env.ZOHO_API_DOMAIN || "https://www.zohoapis.com").replace(/\/+$/, "");
/** Impuesto a aplicar en cada línea (ITBMS en Panamá por defecto). */
export const ZOHO_TAX_ID = process.env.ZOHO_TAX_ID || "";

export const isZohoConfigured = Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN && ORG_ID);

// Cache en memoria del access token dentro de la misma instancia de función
// (best-effort; en serverless puede perderse entre invocaciones frías, en
// cuyo caso simplemente se pide uno nuevo — sin costo funcional).
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error("Zoho no está configurado (faltan credenciales del servidor).");
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const url = new URL(`${ACCOUNTS_DOMAIN}/oauth/v2/token`);
  url.searchParams.set("grant_type", "refresh_token");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("client_secret", CLIENT_SECRET);
  url.searchParams.set("refresh_token", REFRESH_TOKEN);

  const res = await fetch(url.toString(), { method: "POST" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error("No se pudo renovar el token de Zoho: " + (body.error || res.status));
  }
  cachedToken = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

/** Llama a la API de Zoho Books (v3), agregando auth + organization_id. */
export async function zohoFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!ORG_ID) throw new Error("Falta ZOHO_ORGANIZATION_ID.");
  const token = await getAccessToken();
  const url = new URL(`${API_DOMAIN}/books/v3${path}`);
  if (!url.searchParams.has("organization_id")) url.searchParams.set("organization_id", ORG_ID);

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Zoho-oauthtoken ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  return fetch(url.toString(), { ...init, headers });
}

export async function zohoJson<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await zohoFetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (typeof body === "object" && body !== null && "code" in body && (body as { code: number }).code !== 0)) {
    const msg = (body as { message?: string })?.message || `Zoho respondió ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

/** Intercambia un grant token (autorización de un solo uso) por un refresh token. */
export async function exchangeGrantToken(params: {
  clientId: string;
  clientSecret: string;
  grantToken: string;
  accountsDomain?: string;
}): Promise<{ refresh_token: string; access_token: string }> {
  const domain = (params.accountsDomain || ACCOUNTS_DOMAIN).replace(/\/+$/, "");
  const url = new URL(`${domain}/oauth/v2/token`);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("client_secret", params.clientSecret);
  url.searchParams.set("redirect_uri", "https://www.zoho.com");
  url.searchParams.set("code", params.grantToken);

  const res = await fetch(url.toString(), { method: "POST" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.refresh_token) {
    throw new Error(body.error || "No se pudo intercambiar el grant token. Verifica que no haya expirado (dura pocos minutos) y que no se haya usado antes.");
  }
  return { refresh_token: body.refresh_token, access_token: body.access_token };
}
