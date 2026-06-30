/**
 * Migra imágenes de eventos al layout que Keystatic espera:
 *   public/eventos/{slug}/image.webp
 *   yaml: image: /eventos/{slug}/image.webp
 *
 * Uso: node scripts/migrate-eventos-images.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT = join(ROOT, 'src/content/eventos');
const PUBLIC = join(ROOT, 'public');

const slugs = readdirSync(CONTENT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const slug of slugs) {
  const yamlPath = join(CONTENT, slug, 'index.yaml');
  const raw = readFileSync(yamlPath, 'utf8');
  const imageMatch = raw.match(/^image:\s*(.+)$/m);
  if (!imageMatch) {
    console.warn(`skip ${slug}: sin campo image`);
    continue;
  }

  const current = imageMatch[1].trim();
  const targetPublic = `/eventos/${slug}/image.webp`;
  const targetDir = join(PUBLIC, 'eventos', slug);
  const targetFile = join(targetDir, 'image.webp');

  if (current === targetPublic && existsSync(targetFile)) {
    console.log(`ok ${slug}`);
    continue;
  }

  const legacyPath = current.startsWith('/') ? join(PUBLIC, current) : join(PUBLIC, current);
  if (!existsSync(legacyPath)) {
    console.warn(`skip ${slug}: no existe ${legacyPath}`);
    continue;
  }

  mkdirSync(targetDir, { recursive: true });
  copyFileSync(legacyPath, targetFile);

  const updated = raw.replace(/^image:\s*.+$/m, `image: ${targetPublic}`);
  writeFileSync(yamlPath, updated);
  console.log(`migrated ${slug}`);
}
