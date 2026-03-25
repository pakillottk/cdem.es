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

En Cloudflare Pages, configuralas en **Settings -> Environment variables**.

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
