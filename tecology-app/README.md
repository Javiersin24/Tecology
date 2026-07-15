# Tecology · Catálogo inteligente

Aplicación web del **catálogo digital guiado de Tecology** para eventos empresariales,
implementada a partir del diseño de Claude Design (`../project/Tecology Catalogo.dc.html`).

La experiencia guía al visitante: **Bienvenida → Registro + tipo de uso → Categorías →
Catálogo (Básico / Recomendado / Empresarial) → Detalle → Cierre**, capturando cada
interacción como *lead* comercial. Incluye un **panel administrativo** para gestionar
productos, tipos de uso y registros sin tocar código.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion** (`motion`) para las transiciones entre pantallas
- Fuente **Inter** vía `next/font` (fallback de *SF Pro Display*)

## Ejecutar

```bash
npm install
npm run dev      # desarrollo en http://localhost:3000
npm run build    # build de producción
npm run start    # servir el build
```

Rutas:

- `/` — catálogo guiado (diseño móvil; en pantallas grandes se centra como *app card*).
- `/admin` — panel administrativo.

## Datos: Supabase real o modo demo local

Toda la lectura/escritura pasa por `src/lib/store.ts` (interfaz **`DataStore`**), con dos
implementaciones que la app elige **automáticamente**:

- **Supabase** (`supabaseStore.ts`) — si defines `NEXT_PUBLIC_SUPABASE_URL` y
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Base real compartida entre dispositivos, fotos en
  Supabase Storage, sincronización en vivo (realtime) y `/admin` protegido con login.
- **Local** (`store.ts`) — si no hay credenciales: persistencia en `localStorage`, ideal
  para desarrollo y demo. `/admin` queda abierto (sin login).

👉 **Para ponerlo en marcha de verdad y gratis, sigue [`SETUP.md`](./SETUP.md)** (Supabase +
Vercel, ~10 min). El esquema completo está en `supabase/schema.sql` (una sola pegada en el
editor SQL de Supabase). Los datos de ejemplo viven en `src/lib/seed.ts`.

## Estructura

```
src/
  app/
    layout.tsx            # fuente, metadata, icono
    page.tsx              # ruta del catálogo
    admin/page.tsx        # ruta del panel admin
    globals.css           # reset, keyframes, contenedor responsive
  components/
    catalog/CatalogApp.tsx  # máquina de estados + 6 pantallas del flujo
    admin/AdminApp.tsx      # dashboard: productos, tipos de uso, leads
  lib/
    types.ts              # tipos de dominio
    seed.ts               # datos semilla (demo)
    store.ts              # capa de datos (DataStore) — punto de swap a Supabase
    useStore.ts           # hooks reactivos
    theme.ts              # tokens de color, metadatos de categorías, códigos de país
public/brand/             # logos (mark + wordmark, fondo transparente)
```

## Notas de fidelidad al diseño

- Se implementó **solo la dirección A** (oscura, editorial), que fue la elegida por el
  cliente; se eliminó el conmutador A/B del prototipo.
- El registro pide *Colaboradores* pero **no** *Provincia* ni *Nº de equipos*, y el
  teléfono usa **selector de código de país** (🇨🇷 +506 por defecto), tal como se acordó.
- El medallón de bienvenida es **semi-transparente**, listo para colocar un video de fondo.
- Se omitió el marco de teléfono y la barra de estado falsa del prototipo (eran *chrome*
  de la herramienta de diseño); la app usa el ancho real del dispositivo.
