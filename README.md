# asesinos.cl

Sitio estático (HTML/CSS/JS) + backend con Cloudflare Pages Functions.

## Estructura

```
index.html              Página principal
404.html                Página de error
css/styles.css          Estilos
js/main.js              JS del navegador (formulario)
functions/api/contacto.js  Backend (reemplaza a contacto.php) -> POST /api/contacto
robots.txt / sitemap.xml   Para Google
_headers                Cabeceras de seguridad y caché
favicon.svg
```

> PHP no corre en Cloudflare Pages. Cualquier lógica de servidor va en `functions/`
> como JavaScript. Cada archivo es una ruta: `functions/api/contacto.js` → `/api/contacto`.

## Despliegue en Cloudflare Pages

1. Sube este repo a GitHub.
2. Cloudflare → **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**.
3. Configuración de build:
   - Framework preset: **None**
   - Build command: *(vacío)*
   - Build output directory: `/`
4. **Custom domains** → agrega `asesinos.cl` y `www.asesinos.cl`.

## Formulario de contacto (opcional)

1. Crea cuenta gratis en https://resend.com y genera una API key.
2. Cloudflare → proyecto Pages → **Settings → Variables and Secrets**:
   - `RESEND_API_KEY` (tipo Secret)
   - `CONTACT_TO` → tu correo
   - `CONTACT_FROM` → `asesinos.cl <onboarding@resend.dev>` (para pruebas)
3. Vuelve a desplegar (Deployments → Retry deployment).
4. Para enviar desde `contacto@asesinos.cl`, verifica el dominio en Resend y agrega
   los registros DNS que te indique en Cloudflare.

## Probar en local

```bash
npx wrangler pages dev .
```
Abre http://localhost:8788
