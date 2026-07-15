// Genera supabase/schema.sql a partir de los datos semilla (una sola fuente de verdad).
// Uso:  node --experimental-strip-types scripts/gen-schema.ts > supabase/schema.sql
import { SEED_DATA, CATEGORY_ORDER } from "../src/lib/seed.ts";

const q = (v: string | null | undefined) => (v == null ? "null" : "'" + String(v).replace(/'/g, "''") + "'");
const j = (v: unknown) => "'" + JSON.stringify(v).replace(/'/g, "''") + "'::jsonb";

const header = `-- ============================================================================
-- Tecology · Esquema Supabase (una sola pegada en el editor SQL de Supabase)
-- Crea tablas, políticas de seguridad (RLS), bucket de imágenes y datos de ejemplo.
-- Vuelve a ejecutarlo cuando quieras: es idempotente.
-- ============================================================================

-- ---------- Tablas ----------------------------------------------------------
create table if not exists public.products (
  id         text primary key,
  category   text not null,
  tier       text not null,
  name       text not null,
  model      text default '',
  price      text default '',
  warranty   text default '',
  ideal      text default '',
  img        text default '',
  active     boolean not null default true,
  specs      jsonb not null default '[]'::jsonb,
  features   jsonb not null default '[]'::jsonb,
  includes   jsonb,
  uses       jsonb not null default '[]'::jsonb,
  sort       integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.use_cases (
  id    text primary key,
  icon  text default '',
  name  text not null,
  "desc" text default '',
  sort  integer not null default 0
);

create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  nombre        text,
  apellido      text,
  empresa       text,
  cargo         text,
  correo        text,
  codigo        text,
  telefono      text,
  colaboradores text,
  uso           text,
  renovar       text,
  categorias    jsonb default '[]'::jsonb,
  vistos        jsonb default '[]'::jsonb,
  favoritos     jsonb default '[]'::jsonb,
  cotizo        boolean default false,
  segundos      integer
);

-- ---------- Realtime (para que todas las tablets se sincronicen) -------------
do $$ begin
  alter publication supabase_realtime add table public.products;
  alter publication supabase_realtime add table public.use_cases;
  alter publication supabase_realtime add table public.leads;
exception when duplicate_object then null; end $$;

-- ---------- Seguridad (RLS) --------------------------------------------------
alter table public.products  enable row level security;
alter table public.use_cases enable row level security;
alter table public.leads     enable row level security;

-- Catálogo: lectura pública; escritura solo para el admin autenticado.
drop policy if exists "read products"  on public.products;
drop policy if exists "write products" on public.products;
create policy "read products"  on public.products  for select using (true);
create policy "write products" on public.products  for all to authenticated using (true) with check (true);

drop policy if exists "read use_cases"  on public.use_cases;
drop policy if exists "write use_cases" on public.use_cases;
create policy "read use_cases"  on public.use_cases for select using (true);
create policy "write use_cases" on public.use_cases for all to authenticated using (true) with check (true);

-- Leads: el visitante anónimo puede crear y actualizar su registro;
-- solo el admin autenticado puede leerlos o borrarlos.
drop policy if exists "insert leads" on public.leads;
drop policy if exists "update leads" on public.leads;
drop policy if exists "read leads"   on public.leads;
drop policy if exists "delete leads" on public.leads;
create policy "insert leads" on public.leads for insert to anon, authenticated with check (true);
create policy "update leads" on public.leads for update to anon, authenticated using (true) with check (true);
create policy "read leads"   on public.leads for select to authenticated using (true);
create policy "delete leads" on public.leads for delete to authenticated using (true);

-- ---------- Storage: bucket público de imágenes de producto ------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "read images"   on storage.objects;
drop policy if exists "upload images" on storage.objects;
drop policy if exists "update images" on storage.objects;
create policy "read images"   on storage.objects for select using (bucket_id = 'product-images');
create policy "upload images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
create policy "update images" on storage.objects for update to authenticated using (bucket_id = 'product-images');

-- ============================================================================
-- Datos de ejemplo (opcional). Bórralos si quieres empezar con el catálogo
-- vacío. 'on conflict do nothing' evita duplicados al reejecutar.
-- ============================================================================
`;

const lines: string[] = [header];

// Productos
for (const cat of CATEGORY_ORDER) {
  const block = SEED_DATA.categories[cat];
  block.plans.forEach((p, i) => {
    lines.push(
      `insert into public.products (id,category,tier,name,model,price,warranty,ideal,img,active,specs,features,includes,uses,sort) values (` +
        `${q(p.id)},${q(cat)},${q(p.tier)},${q(p.name)},${q(p.model)},${q(p.price)},${q(p.warranty)},${q(p.ideal)},${q(p.img)},true,` +
        `${j(p.specs)},${j(p.features)},${p.includes ? j(p.includes) : "null"},${j(p.uses ?? [])},${i}) on conflict (id) do nothing;`,
    );
  });
}
lines.push("");
// Tipos de uso
SEED_DATA.useCases.forEach((u, i) => {
  lines.push(
    `insert into public.use_cases (id,icon,name,"desc",sort) values (${q(u.id)},${q(u.icon)},${q(u.name)},${q(u.desc)},${i}) on conflict (id) do nothing;`,
  );
});
lines.push("");

process.stdout.write(lines.join("\n"));
