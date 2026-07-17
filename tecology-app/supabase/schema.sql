-- ============================================================================
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
  services   jsonb not null default '[]'::jsonb,
  includes   jsonb,
  uses       jsonb not null default '[]'::jsonb,
  sort       integer not null default 0,
  updated_at timestamptz not null default now(),
  zoho_item_id   text,
  zoho_item_name text
);

-- Migraciones seguras si la tabla ya existía sin estas columnas:
alter table public.products add column if not exists services jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists zoho_item_id text;
alter table public.products add column if not exists zoho_item_name text;

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

insert into public.products (id,category,tier,name,model,price,warranty,ideal,img,active,specs,features,services,includes,uses,sort) values ('lt-b','laptops','Básico','ThinkPad L14','Gen 4 · Business','$499','Garantía 1 año','Tareas administrativas, Office, navegación y multitarea diaria en oficina.','',true,'[{"k":"Procesador","v":"Intel Core i5"},{"k":"Memoria","v":"16 GB RAM"},{"k":"Almacenamiento","v":"512 GB SSD"},{"k":"Pantalla","v":"14\" FHD"}]'::jsonb,'["Diseño ligero y resistente","Teclado con resistencia a derrames","Batería para toda la jornada"]'::jsonb,'[]'::jsonb,null,'[]'::jsonb,0) on conflict (id) do nothing;
insert into public.products (id,category,tier,name,model,price,warranty,ideal,img,active,specs,features,services,includes,uses,sort) values ('lt-r','laptops','Recomendado','ThinkPad T14','Gen 4 · vPro','$699','Garantía 3 años on-site','Profesionales que necesitan rendimiento, seguridad y movilidad para el día a día.','',true,'[{"k":"Procesador","v":"Intel Core i7"},{"k":"Memoria","v":"16 GB RAM"},{"k":"Almacenamiento","v":"512 GB SSD"},{"k":"Pantalla","v":"14\" FHD IPS"}]'::jsonb,'["Chasis reforzado certificación militar","Seguridad Intel vPro","Carga rápida y RAM ampliable"]'::jsonb,'[]'::jsonb,null,'[]'::jsonb,1) on conflict (id) do nothing;
insert into public.products (id,category,tier,name,model,price,warranty,ideal,img,active,specs,features,services,includes,uses,sort) values ('lt-e','laptops','Empresarial','EliteBook 840 G10','Core Ultra · Elite','$999','Garantía 3 años on-site','Ejecutivos y equipos que demandan máximo rendimiento y seguridad avanzada.','',true,'[{"k":"Procesador","v":"Intel Core Ultra 7"},{"k":"Memoria","v":"32 GB RAM"},{"k":"Almacenamiento","v":"1 TB SSD"},{"k":"Pantalla","v":"14\" WUXGA antirreflejo"}]'::jsonb,'["Pantalla WUXGA de bajo consumo","Cámara con obturador de privacidad","Ampliable en RAM y SSD"]'::jsonb,'[]'::jsonb,null,'[]'::jsonb,2) on conflict (id) do nothing;
insert into public.products (id,category,tier,name,model,price,warranty,ideal,img,active,specs,features,services,includes,uses,sort) values ('dk-b','desktop','Básico','ThinkCentre Neo 50s','SFF · Business','$459','Garantía 1 año','Puestos administrativos, recepción y trabajo de oficina de uso general.','',true,'[{"k":"Procesador","v":"Intel Core i5"},{"k":"Memoria","v":"16 GB RAM"},{"k":"Almacenamiento","v":"512 GB SSD"},{"k":"Formato","v":"Small Form Factor"}]'::jsonb,'["Formato compacto que ahorra espacio","Bajo consumo energético","Fácil mantenimiento"]'::jsonb,'[]'::jsonb,null,'[]'::jsonb,0) on conflict (id) do nothing;
insert into public.products (id,category,tier,name,model,price,warranty,ideal,img,active,specs,features,services,includes,uses,sort) values ('dk-r','desktop','Recomendado','OptiPlex 7010','Tower · vPro','$649','Garantía 3 años on-site','Estaciones de trabajo estables para multitarea y sistemas empresariales.','',true,'[{"k":"Procesador","v":"Intel Core i7"},{"k":"Memoria","v":"16 GB RAM"},{"k":"Almacenamiento","v":"512 GB SSD"},{"k":"Formato","v":"Tower expandible"}]'::jsonb,'["Chasis expandible sin herramientas","Seguridad de nivel empresarial","Alto rendimiento sostenido"]'::jsonb,'[]'::jsonb,null,'[]'::jsonb,1) on conflict (id) do nothing;
insert into public.products (id,category,tier,name,model,price,warranty,ideal,img,active,specs,features,services,includes,uses,sort) values ('dk-e','desktop','Empresarial','HP Elite Tower 800 G9','Core Ultra · Elite','$929','Garantía 3 años on-site','Diseño, ingeniería y cargas de trabajo intensivas en la empresa.','',true,'[{"k":"Procesador","v":"Intel Core Ultra 7"},{"k":"Memoria","v":"32 GB RAM"},{"k":"Almacenamiento","v":"1 TB SSD"},{"k":"Formato","v":"Tower · gráficos dedicados"}]'::jsonb,'["Preparado para gráficos dedicados","Refrigeración optimizada","Máxima capacidad de expansión"]'::jsonb,'[]'::jsonb,null,'[]'::jsonb,2) on conflict (id) do nothing;
insert into public.products (id,category,tier,name,model,price,warranty,ideal,img,active,specs,features,services,includes,uses,sort) values ('cb-b','combos','Básico','Combo Oficina Básico','Solución lista para trabajar','$649','Garantía 1 año','Equipar un nuevo puesto administrativo completo desde el primer día.','',true,'[{"k":"Equipo","v":"ThinkPad L14"},{"k":"Monitor","v":"24\" FHD"},{"k":"Periféricos","v":"Mouse + Teclado"},{"k":"Extra","v":"Mochila"}]'::jsonb,'["Todo listo para conectar y trabajar","Compatibilidad garantizada","Precio especial de paquete"]'::jsonb,'[]'::jsonb,'[{"icon":"💻","label":"Laptop ThinkPad"},{"icon":"🖥","label":"Monitor 24\""},{"icon":"🖱","label":"Mouse inalámbrico"},{"icon":"⌨️","label":"Teclado"},{"icon":"🎒","label":"Mochila"}]'::jsonb,'[]'::jsonb,0) on conflict (id) do nothing;
insert into public.products (id,category,tier,name,model,price,warranty,ideal,img,active,specs,features,services,includes,uses,sort) values ('cb-r','combos','Recomendado','Combo Productividad','Estación completa','$949','Garantía 3 años','Colaboradores que alternan entre escritorio y movilidad con una sola estación.','',true,'[{"k":"Equipo","v":"ThinkPad T14"},{"k":"Monitor","v":"27\" QHD"},{"k":"Docking","v":"USB-C incluido"},{"k":"Periféricos","v":"Mouse + Teclado"}]'::jsonb,'["Docking station para un solo cable","Monitor QHD de gran formato","Ergonomía y productividad"]'::jsonb,'[]'::jsonb,'[{"icon":"💻","label":"Laptop ThinkPad T14"},{"icon":"🖥","label":"Monitor 27\" QHD"},{"icon":"🔌","label":"Docking Station"},{"icon":"🖱","label":"Mouse"},{"icon":"⌨️","label":"Teclado"},{"icon":"🎒","label":"Mochila"}]'::jsonb,'[]'::jsonb,1) on conflict (id) do nothing;
insert into public.products (id,category,tier,name,model,price,warranty,ideal,img,active,specs,features,services,includes,uses,sort) values ('cb-e','combos','Empresarial','Combo Ejecutivo','Solución premium','$1,299','Garantía 3 años on-site','Gerencias y ejecutivos que requieren rendimiento, respaldo y presentación premium.','',true,'[{"k":"Equipo","v":"EliteBook 840 G10"},{"k":"Monitor","v":"27\" 4K"},{"k":"Respaldo","v":"UPS 650VA"},{"k":"Docking","v":"USB-C incluido"}]'::jsonb,'["Respaldo de energía UPS","Monitor 4K y docking","Setup ejecutivo completo"]'::jsonb,'[]'::jsonb,'[{"icon":"💻","label":"EliteBook 840"},{"icon":"🖥","label":"Monitor 27\" 4K"},{"icon":"🔌","label":"Docking Station"},{"icon":"🔋","label":"UPS 650VA"},{"icon":"🖱","label":"Mouse"},{"icon":"🎒","label":"Mochila"}]'::jsonb,'[]'::jsonb,2) on conflict (id) do nothing;
insert into public.products (id,category,tier,name,model,price,warranty,ideal,img,active,specs,features,services,includes,uses,sort) values ('mn-b','monitores','Básico','ThinkVision T24i','24" · Oficina','$149','Garantía 3 años','Puestos administrativos y de oficina que necesitan una pantalla confiable.','',true,'[{"k":"Tamaño","v":"24 pulgadas"},{"k":"Resolución","v":"Full HD 1080p"},{"k":"Panel","v":"IPS"},{"k":"Puertos","v":"HDMI · DisplayPort"}]'::jsonb,'["Panel IPS con buenos ángulos","Base ajustable en altura","Bajo consumo"]'::jsonb,'[]'::jsonb,null,'[]'::jsonb,0) on conflict (id) do nothing;
insert into public.products (id,category,tier,name,model,price,warranty,ideal,img,active,specs,features,services,includes,uses,sort) values ('mn-r','monitores','Recomendado','Dell P2725H','27" · Productividad','$229','Garantía 3 años','Multitarea cómoda con más espacio y conectividad USB-C de un solo cable.','',true,'[{"k":"Tamaño","v":"27 pulgadas"},{"k":"Resolución","v":"QHD 1440p"},{"k":"Panel","v":"IPS · 100 Hz"},{"k":"Puertos","v":"USB-C · HDMI · DP"}]'::jsonb,'["USB-C con carga incluida","Marco ultra delgado","Diseño ergonómico completo"]'::jsonb,'[]'::jsonb,null,'[]'::jsonb,1) on conflict (id) do nothing;
insert into public.products (id,category,tier,name,model,price,warranty,ideal,img,active,specs,features,services,includes,uses,sort) values ('mn-e','monitores','Empresarial','HP Z27k G3','27" · Estación de trabajo','$549','Garantía 3 años on-site','Diseño, edición y trabajo que exige color preciso y máxima definición.','',true,'[{"k":"Tamaño","v":"27 pulgadas"},{"k":"Resolución","v":"4K UHD"},{"k":"Panel","v":"IPS · 99% sRGB"},{"k":"Puertos","v":"USB-C 100W · DP"}]'::jsonb,'["4K con color calibrado de fábrica","USB-C 100W para portátiles","Ideal para diseño y edición"]'::jsonb,'[]'::jsonb,null,'[]'::jsonb,2) on conflict (id) do nothing;

insert into public.use_cases (id,icon,name,"desc",sort) values ('oficina','🏢','Oficina administrativa','Office, navegación y multitarea.',0) on conflict (id) do nothing;
insert into public.use_cases (id,icon,name,"desc",sort) values ('ejecutivos','💼','Ejecutivos','Movilidad, reuniones y productividad.',1) on conflict (id) do nothing;
insert into public.use_cases (id,icon,name,"desc",sort) values ('programacion','💻','Programación','Alto rendimiento para desarrollo.',2) on conflict (id) do nothing;
insert into public.use_cases (id,icon,name,"desc",sort) values ('diseno','🎨','Diseño gráfico','Adobe, AutoCAD, Illustrator.',3) on conflict (id) do nothing;
insert into public.use_cases (id,icon,name,"desc",sort) values ('video','🎥','Edición de video','Premiere, DaVinci y multimedia.',4) on conflict (id) do nothing;
insert into public.use_cases (id,icon,name,"desc",sort) values ('contabilidad','📊','Contabilidad','ERP, SAP y QuickBooks.',5) on conflict (id) do nothing;
insert into public.use_cases (id,icon,name,"desc",sort) values ('clinicas','🏥','Clínicas','Consultorios y expedientes.',6) on conflict (id) do nothing;
insert into public.use_cases (id,icon,name,"desc",sort) values ('educacion','🏫','Educación','Colegios y laboratorios.',7) on conflict (id) do nothing;
insert into public.use_cases (id,icon,name,"desc",sort) values ('hoteles','🏨','Hoteles','Recepción, reservas y admin.',8) on conflict (id) do nothing;
insert into public.use_cases (id,icon,name,"desc",sort) values ('callcenter','📞','Call Center','Jornadas prolongadas y estables.',9) on conflict (id) do nothing;
insert into public.use_cases (id,icon,name,"desc",sort) values ('logistica','📦','Logística','Inventario, bodega y facturación.',10) on conflict (id) do nothing;
insert into public.use_cases (id,icon,name,"desc",sort) values ('industria','🏭','Industria','Producción y gestión robusta.',11) on conflict (id) do nothing;
