# CDEM.es

Web corporativa de **CDEM (Creacion y Diseno de Eventos Musicales)** construida con Astro y desplegada en Cloudflare Pages.

## Vista General

Este proyecto incluye:

- Paginas estaticas en Astro para secciones corporativas
- Componentes React para partes interactivas (formularios y galeria)
- Generacion automatica del manifiesto de imagenes de producciones
- Integracion preparada para Cloudflare Pages + Worker

## Stack Tecnico

- **Framework:** Astro 6
- **UI:** Astro + React 19
- **Estilos:** CSS global + Tailwind CSS 4 (via plugin Vite)
- **Contenido:** Markdoc + Keystatic
- **Runtime/Deploy:** Cloudflare (`@astrojs/cloudflare`)

## Scripts Disponibles

Todos los comandos se ejecutan desde la raiz del proyecto:

| Comando | Que hace |
| :-- | :-- |
| `npm install` | Instala dependencias |
| `npm run gallery:manifest` | Regenera `src/data/galleryManifest.generated.ts` leyendo `public/producciones` |
| `npm run dev` | Arranca entorno local (`astro dev`) |
| `npm run build` | Genera build de produccion en `dist/` |
| `npm run preview` | Previsualiza la build localmente |
| `npm run deploy` | Build + deploy a Cloudflare Pages con Wrangler |

> Nota: `gallery:manifest` se ejecuta automaticamente antes de `dev` y `build`.

## Variables de Entorno

La app define estas variables (opcionales) para el flujo de contacto:

- `RESEND_API_KEY`
- `CONTACT_EMAIL_TO`
- `FROM_EMAIL`
- `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`
- `PREVIEW_SECRET` (previews y E2E remoto)

### CMS Keystatic (eventos)

- En **local**: no definas `KEYSTATIC_STORAGE` → storage en filesystem. Arranca `npm run dev` y abre `http://localhost:4321/keystatic` (alias: `/admin`). Las imágenes de eventos se suben desde el campo **Imagen** (no hace falta escribir rutas).
- En desarrollo usamos el adapter Node (no Cloudflare) para que el admin de Keystatic hidrate bien; el deploy sigue siendo Cloudflare Workers.
- En **Cloudflare** (staging/producción): `KEYSTATIC_STORAGE=github` + secrets OAuth (`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`).
- Publicar en el CMS crea commits en Git; el workflow `.github/workflows/deploy.yml` reconstruye y despliega al cambiar `src/content/**` o `public/eventos/**`.
- Staging: rama `develop`. Producción: rama `master`. En el admin de Keystatic puedes cambiar de rama antes de publicar.
- Recomendado: proteger `/keystatic`, `/admin` y `/api/keystatic` con **Cloudflare Access** además del login GitHub.

Copia `.env.example` a `.env` o `.dev.vars` para desarrollo local. Para probar `/keystatic` con `wrangler dev`, añade también las vars de Keystatic en `.dev.vars`.

En **Cloudflare Workers**, `wrangler.jsonc` incluye `disable_nodejs_process_v2` junto a `nodejs_compat` (sin eso las rutas SSR devuelven `[object Object]`). Los secrets deben inyectarse en cada versión con `--secrets-file` (el deploy ejecuta `scripts/sync-worker-secrets.sh` antes del upload). Si despliegas con **Workers Builds**, define los mismos secrets como variables de build en el dashboard.

## Estructura del Proyecto

```text
.
|-- public/
|   |-- producciones/         # Imagenes de galeria por carpeta
|   `-- ...
|-- scripts/
|   `-- build-gallery-manifest.mjs
|-- src/
|   |-- actions/              # Actions del servidor
|   |-- components/           # Componentes Astro/React
|   |-- content/              # Contenido CMS (eventos, posts)
|   |-- data/                 # Datos estaticos y manifiesto generado
|   |-- layouts/              # Layout base
|   |-- pages/                # Rutas del sitio
|   `-- styles/               # Estilos por seccion/componente
|-- astro.config.mjs
`-- package.json
```

## Desarrollo Local

```bash
npm install
npm run dev
```

El servidor de desarrollo suele levantarse en `http://localhost:4321`.

## Despliegue

### Opcion 1: Desde CLI

```bash
npm run deploy
```

### Opcion 2: Desde Cloudflare Pages (Git integrado)

- **Build command:** `npm run build`
- **Build output directory:** `dist`

## Notas de Mantenimiento

- Si se agregan o renombran imagenes en `public/producciones`, ejecuta:
  - `npm run gallery:manifest`
- Revisa que el fichero generado `src/data/galleryManifest.generated.ts` quede actualizado antes de desplegar.
