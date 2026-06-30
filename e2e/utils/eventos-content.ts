import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import {
  eventoSchema,
  groupPublishedEventos,
  toEventoCardView,
  type EventoCardView,
  type EventoEntry,
} from '../../src/lib/eventos';

const EVENTOS_CONTENT_DIR = join(process.cwd(), 'src/content/eventos');

function loadEventosFromRepo(): EventoEntry[] {
  const entryIds = readdirSync(EVENTOS_CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  return entryIds.map((id) => {
    const yamlPath = join(EVENTOS_CONTENT_DIR, id, 'index.yaml');
    const raw = readFileSync(yamlPath, 'utf8');
    const data = eventoSchema.parse(YAML.parse(raw));
    return { id, data };
  });
}

export function getExpectedEventosLists(): {
  festivales: EventoCardView[];
  conciertos: EventoCardView[];
} {
  const { festivales, conciertos } = groupPublishedEventos(loadEventosFromRepo());
  return {
    festivales: festivales.map(toEventoCardView),
    conciertos: conciertos.map(toEventoCardView),
  };
}
