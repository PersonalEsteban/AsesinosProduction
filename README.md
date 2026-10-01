# asesinos.cl

Sitio público + panel privado con acceso por código.
Cloudflare Pages (estático + Functions) y PostgreSQL vía Hyperdrive.

## Estructura

```
public/                     Lo único que se publica como archivos
  index.html                Portada pública + modal de ingreso por código (#ingresar)
  app/                      Panel privado (protegido por functions/app/_middleware.js)
  css/ js/ _headers robots.txt sitemap.xml 404.html favicon.svg
functions/                  Backend (cada archivo es una ruta)
  api/_middleware.js        Conexión a la base, sesión, CSRF y manejo de errores
  api/contacto.js           POST /api/contacto (formulario de la portada)
  api/login.js | logout.js | me.js
  api/usuarios/...          Módulo 1: usuarios internos y sus códigos (admin)
  api/proyectos/...         Módulo 2: proyectos, avances y códigos de cliente
  api/codigos/[id].js       Revocar / reactivar códigos de cliente (admin)
  app/_middleware.js        Sin sesión -> redirige a /#ingresar (abre el modal)
lib/                        Código compartido del servidor (no se publica)
db/schema.sql               Tablas
db/crear-admin.sql          Crea el primer administrador
wrangler.toml               Configuración de Cloudflare (bindings, carpeta de salida)
```

## Roles

| Rol | Cómo entra | Qué puede hacer |
|---|---|---|
| **admin** | Código de usuario | Todo: usuarios, proyectos, códigos de cliente, avances |
| **empresa** | Código de usuario | Ver todos los proyectos y registrar avances |
| **cliente** | Código de proyecto | Ver solo el avance de su proyecto |

Los códigos (`XXXX-XXXX-XXXX`) los genera el sistema y **se muestran una sola vez**:
en la base solo se guarda `HMAC-SHA256(código, CODE_PEPPER)`. Si alguien pierde su
código, el admin le genera uno nuevo. El login bloquea una IP tras 10 intentos
fallidos en 15 minutos.

## Puesta en marcha

### 1. Base de datos (PostgreSQL en Neon)
1. Crea una cuenta en https://neon.tech y un proyecto (región más cercana a Chile).
2. En el **SQL Editor** de Neon ejecuta `db/schema.sql`.
3. Copia el *connection string* (`postgres://usuario:clave@host/db?sslmode=require`).

Para administrar la base con interfaz gráfica (como SSMS) usa **DBeaver** con ese mismo connection string.

### 2. Hyperdrive (conecta Cloudflare con la base)
Cloudflare → **Storage & Databases → Hyperdrive → Create**, pega el connection string
y copia el **ID** generado en `wrangler.toml` (`id = "..."`).

### 3. Secretos en Cloudflare
Proyecto Pages → **Settings → Variables and Secrets** (tipo **Secret**):

- `CODE_PEPPER`: valor aleatorio largo. Genéralo en PowerShell con:
  ```powershell
  $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
  ```
  Guárdalo también en un lugar seguro. **Si cambia, todos los códigos dejan de funcionar.**
- Formulario de contacto (opcional): `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`.
  Como ahora existe `wrangler.toml`, crea también `CONTACT_TO` y `CONTACT_FROM` como Secret.

### 4. Configuración de build en Cloudflare Pages
- Build command: *(vacío)*
- Build output directory: `public` (lo toma de `wrangler.toml`)
- Cloudflare instala `package.json` automáticamente.
- El `name` de `wrangler.toml` debe coincidir con el nombre del proyecto en Pages.

### 5. Primer administrador
Edita `db/crear-admin.sql` (tu código y el `CODE_PEPPER`), ejecútalo en Neon y entra a
`https://asesinos.cl/#ingresar`. Desde el panel puedes regenerar tu código para que lo genere el sistema.
No guardes ese archivo con los valores reales en el repo.

## Probar en local

Requiere Node.js 20+.

```bash
npm install
```

Crea `.dev.vars` (está en `.gitignore`):
```
CODE_PEPPER=el-mismo-u-otro-valor-para-pruebas
```

Indica la base a usar en local y levanta el sitio:
```powershell
$env:CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE = "postgres://..."
npm run dev
```
Abre http://localhost:8788. Conviene usar una *branch* de Neon para pruebas y no la base de producción.
