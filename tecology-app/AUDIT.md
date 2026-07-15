# Auditoría de implementación — Tecology Catálogo

Resumen técnico de todo lo realizado, para revisión. Fecha: 2026-07-15.

Origen: diseño de Claude Design `project/Tecology Catalogo.dc.html` (+ `Tecology Admin.dc.html`).
Implementación real en `tecology-app/`.

---

## 1. Alcance entregado

1. **Catálogo guiado** (visitante): Bienvenida → Registro + tipo de uso → Categorías →
   Catálogo (Básico/Recomendado/Empresarial) → Detalle → Cierre, con captura de lead.
2. **Panel administrativo** (`/admin`): CRUD de productos, niveles, activar/desactivar,
   fotos, CRUD de tipos de uso, registros de clientes y exportación CSV.
3. **Backend real opcional** (Supabase) con detección automática; si no hay credenciales,
   modo demo local (localStorage).
4. **Login** para el panel (Supabase Auth) y **reglas de seguridad** (RLS).
5. **Guía de despliegue** gratuito (Supabase + Vercel).

## 2. Stack

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4.
- Framer Motion (`motion`) para transiciones de pantalla.
- `@supabase/supabase-js` v2 (cliente, Storage, Auth, Realtime).
- Fuente Inter vía `next/font`.

## 3. Inventario de archivos (versionados)

| Archivo | Propósito |
|---|---|
| `src/app/layout.tsx` | Fuente, metadata, viewport, icono. |
| `src/app/page.tsx` | Ruta del catálogo → `CatalogApp`. |
| `src/app/admin/page.tsx` | Ruta admin → `AdminGate`. |
| `src/app/globals.css` | Reset, keyframes, contenedor responsive (`.tec-stage/.tec-device`). |
| `src/app/icon.png` | Favicon (marca Tecology). |
| `src/components/catalog/CatalogApp.tsx` (~870 L) | Máquina de estados + 6 pantallas del flujo. |
| `src/components/admin/AdminApp.tsx` (~581 L) | Dashboard: productos, tipos de uso, leads. |
| `src/components/admin/AdminGate.tsx` (~98 L) | Login Supabase Auth; en modo local pasa directo. |
| `src/lib/types.ts` | Tipos de dominio (`Product`, `UseCase`, `Lead`, …). |
| `src/lib/seed.ts` | Datos de ejemplo, etiquetas de categoría, `EMPTY_CATALOG`. |
| `src/lib/store.ts` | Interfaz `DataStore`, `LocalDataStore`, selector, compresión de imagen. |
| `src/lib/supabaseClient.ts` | Cliente Supabase + `isSupabaseConfigured`. |
| `src/lib/supabaseStore.ts` (~226 L) | `SupabaseDataStore` (DB, Storage, Realtime). |
| `src/lib/useStore.ts` | Hooks `useCatalogData`, `useLeads`. |
| `src/lib/theme.ts` | Tokens de color, metadatos de categoría, códigos de país. |
| `supabase/schema.sql` (~130 L) | Tablas + RLS + bucket + seed (idempotente, una sola pegada). |
| `scripts/gen-schema.ts` | Genera `schema.sql` desde `seed.ts` (`npm run gen:schema`). |
| `SETUP.md` | Puesta en marcha gratuita paso a paso. |
| `.env.local.example` | Plantilla de variables de entorno. |
| `public/brand/*.png` | Logos (fondo transparente). |

Commits de la sesión (rama `implement-tecology-catalogo`):

- `7c0b342` Implement Tecology catálogo + admin panel (Next.js)
- `3078a69` Make it real: Supabase backend, admin auth, deploy guide
- `f029620` docs: add GitHub push steps to SETUP.md

## 4. Arquitectura de datos

Toda la lectura/escritura pasa por la interfaz **`DataStore`** (`store.ts`), con dos
implementaciones seleccionadas automáticamente según haya credenciales de Supabase:

- `SupabaseDataStore` — DB real, Storage de imágenes, Realtime (sincroniza tablets).
- `LocalDataStore` — `localStorage` (desarrollo/demo, por dispositivo).

Métodos: `load / save / reset / getLeads / addLead / updateLead / clearLeads /
uploadImage / subscribe`. Todos asíncronos.

### Modelo relacional (Supabase)

- **products**: `id, category, tier, name, model, price, warranty, ideal, img, active,
  specs (jsonb), features (jsonb), includes (jsonb), uses (jsonb), sort, updated_at`.
- **use_cases**: `id, icon, name, desc, sort`.
- **leads**: `id (uuid), created_at, nombre, apellido, empresa, cargo, correo, codigo,
  telefono, colaboradores, uso, renovar, categorias (jsonb), vistos (jsonb),
  favoritos (jsonb), cotizo, segundos`.

Nota de diseño: `save()` reescribe el conjunto de productos/usos (upsert + borra los que
faltan). Es aceptable por el tamaño (decenas de filas); no está pensado para catálogos
grandes.

## 5. Seguridad (RLS) — punto clave de auditoría

Definido en `supabase/schema.sql`. Las claves `NEXT_PUBLIC_*` son públicas por diseño; la
protección real la dan estas políticas:

- **products / use_cases**: `SELECT` público; `INSERT/UPDATE/DELETE` solo `authenticated`.
- **leads**: `INSERT` y `UPDATE` para `anon` + `authenticated` (el visitante crea/actualiza
  su propio registro); `SELECT` y `DELETE` solo `authenticated` (el admin).
- **storage `product-images`**: bucket público; lectura pública; subir/actualizar solo
  `authenticated`.
- Realtime habilitado en las tres tablas.

## 6. Verificación realizada

- `tsc --noEmit`: **sin errores**.
- `eslint --max-warnings 0`: **limpio**.
- `next build` (producción): **exitoso** en modo local y en modo Supabase (con env de prueba).
- Navegador (Chromium/Playwright):
  - Modo local: flujo completo Bienvenida→…→Cierre; el lead se captura y aparece en
    `/admin`; reset a Bienvenida; tipos de uso y productos renderizan.
  - Modo Supabase (con URL/clave de prueba): SSR y cliente muestran el **login** del admin
    (correo, contraseña, botón Ingresar); el catálogo arranca sin fallar.

> No conecté un proyecto Supabase real (requiere tu cuenta), así que el camino contra la
> base real no se ejecutó de extremo a extremo; sí se verificó que compila, arranca y que
> el gate de login funciona.

## 7. Decisiones y desviaciones respecto al prototipo

- **Solo dirección A** (oscura/editorial), elegida por el cliente; se quitó el conmutador A/B.
- Se **omitió el marco de teléfono y la barra de estado falsa** del prototipo (eran chrome de
  la herramienta de diseño); la app usa el ancho real del dispositivo.
- **Registro**: se conserva *Colaboradores*; se quitaron *Provincia* y *Nº de equipos*; el
  teléfono usa **selector de código de país** (🇨🇷 +506 por defecto). (Acordado en el chat.)
- **Medallón** de bienvenida semi-transparente (listo para un video de fondo).
- **Responsive**: móvil a pantalla completa; en ≥768px se centra como *app card*. El catálogo
  mantiene el apilado vertical del `.dc.html` (fiel al diseño entregado).
- **Robustez**: la bienvenida se muestra de inmediato con un catálogo vacío de respaldo; las
  escrituras del admin están protegidas para no sobrescribir con ese respaldo.

## 8. Limitaciones y riesgos conocidos (honestidad de auditoría)

- **Leads – UPDATE anónimo**: la política permite que un anónimo actualice cualquier fila de
  `leads` (`using(true)`), necesario para que el visitante actualice su propio registro sin
  sesión. Riesgo bajo en un evento; se puede endurecer si se requiere.
- **Sin rate-limiting** en el `INSERT` público de `leads` (podría recibir spam). Aceptable
  para un evento presencial; considerar límites si se expone ampliamente.
- **`save()` grueso**: reescribe todos los productos/usos por cada cambio; correcto para este
  tamaño, no óptimo a gran escala.
- **Modo local** (sin Supabase) es por dispositivo; no sirve para varias tablets.
- **Sin tests automatizados** en el repo; la verificación fue manual vía navegador.
- Imágenes comprimidas a 640 px JPEG antes de subir.

## 9. Pasos manuales pendientes (requieren tu cuenta)

Detallados en `SETUP.md`:

1. Crear proyecto **Supabase** (gratis) y ejecutar `supabase/schema.sql`.
2. Crear tu **usuario admin** y copiar **Project URL** + **anon key**.
3. Subir el repo a **GitHub** y desplegar en **Vercel** (gratis) con esas 2 variables.

Este entorno de trabajo es efímero y sin conexión a GitHub, por lo que el `push` y el deploy
deben ejecutarse desde tu cuenta.
