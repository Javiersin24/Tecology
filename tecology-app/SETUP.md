# Puesta en marcha real (gratis) — Supabase + Vercel

Esta guía deja la app **funcionando de verdad** y **gratis**: base de datos compartida
entre todas las tablets del evento, fotos en la nube y el panel `/admin` protegido con
login. Son ~10 minutos. Yo dejé todo el código y el SQL listos; estos son los pasos que
solo tú puedes hacer porque van ligados a tu correo.

> Si NO configuras Supabase, la app igual funciona en **modo demo local** (los datos se
> guardan en el navegador de cada dispositivo). Para el evento real, sigue esta guía.

---

## 1) Crear el proyecto en Supabase (gratis)

1. Entra a **https://supabase.com** → *Start your project* → inicia sesión con GitHub o correo.
2. *New project*. Ponle nombre (p. ej. `tecology`), elige una contraseña de base de datos
   (guárdala) y la región más cercana. Plan **Free**.
3. Espera ~1 minuto a que se aprovisione.

## 2) Crear las tablas, seguridad y datos de ejemplo (una sola pegada)

1. En el proyecto, ve a **SQL Editor** (icono `</>` a la izquierda) → *New query*.
2. Abre el archivo **`supabase/schema.sql`** de este repo, copia **todo** su contenido,
   pégalo y pulsa **Run**.
3. Debe decir *Success*. Esto crea las tablas `products`, `use_cases`, `leads`, las reglas
   de seguridad, el bucket de imágenes y carga el catálogo de ejemplo (que luego editas).

## 3) Crear tu usuario administrador

1. Ve a **Authentication → Users → Add user → Create new user**.
2. Escribe tu **correo** y una **contraseña**, marca **Auto Confirm User** y crea.
3. Con ese correo y contraseña entrarás al panel `/admin`.

## 4) Copiar tus claves

1. Ve a **Project Settings → API**.
2. Copia **Project URL** y la clave **anon public**. Las usarás en el paso 5 y 6.

---

## 5) Probarlo en tu computadora (opcional pero recomendado)

```bash
cd tecology-app
cp .env.local.example .env.local
# edita .env.local y pega tus dos claves
npm install
npm run dev
```

Abre `http://localhost:3000` (catálogo) y `http://localhost:3000/admin` (te pedirá login).
Sube una foto a un producto y cámbialo de nivel: los cambios quedan en Supabase.

## 6) Publicar en Vercel (gratis)

### 6.1 Subir el código a tu GitHub

Si el repositorio aún no está en tu GitHub:

1. Crea un repositorio vacío en **https://github.com/new** (por ejemplo `tecology`), sin
   README ni .gitignore.
2. Desde la raíz del proyecto, en tu terminal:

   ```bash
   git remote add origin https://github.com/TU-USUARIO/tecology.git
   git push -u origin HEAD        # sube la rama actual con todo el código
   ```

   > El proyecto Next.js está en la subcarpeta `tecology-app/` de este repositorio.

### 6.2 Importar en Vercel

1. Entra a **https://vercel.com** → inicia sesión con GitHub → *Add New… → Project*.
3. Importa el repositorio. En **Root Directory** selecciona **`tecology-app`**.
4. En **Environment Variables** agrega las dos:
   - `NEXT_PUBLIC_SUPABASE_URL` = tu Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu anon key
5. Pulsa **Deploy**. En ~1 minuto tendrás una URL pública (p. ej. `tecology.vercel.app`).

- Catálogo del evento: la URL raíz.
- Panel: `…/admin` (login con el usuario del paso 3).

> **Tip para el evento:** abre la URL raíz en cada tablet en pantalla completa. Todas leen
> el mismo catálogo y cada registro de visitante aparece al instante en `/admin`.

---

## Cómo cargar tus productos y fotos

En `/admin` → pestaña **Catálogo**:
- **+ Nuevo producto** para crear, o **Editar** en cualquiera de los de ejemplo.
- **Subir imagen** sube la foto a Supabase (se comprime automáticamente) — usa fotos
  aprox. cuadradas o algo verticales para que luzcan bien.
- Marca el **nivel** (Básico / Recomendado / Empresarial). El *Recomendado* es el que sale
  destacado en el centro del catálogo.
- Marca los **tipos de uso** a los que aplica cada producto: el catálogo mostrará solo esos
  según lo que elija el visitante en el registro.
- El interruptor verde **activa/desactiva** un producto en el catálogo.

## Notas de seguridad

- Las claves `NEXT_PUBLIC_*` son **públicas** por diseño; lo que protege los datos son las
  reglas **RLS** del `schema.sql`: cualquiera puede *leer* el catálogo y *crear* su propio
  registro, pero **solo tu usuario autenticado** puede editar productos y ver/exportar los
  datos de los clientes.
- ¿Necesitas más de un administrador? Repite el paso 3 con otro correo.

## Regenerar el SQL (si cambias los datos de ejemplo)

```bash
npm run gen:schema   # reescribe supabase/schema.sql desde src/lib/seed.ts
```
