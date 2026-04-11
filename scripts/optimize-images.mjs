/**
 * Optimiza todas las imágenes de public/ según su uso real en la UI.
 * - Convierte a WebP
 * - Reduce resolución al máximo necesario (con margen 2x para retina)
 * - Genera versiones thumb + full para galerías con modal
 *
 * Uso: node scripts/optimize-images.mjs
 * Prerrequisito: sharp disponible en node_modules
 */

import sharp from "sharp";
import {
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join, basename, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

const SUPPORTED = /\.(jpe?g|png|webp)$/i;

// ── Configuración por tipo de uso ──────────────────────────────────────────
// thumbnail: versión para grids/listas
// full:      versión para modal/vista completa
// single:    una sola versión (sin modal)

const TASKS = {
  // Portadas de producciones (raíz de /producciones, grid 3 cols max-w-6xl → ~384px real, 2x = 768, usamos 800)
  producciones_portadas: {
    srcDir: join(PUBLIC, "producciones"),
    recursive: false,
    single: { width: 800, quality: 82 },
  },
  // Galerías de producciones (en subcarpetas; se usan como thumb en react-image-gallery + full en modal 1100px, 2x = 2200)
  producciones_gallery: {
    srcDir: join(PUBLIC, "producciones"),
    recursive: true,
    thumb: { width: 800, quality: 80 },
    full: { width: 2200, quality: 85 },
  },
  // Booking (grid 3 cols, sin modal → 800px)
  booking: {
    srcDir: join(PUBLIC, "booking", "img"),
    recursive: false,
    single: { width: 800, quality: 82 },
  },
  // Eventos (grids de presentación → 800px)
  eventos: {
    srcDir: join(PUBLIC, "eventos"),
    recursive: true,
    single: { width: 800, quality: 82 },
  },
  // Iconos /public/iconos: solo .webp (fuentes ya convertidas). Tamaños según uso en UI.
  iconos: {
    srcDir: join(PUBLIC, "iconos"),
    rules: [
      {
        test: (n) =>
          [
            "organizacion-integral.webp",
            "gestion-artistas.webp",
            "coordinacion-tecnica.webp",
            "curaduria-y-asesoramiento.webp",
          ].includes(n),
        // UI ~284px; fuentes ~400px no se reducían con 568+withoutEnlargement
        width: 284,
        quality: 82,
      },
      {
        test: (n) => n.startsWith("SERVICIOS") && n.endsWith(".webp"),
        width: 224,
        quality: 82,
      },
    ],
    defaultRule: { width: 400, quality: 82 },
  },
  // Equipo nosotros (similar a grid de 3 cols → 1200px)
  nosotros: {
    srcDir: join(PUBLIC, "nosotros"),
    recursive: false,
    single: { width: 1200, quality: 85 },
  },
  // RRSS (iconos pequeños en footer ~32px, 2x = 64px, usamos 128 como máximo)
  rrss: {
    srcDir: join(PUBLIC, "rrss"),
    recursive: false,
    single: { width: 128, quality: 85 },
  },
  // Hero home: variantes responsive + home-foto.webp (1920, OG/legacy)
  // Calidad más baja en anchos pequeños (LCP móvil) sin tocar tanto el desktop grande.
  hero: {
    srcDir: PUBLIC,
    recursive: false,
    filter: (name) => name === "home foto.png",
    // Anchos grandes: calidad algo más alta; 640/800/960 muy agresivo (LCP móvil; hero con opacity baja en CSS).
    quality: 64,
    webpEffort: 6,
    breakpoints: [
      { file: "home-foto-640.webp", width: 640, quality: 42 },
      // ~360 CSS px ×2 ≈ 720 físicos: evita bajar al 800w si no hace falta.
      { file: "home-foto-720.webp", width: 720, quality: 30 },
      // Entre 720 y 960: móviles ~390–430 ×2 suelen caer en 800w.
      { file: "home-foto-800.webp", width: 800, quality: 28 },
      { file: "home-foto-960.webp", width: 960, quality: 34 },
      { file: "home-foto-1280.webp", width: 1280, quality: 52 },
      { file: "home-foto-1920.webp", width: 1920, quality: 58 },
    ],
    legacyFile: "home-foto.webp",
  },
  // Favicon (se usa a 32px aprox, optimizar PNG → se maneja separado)
  favicon: {
    srcDir: PUBLIC,
    recursive: false,
    filter: (name) => name === "favicon-cdem.png",
    outputName: () => "favicon-cdem-opt.png",
    single: { width: 180, quality: 90, format: "png" },
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

let totalSaved = 0;
let totalOriginal = 0;
let filesProcessed = 0;

function sizeMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function sizeKB(bytes) {
  return (bytes / 1024).toFixed(1) + " KB";
}

function getFilesInDir(dir, recursive = false) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const fullPath = join(dir, e.name);
    if (e.isDirectory() && recursive) {
      files.push(...getFilesInDir(fullPath, true));
    } else if (e.isFile() && SUPPORTED.test(e.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function getFilesInDirNonRecursive(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && SUPPORTED.test(e.name))
    .map((e) => join(dir, e.name));
}

async function processFile(srcPath, destPath, { width, quality, format = "webp", effort = 5 }) {
  const originalSize = statSync(srcPath).size;

  let pipeline = sharp(srcPath).resize({
    width,
    withoutEnlargement: true, // No agrandar si ya es más pequeña
    fit: "inside",
  });

  if (format === "webp") {
    pipeline = pipeline.webp({ quality, effort });
  } else if (format === "png") {
    pipeline = pipeline.png({ quality, compressionLevel: 9 });
  }

  mkdirSync(dirname(destPath), { recursive: true });
  await pipeline.toFile(destPath);

  const newSize = statSync(destPath).size;
  const saved = originalSize - newSize;
  totalSaved += saved;
  totalOriginal += originalSize;
  filesProcessed++;

  const pct = ((saved / originalSize) * 100).toFixed(0);
  console.log(
    `  ✓ ${basename(srcPath)} → ${basename(destPath)}\n` +
      `    ${sizeKB(originalSize)} → ${sizeKB(newSize)} (${pct}% reducción)`
  );

  return destPath;
}

function toWebpPath(srcPath, suffix = "") {
  const base = basename(srcPath, extname(srcPath));
  const dir = dirname(srcPath);
  return join(dir, base + suffix + ".webp");
}

// ── Procesado por tarea ────────────────────────────────────────────────────

async function runTask(name, task) {
  console.log(`\n── ${name} ──`);

  if (name === "producciones_gallery") {
    // Solo archivos en subdirectorios (carpetas de galerías)
    const subDirs = readdirSync(task.srcDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => join(task.srcDir, e.name));

    for (const subDir of subDirs) {
      const files = getFilesInDirNonRecursive(subDir);
      for (const srcPath of files) {
        // Omitir si ya son archivos webp generados
        if (srcPath.endsWith(".webp")) continue;

        const thumbPath = toWebpPath(srcPath, "-thumb");
        const fullPath = toWebpPath(srcPath, "-full");

        if (!existsSync(thumbPath)) {
          await processFile(srcPath, thumbPath, task.thumb);
        }
        if (!existsSync(fullPath)) {
          await processFile(srcPath, fullPath, task.full);
        }
      }
    }
    return;
  }

  if (name === "iconos") {
    if (!existsSync(task.srcDir)) {
      console.log("  (omitido: no existe public/iconos)");
      return;
    }
    const names = readdirSync(task.srcDir).filter(
      (n) => n.endsWith(".webp") && statSync(join(task.srcDir, n)).isFile()
    );
    for (const n of names) {
      const p = join(task.srcDir, n);
      let rule = task.defaultRule;
      for (const r of task.rules) {
        if (r.test(n)) {
          rule = r;
          break;
        }
      }
      const before = statSync(p).size;
      const buf = await sharp(p)
        .resize({
          width: rule.width,
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({ quality: rule.quality, effort: 5 })
        .toBuffer();
      writeFileSync(p, buf);
      const after = buf.length;
      totalSaved += before - after;
      totalOriginal += before;
      filesProcessed++;
      const pct = before ? (((before - after) / before) * 100).toFixed(0) : "0";
      console.log(
        `  ✓ ${n} (webp in-place)\n` +
          `    ${sizeKB(before)} → ${sizeKB(after)} (${pct}% reducción)`
      );
    }
    return;
  }

  if (name === "hero") {
    const files = getFilesInDirNonRecursive(task.srcDir).filter((f) =>
      task.filter(basename(f))
    );
    if (files.length === 0) {
      console.log("  (omitido: falta fuente home foto.png en public/)");
      return;
    }
    const srcPath = files[0];
    const dir = dirname(srcPath);
    const q = task.quality;
    const effort = task.webpEffort ?? 5;
    for (const bp of task.breakpoints) {
      const destPath = join(dir, bp.file);
      await processFile(srcPath, destPath, {
        width: bp.width,
        quality: bp.quality ?? q,
        effort: bp.effort ?? effort,
      });
    }
    await processFile(srcPath, join(dir, task.legacyFile), {
      width: 1920,
      quality: q,
      effort,
    });
    return;
  }

  if (name === "producciones_portadas") {
    // Solo archivos en la raíz de producciones (las portadas)
    const files = getFilesInDirNonRecursive(task.srcDir).filter(
      (f) => !f.endsWith(".webp")
    );
    for (const srcPath of files) {
      const destPath = toWebpPath(srcPath);
      if (!existsSync(destPath)) {
        await processFile(srcPath, destPath, task.single);
      }
    }
    return;
  }

  // Tareas con filter personalizado (favicon)
  if (task.filter) {
    const files = getFilesInDirNonRecursive(task.srcDir).filter((f) =>
      task.filter(basename(f))
    );
    for (const srcPath of files) {
      const destPath = join(dirname(srcPath), task.outputName(basename(srcPath)));
      if (!existsSync(destPath)) {
        await processFile(srcPath, destPath, task.single);
      }
    }
    return;
  }

  // Tarea estándar (single)
  const files = task.recursive
    ? getFilesInDir(task.srcDir, true)
    : getFilesInDirNonRecursive(task.srcDir);

  for (const srcPath of files) {
    if (srcPath.endsWith(".webp")) continue;
    const destPath = toWebpPath(srcPath);
    if (!existsSync(destPath)) {
      await processFile(srcPath, destPath, task.single);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Optimización de imágenes ===\n");
  const start = Date.now();

  for (const [name, task] of Object.entries(TASKS)) {
    await runTask(name, task);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\n═══════════════════════════════════════════\n` +
      `Archivos procesados: ${filesProcessed}\n` +
      `Tamaño original:     ${sizeMB(totalOriginal)}\n` +
      `Ahorro total:        ${sizeMB(totalSaved)} (${((totalSaved / totalOriginal) * 100).toFixed(0)}%)\n` +
      `Tiempo:              ${elapsed}s\n`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
